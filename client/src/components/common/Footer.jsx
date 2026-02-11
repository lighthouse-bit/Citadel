// client/src/components/common/Footer.jsx
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Mail, MapPin, Phone } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';

const Footer = () => {
  const { settings } = useSettings();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-stone-900 text-stone-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 
              className="text-3xl text-white mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {settings.siteName}
            </h3>
            <p 
              className="text-xs tracking-widest text-amber-500 mb-6"
              style={{ letterSpacing: '0.2em' }}
            >
              {settings.siteTagline}
            </p>
            <p className="text-stone-400 max-w-md leading-relaxed mb-8">
              {settings.artistBio.length > 200 
                ? settings.artistBio.substring(0, 200) + '...' 
                : settings.artistBio}
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              {settings.socialInstagram && (
                <a 
                  href={settings.socialInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 border border-stone-700 flex items-center justify-center 
                           text-stone-400 hover:text-amber-500 hover:border-amber-500 transition-colors"
                >
                  <Instagram size={18} strokeWidth={1.5} />
                </a>
              )}
              {settings.socialTwitter && (
                <a 
                  href={settings.socialTwitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 border border-stone-700 flex items-center justify-center 
                           text-stone-400 hover:text-amber-500 hover:border-amber-500 transition-colors"
                >
                  <Twitter size={18} strokeWidth={1.5} />
                </a>
              )}
              {settings.socialFacebook && (
                <a 
                  href={settings.socialFacebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 border border-stone-700 flex items-center justify-center 
                           text-stone-400 hover:text-amber-500 hover:border-amber-500 transition-colors"
                >
                  <Facebook size={18} strokeWidth={1.5} />
                </a>
              )}
              {settings.contactEmail && (
                <a 
                  href={`mailto:${settings.contactEmail}`}
                  className="w-10 h-10 border border-stone-700 flex items-center justify-center 
                           text-stone-400 hover:text-amber-500 hover:border-amber-500 transition-colors"
                >
                  <Mail size={18} strokeWidth={1.5} />
                </a>
              )}
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
                { label: 'Contact', path: '/contact' },
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
              {settings.address && (
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-stone-400 text-sm">
                    {settings.address}
                  </span>
                </li>
              )}
              {settings.phone && (
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-amber-500 flex-shrink-0" />
                  <a 
                    href={`tel:${settings.phone.replace(/\D/g, '')}`}
                    className="text-stone-400 hover:text-amber-500 transition-colors text-sm"
                  >
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings.contactEmail && (
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-amber-500 flex-shrink-0" />
                  <a 
                    href={`mailto:${settings.contactEmail}`} 
                    className="text-stone-400 hover:text-amber-500 transition-colors text-sm"
                  >
                    {settings.contactEmail}
                  </a>
                </li>
              )}
            </ul>

            {/* Commission Status */}
            <div className="mt-6 pt-6 border-t border-stone-800">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${settings.commissionOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-stone-400">
                  Commissions {settings.commissionOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              {settings.commissionOpen && settings.commissionWaitTime && (
                <p className="text-xs text-stone-500 mt-1 ml-4">
                  Current wait: {settings.commissionWaitTime}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-stone-500 text-sm">
              © {currentYear} {settings.siteName}. All rights reserved.
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