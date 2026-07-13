import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, KeyRound, Link2, Loader, MapPin, Pencil, Plus, Save, ShieldCheck, Star, Trash2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { accountAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const emptyAddress = { label: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'Nigeria', isDefault: false };

export default function AccountSettings() {
  const { checkAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [profile, setProfile] = useState(null);
  const [addressForm, setAddressForm] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const load = useCallback(async () => {
    try {
      const { data } = await accountAPI.getProfile();
      setProfile(data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load account settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async event => {
    event.preventDefault();
    try {
      setSaving('profile');
      const { data } = await accountAPI.updateProfile(profile);
      setProfile(data);
      await checkAuth();
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally { setSaving(''); }
  };

  const saveAddress = async event => {
    event.preventDefault();
    try {
      setSaving('address');
      if (addressForm.id) await accountAPI.updateAddress(addressForm.id, addressForm);
      else await accountAPI.createAddress(addressForm);
      setAddressForm(null);
      await load();
      toast.success('Address saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save address');
    } finally { setSaving(''); }
  };

  const makeDefault = async id => {
    try { await accountAPI.setDefaultAddress(id); await load(); toast.success('Default address updated'); }
    catch (error) { toast.error(error.response?.data?.error || 'Failed to update address'); }
  };

  const removeAddress = async id => {
    if (!window.confirm('Remove this saved address? Existing orders will not be affected.')) return;
    try { await accountAPI.deleteAddress(id); await load(); toast.success('Address removed'); }
    catch (error) { toast.error(error.response?.data?.error || 'Failed to remove address'); }
  };

  const changePassword = async event => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('New passwords do not match');
    try {
      setSaving('password');
      await accountAPI.changePassword(passwords);
      toast.success(profile.hasPassword ? 'Password changed. Please sign in again.' : 'Password created. Please sign in again.');
      logout();
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update password');
    } finally { setSaving(''); }
  };

  if (loading || !profile) return <Loader className="animate-spin m-16 mx-auto text-amber-600" />;

  return <div className="space-y-8">
    <div><h1 className="text-3xl font-serif text-stone-900">Profile & Security</h1><p className="text-stone-500 text-sm mt-2">Manage your personal details, delivery addresses and sign-in options.</p></div>

    <form onSubmit={saveProfile} className="bg-white border border-stone-200 rounded-xl p-6 space-y-5 shadow-sm">
      <h2 className="font-semibold flex items-center gap-2"><UserRound size={19}/> Personal details</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="First name" value={profile.firstName} onChange={firstName => setProfile({ ...profile, firstName })}/>
        <Field label="Last name" value={profile.lastName} onChange={lastName => setProfile({ ...profile, lastName })}/>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email" value={profile.email} disabled help="Contact support if you need to change your email."/>
        <Field label="Phone number" value={profile.phone || ''} onChange={phone => setProfile({ ...profile, phone })} type="tel" placeholder="+234…"/>
      </div>
      <button disabled={saving === 'profile'} className="inline-flex items-center gap-2 bg-stone-900 text-white rounded-lg px-5 py-3 disabled:opacity-50">{saving === 'profile' ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>} Save profile</button>
    </form>

    <section className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="font-semibold text-lg flex items-center gap-2"><MapPin size={19}/> Address book</h2><p className="text-sm text-stone-500">Your default address will be selected automatically at checkout.</p></div><button onClick={() => setAddressForm({ ...emptyAddress, isDefault: profile.addresses.length === 0 })} className="inline-flex items-center gap-2 border bg-white rounded-lg px-4 py-2 text-sm"><Plus size={16}/> Add address</button></div>
      <div className="grid md:grid-cols-2 gap-4">
        {profile.addresses.map(address => <article key={address.id} className={`bg-white border rounded-xl p-5 ${address.isDefault ? 'border-amber-400 ring-1 ring-amber-200' : 'border-stone-200'}`}>
          <div className="flex justify-between gap-3"><div><p className="font-semibold">{address.label || 'Delivery address'}</p>{address.isDefault && <span className="inline-flex items-center gap-1 text-xs text-amber-700 mt-1"><Star size={12} fill="currentColor"/> Default</span>}</div><div className="flex gap-2"><button aria-label="Edit address" onClick={() => setAddressForm({ ...address })} className="p-2 hover:bg-stone-100 rounded"><Pencil size={15}/></button><button aria-label="Delete address" onClick={() => removeAddress(address.id)} className="p-2 hover:bg-red-50 text-red-600 rounded"><Trash2 size={15}/></button></div></div>
          <p className="text-sm text-stone-600 mt-4 leading-6">{address.line1}{address.line2 && <><br/>{address.line2}</>}<br/>{address.city}{address.state ? `, ${address.state}` : ''} {address.postalCode}<br/>{address.country}</p>
          {!address.isDefault && <button onClick={() => makeDefault(address.id)} className="text-xs text-amber-700 font-medium mt-4">Make default</button>}
        </article>)}
        {!profile.addresses.length && <div className="md:col-span-2 border border-dashed rounded-xl p-10 text-center text-stone-500"><MapPin className="mx-auto mb-3"/><p>No saved addresses yet.</p></div>}
      </div>
    </section>

    {addressForm && <form onSubmit={saveAddress} className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
      <div className="flex justify-between"><h3 className="font-semibold">{addressForm.id ? 'Edit address' : 'New address'}</h3><button type="button" onClick={() => setAddressForm(null)} className="text-sm text-stone-500">Cancel</button></div>
      <div className="grid sm:grid-cols-2 gap-4"><Field label="Label" value={addressForm.label || ''} onChange={label => setAddressForm({ ...addressForm, label })} placeholder="Home, Office…"/><Field label="Country" value={addressForm.country} onChange={country => setAddressForm({ ...addressForm, country })}/></div>
      <Field label="Address line 1" required value={addressForm.line1} onChange={line1 => setAddressForm({ ...addressForm, line1 })}/>
      <Field label="Address line 2" value={addressForm.line2 || ''} onChange={line2 => setAddressForm({ ...addressForm, line2 })}/>
      <div className="grid sm:grid-cols-3 gap-4"><Field label="City" required value={addressForm.city} onChange={city => setAddressForm({ ...addressForm, city })}/><Field label="State / region" value={addressForm.state || ''} onChange={state => setAddressForm({ ...addressForm, state })}/><Field label="Postal code" required value={addressForm.postalCode} onChange={postalCode => setAddressForm({ ...addressForm, postalCode })}/></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(addressForm.isDefault)} onChange={event => setAddressForm({ ...addressForm, isDefault: event.target.checked })} className="accent-amber-600"/> Use as my default delivery address</label>
      <button disabled={saving === 'address'} className="inline-flex items-center gap-2 bg-stone-900 text-white rounded-lg px-5 py-3 disabled:opacity-50">{saving === 'address' ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>} Save address</button>
    </form>}

    <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5 shadow-sm">
      <h2 className="font-semibold flex items-center gap-2"><ShieldCheck size={19}/> Sign-in security</h2>
      <div className="grid sm:grid-cols-2 gap-3 text-sm"><Status icon={CheckCircle} active={profile.isVerified} label={profile.isVerified ? 'Email verified' : 'Email not verified'}/><Status icon={Link2} active={profile.googleLinked} label={profile.googleLinked ? 'Google account linked' : 'Google account not linked'}/></div>
      <form onSubmit={changePassword} className="space-y-4 border-t pt-5">
        <div><h3 className="font-medium flex items-center gap-2"><KeyRound size={17}/>{profile.hasPassword ? 'Change password' : 'Create a password'}</h3>{!profile.hasPassword && <p className="text-xs text-stone-500 mt-1">Add a password so you can also sign in without Google.</p>}</div>
        {profile.hasPassword && (
          <Field type="password" label="Current password" required value={passwords.currentPassword} onChange={currentPassword => setPasswords({ ...passwords, currentPassword })}/>
        )}
        <div className="grid sm:grid-cols-2 gap-4"><Field type="password" label="New password" required minLength={12} value={passwords.newPassword} onChange={newPassword => setPasswords({ ...passwords, newPassword })}/><Field type="password" label="Confirm new password" required minLength={12} value={passwords.confirmPassword} onChange={confirmPassword => setPasswords({ ...passwords, confirmPassword })}/></div>
        <button disabled={saving === 'password'} className="inline-flex items-center gap-2 bg-stone-900 text-white rounded-lg px-5 py-3 disabled:opacity-50">{saving === 'password' ? <Loader size={16} className="animate-spin"/> : <KeyRound size={16}/>} {profile.hasPassword ? 'Change password' : 'Create password'}</button>
      </form>
    </section>
  </div>;
}

const Field = ({ label, help, onChange, ...props }) => <label className="block"><span className="block text-xs font-medium uppercase tracking-wide text-stone-500 mb-2">{label}</span><input {...props} onChange={event => onChange?.(event.target.value)} className="w-full border border-stone-200 bg-white rounded-lg px-4 py-3 disabled:bg-stone-100 disabled:text-stone-500 focus:outline-none focus:border-amber-500"/>{help && <span className="text-[11px] text-stone-400 mt-1 block">{help}</span>}</label>;
const Status = ({ icon: Icon, active, label }) => <div className={`flex items-center gap-2 rounded-lg p-3 ${active ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'}`}><Icon size={16}/>{label}</div>;
