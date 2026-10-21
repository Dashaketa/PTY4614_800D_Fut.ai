import { useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PILOT_MAILTO, QUOTE_MAILTO } from '@/config/site';
import { PILOT_STEPS, PLANS } from '@/content/plans';
import { useReveal } from '@/lib/motion';

/* =============================================================================
   7. PLANES Y MODELO DE NEGOCIO
   ========================================================================== */

export function PlansSection() {
  const ref = useRef(null);
  useReveal(ref, { stagger: 120 });

  return (
    <section id="planes" ref={ref} className="relative border-t border-white/5 bg-carbon-800/50 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Planes SaaS B2B"
          title="Escala por partidos analizados, no por cámaras instaladas"
          description="Dos planes pensados para la realidad del fútbol: academias que necesitan métricas accionables y clubes profesionales que gestionan plantel, cargas y temporada completa."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              data-reveal
              className={`relative flex flex-col rounded-3xl border p-8 backdrop-blur-md ${
                plan.highlight
                  ? 'border-neon/40 bg-gradient-to-b from-neon/[0.08] to-white/[0.03] shadow-[0_0_60px_-15px_rgba(0,230,118,0.35)]'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 right-8 rounded-full bg-neon px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-carbon-900">
                  Recomendado
                </span>
              )}
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${plan.highlight ? 'border-neon/40 bg-neon/10 text-neon' : 'border-tech/30 bg-tech/10 text-tech'}`}>
                  <Icon name={plan.icon} className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-semibold text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-400">{plan.audience}</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-white/10 py-5">
                <span className={`font-display text-3xl font-bold ${plan.highlight ? 'text-neon' : 'text-white'}`}>{plan.volume}</span>
                <span className="text-sm text-gray-500">{plan.priceNote}</span>
              </div>

              <ul className="mt-6 space-y-3.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm text-gray-300">
                    <Icon name="check" className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? 'text-neon' : 'text-tech'}`} strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                <a
                  href={QUOTE_MAILTO(plan.name)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition ${
                    plan.highlight
                      ? 'bg-neon text-carbon-900 shadow-[0_0_30px_rgba(0,230,118,0.35)] hover:bg-[#33eb91]'
                      : 'border border-white/15 bg-white/5 text-white hover:border-tech/60 hover:text-tech'
                  }`}
                >
                  {plan.cta}
                  <Icon name="arrowRight" className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Banner Land & Expand */}
        <div
          id="piloto"
          data-reveal
          className="relative mt-10 overflow-clip rounded-3xl border border-neon/30 bg-gradient-to-br from-neon/[0.12] via-carbon-800 to-tech/[0.10] p-8 sm:p-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-neon/20 blur-[100px]" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-neon">
                <Icon name="gift" className="h-3.5 w-3.5" />
                Land &amp; Expand
              </span>
              <h3 className="mt-5 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                2 meses de piloto gratuito para auditoría técnica
              </h3>
              <p className="mt-4 text-gray-300">
                Procesamos los partidos de tu club sin costo durante dos meses. Si las métricas no le sirven al cuerpo
                técnico, no hay contrato. Si le sirven, escalamos juntos.
              </p>
              <a
                href={PILOT_MAILTO}
                className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-neon px-6 py-3.5 text-sm font-semibold text-carbon-900 shadow-[0_0_30px_rgba(0,230,118,0.45)] transition hover:bg-[#33eb91]"
              >
                <Icon name="mail" className="h-4 w-4" />
                Postular mi club al piloto
                <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <ol className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {PILOT_STEPS.map((step, i) => (
                <li key={step.title} className="rounded-2xl border border-white/10 bg-carbon-900/60 p-5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neon/15 font-mono text-[11px] font-bold text-neon">
                      {i + 1}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">{step.when}</span>
                  </div>
                  <p className="mt-3 font-semibold text-white">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
