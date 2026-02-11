// client/src/components/common/Footer.jsx
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-citadel-charcoal border-t border-citadel-gold/20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-serif text-citadel-gold mb-4">Citadel</h3>
            <p className="text-gray-400 max-w-md">
              Original fine art pieces crafted with passion. Each artwork tells a unique story,
              bringing emotion and beauty into your space.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {['Gallery', 'Shop', 'Commission', 'About'].map((item) => (
                <li key={item}>
                  <Link 
                    to={`/${item.toLowerCase()}`}
                    className="text-gray-400 hover:text-citadel-gold transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-white font-medium mb-4">Connect</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-citadel-gold transition-colors">
                <Instagram size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-citadel-gold transition-colors">
                <Twitter size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-citadel-gold transition-colors">
                <Mail size={24} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-citadel-gold/20 mt-8 pt-8 text-center text-gray-400">
          <p>© {new Date().getFullYear()} Citadel Art. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;