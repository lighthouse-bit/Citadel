// client/src/pages/About.jsx
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';

const About = () => {
  const { settings } = useSettings();

  return (
    <div className="pt-20 min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p 
            className="text-xs tracking-widest uppercase text-amber-700 mb-4"
            style={{ letterSpacing: '0.2em' }}
          >
            The Artist
          </p>
          <h1 
            className="text-4xl md:text-5xl text-stone-900 mb-6"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            About {settings.artistName}
          </h1>
          <div className="h-px bg-gradient-to-r from-transparent via-amber-600/30 to-transparent max-w-xs mx-auto" />
        </div>
      </section>

      {/* Artist Bio Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <img
                src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=1000&fit=crop"
                alt={settings.artistName}
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p 
                className="text-xs tracking-widest uppercase text-amber-700 mb-4"
                style={{ letterSpacing: '0.2em' }}
              >
                Our Philosophy
              </p>
              <h2 
                className="text-3xl text-stone-900 mb-6"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
              >
                A Passion for Exceptional Art
              </h2>
              <div className="space-y-4 text-stone-600 leading-relaxed">
                {settings.artistBio.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {/* Contact Info */}
              <div className="mt-8 pt-8 border-t border-stone-200">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Get in Touch</h3>
                <div className="space-y-3">
                  {settings.address && (
                    <div className="flex items-center gap-3 text-stone-600">
                      <MapPin size={18} className="text-amber-600" />
                      <span>{settings.address}</span>
                    </div>
                  )}
                  {settings.phone && (
                    <div className="flex items-center gap-3 text-stone-600">
                      <Phone size={18} className="text-amber-600" />
                      <a href={`tel:${settings.phone.replace(/\D/g, '')}`} className="hover:text-amber-600">
                        {settings.phone}
                      </a>
                    </div>
                  )}
                  {settings.contactEmail && (
                    <div className="flex items-center gap-3 text-stone-600">
                      <Mail size={18} className="text-amber-600" />
                      <a href={`mailto:${settings.contactEmail}`} className="hover:text-amber-600">
                        {settings.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 
              className="text-3xl text-stone-900"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
            >
              Our Values
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Authenticity', 
                desc: 'Every piece is an original work, created with intention and integrity.' 
              },
              { 
                title: 'Craftsmanship', 
                desc: 'Mastery of technique combined with artistic vision.' 
              },
              { 
                title: 'Connection', 
                desc: 'Art that resonates and creates meaningful dialogue.' 
              },
            ].map((value, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-8 border border-stone-200 rounded-lg hover:border-amber-500/50 transition-colors"
              >
                <h3 
                  className="text-xl text-stone-900 mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {value.title}
                </h3>
                <p className="text-stone-600">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-stone-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 
            className="text-3xl text-stone-900 mb-6"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            Interested in a Commission?
          </h2>
          <p className="text-stone-600 mb-8">
            {settings.commissionOpen 
              ? `I'm currently accepting commissions with an estimated wait time of ${settings.commissionWaitTime}.`
              : 'Commissions are currently closed. Please check back later or contact me for future availability.'}
          </p>
          <Link
            to={settings.commissionOpen ? '/commission' : '/contact'}
            className="inline-flex items-center justify-center px-8 py-4 
                     bg-stone-900 text-white text-sm uppercase tracking-wider
                     hover:bg-stone-800 transition-colors"
            style={{ letterSpacing: '0.1em' }}
          >
            {settings.commissionOpen ? 'Start Your Commission' : 'Contact Me'}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;