// client/src/pages/Contact.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, Send, Loader, Instagram, Twitter, Facebook } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import toast from 'react-hot-toast';

const Contact = () => {
  const { settings } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p 
            className="text-xs tracking-widest uppercase text-amber-700 mb-4"
            style={{ letterSpacing: '0.2em' }}
          >
            Get in Touch
          </p>
          <h1 
            className="text-4xl md:text-5xl text-stone-900 mb-6"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}
          >
            Contact Us
          </h1>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Have a question or interested in a piece? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 
                className="text-2xl text-stone-900 mb-6"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Contact Information
              </h2>
              
              <div className="space-y-6 mb-10">
                {settings.address && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin size={20} className="text-amber-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-stone-900 mb-1">Address</h3>
                      <p className="text-stone-600">{settings.address}</p>
                    </div>
                  </div>
                )}
                
                {settings.phone && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone size={20} className="text-amber-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-stone-900 mb-1">Phone</h3>
                      <a 
                        href={`tel:${settings.phone.replace(/\D/g, '')}`}
                        className="text-stone-600 hover:text-amber-700 transition-colors"
                      >
                        {settings.phone}
                      </a>
                    </div>
                  </div>
                )}
                
                {settings.contactEmail && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail size={20} className="text-amber-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-stone-900 mb-1">Email</h3>
                      <a 
                        href={`mailto:${settings.contactEmail}`}
                        className="text-stone-600 hover:text-amber-700 transition-colors"
                      >
                        {settings.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="border-t border-stone-200 pt-8">
                <h3 className="font-medium text-stone-900 mb-4">Follow Us</h3>
                <div className="flex gap-4">
                  {settings.socialInstagram && (
                    <a
                      href={settings.socialInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 border border-stone-300 rounded-full flex items-center justify-center
                               text-stone-600 hover:text-amber-700 hover:border-amber-500 transition-colors"
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                  {settings.socialTwitter && (
                    <a
                      href={settings.socialTwitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 border border-stone-300 rounded-full flex items-center justify-center
                               text-stone-600 hover:text-amber-700 hover:border-amber-500 transition-colors"
                    >
                      <Twitter size={20} />
                    </a>
                  )}
                  {settings.socialFacebook && (
                    <a
                      href={settings.socialFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 border border-stone-300 rounded-full flex items-center justify-center
                               text-stone-600 hover:text-amber-700 hover:border-amber-500 transition-colors"
                    >
                      <Facebook size={20} />
                    </a>
                  )}
                </div>
              </div>

              {/* Commission Status */}
              <div className="mt-8 p-6 bg-stone-100 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${settings.commissionOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium text-stone-900">
                    Commissions {settings.commissionOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                {settings.commissionOpen && settings.commissionWaitTime && (
                  <p className="text-sm text-stone-600">
                    Current wait time: {settings.commissionWaitTime}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8">
                <h2 
                  className="text-2xl text-stone-900 mb-6"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Send a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm text-stone-600 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg
                               focus:outline-none focus:border-amber-500 text-stone-900"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-stone-600 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg
                               focus:outline-none focus:border-amber-500 text-stone-900"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-stone-600 mb-2">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg
                               focus:outline-none focus:border-amber-500 text-stone-900"
                      placeholder="What is this regarding?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-stone-600 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg
                               focus:outline-none focus:border-amber-500 text-stone-900 resize-none"
                      placeholder="Your message..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-stone-900 text-white rounded-lg font-medium
                             hover:bg-stone-800 transition-colors flex items-center justify-center gap-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;