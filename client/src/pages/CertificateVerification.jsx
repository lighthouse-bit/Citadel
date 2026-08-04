import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, Check, Copy, ExternalLink, Loader, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import { digitalCertificateAPI } from '../services/api';

export default function CertificateVerification() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    digitalCertificateAPI.verify(id)
      .then(response => setCertificate(response.data))
      .catch(error => {
        if (error.response?.status === 404) setNotFound(true);
        else toast.error(error.response?.data?.error || 'Certificate verification is unavailable');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success('Verification link copied');
  };

  return <>
    <SEO title="Verify Digital Art Certificate" description="Verify a Highmarc digital artwork licence and numbered edition certificate." url={`/certificate/${id}`} noIndex />
    <div className="min-h-screen bg-[#f5f3ee] px-5 pb-20 pt-32">
      {loading ? <div className="grid min-h-[60vh] place-items-center"><div className="text-center"><Loader className="mx-auto animate-spin text-amber-700"/><p className="mt-3 text-sm text-stone-500">Checking certificate record…</p></div></div> : notFound || !certificate ? <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm"><AlertTriangle className="mx-auto text-amber-700" size={42}/><h1 className="mt-5 font-serif text-3xl">Certificate not found</h1><p className="mt-3 text-stone-500">This reference does not match an issued Highmarc digital licence. Check that the full verification link was copied correctly.</p><Link to="/digital-art" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-amber-700">Explore verified digital editions <ExternalLink size={15}/></Link></div> : <div className="mx-auto max-w-4xl">
        <div className={`mb-5 flex items-center justify-between gap-4 rounded-2xl border p-5 ${certificate.status === 'VALID' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}><div className="flex items-center gap-3">{certificate.status === 'VALID' ? <BadgeCheck className="text-emerald-700" size={28}/> : <AlertTriangle className="text-red-700" size={28}/>}<div><p className={`text-xs font-semibold uppercase tracking-[0.18em] ${certificate.status === 'VALID' ? 'text-emerald-700' : 'text-red-700'}`}>{certificate.status === 'VALID' ? 'Authentic certificate' : 'Access revoked'}</p><p className="mt-1 text-sm text-stone-600">Verified against the live Highmarc licence record.</p></div></div><button onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium"><Copy size={14}/> <span className="hidden sm:inline">Copy link</span></button></div>

        <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"><div className="grid md:grid-cols-[0.82fr_1.18fr]"> <div className="min-h-72 bg-stone-100">{certificate.artwork.previewUrl ? <img src={certificate.artwork.previewUrl} alt={certificate.artwork.title} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center"><ShieldCheck size={56} className="text-stone-300"/></div>}</div><div className="p-7 sm:p-10"><p className="text-xs uppercase tracking-[0.24em] text-amber-700">Highmarc Art Atelier</p><h1 className="mt-4 font-serif text-4xl leading-tight">Digital Licence Certificate</h1><p className="mt-3 text-stone-500">A public, privacy-safe record of an issued digital artwork licence.</p><div className="my-8 h-px bg-stone-200"/><dl className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-stone-400">Artwork</dt><dd className="mt-1 text-xl font-serif">{certificate.artwork.title}</dd></div><div><dt className="text-xs uppercase tracking-wider text-stone-400">Registered collector</dt><dd className="mt-1 font-medium">{certificate.owner}</dd></div><div><dt className="text-xs uppercase tracking-wider text-stone-400">Licence</dt><dd className="mt-1 font-medium">{certificate.licence.name}</dd></div><div><dt className="text-xs uppercase tracking-wider text-stone-400">Edition</dt><dd className="mt-1 font-medium">{certificate.edition ? `${certificate.edition.number} of ${certificate.edition.size}` : 'Open digital edition'}</dd></div><div><dt className="text-xs uppercase tracking-wider text-stone-400">Issued</dt><dd className="mt-1 font-medium">{new Date(certificate.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div></dl><div className="mt-8 rounded-xl bg-stone-50 p-4"><p className="text-[10px] uppercase tracking-wider text-stone-400">Certificate reference</p><p className="mt-2 break-all font-mono text-xs text-stone-600">{certificate.certificateId}</p></div><div className="mt-7 flex flex-wrap gap-3"><Link to={`/artwork/${certificate.artwork.id}`} className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white">View artwork <ExternalLink size={15}/></Link>{certificate.status === 'VALID' && <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-4 py-3 text-sm text-emerald-700"><Check size={15}/> Active record</span>}</div></div></div></article>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-stone-400">Verification confirms that Highmarc issued this licence record. Copyright remains with the artist, and this page does not expose the licensed master file or the collector’s private information.</p>
      </div>}
    </div>
  </>;
}
