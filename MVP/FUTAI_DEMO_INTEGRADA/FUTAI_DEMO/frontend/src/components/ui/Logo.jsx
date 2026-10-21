export function Logo({ className = '' }) {
  return (
    <a href="#inicio" className={`group flex items-center gap-2.5 ${className}`} aria-label="FUT.AI, volver al inicio">
      <img
        src="/fut-ai-mark.png"
        alt=""
        width="58"
        height="35"
        className="h-8 w-auto drop-shadow-[0_0_10px_rgba(0,230,118,0.35)] transition-transform duration-300 group-hover:scale-105"
      />
      <span className="font-display text-xl font-bold tracking-tight text-white">
        FUT<span className="text-neon drop-shadow-[0_0_8px_rgba(0,230,118,0.7)]">.AI</span>
      </span>
    </a>
  );
}
