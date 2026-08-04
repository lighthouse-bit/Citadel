import LegalDocument from '../components/common/LegalDocument';

const sections = [
  {
    id: 'agreement',
    title: 'Agreement and eligibility',
    paragraphs: ['These Terms govern your use of the Highmarc Art Atelier website and your purchase of physical artwork, commissions, and digital artwork licences. By using the services or placing an order, you agree to these Terms and the policies referenced here. You must be at least 18 years old, or otherwise have legal capacity and any required guardian authorisation, to make a purchase.'],
  },
  {
    id: 'accounts',
    title: 'Accounts and security',
    paragraphs: ['You must provide accurate information and keep it current. You are responsible for activity performed through your account and for protecting your password and devices. You may not share account access, impersonate another person, interfere with the service, evade security controls, or use the site for unlawful activity. We may restrict access where reasonably necessary to protect customers, artwork, or the service.'],
  },
  {
    id: 'orders-and-payment',
    title: 'Orders, prices, and payment',
    paragraphs: ['Artwork availability, prices, currency, taxes, delivery charges, licence selection, and the final order total are shown before payment. Submitting an order is an offer to purchase; acceptance occurs when payment is confirmed and we issue an order confirmation or digital entitlement. We may reject or cancel an order affected by a clear pricing error, suspected fraud, unavailable work, or technical failure and will arrange any payment reversal that is due. Payments are processed by Paystack under its own terms.'],
  },
  {
    id: 'physical-artwork',
    title: 'Physical artwork and delivery',
    paragraphs: ['Images and dimensions are presented as accurately as reasonably possible, but display colours and handmade details may vary. Delivery estimates are not guarantees and may be affected by carriers, customs, or events outside our reasonable control. The customer is responsible for accurate delivery information and any import duties or taxes not included at checkout. Inspect delivered work promptly and contact us with photographs if it arrives damaged or materially different from the confirmed order.'],
  },
  {
    id: 'commissions',
    title: 'Commissioned artwork',
    paragraphs: ['A commission is governed by the accepted brief, quoted price, payment schedule, estimated deadline, and agreed revision scope shown in your account or communications with us. Work normally begins after the stated deposit is confirmed. Changes outside the accepted brief may affect price and timing. Deposits and completed custom work may be non-refundable to the extent permitted by law because time and materials are reserved specifically for the customer. Any exception or cancellation will be assessed fairly based on work completed and applicable consumer law.'],
  },
  {
    id: 'digital-licences',
    title: 'Digital artwork and licences',
    paragraphs: ['A digital purchase grants the named customer the personal-use or commercial-use licence selected at checkout; ownership of copyright is not transferred. The licence document and certificate issued with the order record the controlling usage terms. Numbered editions are allocated after confirmed payment. Download access is personal, account-bound, limited, and delivered through expiring links.'],
    items: [
      'You may use the work only within the permissions stated in the issued licence.',
      'You may not redistribute or resell the original file, share download access, remove authorship claims, sublicense the work, mint it as an NFT, use it to train an artificial-intelligence model, or claim the artwork as your own unless the issued licence expressly permits that use.',
      'We may pause access where we reasonably suspect fraud, unauthorised distribution, chargeback abuse, or a material licence breach. Contact support if you believe access was restricted incorrectly.',
      'Because a digital master becomes available promptly after payment, cancellation or refund rights may be limited after delivery or download, except where required by law or where the file is defective or materially misdescribed.',
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual property',
    paragraphs: ['The website, artwork images, text, branding, designs, and software are owned by Highmarc, the artist, or their licensors and are protected by intellectual-property laws. Browsing the site does not grant permission to copy, scrape, reproduce, distribute, modify, publish, or commercially exploit that material. Product images may be viewed for shopping purposes but may not be downloaded or reused without written permission.'],
  },
  {
    id: 'customer-content',
    title: 'Reference images and other customer content',
    paragraphs: ['You retain ownership of content you submit. You give us a limited permission to store, process, reproduce, and share it with authorised service providers only as needed to fulfil your request, provide support, secure the service, or comply with law. You confirm that you have the rights and permissions needed to submit the content and that it does not unlawfully infringe another person’s privacy, copyright, or other rights.'],
  },
  {
    id: 'reviews-and-conduct',
    title: 'Reviews and acceptable conduct',
    paragraphs: ['Reviews must reflect genuine experiences and must not contain unlawful, deceptive, abusive, confidential, or infringing content. We may moderate or remove content that violates these Terms. You may not probe the service for vulnerabilities, overload it, automate unauthorised extraction, bypass download controls, introduce malicious code, or attempt to access another customer’s information.'],
  },
  {
    id: 'refunds',
    title: 'Cancellations, returns, and refunds',
    paragraphs: ['Eligibility depends on the type of purchase, its fulfilment stage, the condition of physical work, the terms shown at checkout, and applicable law. Contact us promptly with the order number and reason for the request. Nothing in these Terms excludes a remedy that cannot lawfully be excluded. Approved refunds are returned through the original payment method where practicable and may take additional time to appear.'],
  },
  {
    id: 'availability-and-liability',
    title: 'Service availability and liability',
    paragraphs: ['We aim to keep the site accurate and available but do not promise uninterrupted or error-free access. To the fullest extent permitted by law, we are not responsible for indirect, incidental, special, or consequential loss arising from use of the service. Our aggregate liability relating to a purchase will not exceed the amount paid for that purchase, except where liability cannot legally be limited, including liability arising from fraud or deliberate misconduct.'],
  },
  {
    id: 'governing-law',
    title: 'Governing law and disputes',
    paragraphs: ['These Terms are governed by the laws of the Federal Republic of Nigeria, without depriving a consumer of mandatory protections that apply in their place of residence. Please contact us first so we can try to resolve a concern in good faith. If it cannot be resolved, disputes may be submitted to courts of competent jurisdiction or another process agreed by the parties.'],
  },
  {
    id: 'changes-and-contact',
    title: 'Changes and contact',
    paragraphs: ['We may update these Terms for future use of the service. The effective date at the top identifies the current version. Changes do not retroactively alter an already accepted order unless required by law or agreed with you. Contact us with questions about these Terms, an order, a commission, or a licence.'],
  },
];

export default function Terms() {
  return <LegalDocument eyebrow="Using Highmarc" title="Terms of Service" summary="The rules that apply when you use this website, purchase original or digital artwork, or commission a bespoke piece." effectiveDate="4 August 2026" sections={sections}/>;
}
