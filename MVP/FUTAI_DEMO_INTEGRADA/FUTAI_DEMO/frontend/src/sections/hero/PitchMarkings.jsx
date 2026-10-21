export function PitchMarkings() {
  const line = { fill: 'none', stroke: '#7dffb6', strokeOpacity: 0.55, strokeWidth: 2.5 };
  return (
    <g filter="url(#fut-glow)" {...line}>
      <rect x="0" y="0" width="1050" height="680" rx="4" />
      <line x1="525" y1="0" x2="525" y2="680" />
      <circle cx="525" cy="340" r="91.5" />
      <circle cx="525" cy="340" r="4" fill="#7dffb6" />
      {/* Área izquierda */}
      <rect x="0" y="138.4" width="165" height="403.2" />
      <rect x="0" y="248.4" width="55" height="183.2" />
      <circle cx="110" cy="340" r="3.5" fill="#7dffb6" />
      <path d="M165 266.9 A91.5 91.5 0 0 1 165 413.1" />
      <rect x="-14" y="303.4" width="14" height="73.2" />
      {/* Área derecha */}
      <rect x="885" y="138.4" width="165" height="403.2" />
      <rect x="995" y="248.4" width="55" height="183.2" />
      <circle cx="940" cy="340" r="3.5" fill="#7dffb6" />
      <path d="M885 266.9 A91.5 91.5 0 0 0 885 413.1" />
      <rect x="1050" y="303.4" width="14" height="73.2" />
      {/* Córners */}
      <path d="M0 10 A10 10 0 0 0 10 0 M1040 0 A10 10 0 0 0 1050 10 M1050 670 A10 10 0 0 0 1040 680 M10 680 A10 10 0 0 0 0 670" />
    </g>
  );
}
