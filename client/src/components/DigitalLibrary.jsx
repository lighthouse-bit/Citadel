import { useEffect, useState } from 'react';
import { Download, FileText, Image, Loader, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { digitalLibraryAPI } from '../services/api';

const formatBytes = bytes => {
  if (!bytes) return 'High-resolution file';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function DigitalLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDownload, setActiveDownload] = useState('');

  const load = async () => {
    try {
      const { data } = await digitalLibraryAPI.getAll();
      setItems(data.items || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load your digital collection');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const downloadArtwork = async item => {
    setActiveDownload(item.id);
    try {
      const { data } = await digitalLibraryAPI.createDownload(item.id);
      const link = document.createElement('a');
      link.href = data.url;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setItems(current => current.map(entry => entry.id === item.id ? {
        ...entry,
        downloadCount: entry.downloadCount + 1,
        remainingDownloads: Math.max(entry.remainingDownloads - 1, 0),
      } : entry));
      toast.success('Your secure download has started');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not prepare the download');
    } finally {
      setActiveDownload('');
    }
  };

  const downloadLicense = async item => {
    try {
      const { data } = await digitalLibraryAPI.downloadLicense(item.id);
      const filename = `${item.artwork.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-license.html`;
      downloadBlob(data, filename);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not download the licence');
    }
  };

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader className="animate-spin text-amber-700"/></div>;

  return (
    <div>
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs uppercase tracking-[0.2em] text-amber-700">Secure ownership</p><h2 className="mt-2 text-3xl font-serif text-stone-900">My Digital Collection</h2><p className="mt-2 text-sm text-stone-500">Purchased masters, licence certificates, editions, and download history.</p></div>
        <div className="inline-flex items-center gap-2 text-xs text-stone-500"><LockKeyhole size={15}/> Links expire after 10 minutes</div>
      </div>

      {items.length ? <div className="grid gap-5 lg:grid-cols-2">{items.map(item => (
        <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="aspect-[16/10] bg-stone-100">{item.artwork.previewUrl ? <img src={item.artwork.previewUrl} alt={item.artwork.title} className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center"><Image className="text-stone-300" size={42}/></div>}</div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-serif text-stone-900">{item.artwork.title}</h3><p className="mt-1 text-xs text-stone-500">Order #{item.orderNumber}{item.editionNumber ? ` · Edition ${item.editionNumber} of ${item.editionSize}` : ''}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"><ShieldCheck size={13}/> {item.licenseType === 'COMMERCIAL_USE' ? 'Commercial' : 'Personal'}</span></div>
            <div className="my-5 grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4 text-sm"><div><p className="text-xs uppercase text-stone-400">File</p><p className="mt-1 font-medium">{item.format || 'Image'} · {formatBytes(item.bytes)}</p></div><div><p className="text-xs uppercase text-stone-400">Downloads</p><p className="mt-1 font-medium">{item.remainingDownloads} of {item.downloadLimit} remaining</p></div></div>
            {item.revoked ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Download access is currently unavailable.</p> : <div className="grid grid-cols-2 gap-3"><button onClick={() => downloadArtwork(item)} disabled={!item.remainingDownloads || activeDownload === item.id} className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">{activeDownload === item.id ? <Loader size={16} className="animate-spin"/> : <Download size={16}/>} Download</button><button onClick={() => downloadLicense(item)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700"><FileText size={16}/> Licence</button></div>}
            <Link to={item.verificationPath} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600"><ShieldCheck size={15}/> Verify certificate</Link>
          </div>
        </article>
      ))}</div> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center"><Image size={42} className="mx-auto text-stone-300"/><h3 className="mt-4 text-xl font-serif text-stone-900">Your digital collection is waiting</h3><p className="mx-auto mt-2 max-w-md text-sm text-stone-500">Digital artwork appears here automatically after Paystack confirms your purchase.</p></div>}
    </div>
  );
}
