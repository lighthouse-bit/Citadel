import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle, Info, Loader, Lock, MapPin, Package, ShoppingBag, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { accountAPI, marketingAPI, ordersAPI, paymentsAPI, shippingAPI } from '../services/api';
import { trackEvent, trackPurchase } from '../utils/analytics';
import { checkoutTotal } from '../utils/checkoutTotals';

const DRAFT_KEY = 'citadel_checkout_draft';
const PENDING_KEY = 'pending_order';
const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Morocco', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'UAE', 'Saudi Arabia', 'India', 'China', 'Japan', 'Other'];
const emptyForm = { email: '', firstName: '', lastName: '', address: '', city: '', state: '', zip: '', country: 'Nigeria' };

const readStorage = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
};
const newCheckoutToken = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const fieldClass = (error) => `w-full px-4 py-3 bg-stone-50 border rounded-lg text-stone-900 focus:outline-none focus:ring-1 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-stone-200 focus:border-amber-500 focus:ring-amber-200'}`;

function CartImage({ src, alt }) {
  const fallback = 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=200&h=200&fit=crop';
  return <img src={src || fallback} alt={alt} className="w-full h-full object-cover" onError={event => { event.currentTarget.src = fallback; }} />;
}

function Field({ label, name, value, error, onChange, type = 'text', autoComplete }) {
  return <div><label htmlFor={`checkout-${name}`} className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">{label}</label><input id={`checkout-${name}`} type={type} name={name} value={value} onChange={onChange} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className={fieldClass(error)} />{error && <p id={`${name}-error`} className="text-xs text-red-600 mt-1.5">{error}</p>}</div>;
}

function Progress({ phase }) {
  const active = phase === 'details' ? 0 : 1;
  return <div className="max-w-xl mx-auto mb-10 flex items-center" aria-label="Checkout progress">{['Delivery details', 'Review & payment'].map((label, index) => <div key={label} className={`flex items-center ${index === 0 ? 'flex-1' : ''}`}><div className="flex items-center gap-2"><span className={`w-8 h-8 rounded-full grid place-items-center text-sm font-medium ${index <= active ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500'}`}>{index < active ? <Check size={16}/> : index + 1}</span><span className={`text-sm ${index <= active ? 'text-stone-900' : 'text-stone-400'}`}>{label}</span></div>{index === 0 && <div className={`h-px flex-1 mx-4 ${active > 0 ? 'bg-stone-900' : 'bg-stone-200'}`}/>}</div>)}</div>;
}

export default function Checkout() {
  const { cartItems, cartTotal, clearCart, unavailableCount, openCart } = useCart();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const restored = useRef(readStorage(DRAFT_KEY));
  const initialPending = useRef(readStorage(PENDING_KEY));
  const submitLock = useRef(false);
  const verifyLock = useRef('');
  const [phase, setPhase] = useState(restored.current?.phase === 'review' ? 'review' : 'details');
  const [formData, setFormData] = useState(() => ({ ...emptyForm, ...(restored.current?.formData || {}), email: restored.current?.formData?.email || user?.email || '', firstName: restored.current?.formData?.firstName || user?.firstName || user?.name?.split(' ')[0] || '', lastName: restored.current?.formData?.lastName || user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '' }));
  const [errors, setErrors] = useState({});
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(restored.current?.selectedAddressId || '');
  const [checkoutToken] = useState(restored.current?.checkoutToken || initialPending.current?.checkoutToken || newCheckoutToken);
  const [shippingInfo, setShippingInfo] = useState(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState(restored.current?.promoCode || '');
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(initialPending.current);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [failureMessage, setFailureMessage] = useState('');

  const shippingCost = Number(shippingInfo?.shippingCost || 0);
  const finalTotal = checkoutTotal(cartTotal, shippingCost, appliedPromotion?.discount || 0);

  const selectSavedAddress = useCallback(address => {
    setSelectedAddressId(address.id);
    setFormData(previous => ({ ...previous, address: address.line1, city: address.city, state: address.state || '', zip: address.postalCode, country: address.country }));
    setErrors({});
  }, []);

  useEffect(() => {
    if (!user) return;
    accountAPI.getProfile().then(({ data }) => {
      const addresses = data.addresses || [];
      setSavedAddresses(addresses);
      setFormData(previous => ({ ...previous, email: previous.email || data.email, firstName: previous.firstName || data.firstName, lastName: previous.lastName || data.lastName }));
      if (!restored.current?.formData?.address) {
        const address = addresses.find(item => item.isDefault) || addresses[0];
        if (address) selectSavedAddress(address);
      }
    }).catch(() => {});
  }, [selectSavedAddress, user]);

  useEffect(() => {
    if (['success', 'verify'].includes(phase)) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, selectedAddressId, promoCode, checkoutToken, phase, savedAt: new Date().toISOString() }));
  }, [checkoutToken, formData, phase, promoCode, selectedAddressId]);

  useEffect(() => {
    if (!formData.country || cartItems.length === 0) { setShippingInfo(null); return undefined; }
    const timer = setTimeout(async () => {
      setIsCalculatingShipping(true);
      try {
        const { data } = await shippingAPI.calculate({ country: formData.country, items: cartItems.map(item => ({ width: item.width, height: item.height, price: item.price })) });
        setShippingInfo(data);
      } catch {
        setShippingInfo(null);
      } finally {
        setIsCalculatingShipping(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [cartItems, formData.country]);

  const verifyPayment = useCallback(async reference => {
    if (!reference || verifyLock.current === reference) return;
    verifyLock.current = reference;
    setPhase('verify');
    try {
      const { data } = await paymentsAPI.verifyPayment(reference);
      if (!data.success) throw new Error(data.error || 'Payment verification failed');
      const storedOrder = readStorage(PENDING_KEY) || {};
      const order = data.order || storedOrder;
      trackPurchase(order, cartItems, Number(order.total || storedOrder.total || finalTotal));
      localStorage.removeItem('citadel_cart');
      sessionStorage.removeItem('citadel_cart');
      localStorage.removeItem(PENDING_KEY);
      localStorage.removeItem(DRAFT_KEY);
      await clearCart();
      setPendingOrder(null);
      setCompletedOrder(order);
      setPhase('success');
      toast.success('Payment confirmed');
    } catch (error) {
      verifyLock.current = '';
      setFailureMessage(error.response?.data?.error || error.message || 'We could not confirm the payment yet.');
      setPhase('failure');
    }
  }, [cartItems, clearCart, finalTotal]);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const redirectError = searchParams.get('error');
    if (reference) verifyPayment(reference);
    else if (redirectError) { setFailureMessage('The payment was not completed. Your order is saved and you can safely try again.'); setPhase('failure'); }
  }, [searchParams, verifyPayment]);

  const handleChange = event => {
    const { name, value } = event.target;
    if (['address', 'city', 'state', 'zip', 'country'].includes(name)) setSelectedAddressId('');
    setFormData(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: '' }));
  };

  const validate = () => {
    const next = {};
    if (formData.firstName.trim().length < 2) next.firstName = 'Enter your first name.';
    if (formData.lastName.trim().length < 2) next.lastName = 'Enter your last name.';
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) next.email = 'Enter a valid email address.';
    if (formData.address.trim().length < 5) next.address = 'Enter a complete street address.';
    if (formData.city.trim().length < 2) next.city = 'Enter your city.';
    if (formData.zip.trim().length < 3) next.zip = 'Enter a valid postal code.';
    if (!formData.country) next.country = 'Select your delivery country.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const continueToReview = event => {
    event.preventDefault();
    if (!validate()) { toast.error('Please check the highlighted delivery details'); return; }
    if (isCalculatingShipping) { toast.error('Please wait while shipping is calculated'); return; }
    if (!shippingInfo) { toast.error('Shipping could not be calculated. Check the country and try again.'); return; }
    setPhase('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyPromotion = async () => {
    if (!promoCode.trim()) return;
    try {
      const { data } = await marketingAPI.validatePromotion({ code: promoCode, subtotal: cartTotal, artworkIds: cartItems.map(item => item.id) });
      setAppliedPromotion(data);
      toast.success(`${data.code} applied`);
    } catch (error) {
      setAppliedPromotion(null);
      toast.error(error.response?.data?.error || 'Invalid promotion');
    }
  };

  const redirectToPayment = async order => {
    sessionStorage.setItem('citadel_tracking_email', formData.email.trim().toLowerCase());
    const { data } = await paymentsAPI.createArtworkPayment(order.orderId || order.id, checkoutToken);
    if (data.alreadyPaid) {
      localStorage.removeItem(PENDING_KEY);
      localStorage.removeItem(DRAFT_KEY);
      await clearCart();
      setPendingOrder(null);
      setCompletedOrder(data.order);
      setPhase('success');
      setIsProcessing(false);
      return;
    }
    const updated = { ...order, orderId: order.orderId || order.id, orderNumber: data.orderNumber || order.orderNumber, reference: data.reference, total: Number(order.total || finalTotal), email: formData.email, firstName: formData.firstName, checkoutToken };
    localStorage.setItem(PENDING_KEY, JSON.stringify(updated));
    setPendingOrder(updated);
    window.location.assign(data.authorizationUrl);
  };

  const submitPayment = async () => {
    if (submitLock.current || isProcessing) return;
    if (isCalculatingShipping || !shippingInfo) { toast.error('Please wait for the current delivery total'); return; }
    submitLock.current = true;
    setIsProcessing(true);
    setFailureMessage('');
    try {
      if (pendingOrder?.orderId && pendingOrder.checkoutToken === checkoutToken) {
        await redirectToPayment(pendingOrder);
        return;
      }
      const { data: order } = await ordersAPI.create({
        checkoutToken,
        firstName: formData.firstName.trim(), lastName: formData.lastName.trim(), email: formData.email.trim().toLowerCase(),
        items: cartItems.map(item => ({ id: item.id })),
        shippingAddressId: selectedAddressId || undefined,
        shippingAddress: { line1: formData.address.trim(), city: formData.city.trim(), state: formData.state.trim(), postalCode: formData.zip.trim(), country: formData.country },
        shippingCost, shippingZone: shippingInfo?.zone || 'Unknown', shippingSize: shippingInfo?.size || 'unknown', promotionCode: appliedPromotion?.code || null,
      });
      const pending = { orderId: order.id, orderNumber: order.orderNumber, total: Number(order.total), email: formData.email, firstName: formData.firstName, checkoutToken };
      localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
      setPendingOrder(pending);
      trackEvent('begin_checkout', { value: Number(order.total), currency: 'USD', item_count: cartItems.length, promotion_code: appliedPromotion?.code || undefined });
      await redirectToPayment(pending);
    } catch (error) {
      setFailureMessage(error.response?.data?.error || 'Checkout could not continue. Your details are saved; please try again.');
      setPhase('failure');
      setIsProcessing(false);
      submitLock.current = false;
    }
  };

  if (phase === 'verify') return <div className="min-h-screen pt-20 bg-stone-50 grid place-items-center px-6"><div className="text-center max-w-md"><Loader size={48} className="animate-spin text-amber-600 mx-auto mb-5"/><h1 className="font-serif text-2xl mb-2">Confirming your payment</h1><p className="text-stone-500">Keep this page open. We are securely checking the transaction with Paystack.</p></div></div>;

  if (phase === 'success') return <div className="min-h-screen pt-24 pb-16 bg-stone-50 px-6"><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 md:p-10 rounded-2xl shadow-lg border border-stone-200 max-w-2xl mx-auto"><div className="w-20 h-20 bg-green-100 rounded-full grid place-items-center mx-auto mb-6"><CheckCircle size={40} className="text-green-600"/></div><div className="text-center"><p className="text-xs tracking-[0.2em] uppercase text-green-700 mb-2">Payment received</p><h1 className="text-3xl font-serif text-stone-900">Your artwork is reserved for you</h1><p className="text-stone-500 mt-3">A receipt and order confirmation have been sent to {completedOrder?.customer?.email || completedOrder?.email || formData.email}.</p></div><div className="grid sm:grid-cols-2 gap-4 my-8"><div className="bg-stone-50 rounded-xl p-4"><p className="text-xs uppercase text-stone-400">Order number</p><p className="font-medium mt-1">{completedOrder?.orderNumber || 'Confirmed'}</p></div><div className="bg-stone-50 rounded-xl p-4"><p className="text-xs uppercase text-stone-400">Amount paid</p><p className="font-medium mt-1">${Number(completedOrder?.total || 0).toLocaleString()}</p></div><div className="bg-stone-50 rounded-xl p-4 sm:col-span-2"><p className="text-xs uppercase text-stone-400">What happens next</p><p className="text-sm text-stone-600 mt-1">We will prepare your artwork and email you when tracking becomes available.</p></div></div><div className="grid sm:grid-cols-2 gap-3">{completedOrder?.orderNumber && <Link to={`/track/${completedOrder.orderNumber}`} className="inline-flex justify-center items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-lg"><Package size={17}/> Track this order</Link>}<Link to={user ? '/account' : '/shop'} className="inline-flex justify-center items-center px-6 py-3 border border-stone-200 text-stone-700 rounded-lg">{user ? 'View my orders' : 'Continue browsing'}</Link></div></motion.div></div>;

  if (phase === 'failure') return <div className="min-h-screen pt-24 bg-stone-50 grid place-items-center px-6"><div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg w-full shadow-sm text-center"><AlertCircle size={48} className="text-red-500 mx-auto mb-5"/><h1 className="font-serif text-2xl text-stone-900 mb-3">Payment needs attention</h1><p className="text-stone-600 mb-3">{failureMessage}</p>{pendingOrder?.orderNumber && <p className="text-sm text-stone-500 mb-6">Your saved order is <strong>#{pendingOrder.orderNumber}</strong>. You will not create a duplicate by retrying.</p>}<div className="space-y-3"><button onClick={() => { setPhase('review'); setFailureMessage(''); }} className="w-full bg-stone-900 text-white rounded-lg px-6 py-3">Review and try again</button><Link to="/shop" className="block border border-stone-200 rounded-lg px-6 py-3 text-stone-700">Return to shop</Link></div></div></div>;

  if (cartItems.length === 0) return <div className="min-h-screen pt-20 bg-stone-50 grid place-items-center"><div className="text-center"><ShoppingBag size={48} className="mx-auto text-stone-300 mb-4"/><h1 className="text-2xl font-serif mb-4">Your collection is empty</h1><Link to="/shop" className="text-amber-700 underline">Explore available artwork</Link></div></div>;
  if (unavailableCount > 0) return <div className="min-h-screen pt-20 bg-stone-50 grid place-items-center px-6"><div className="bg-white border border-amber-200 rounded-xl p-8 max-w-md text-center"><Info size={44} className="mx-auto text-amber-600 mb-4"/><h1 className="text-2xl font-serif mb-3">Your cart needs attention</h1><p className="text-stone-500 mb-6">Remove unavailable artwork before continuing.</p><button onClick={openCart} className="bg-stone-900 text-white rounded-lg px-6 py-3">Review cart</button></div></div>;

  return <div className="pt-24 min-h-screen bg-stone-50 pb-24"><div className="max-w-7xl mx-auto px-6"><h1 className="text-4xl font-serif text-stone-900 mb-5 text-center">Secure Checkout</h1><Progress phase={phase}/><div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 max-w-6xl mx-auto">
    <div>{phase === 'details' ? <form onSubmit={continueToReview} className="bg-white p-6 md:p-8 rounded-xl border border-stone-200 shadow-sm"><div className="flex items-center gap-3 mb-7"><MapPin className="text-amber-700"/><div><h2 className="text-xl font-serif">Contact & delivery</h2><p className="text-sm text-stone-500">We use these details for delivery updates and your invoice.</p></div></div><div className="space-y-5">{savedAddresses.length > 0 && <div><label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Saved delivery address</label><select value={selectedAddressId} onChange={event => { const address = savedAddresses.find(item => item.id === event.target.value); if (address) selectSavedAddress(address); else setSelectedAddressId(''); }} className={fieldClass(false)}><option value="">Enter a different address</option>{savedAddresses.map(address => <option key={address.id} value={address.id}>{address.isDefault ? 'Default — ' : ''}{address.label || address.line1}, {address.city}</option>)}</select></div>}<div className="grid sm:grid-cols-2 gap-4"><Field label="First name" name="firstName" value={formData.firstName} error={errors.firstName} onChange={handleChange} autoComplete="given-name"/><Field label="Last name" name="lastName" value={formData.lastName} error={errors.lastName} onChange={handleChange} autoComplete="family-name"/></div><Field label="Email" name="email" type="email" value={formData.email} error={errors.email} onChange={handleChange} autoComplete="email"/><Field label="Street address" name="address" value={formData.address} error={errors.address} onChange={handleChange} autoComplete="street-address"/><div className="grid sm:grid-cols-2 gap-4"><Field label="City" name="city" value={formData.city} error={errors.city} onChange={handleChange} autoComplete="address-level2"/><Field label="State / region (optional)" name="state" value={formData.state} error={errors.state} onChange={handleChange} autoComplete="address-level1"/></div><div className="grid sm:grid-cols-2 gap-4"><Field label="ZIP / postal code" name="zip" value={formData.zip} error={errors.zip} onChange={handleChange} autoComplete="postal-code"/><div><label htmlFor="checkout-country" className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Country</label><select id="checkout-country" name="country" value={formData.country} onChange={handleChange} className={fieldClass(errors.country)}>{COUNTRIES.map(country => <option key={country}>{country}</option>)}</select>{errors.country && <p className="text-xs text-red-600 mt-1.5">{errors.country}</p>}</div></div><button type="submit" disabled={isCalculatingShipping} className="w-full bg-stone-900 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">{isCalculatingShipping ? <><Loader size={18} className="animate-spin"/> Calculating delivery</> : <>Review order <ArrowRight size={18}/></>}</button></div></form> : <div className="space-y-6"><div className="bg-white p-6 md:p-8 rounded-xl border border-stone-200"><div className="flex justify-between gap-4 mb-5"><div><h2 className="text-xl font-serif">Review delivery</h2><p className="text-sm text-stone-500 mt-1">Confirm everything before opening Paystack.</p></div><button onClick={() => setPhase('details')} className="text-sm text-amber-700 inline-flex items-center gap-1"><ArrowLeft size={15}/> Edit</button></div><div className="grid sm:grid-cols-2 gap-5 text-sm"><div><p className="text-xs uppercase text-stone-400 mb-1">Contact</p><p>{formData.firstName} {formData.lastName}</p><p className="text-stone-500">{formData.email}</p></div><div><p className="text-xs uppercase text-stone-400 mb-1">Delivery address</p><p>{formData.address}</p><p className="text-stone-500">{formData.city}{formData.state ? `, ${formData.state}` : ''} {formData.zip}<br/>{formData.country}</p></div></div></div><div className="bg-white p-6 md:p-8 rounded-xl border border-stone-200"><div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 bg-[#00C3F7] rounded-lg grid place-items-center"><Lock size={18} className="text-white"/></div><div><h2 className="font-medium">Pay securely with Paystack</h2><p className="text-xs text-stone-500">Cards, bank transfer, USSD and more</p></div></div><div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 mb-5">You will be redirected to Paystack. If payment is interrupted, return here and retry the saved order safely.</div><button onClick={submitPayment} disabled={isProcessing || isCalculatingShipping} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">{isProcessing ? <><Loader size={18} className="animate-spin"/> Opening Paystack</> : <><Lock size={17}/> Pay ${finalTotal.toLocaleString()}</>}</button></div></div>}</div>
    <aside><div className="bg-white p-6 md:p-8 rounded-xl border border-stone-200 shadow-sm sticky top-28"><h2 className="text-xl font-serif mb-6">Order summary</h2><div className="space-y-4 mb-6 max-h-72 overflow-y-auto">{cartItems.map(item => <div key={item.id} className="flex gap-4"><div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0"><CartImage src={item.images?.[0]?.url || item.images?.[0]} alt={item.title}/></div><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{item.title}</p><p className="text-xs text-stone-500 mt-1">{item.medium}</p></div><p className="font-medium text-sm">${Number(item.price).toLocaleString()}</p></div>)}</div><div className="flex gap-2 mb-5"><input value={promoCode} onChange={event => setPromoCode(event.target.value.toUpperCase())} placeholder="Promotion code" className="border border-stone-200 rounded-lg px-3 py-2 flex-1 min-w-0 text-sm"/><button type="button" onClick={applyPromotion} className="border border-stone-200 rounded-lg px-3 text-sm">Apply</button></div><div className="space-y-3 pt-5 border-t text-sm"><div className="flex justify-between text-stone-500"><span>Subtotal</span><span>${cartTotal.toLocaleString()}</span></div>{appliedPromotion && <div className="flex justify-between text-green-700"><span>Discount ({appliedPromotion.code})</span><span>-${Number(appliedPromotion.discount).toLocaleString()}</span></div>}<div className="flex justify-between text-stone-500"><span>Shipping {shippingInfo?.zone ? `(${shippingInfo.zone})` : ''}</span>{isCalculatingShipping ? <Loader size={14} className="animate-spin"/> : shippingInfo?.isFreeShipping ? <span className="text-green-600">FREE</span> : shippingInfo ? <span>${shippingCost.toFixed(2)}</span> : <span>Calculating</span>}</div>{shippingInfo?.estimatedDays && <div className="flex gap-2 text-xs text-stone-400"><Truck size={14}/><span>Estimated delivery: {shippingInfo.estimatedDays}</span></div>}<div className="flex justify-between text-stone-500"><span>Tax</span><span>$0.00</span></div><div className="flex justify-between text-xl font-serif pt-4 border-t"><span>Total</span><span className="text-amber-700">${finalTotal.toLocaleString()}</span></div></div><p className="mt-6 pt-4 border-t text-xs text-stone-400 flex justify-center items-center gap-1"><Lock size={11}/> Encrypted checkout · Powered by Paystack</p></div></aside>
  </div></div></div>;
}
