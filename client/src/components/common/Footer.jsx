// client/src/components/common/Footer.jsx
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-stone-900 text-stone-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 
              className="text-3xl text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              CITADEL
            </h3>
            <p 
              className="text-xs tracking-widest text-amber-500 mb-6"
              style={{ letterSpacing: '0.2em' }}
            >
              FINE ART ATELIER
            </p>
            <p className="text-stone-400 max-w-md leading-relaxed mb-8">
              Curating exceptional fine art for discerning collectors. Each piece in our 
              collection represents a convergence of technical mastery and emotional depth.
            </p>
            {/* Social Links */}
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="w-10 h-10 border border-stone-700 flex items-center justify-center 
                         text-stone-400 hover:text-amber-500 hover:border-amber-500 transition-colors"
              >
                <Instagram size={18} strokeWidth={1.5} />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 border border-stone-700 flex items-center justify-center 
                         text-stone-400 hover:text-amber-500 hover:border-amber-500 transition-colors"
              >
                <Twitter size={18} strokeWidth={1.5} />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 border border-stone-700 flex items-center justify-center 
                         text-stone-400 hover:text-amber-500 hover:border-amber-500 transition-colors"
              >
                <Mail size={18} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 
              className="text-xs tracking-widest text-white mb-6"
              style={{ letterSpacing: '0.15em' }}
            >
              EXPLORE
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Gallery', path: '/gallery' },
                { label: 'Collection', path: '/shop' },
                { label: 'Bespoke Commissions', path: '/commission' },
                { label: 'About the Atelier', path: '/about' },
              ].map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-stone-400 hover:text-amber-500 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 
              className="text-xs tracking-widest text-white mb-6"
              style={{ letterSpacing: '0.15em' }}
            >
              CONTACT
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-stone-400 text-sm">
                  123 Art District<br />
                  New York, NY 10001
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-amber-500 flex-shrink-0" />
                <span className="text-stone-400 text-sm">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-amber-500 flex-shrink-0" />
                <a 
                  href="mailto:inquiries@citadel-art.com" 
                  className="text-stone-400 hover:text-amber-500 transition-colors text-sm"
                >
                  inquiries@citadel-art.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-stone-500 text-sm">
              © {currentYear} Citadel Fine Art. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link to="/privacy" className="text-stone-500 hover:text-stone-300 text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-stone-500 hover:text-stone-300 text-sm transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;