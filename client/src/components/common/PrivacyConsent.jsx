import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { applyAnalyticsConsent, trackPageView } from '../../utils/analytics';
import { getPrivacyConsent, savePrivacyConsent } from '../../utils/privacyConsent';

export default function PrivacyConsent() {
  const [consent, setConsent] = useState(() => getPrivacyConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [choices, setChoices] = useState({ analytics: consent?.analytics || false, marketing: consent?.marketing || false });

  useEffect(() => {
    if (consent) applyAnalyticsConsent(consent);
    const open = () => {
      const current = getPrivacyConsent();
      setChoices({ analytics: current?.analytics || false, marketing: current?.marketing || false });
      setSettingsOpen(true);
    };
    window.addEventListener('highmarc:open-privacy-settings', open);
    return () => window.removeEventListener('highmarc:open-privacy-settings', open);
  }, [consent]);

  const commit = next => {
    const saved = savePrivacyConsent(next);
    setConsent(saved);
    setChoices({ analytics: saved.analytics, marketing: saved.marketing });
    setSettingsOpen(false);
    applyAnalyticsConsent(saved);
    if (saved.analytics) window.setTimeout(() => trackPageView(`${window.location.pathname}${window.location.search}`, document.title), 0);
  };

  return <>
    {!consent && !settingsOpen && <div className="fixed inset-x-4 bottom-4 z-[120] mx-auto max-w-4xl rounded-2xl border border-stone-700 bg-stone-950 p-5 text-white shadow-2xl sm:p-6" role="dialog" aria-label="Privacy choices"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-amber-400"/><div><h2 className="font-medium">Your privacy choices</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-stone-400">Essential storage keeps accounts and carts working. With your permission, analytics helps us understand and improve the gallery. Optional tracking stays off until you choose.</p><Link to="/privacy" className="mt-2 inline-block text-xs text-amber-400 hover:text-amber-300">Read the Privacy Policy</Link></div></div><div className="flex shrink-0 flex-wrap gap-2"><button onClick={() => commit({ analytics: false, marketing: false })} className="rounded-lg border border-stone-600 px-4 py-2.5 text-sm">Essential only</button><button onClick={() => setSettingsOpen(true)} className="rounded-lg border border-stone-600 px-4 py-2.5 text-sm">Choose</button><button onClick={() => commit({ analytics: true, marketing: true })} className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-stone-950">Accept all</button></div></div></div>}
    {settingsOpen && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="privacy-settings-title"><div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-stone-200 p-6"><div><p className="text-xs uppercase tracking-[0.18em] text-amber-700">Privacy controls</p><h2 id="privacy-settings-title" className="mt-2 font-serif text-3xl">Choose what you allow</h2></div>{consent && <button aria-label="Close privacy settings" onClick={() => setSettingsOpen(false)} className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X/></button>}</div><div className="space-y-4 p-6"><Choice title="Essential storage" text="Required for sign-in, security, cart contents, and your saved privacy choice." checked disabled/><Choice title="Analytics" text="Allows first-party usage analytics, performance measurements, and Google Analytics when configured." checked={choices.analytics} onChange={analytics => setChoices(current => ({ ...current, analytics }))}/><Choice title="Marketing" text="Records permission for optional marketing measurement and personalisation. Email subscriptions remain separately controllable in your account." checked={choices.marketing} onChange={marketing => setChoices(current => ({ ...current, marketing }))}/><p className="text-xs leading-5 text-stone-500">You can change these choices at any time from “Privacy choices” in the footer. See our <Link to="/privacy" className="text-amber-700">Privacy Policy</Link>.</p></div><div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 p-5"><button onClick={() => commit({ analytics: false, marketing: false })} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm">Reject optional</button><button onClick={() => commit(choices)} className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white">Save choices</button></div></div></div>}
  </>;
}

const Choice = ({ title, text, checked, disabled, onChange }) => <label className={`flex gap-4 rounded-xl border p-4 ${disabled ? 'bg-stone-50' : 'cursor-pointer bg-white'}`}><div className="flex-1"><span className="font-medium text-stone-900">{title}</span><p className="mt-1 text-sm leading-6 text-stone-500">{text}</p></div><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange?.(event.target.checked)} className="mt-1 h-5 w-5 accent-amber-600"/></label>;
