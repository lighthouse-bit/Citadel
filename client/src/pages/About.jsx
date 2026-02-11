// client/src/pages/About.jsx
const About = () => {
  return (
    <div className="pt-20 min-h-screen">
      <section className="py-16 bg-citadel-charcoal">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">
            About the Artist
          </h1>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="prose prose-lg prose-invert mx-auto">
            <p className="text-gray-300 leading-relaxed">
              Welcome to Citadel, where art meets passion. As a fine artist, 
              I specialize in creating unique pieces that capture emotion and beauty.
            </p>
            {/* Add more content as needed */}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;