export function SectionHeader({ eyebrow, title, description, align = 'center' }) {
  const alignment = align === 'center' ? 'mx-auto text-center' : 'text-left';
  return (
    <div className={`max-w-3xl ${alignment}`}>
      <p data-reveal className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-neon">
        {eyebrow}
      </p>
      <h2 data-reveal className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {description && (
        <p data-reveal className="mt-5 text-base leading-relaxed text-gray-400 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
