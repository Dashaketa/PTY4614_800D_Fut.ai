import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { CONTACT_EMAIL, NAV_LINKS } from '@/config/site';

/* =============================================================================
   8. FOOTER
   ========================================================================== */

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-carbon-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
              Análisis táctico y biomecánico automatizado con Computer Vision e Inteligencia Artificial. Sin hardware
              propietario: solo el video de tus partidos.
            </p>
            <a
              href="#piloto"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-neon hover:underline"
            >
              Solicitar Piloto
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500">Producto</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_LINKS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-gray-300 hover:text-neon">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500">Contacto</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-gray-300 hover:text-neon">
                  <Icon name="mail" className="h-4 w-4" />
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a href="#piloto" className="text-gray-300 hover:text-neon">
                  Piloto gratuito de 2 meses
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} FUT.AI · Todos los derechos reservados.</p>
          <p className="flex items-center gap-2">
            <Icon name="graduation" className="h-4 w-4 text-neon" />
            Proyecto Capstone · Duoc UC
          </p>
        </div>
      </div>
    </footer>
  );
}
