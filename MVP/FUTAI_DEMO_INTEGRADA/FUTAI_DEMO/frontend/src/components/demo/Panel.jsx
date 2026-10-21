export function Panel({ title, detail, children, className = '' }) {
  return <section className={`rounded-2xl border border-white/10 bg-[#11151c]/95 p-5 shadow-[0_18px_60px_rgba(0,0,0,.24)] ${className}`}>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><h2 className="font-display text-lg font-semibold text-white">{title}</h2>{detail && <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{detail}</span>}</div>
    {children}
  </section>;
}

export function Stat({ label, value, suffix, helper }) {
  return <div className="rounded-2xl border border-white/10 bg-[#11151c] p-5">
    <div className="mb-4 font-mono text-[10px] uppercase tracking-[.16em] text-gray-500">{label}</div>
    <div className="font-display text-3xl font-bold tracking-tight text-white">{value}<span className="ml-1 text-sm font-normal text-neon">{suffix}</span></div>
    {helper && <p className="mt-2 text-xs text-gray-500">{helper}</p>}
  </div>;
}
