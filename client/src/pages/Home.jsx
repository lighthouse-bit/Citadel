// client/src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { getFeaturedArtworks } from '../data/sampleArtworks';
import { useSettings } from '../hooks/useSettings';

const Home = () => {
  const featuredWorks = getFeaturedArtworks();
  const { settings } = useSettings();

  return (
    <div className="bg-stone-50">
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1578662996442-48f60103fc81?w=1920&h=1080&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        >
          <p 
            className="text-amber-400 mb-8 font-sans text-sm"
            style={{ letterSpacing: '0.25em', textTransform: 'uppercase' }}
          >
            {settings.siteTagline}
          </p>
          
          <h1 
            className="text-white mb-8"
            style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontWeight: 400,
              fontSize: 'clamp(3rem, 10vw, 8rem)',
              lineHeight: 1,
            }}
          >
            {settings.heroTitle || settings.siteName}
          </h1>
          
          <p 
            className="text-stone-300 mb-12 max-w-2xl mx-auto text-xl md:text-2xl"
            style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}
          >
            {settings.heroSubtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/gallery" 
              className="inline-flex items-center justify-center px-10 py-4 
                       bg-white text-stone-900 text-xs font-medium uppercase
                       hover:bg-amber-400 transition-all duration-300"
              style={{ letterSpacing: '0.15em' }}
            >
              Explore Collection
              <ArrowRight size={16} className="ml-2" />
            </Link>
            <Link 
              to="/commission" 
              className="inline-flex items-center justify-center px-10 py-4 
                       bg-transparent text-white text-xs font-medium uppercase
                       border border-white/50 hover:border-amber-400 hover:text-amber-400
                       transition-all duration-300"
              style={{ letterSpacing: '0.15em' }}
            >
              {settings.commissionOpen ? 'Commission Artwork' : 'Contact Us'}
            </Link>
          </div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-amber-400/50 to-transparent" />
        </motion.div>
      </section>

      {/* Rest of the Home page content... */}
      {/* (Keep the existing sections: Introduction, Featured Works, Services, Testimonial, CTA) */}
      
      {/* Introduction Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p 
                className="text-amber-700 mb-6 font-sans text-xs"
                style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
              >
                The Atelier
              </p>
              <h2 
                className="text-stone-900 mb-8"
                style={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontWeight: 400,
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  lineHeight: 1.2,
                }}
              >
                Curated with
                <span className="block text-amber-700">Distinction</span>
              </h2>
              <p className="text-stone-600 mb-6 leading-relaxed">
                {settings.artistBio.substring(0, 300)}
                {settings.artistBio.length > 300 ? '...' : ''}
              </p>
              <Link 
                to="/about" 
                className="inline-flex items-center text-amber-700 hover:text-amber-600 
                         transition-colors duration-300 font-sans text-xs"
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
              >
                Discover Our Story
                <ArrowRight size={14} className="ml-2" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-[3/4] overflow-hidden bg-stone-200">
                <img
                  src="https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=1000&fit=crop"
                  alt="Atelier"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-4 border border-amber-600/30 pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-24 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p 
              className="text-amber-700 mb-4 font-sans text-xs"
              style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
            >
              Featured Works
            </p>
            <h2 
              className="text-stone-900 mb-6"
              style={{ 
                fontFamily: "'Playfair Display', serif", 
                fontWeight: 400,
                fontSize: 'clamp(2rem, 5vw, 3rem)',
              }}
            >
              The Signature Collection
            </h2>
            <div className="h-px bg-gradient-to-r from-transparent via-amber-600/40 to-transparent max-w-xs mx-auto" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredWorks.slice(0, 6).map((work, index) => (
              <motion.article
                key={work.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="group"
              >
                <Link to={`/artwork/${work.id}`}>
                  <div className="relative overflow-hidden bg-stone-200 mb-6">
                    <div className="aspect-[3/4]">
                      <img
                        src={work.images[0]}
                        alt={work.title}
                        className="w-full h-full object-cover transition-transform duration-700 
                                 group-hover:scale-105"
                      />
                    </div>
                    
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 
                                  transition-all duration-500 flex items-end">
                      <div className="w-full p-6 translate-y-full group-hover:translate-y-0 
                                    transition-transform duration-500">
                        <p className="text-white/90 mb-2 text-xs uppercase tracking-wider">
                          {work.medium}
                        </p>
                        <p className="text-white/90">{work.size}</p>
                      </div>
                    </div>
                    
                    {work.status === 'SOLD' && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-stone-900 text-white px-3 py-1 text-xs uppercase tracking-wider">
                          Private Collection
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <h3 
                      className="text-stone-900 mb-2 group-hover:text-amber-700 transition-colors duration-300 text-xl"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {work.title}
                    </h3>
                    <p className="text-amber-700 text-sm font-medium">
                      {work.status === 'SOLD' 
                        ? 'Acquired' 
                        : new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                          }).format(work.price)
                      }
                    </p>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <Link 
              to="/gallery" 
              className="inline-flex items-center justify-center px-12 py-4 
                       bg-amber-600 text-white text-xs font-medium uppercase
                       hover:bg-amber-700 transition-all duration-300"
              style={{ letterSpacing: '0.15em' }}
            >
              View Full Collection
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-32 relative overflow-hidden"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1920&h=600&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-black/75" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p 
            className="text-amber-400 mb-6 font-sans text-xs"
            style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}
          >
            {settings.commissionOpen ? 'Bespoke Artistry' : 'Get in Touch'}
          </p>
          <h2 
            className="text-white mb-8"
            style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontWeight: 400,
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: 1.2,
            }}
          >
            {settings.commissionOpen ? (
              <>
                Commission Your
                <span className="block text-amber-400">Masterpiece</span>
              </>
            ) : (
              <>
                Let's Create
                <span className="block text-amber-400">Together</span>
              </>
            )}
          </h2>
          <p className="text-stone-300 mb-12 max-w-2xl mx-auto leading-relaxed text-lg">
            {settings.commissionOpen 
              ? `Collaborate with me to create a unique piece that reflects your personal aesthetic. Current wait time: ${settings.commissionWaitTime}.`
              : 'Commissions are currently closed, but feel free to reach out for inquiries about future availability.'}
          </p>
          <Link 
            to={settings.commissionOpen ? '/commission' : '/contact'} 
            className="inline-flex items-center justify-center px-12 py-4 
                     bg-amber-500 text-stone-900 text-xs font-medium uppercase
                     hover:bg-amber-400 transition-all duration-300"
            style={{ letterSpacing: '0.15em' }}
          >
            {settings.commissionOpen ? 'Begin Your Commission' : 'Contact Me'}
            <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;