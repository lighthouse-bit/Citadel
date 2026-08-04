import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Download, Layers3, Loader, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import ArtworkImage from '../components/common/ArtworkImage';
import { artworksAPI } from '../services/api';

const benefits = [
  { icon: ShieldCheck, title: 'Secure delivery', text: 'Your high-resolution master is delivered through a private, expiring download link.' },
  { icon: BadgeCheck, title: 'Named certificate', text: 'Every purchase includes a licence certificate tied to your account and order.' },
  { icon: Layers3, title: 'Numbered editions', text: 'Limited releases display remaining availability and record your unique edition number.' },
];

const remaining = artwork => artwork.editionSize == null
  ? null
  : Math.max(artwork.editionSize - artwork.editionsIssued - artwork.editionsReserved, 0);

export default function DigitalArt() {
  const [artworks, setArtworks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (page = 1) => {
    page === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const { data } = await artworksAPI.getAll({ productType: 'DIGITAL', status: 'AVAILABLE', sort: 'createdAt', order: 'desc', page, limit: 12 });
      const availableReleases = data.artworks.filter(item => remaining(item) !== 0);
      setArtworks(current => page === 1 ? availableReleases : [...current, ...availableReleases.filter(item => !current.some(existing => existing.id === item.id))]);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load the digital collection');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { load(); }, []);

  return <>
    <SEO title="Collect Digital Art" description="Collect secure high-resolution digital artwork with personal or commercial licences, numbered editions, and downloadable certificates." keywords="buy digital art, licensed digital artwork, limited digital editions, commercial art licence" url="/digital-art" />

    <div className="min-h-screen bg-[#f8f6f1] pt-20 text-stone-900">
      <section className="relative overflow-hidden border-b border-stone-800 bg-stone-950 text-white">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_75%_30%,#b45309_0,transparent_38%)]"/>
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
            <p className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-amber-400"><Sparkles size={15}/> Digital atelier</p>
            <h1 className="max-w-3xl font-serif text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">Art made to live beyond the canvas.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-stone-300 sm:text-lg">Collect high-resolution digital works with clear usage rights, secure delivery, and a permanent certificate in your Highmarc account.</p>
            <a href="#digital-collection" className="mt-9 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-stone-950 transition hover:bg-amber-400">Explore releases <ArrowRight size={17}/></a>
          </motion.div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15">
            <div className="bg-stone-950/80 p-6"><p className="text-3xl font-serif">{pagination.total}</p><p className="mt-2 text-xs uppercase tracking-wider text-stone-400">Available releases</p></div>
            <div className="bg-stone-950/80 p-6"><p className="text-3xl font-serif">2</p><p className="mt-2 text-xs uppercase tracking-wider text-stone-400">Licence options</p></div>
            <div className="col-span-2 bg-stone-950/80 p-6"><div className="flex items-center gap-3"><Download className="text-amber-400"/><div><p className="font-medium">Available after payment</p><p className="mt-1 text-sm text-stone-400">No shipping wait. Access appears in your digital collection.</p></div></div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-10 md:grid-cols-3">
        {benefits.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-2xl border border-stone-200 bg-white p-6"><Icon className="text-amber-700" size={22}/><h2 className="mt-4 font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-500">{text}</p></div>)}
      </section>

      <section id="digital-collection" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-14 md:py-20">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-amber-700">Current releases</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">The digital collection</h2></div><p className="max-w-md text-sm leading-6 text-stone-500">Choose a work to compare its personal and commercial licence options before adding it to your collection.</p></div>

        {loading ? <div className="grid min-h-80 place-items-center"><Loader className="animate-spin text-amber-700" size={30}/></div> : artworks.length ? <>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{artworks.map((artwork, index) => {
            const editionsLeft = remaining(artwork);
            return <motion.article key={artwork.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index, 5) * 0.05 }} className="group">
              <Link to={`/artwork/${artwork.id}`} className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-stone-200">
                <ArtworkImage src={artwork.images?.[0]?.url} alt={artwork.title} className="h-full transition duration-700 group-hover:scale-[1.025]" sizes="(max-width: 639px) calc(100vw - 3rem), (max-width: 1023px) 45vw, 390px" loading={index < 3 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'}/>
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4"><span className="rounded-full bg-stone-950/85 px-3 py-1.5 text-[10px] uppercase tracking-wider text-white backdrop-blur">Digital edition</span>{editionsLeft != null && <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-900 backdrop-blur">{editionsLeft} of {artwork.editionSize} left</span>}</div>
              </Link>
              <div className="pt-5"><div className="flex items-start justify-between gap-4"><div><Link to={`/artwork/${artwork.id}`} className="font-serif text-2xl transition hover:text-amber-700">{artwork.title}</Link><p className="mt-1 text-xs uppercase tracking-wider text-stone-400">{artwork.medium || 'Digital artwork'}{artwork.year ? ` · ${artwork.year}` : ''}</p></div><p className="whitespace-nowrap text-sm font-medium">From ${Number(artwork.price).toLocaleString()}</p></div><div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4"><p className="text-xs text-stone-500">{artwork.commercialLicenseEnabled ? 'Personal + commercial licences' : 'Personal-use licence'}</p><Link to={`/artwork/${artwork.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">Choose licence <ArrowRight size={14}/></Link></div></div>
            </motion.article>;
          })}</div>
          {pagination.page < pagination.pages && <div className="mt-14 text-center"><button onClick={() => load(pagination.page + 1)} disabled={loadingMore} className="inline-flex min-w-44 items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium disabled:opacity-50">{loadingMore && <Loader size={16} className="animate-spin"/>} Load more</button></div>}
        </> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><Download className="mx-auto text-stone-300" size={42}/><h3 className="mt-4 font-serif text-2xl">New digital releases are being prepared</h3><p className="mx-auto mt-2 max-w-md text-sm text-stone-500">Explore the full collection now and return soon for secure digital editions.</p><Link to="/shop" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-amber-700">Browse all artwork <ArrowRight size={15}/></Link></div>}
      </section>

      <section className="bg-white py-16 md:py-24"><div className="mx-auto max-w-7xl px-6"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-xs uppercase tracking-[0.24em] text-amber-700">Licence guide</p><h2 className="mt-3 font-serif text-4xl">Buy the rights you actually need.</h2><p className="mt-5 text-sm leading-7 text-stone-500">The artwork page shows the exact terms before purchase. Your selected terms are preserved in the certificate issued with your order.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-stone-200 p-7"><Download className="text-amber-700"/><h3 className="mt-5 text-xl font-medium">Personal use</h3><p className="mt-3 text-sm leading-6 text-stone-500">For private display on your devices and personal prints. The original file cannot be resold or shared.</p></div><div className="rounded-2xl border border-stone-900 bg-stone-950 p-7 text-white"><BriefcaseBusiness className="text-amber-400"/><h3 className="mt-5 text-xl font-medium">Commercial use</h3><p className="mt-3 text-sm leading-6 text-stone-400">For eligible works used in your own business projects and marketing, under the certificate’s stated terms.</p></div></div></div></div></section>
    </div>
  </>;
}
