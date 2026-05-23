import type { LegalSection } from '@/lib/legal/types';

type LegalSectionsViewProps = {
  sections: LegalSection[];
  className?: string;
};

export function LegalSectionsView({ sections, className = '' }: LegalSectionsViewProps) {
  return (
    <div className={className}>
      {sections.map((section) => (
        <section key={section.id ?? section.title} className="mb-8 last:mb-2">
          <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-1">
            {section.title}
          </h2>
          {section.paragraphs.map((p, i) => (
            <p key={i} className="mb-3 last:mb-0 text-sm text-gray-800 leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
