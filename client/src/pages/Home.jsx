// client/src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { getFeaturedArtworks } from '../data/sampleArtworks';

const Home = () => {
  const featuredWorks = getFeaturedArtworks();
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 500], [0, -50]);

  return (
    <div className="bg-luxury-cream">
      {/* Hero Section - Refined Luxury */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax Background */}
        <motion.div 
          style={{ y: heroParallax }}
          className="absolute inset-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: 'url(https://images.unsplash.com/photo-1578662996442-48f60103fc81?w=1920&h=1080&fit=crop)',
              filter: 'brightness(0.4) contrast(1.1)'
            }}
          />
        </motion.div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-charcoal/40 via-transparent to-luxury-charcoal/60" />
        
        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Subtitle */}
            <p className="font-sans text-xs tracking-luxury uppercase text-luxury-champagne mb-8">
              Exclusive Fine Art Collection
            </p>
            
            {/* Main Title */}
            <h1 className="font-display text-display-lg md:text-[5.5rem] lg:text-[7rem] 
                         text-white leading-[0.9] mb-8">
              CITADEL
            </h1>
            
            {/* Tagline */}
            <p className="font-heading text-xl md:text-2xl text-luxury-cream/90 
                       font-light italic mb-12 max-w-2xl mx-auto">
              Where Artistry Meets Timeless Elegance
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/gallery" 
                className="btn-luxury group"
              >
                <span>Explore Collection</span>
                <ArrowRight 
                  size={16} 
                  className="ml-2 transition-transform duration-300 group-hover:translate-x-1" 
                />
              </Link>
              <Link 
                to="/commission" 
                className="btn-luxury-outline"
              >
                <span>Commission Artwork</span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator - Elegant */}
        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-luxury-champagne to-transparent" />
        </motion.div>
      </section>

      {/* Introduction Section - Editorial Style */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="luxury-subheading mb-6">The Atelier</p>
              <h2 className="font-display text-display mb-8 text-luxury-charcoal">
                Curated with
                <span className="block text-luxury-gold">Distinction</span>
              </h2>
              <p className="luxury-paragraph mb-6">
                Each piece in the Citadel collection represents a convergence of technical mastery 
                and emotional depth, carefully selected to resonate with the discerning collector.
              </p>
              <p className="luxury-paragraph mb-8">
                Our atelier celebrates the timeless dialogue between artist and medium, 
                presenting works that transcend mere decoration to become heirlooms of tomorrow.
              </p>
              <Link 
                to="/about" 
                className="inline-flex items-center font-sans text-xs tracking-luxury 
                         uppercase text-luxury-bronze hover:text-luxury-gold transition-colors duration-300"
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
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=1000&fit=crop"
                  alt="Atelier"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Decorative frame */}
              <div className="absolute inset-4 border border-luxury-gold/30 pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Collection - Gallery Style */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="luxury-subheading mb-4">Featured Works</p>
            <h2 className="font-display text-display text-luxury-charcoal mb-6">
              The Signature Collection
            </h2>
            <div className="luxury-divider max-w-xs mx-auto" />
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
                  <div className="relative overflow-hidden bg-luxury-bone mb-6">
                    <div className="aspect-[3/4]">
                      <img
                        src={work.images[0]}
                        alt={work.title}
                        className="w-full h-full object-cover transition-transform duration-700 
                                 group-hover:scale-105"
                      />
                    </div>
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-luxury-charcoal/0 group-hover:bg-luxury-charcoal/40 
                                  transition-all duration-500 flex items-end">
                      <div className="w-full p-6 translate-y-full group-hover:translate-y-0 
                                    transition-transform duration-500">
                        <p className="font-sans text-xs tracking-luxury uppercase text-white/90 mb-2">
                          {work.medium}
                        </p>
                        <p className="font-body text-white/90">
                          {work.size}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    {work.status === 'SOLD' && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-luxury-charcoal/90 text-white px-3 py-1 
                                       font-sans text-[10px] tracking-luxury uppercase">
                          Private Collection
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Artwork Details */}
                  <div className="text-center">
                    <h3 className="font-heading text-heading text-luxury-charcoal mb-2 
                                 group-hover:text-luxury-gold transition-colors duration-300">
                      {work.title}
                    </h3>
                    <p className="font-sans text-sm text-luxury-bronze">
                      {work.status === 'SOLD' 
                        ? 'Acquired' 
                        : `${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(work.price)}`
                      }
                    </p>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <Link to="/gallery" className="btn-luxury-gold">
              <span>View Full Collection</span>
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Services - Minimal Luxury */}
      <section className="py-24 bg-luxury-bone">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: 'Curated Collection',
                description: 'Exceptional artworks selected for the discerning collector',
                icon: '01'
              },
              {
                title: 'Bespoke Commissions',
                description: 'Custom pieces tailored to your vision and space',
                icon: '02'
              },
              {
                title: 'White Glove Service',
                description: 'Personalized consultation and worldwide delivery',
                icon: '03'
              }
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <span className="font-display text-5xl text-luxury-gold/30 mb-6 block">
                  {service.icon}
                </span>
                <h3 className="font-heading text-heading-lg text-luxury-charcoal mb-4">
                  {service.title}
                </h3>
                <p className="luxury-paragraph">
                  {service.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} className="text-luxury-gold fill-luxury-gold" />
            ))}
          </div>
          <blockquote className="font-heading text-2xl text-luxury-charcoal mb-8 italic">
            "The Citadel collection represents the pinnacle of contemporary fine art. 
            Each piece is a masterwork that transforms our living space into a gallery of distinction."
          </blockquote>
          <cite className="font-sans text-xs tracking-luxury uppercase text-luxury-bronze">
            — Eleanor Whitmore, Private Collector
          </cite>
        </div>
      </section>

      {/* CTA Section - Refined */}
      <section className="py-32 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1920&h=600&fit=crop)',
            filter: 'brightness(0.3)'
          }}
        />
        <div className="absolute inset-0 bg-luxury-charcoal/60" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p className="font-sans text-xs tracking-luxury uppercase text-luxury-champagne mb-6">
            Bespoke Artistry
          </p>
          <h2 className="font-display text-display text-white mb-8">
            Commission Your
            <span className="block text-luxury-gold">Masterpiece</span>
          </h2>
          <p className="font-body text-lg text-white/90 mb-12 max-w-2xl mx-auto">
            Collaborate with our artists to create a unique piece that reflects 
            your personal aesthetic and complements your collection.
          </p>
          <Link to="/commission" className="btn-luxury-gold">
            <span>Begin Your Commission</span>
            <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;