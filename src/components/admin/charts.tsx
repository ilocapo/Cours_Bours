import { formatXof } from "@/lib/booking/money";

// Graphiques en SVG, sans librairie, dans la palette ZST (brun prune, bronze, gris Z, ivoire ombré).
const PAL = ["#1C1013", "#A07A52", "#8C8C8C", "#C9B8A3", "#5A4348", "#D9CDBD"];
export const color = (i: number) => PAL[i % PAL.length];

type Pt = { label: string; value: number };

export function BarChart({ data, money = false, height = 180, title }: { data: Pt[]; money?: boolean; height?: number; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const bw = Math.max(2, Math.min(34, 560 / n - 4));
  const W = Math.max(280, n * (bw + 4));
  const every = Math.ceil(n / 12);
  return (
    <figure className="chart" aria-label={title}>
      <div className="chart__scroll">
        <svg viewBox={`0 0 ${W} ${height + 26}`} role="img" aria-label={title} style={{ width: "100%", height: "auto", minWidth: Math.min(W, 520) }}>
          <line x1="0" x2={W} y1={height} y2={height} stroke="#1C1013" strokeOpacity=".25" />
          {data.map((d, i) => {
            const h = Math.round((d.value / max) * (height - 14));
            const x = i * (bw + 4) + 2;
            return (
              <g key={i}>
                <rect x={x} y={height - h} width={bw} height={h} rx={Math.min(bw / 2, 6)} fill="#1C1013"><title>{`${d.label} : ${money ? formatXof(d.value) : d.value}`}</title></rect>
                {i % every === 0 && <text x={x + bw / 2} y={height + 16} textAnchor="middle" fontSize="10" fill="#1C1013" fillOpacity=".7">{d.label}</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}

export function Donut({ data, money = false, title }: { data: Pt[]; money?: boolean; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <figure className="donut" aria-label={title}>
      <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label={title}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#1C1013" strokeOpacity=".08" strokeWidth="22" />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * C;
          const el = <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={color(i)} strokeWidth="22" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"><title>{`${d.label} : ${money ? formatXof(d.value) : d.value}`}</title></circle>;
          off += len;
          return el;
        })}
      </svg>
      <ul className="legend">
        {data.length === 0 && <li className="dim">Pas encore de données.</li>}
        {data.map((d, i) => <li key={d.label}><i style={{ background: color(i) }} />{d.label}<b>{money ? formatXof(d.value) : d.value}{total ? ` · ${Math.round((d.value / total) * 100)} %` : ""}</b></li>)}
      </ul>
    </figure>
  );
}

export function HBars({ data, money = false, title }: { data: Pt[]; money?: boolean; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="hbars" aria-label={title}>
      {data.length === 0 && <li className="dim">Pas encore de données.</li>}
      {data.map((d) => (
        <li key={d.label}><span>{d.label}</span><span className="hbars__bar"><i style={{ width: `${(d.value / max) * 100}%` }} /></span><b>{money ? formatXof(d.value) : d.value}</b></li>
      ))}
    </ul>
  );
}

export function Kpi({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return <div className={`kpi ${warn ? "is-warn" : ""}`}><span className="lb lb--s">{label}</span><strong className="bod">{value}</strong>{sub && <span className="dim kpi__sub">{sub}</span>}</div>;
}
