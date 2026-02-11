// client/src/pages/About.jsx
import { motion } from 'framer-motion';

const About = () => {
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
            About the Atelier
          </h1>
          <div className="h-px bg-gradient-to-r from-transparent via-amber-600/30 to-transparent max-w-xs mx-auto" />
        </div>
      </section>

      {/* Content */}
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
                alt="The Artist"
                className="w-full h-auto"
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
                <p>
                  Welcome to Citadel, where art meets passion. As a fine artist, 
                  I specialize in creating unique pieces that capture emotion and beauty 
                  in their purest forms.
                </p>
                <p>
                  Each artwork in my collection is a journey—a careful balance of 
                  technique, intuition, and the ineffable spark that transforms paint 
                  and canvas into something that speaks to the soul.
                </p>
                <p>
                  My work explores themes of nature, emotion, and the human experience, 
                  rendered through a variety of mediums including oil, watercolor, and 
                  mixed media.
                </p>
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
              { title: 'Authenticity', desc: 'Every piece is an original work, created with intention and integrity.' },
              { title: 'Craftsmanship', desc: 'Mastery of technique combined with artistic vision.' },
              { title: 'Connection', desc: 'Art that resonates and creates meaningful dialogue.' },
            ].map((value, index) => (
              <div key={index} className="text-center p-8 border border-stone-200">
                <h3 
                  className="text-xl text-stone-900 mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {value.title}
                </h3>
                <p className="text-stone-600">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;