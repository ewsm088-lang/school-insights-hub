import { VDI_COLORS, VDI_MAX, classifyVDI } from "@/lib/descartes";

export function GaugeVDI({ modulo }: { modulo: number }) {
  const cls = classifyVDI(modulo);
  const pct = Math.min(1, modulo / VDI_MAX);
  // Semi-circle arc
  const radius = 90;
  const cx = 110;
  const cy = 110;
  const startAngle = 180; // left
  const endAngle = 0;     // right
  const angle = startAngle - (startAngle - endAngle) * pct;
  const toXY = (a: number) => [cx + radius * Math.cos((a * Math.PI) / 180), cy - radius * Math.sin((a * Math.PI) / 180)];
  const [tx, ty] = toXY(angle);

  // Zone arcs: 0–0.58 (red), 0.58–1.15 (amber), 1.15–√3 (green)
  function arcPath(p0: number, p1: number) {
    const a0 = 180 - 180 * p0;
    const a1 = 180 - 180 * p1;
    const [x0, y0] = toXY(a0);
    const [x1, y1] = toXY(a1);
    const large = p1 - p0 > 0.5 ? 1 : 0;
    return `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1}`;
  }
  const zones = [
    { from: 0, to: 0.58 / VDI_MAX, color: VDI_COLORS.vulneravel },
    { from: 0.58 / VDI_MAX, to: 1.15 / VDI_MAX, color: VDI_COLORS.parcial },
    { from: 1.15 / VDI_MAX, to: 1, color: VDI_COLORS.integrado },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 140" width="100%" style={{ maxWidth: 360 }}>
        {zones.map((z, i) => (
          <path key={i} d={arcPath(z.from, z.to)} stroke={z.color} strokeWidth={18} fill="none" strokeLinecap="butt" />
        ))}
        <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="var(--foreground)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill="var(--foreground)" />
        <text x={cx} y={135} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--foreground)">
          {modulo.toFixed(3)}
        </text>
      </svg>
      <div className="mt-2 text-sm uppercase tracking-wide" style={{ color: VDI_COLORS[cls] }}>
        {cls === "vulneravel" ? "Vulnerável" : cls === "parcial" ? "Parcial" : "Integrado"}
      </div>
    </div>
  );
}
