import { pad2 } from '@/lib/format';
import { BBOX_PATH, playerTelemetry, TEAM_COLORS } from '@/sections/hero/matchData';

export function PlayerNode({ player, selected, labeled, showTracking, showGhost, onSelect }) {
  const color = TEAM_COLORS[player.team];
  const { confidence } = playerTelemetry(player);
  const boxColor = selected ? '#ffffff' : color;
  const showLabel = labeled || selected;
  const label = `ID ${pad2(player.trackId)} · ${confidence.toFixed(2)}`;

  const handleKey = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(player.key);
    }
  };

  return (
    <g
      data-player={player.key}
      transform={`translate(${player.x} ${player.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${player.team === 'home' ? 'Local' : 'Visita'}, dorsal ${player.n}, ${player.role}`}
      aria-pressed={selected}
      onClick={() => onSelect(player.key)}
      onKeyDown={handleKey}
      className="cursor-pointer outline-none [&:focus-visible_.focus-ring]:opacity-100"
    >
      {player.ghost && (
        <g style={{ opacity: showGhost ? 1 : 0, transition: 'opacity 400ms ease' }}>
          {/* El esquema bascula con el bloque; la línea une la posición ideal con la real. */}
          <g className="ghost-anchor">
            <line
              className="ghost-link"
              x1="0" y1="0" x2={player.ghost[0]} y2={player.ghost[1]}
              stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="5 5"
            />
            <circle
              className="ghost-node svg-center"
              cx={player.ghost[0]} cy={player.ghost[1]} r="13"
              fill="rgba(255,255,255,0.06)" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="4 4"
            />
          </g>
        </g>
      )}

      <g className="player-motion">
        <g style={{ opacity: showTracking || selected ? 1 : 0, transition: 'opacity 400ms ease' }}>
          <path
            className="bbox svg-center"
            d={BBOX_PATH}
            fill="none"
            stroke={boxColor}
            strokeWidth={selected ? 3.5 : 2.5}
            strokeLinecap="round"
          />
        </g>

        {selected && (
          <circle
            className="selected-ring svg-center"
            r="34" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" strokeDasharray="10 8"
          />
        )}
        <circle className="focus-ring" r="38" fill="none" stroke="#00d2ff" strokeWidth="2.5" opacity="0" />

        <circle r="14" fill={color} fillOpacity="0.95" stroke="#0a0a0a" strokeWidth="3" />
        <text
          y="5" textAnchor="middle" fontSize="13" fontWeight="700"
          fontFamily="'JetBrains Mono', monospace" fill="#0a0a0a"
        >
          {player.n}
        </text>

        {showLabel && showTracking && (
          <g transform="translate(0 -46)">
            <rect x="-66" y="-15" width="132" height="26" rx="5" fill="#0a0a0a" fillOpacity="0.85" stroke={boxColor} strokeOpacity="0.6" />
            <text y="4" textAnchor="middle" fontSize="15" fontFamily="'JetBrains Mono', monospace" fill={boxColor}>
              {label}
            </text>
          </g>
        )}

        {/* Área de clic ampliada */}
        <circle r="30" fill="transparent" />
      </g>
    </g>
  );
}
