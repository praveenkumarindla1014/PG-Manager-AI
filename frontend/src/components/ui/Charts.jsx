import React, { useState } from 'react';
import { compactInr, inr } from '../../utils/format';

/**
 * Grouped bar chart (e.g. income vs expenses per month). Pure SVG, responsive.
 * series: [{ key, label, color }]
 */
export function BarChart({ data, series, height = 240, format = compactInr, tooltipFormat = inr }) {
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = height;
  const pad = { top: 16, right: 8, bottom: 30, left: 48 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...data.flatMap(d => series.map(s => Number(d[s.key]) || 0)));
  const niceMax = niceCeil(max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => t * niceMax);
  const groupW = innerW / Math.max(1, data.length);
  const barW = Math.min(26, (groupW * 0.62) / series.length);

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Bar chart" style={{ overflow: 'visible' }}>
        {ticks.map((t, i) => {
          const y = pad.top + innerH - (t / niceMax) * innerH;
          return (
            <g key={i}>
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="var(--border)" strokeDasharray={i ? '3 4' : '0'} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{format(t)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const gx = pad.left + i * groupW + (groupW - barW * series.length - 4 * (series.length - 1)) / 2;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.left + i * groupW} y={pad.top} width={groupW} height={innerH} fill={hover === i ? 'var(--surface-3)' : 'transparent'} rx="8" opacity="0.6" />
              {series.map((s, j) => {
                const v = Number(d[s.key]) || 0;
                const h = Math.max(v > 0 ? 3 : 0, (v / niceMax) * innerH);
                return (
                  <rect key={s.key} x={gx + j * (barW + 4)} y={pad.top + innerH - h} width={barW} height={h} rx="5" fill={s.color}>
                    <animate attributeName="height" from="0" to={h} dur="0.6s" fill="freeze" />
                    <animate attributeName="y" from={pad.top + innerH} to={pad.top + innerH - h} dur="0.6s" fill="freeze" />
                  </rect>
                );
              })}
              <text x={pad.left + i * groupW + groupW / 2} y={H - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink-2)">{d.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="chart-tooltip" style={{ left: `${((pad.left + hover * groupW + groupW / 2) / W) * 100}%`, top: 10 }}>
          <div style={{ marginBottom: 4 }}>{data[hover].label} {data[hover].year || ''}</div>
          {series.map(s => (
            <div key={s.key} className="row-sm"><i style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />{s.label}: {tooltipFormat(data[hover][s.key])}</div>
          ))}
        </div>
      )}
      <div className="chart-legend" style={{ marginTop: 6, paddingLeft: pad.left }}>
        {series.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  );
}

/**
 * Donut chart with centre label. segments: [{ label, value, color }]
 */
export function DonutChart({ segments, size = 168, thickness = 22, centerLabel, centerValue }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = ((Number(s.value) || 0) / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <title>{s.label}: {s.value}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--ink)">{centerValue}</text>
        <text x="50%" y="61%" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink-3)">{centerLabel}</text>
      </svg>
      <div className="stack-sm grow" style={{ minWidth: 140 }}>
        {segments.map((s, i) => (
          <div key={i} className="row between small">
            <span className="row-sm"><i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: 'inline-block' }} /><span className="muted bold">{s.label}</span></span>
            <span className="bold mono">{s.display ?? s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Horizontal bars (e.g. expenses by category, occupancy by floor).
 * items: [{ label, value, max?, color?, display? }]
 */
export function HBars({ items, color = 'var(--brand)', max }) {
  const top = max || Math.max(1, ...items.map(i => i.max || i.value));
  return (
    <div className="stack">
      {items.map((it, i) => (
        <div key={i} className="stack-sm">
          <div className="row between small">
            <span className="bold capitalize">{it.label}</span>
            <span className="muted mono">{it.display ?? it.value}</span>
          </div>
          <div className="progress"><span style={{ width: `${((it.value || 0) / (it.max || top)) * 100}%`, background: it.color || color }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Tiny sparkline */
export function Sparkline({ values, width = 110, height = 34, color = 'var(--brand)' }) {
  if (!values?.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * width,
    height - 3 - ((v - min) / Math.max(1, max - min)) * (height - 6)
  ]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function niceCeil(v) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * exp;
}
