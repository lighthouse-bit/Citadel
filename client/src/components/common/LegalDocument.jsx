import { Link } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';

const renderParagraph = (paragraph, index) => (
  <p key={index} className="text-sm leading-7 text-stone-600 sm:text-base sm:leading-8">{paragraph}</p>
);

export default function LegalDocument({ eyebrow, title, summary, effectiveDate, sections }) {
  const { settings } = useSettings();
  const contactEmail = settings.contactEmail || 'Contact us through the website contact form';

  return (
    <div className="min-h-screen bg-stone-50 pt-20">
      <header className="border-b border-stone-200 bg-stone-950 px-6 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-400">{eyebrow}</p>
          <h1 className="mt-4 font-serif text-4xl font-normal sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">{summary}</p>
          <p className="mt-7 text-xs text-stone-500">Effective date: {effectiveDate}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-16">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">On this page</p>
          <nav aria-label={`${title} sections`}>
            <ol className="space-y-2 border-l border-stone-200">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="block border-l border-transparent py-1.5 pl-4 text-sm text-stone-500 transition hover:border-amber-700 hover:text-stone-900">
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="divide-y divide-stone-200 px-6 sm:px-10">
            {sections.map((section, index) => (
              <section id={section.id} key={section.id} className="scroll-mt-28 py-9 sm:py-11">
                <div className="flex gap-4">
                  <span className="mt-1 text-xs font-semibold text-amber-700">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-2xl text-stone-900 sm:text-3xl">{section.title}</h2>
                    {section.paragraphs?.length > 0 && <div className="mt-5 space-y-4">{section.paragraphs.map(renderParagraph)}</div>}
                    {section.items?.length > 0 && (
                      <ul className="mt-5 space-y-3 text-sm leading-7 text-stone-600 sm:text-base">
                        {section.items.map((item, itemIndex) => <li key={itemIndex} className="flex gap-3"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700"/><span>{item}</span></li>)}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>

          <footer className="border-t border-stone-200 bg-stone-50 px-6 py-8 sm:px-10">
            <p className="text-sm leading-6 text-stone-600">
              Questions about this document? {settings.contactEmail ? <a className="font-medium text-amber-700 hover:text-amber-800" href={`mailto:${settings.contactEmail}`}>{contactEmail}</a> : <Link className="font-medium text-amber-700 hover:text-amber-800" to="/contact">Use our contact form</Link>}.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
