type LegalPrivacyViewProps = {
  paragraphs: string[];
  className?: string;
};

export function LegalPrivacyView({ paragraphs, className = '' }: LegalPrivacyViewProps) {
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-3 last:mb-0 text-sm text-gray-800 leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
}
