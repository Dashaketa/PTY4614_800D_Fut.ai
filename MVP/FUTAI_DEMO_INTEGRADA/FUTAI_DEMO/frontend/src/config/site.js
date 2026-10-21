/* Configuración general del sitio: contacto y navegación. */

/* =============================================================================
   CONFIGURACIÓN GENERAL
   ========================================================================== */

// Correo que recibe las postulaciones al piloto y las solicitudes de cotización.
export const CONTACT_EMAIL = 'piloto@futai.cl';
export const PILOT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Postulación Piloto FUT.AI')}`;
export const QUOTE_MAILTO = (plan) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Cotización ${plan} · FUT.AI`)}`;

export const NAV_LINKS = [
  { id: 'caracteristicas', label: 'Características' },
  { id: 'tecnologia', label: 'Tecnología' },
  { id: 'planes', label: 'Planes' },
];
