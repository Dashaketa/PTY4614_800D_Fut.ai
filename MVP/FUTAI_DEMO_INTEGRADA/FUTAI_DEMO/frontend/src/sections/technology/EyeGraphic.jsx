import { memo } from 'react';
import { BALL_PANELS, BALL_R, BONES, EYE, EYE_GHOSTS, EYE_LINES, EYE_METRIC_CENTER, EYE_METRICS, EYE_PLAYERS, EYE_TEAM_COLORS, eyeClipPath, eyePath, pentagon, PITCH_LINE, POSE_A, trailControl } from '@/sections/technology/eyeData';

function EyeGraphic() {
  return (
    <svg viewBox="0 0 800 520" className="h-full w-full overflow-visible" role="img" aria-label="Ojo de FUT.AI analizando un partido">
      <defs>
        <clipPath id="eye-lids-clip">
          <path data-eye="clip" d={eyeClipPath(0)} />
        </clipPath>
        <clipPath id="eye-iris-clip">
          <circle cx={EYE.x} cy={EYE.y} r="148" />
        </clipPath>
        <clipPath id="eye-ball-clip">
          <circle r={BALL_R} />
        </clipPath>
        <radialGradient id="eye-iris-fill">
          <stop offset="0%" stopColor="#0f3d26" />
          <stop offset="70%" stopColor="#0a2417" />
          <stop offset="100%" stopColor="#06140d" />
        </radialGradient>
        <linearGradient id="eye-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#00e676" />
          <stop offset="100%" stopColor="#00d2ff" />
        </linearGradient>
        <linearGradient id="eye-sweep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e676" stopOpacity="0" />
          <stop offset="100%" stopColor="#7dffb6" stopOpacity="0.45" />
        </linearGradient>
        <pattern id="eye-scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#7dffb6" opacity="0.16" />
        </pattern>
      </defs>

      {/* Interior del ojo, recortado por los párpados */}
      <g clipPath="url(#eye-lids-clip)">
        <rect width="800" height="520" fill="#050807" />
        <g data-eye="follow">
          <circle data-eye="ticks" cx={EYE.x} cy={EYE.y} r="178" fill="none" stroke="#7dffb6" strokeOpacity="0.3" strokeWidth="7" strokeDasharray="1.5 5.5" opacity="0" />
          <circle
            data-eye="progress" cx={EYE.x} cy={EYE.y} r="168" fill="none" stroke="url(#eye-stroke)" strokeWidth="3"
            strokeLinecap="round" pathLength="1" strokeDasharray="0 1" transform={`rotate(-90 ${EYE.x} ${EYE.y})`}
          />
          {/* Brillo: trazo ancho y transparente, mucho más liviano que un filtro de blur. */}
          <circle
            data-eye="iris-halo" cx={EYE.x} cy={EYE.y} r="150" fill="none" stroke="#00e676" strokeOpacity="0.16" strokeWidth="10"
            pathLength="1" strokeDasharray="1 1" strokeDashoffset="1"
          />
          <circle
            data-eye="iris-ring" cx={EYE.x} cy={EYE.y} r="150" fill="none" stroke="#00e676" strokeWidth="3"
            pathLength="1" strokeDasharray="1 1" strokeDashoffset="1"
          />
          <g clipPath="url(#eye-iris-clip)">
            <circle data-eye="iris-fill" cx={EYE.x} cy={EYE.y} r="150" fill="url(#eye-iris-fill)" opacity="0" />

            <g data-eye="pitch" fill="none" stroke="#7dffb6" strokeWidth="1.6">
              <rect data-eye="pitch-line" x="295" y="192" width="210" height="136" {...PITCH_LINE} />
              <line data-eye="pitch-line" x1="400" y1="192" x2="400" y2="328" {...PITCH_LINE} />
              <circle data-eye="pitch-line" cx="400" cy="260" r="18" {...PITCH_LINE} />
              <rect data-eye="pitch-line" x="295" y="220" width="33" height="80" {...PITCH_LINE} />
              <rect data-eye="pitch-line" x="472" y="220" width="33" height="80" {...PITCH_LINE} />
            </g>

            {/* 1 · Ingesta */}
            <g data-eye="video" opacity="0">
              <rect x="250" y="110" width="300" height="300" fill="url(#eye-scan)" />
              <rect data-eye="sweep" x="250" y="110" width="300" height="26" fill="url(#eye-sweep)" />
              <text x="400" y="172" textAnchor="middle" fontSize="10" fontFamily="'JetBrains Mono', monospace" fill="#7dffb6">
                ● REC · MP4 1080p · 8 FPS
              </text>
            </g>

            {/* 2-3 · Detección y tracking */}
            {EYE_PLAYERS.map((player) => (
              <path
                key={`trail-${player.id}`}
                data-eye="trail"
                d={`M${player.a.join(' ')} Q${trailControl(player).join(' ')} ${player.b.join(' ')}`}
                fill="none" stroke={EYE_TEAM_COLORS[player.team]} strokeOpacity="0.6" strokeWidth="1.5"
                pathLength="1" strokeDasharray="1 1" strokeDashoffset="1" opacity="0"
              />
            ))}
            {EYE_PLAYERS.map((player) => (
              <g key={player.id} data-eye="player" opacity="0">
                <path
                  data-eye="box" d="M-9 -5 V-9 H-5 M5 -9 H9 V-5 M9 5 V9 H5 M-5 9 H-9 V5"
                  fill="none" stroke={EYE_TEAM_COLORS[player.team]} strokeWidth="1.5" opacity="0"
                />
                <circle r="4.5" fill={EYE_TEAM_COLORS[player.team]} stroke="#0a0a0a" strokeWidth="1.5" />
                <text data-eye="id" y="-13" textAnchor="middle" fontSize="7.5" fontFamily="'JetBrains Mono', monospace" fill={EYE_TEAM_COLORS[player.team]} opacity="0">
                  ID {player.id}
                </text>
              </g>
            ))}

            {/* 4 · Biomecánica */}
            <g data-eye="skeleton" opacity="0">
              {BONES.map(([from, to]) => (
                <line key={`${from}-${to}`} data-eye="bone" stroke="#00d2ff" strokeWidth="2.5" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" />
              ))}
              {POSE_A.map((_, i) => (
                <circle key={i} data-eye="joint" r="3.2" fill="#00e676" stroke="#0a0a0a" strokeWidth="1" />
              ))}
              <g data-eye="stride" opacity="0">
                <line data-eye="stride-line" y1="356" y2="356" stroke="#ff4d4f" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="400" y="372" textAnchor="middle" fontSize="9" fontFamily="'JetBrains Mono', monospace" fill="#ff4d4f">
                  zancada der. −18% · alerta
                </text>
              </g>
            </g>

            {/* 5 · Fantasma Táctico */}
            <g data-eye="ghosts" opacity="0">
              {EYE_GHOSTS.map(({ real, ghost, label }) => (
                <g key={real.join()}>
                  <line
                    data-eye="ghost-link" x1={real[0]} y1={real[1]} x2={ghost[0]} y2={ghost[1]}
                    stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.2" pathLength="1" strokeDasharray="1 1"
                  />
                  <circle cx={ghost[0]} cy={ghost[1]} r="7" fill="rgba(255,255,255,0.06)" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.2" strokeDasharray="2.5 2" />
                  <circle cx={real[0]} cy={real[1]} r="4.5" fill="#00e676" stroke="#0a0a0a" strokeWidth="1.5" />
                  <text x={ghost[0]} y={ghost[1] - 11} textAnchor="middle" fontSize="7" fontFamily="'JetBrains Mono', monospace" fill="#ffffff" fillOpacity="0.75">
                    Δ {label}
                  </text>
                </g>
              ))}
            </g>
          </g>
        </g>
      </g>

      {/* Párpados y trazos exteriores, con su halo de brillo */}
      {EYE_LINES.map((line, i) => (
        <path
          key={`halo-${i}`} data-eye="line-halo" d={eyePath(line, 0.002)} fill="none" stroke="url(#eye-stroke)"
          strokeWidth={line.width * 4} strokeOpacity={line.opacity * 0.16} strokeLinecap="round"
          pathLength="1" strokeDasharray="1 1" strokeDashoffset="1"
        />
      ))}
      {EYE_LINES.map((line, i) => (
        <path
          key={i} data-eye="line" d={eyePath(line, 0.002)} fill="none" stroke="url(#eye-stroke)"
          strokeWidth={line.width} strokeOpacity={line.opacity} strokeLinecap="round"
          pathLength="1" strokeDasharray="1 1" strokeDashoffset="1"
        />
      ))}

      {/* Balón-pupila */}
      <g data-eye="follow">
        <g data-eye="ball-pos" transform={`translate(${EYE.x} ${EYE.y}) scale(0.001)`}>
          <g data-eye="ball-spin">
            <g data-eye="ball-clip" clipPath="url(#eye-ball-clip)">
              <circle data-eye="ball-base" r={BALL_R} fill="#f4f6f5" />
              <g data-eye="seams" stroke="#0a0a0a" strokeWidth="1">
                {[0, 1, 2, 3, 4].map((k) => {
                  const a = ((-90 + 72 * k) * Math.PI) / 180;
                  return <line key={k} x1={Math.cos(a) * 7} y1={Math.sin(a) * 7} x2={Math.cos(a) * 11} y2={Math.sin(a) * 11} />;
                })}
              </g>
              {BALL_PANELS.map((panel, i) => (
                <polygon key={i} data-eye="panel" points={pentagon(panel.r)} fill="#0b0f0d" stroke="#0a0a0a" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          </g>
          <circle r={BALL_R} fill="none" stroke="#00e676" strokeOpacity="0.6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" data-eye="ball-base" />
        </g>
      </g>

      {/* Métricas en que se desarma el balón */}
      {[EYE_METRIC_CENTER, ...EYE_METRICS].map((metric) => (
        <g key={metric.label} data-eye="metric" opacity="0" textAnchor="middle" stroke="#050807" strokeWidth="5" strokeLinejoin="round" paintOrder="stroke">
          <text x={metric.at[0]} y={metric.at[1] + 40} fontSize="20" fontWeight="700" fontFamily="'Space Grotesk', sans-serif" fill={metric.alert ? '#ff4d4f' : '#ffffff'}>
            {metric.value}
          </text>
          <text x={metric.at[0]} y={metric.at[1] + 55} fontSize="8.5" letterSpacing="1.5" fontFamily="'JetBrains Mono', monospace" fill="#9ca3af">
            {metric.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export const MemoEyeGraphic = memo(EyeGraphic);
