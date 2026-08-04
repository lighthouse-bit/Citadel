import LegalDocument from '../components/common/LegalDocument';

const sections = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    paragraphs: [
      'Highmarc Art Atelier operates this website and acts as the data controller for personal information collected through it. This notice explains what we collect, why we use it, who may process it for us, and the choices available to you.',
      'We process personal data in accordance with the Nigeria Data Protection Act 2023 and other laws that apply to a particular transaction or customer.',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    items: [
      'Account and identity information, such as your name, email address, phone number, verification status, encrypted password, and Google account identifier when you choose Google sign-in.',
      'Order and delivery information, including billing totals, delivery addresses, shipping selections, transaction references, order history, and customer notes. We do not receive or store your complete payment-card number.',
      'Commission, support, and community information, including reference images, project requirements, messages, reviews, wishlist choices, and communication preferences.',
      'Digital-art records, including the licence selected, edition and certificate identifiers, entitlement status, download count, and download timestamps.',
      'Technical and usage information, such as IP address, browser, device category, user agent, referring page, pages viewed, session identifier, performance information, and interactions with the site.',
    ],
  },
  {
    id: 'how-we-use-information',
    title: 'How and why we use information',
    items: [
      'To create and secure accounts, verify email addresses, authenticate users, and provide customer support.',
      'To prepare commissions, process orders, confirm payments, arrange delivery, issue invoices and certificates, and provide protected digital downloads under our contract with you.',
      'To prevent fraud, enforce download and licence limits, protect artwork and accounts, diagnose failures, and maintain audit records based on our legitimate interests and legal obligations.',
      'To measure site performance and understand how the collection is used. Where consent is required for a particular analytics or marketing technology, we rely on that consent.',
      'To send service messages about purchases, commissions, security, or account activity, and—with your choice—to send marketing or wishlist alerts that you can unsubscribe from.',
    ],
  },
  {
    id: 'storage-and-cookies',
    title: 'Browser storage, cookies, and analytics',
    paragraphs: [
      'The site uses browser storage to keep you signed in, preserve a guest cart, remember selected items, and assign a temporary analytics session. Optional Google Analytics may also use cookies or similar technologies when configured. You can clear browser storage and manage cookies through your browser, although blocking essential storage may prevent account or cart features from working.',
      'Our own analytics may record page paths, referrers, events, session identifiers, IP addresses, device categories, and browser information. We use this information to operate, secure, and improve the site rather than to make decisions that produce legal or similarly significant effects about you.',
    ],
  },
  {
    id: 'service-providers',
    title: 'Service providers and disclosures',
    paragraphs: ['We disclose only the information reasonably required for trusted providers to perform services for us. These providers may include:'],
    items: [
      'Paystack for payment processing and fraud prevention; Google for optional account sign-in; and our email provider for transactional and requested marketing messages.',
      'Cloudinary for artwork, commission-reference, support, and protected digital-file hosting; Supabase for database infrastructure; Vercel for backend hosting; and Hostinger for frontend hosting.',
      'Shipping carriers and fulfilment partners where needed to deliver physical artwork.',
      'Professional advisers, regulators, courts, or law-enforcement bodies where disclosure is required by law or necessary to establish, exercise, or defend legal rights.',
    ],
  },
  {
    id: 'international-transfers',
    title: 'International processing',
    paragraphs: ['Some providers may store or process information outside Nigeria. Where personal data is transferred internationally, we use appropriate contractual, technical, and legal safeguards required by applicable law and consider the protection available in the destination.'],
  },
  {
    id: 'retention',
    title: 'How long we keep information',
    paragraphs: ['We retain information only for as long as reasonably necessary for the purposes described above. Account information is generally kept while the account is active; order, payment, licence, certificate, audit, and tax records may be retained longer to meet contractual, fraud-prevention, accounting, or legal obligations. Commission reference files and support records are reviewed and deleted or anonymised when no longer needed.'],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: ['We use access controls, encrypted connections, password hashing, signed payment verification, authenticated file delivery, expiring download links, audit logging, and restricted administrative routes. No online system is completely secure, so you should use a unique password and promptly tell us if you believe your account has been compromised.'],
  },
  {
    id: 'your-rights',
    title: 'Your privacy rights',
    paragraphs: ['Subject to applicable law and identity verification, you may request information about our processing and ask to access, correct, delete, restrict, or receive a portable copy of your personal data. You may object to certain processing, withdraw consent without affecting earlier lawful processing, and unsubscribe from marketing messages. Some requests may be limited where records must be retained by law or to protect legal rights.'],
    items: [
      'Send a request through the contact details below and describe the account or information concerned.',
      'You may lodge a complaint with the Nigeria Data Protection Commission if you believe your data-protection rights have not been respected.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    paragraphs: ['The store and commission services are not directed to children, and customers must have legal capacity to enter a purchase agreement. We do not knowingly collect personal data from a child without the authorisation required by applicable law.'],
  },
  {
    id: 'updates-and-contact',
    title: 'Updates and contact',
    paragraphs: ['We may update this notice when our services, providers, or legal obligations change. The effective date at the top identifies the current version. Material changes will be communicated through the site or another appropriate channel. Contact us to exercise a right, ask a privacy question, or report a concern.'],
  },
];

export default function Privacy() {
  return <LegalDocument eyebrow="Your information" title="Privacy Policy" summary="How Highmarc collects, uses, protects, and shares information when you browse, purchase artwork, request a commission, or manage your account." effectiveDate="4 August 2026" sections={sections}/>;
}
