import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { NAV_LINKS } from '@/config/site';

/* =============================================================================
   1. NAVBAR
   ========================================================================== */

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Resalta el enlace de la sección visible.
  useEffect(() => {
    const sections = NAV_LINKS.map(({ id }) => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const shell = scrolled || menuOpen
    ? 'border-white/10 bg-carbon-900/75 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.35)]'
    : 'border-transparent bg-transparent';

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${shell}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Principal">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active === id ? 'text-neon' : 'text-gray-300 hover:text-white'
                }`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a href="/demo" className="inline-flex rounded-xl border border-neon/50 bg-neon/10 px-3 py-2 text-sm font-bold text-neon shadow-[0_0_14px_rgba(0,230,118,0.12)] hover:bg-neon/20">Ver demo real</a>
          <a
            href="#piloto"
            className="hidden rounded-xl bg-neon px-4 py-2 text-sm font-semibold text-carbon-900 shadow-[0_0_24px_rgba(0,230,118,0.35)] transition hover:bg-[#33eb91] hover:shadow-[0_0_32px_rgba(0,230,118,0.55)] sm:inline-flex"
          >
            Solicitar Piloto
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-200 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-white/10 px-4 pb-5 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {NAV_LINKS.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-gray-200 hover:bg-white/5"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#piloto"
            onClick={() => setMenuOpen(false)}
            className="mt-3 flex justify-center rounded-xl bg-neon px-4 py-3 text-sm font-semibold text-carbon-900"
          >
            Solicitar Piloto
          </a>
        </div>
      )}
    </header>
  );
}
