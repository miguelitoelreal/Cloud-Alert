export function MiniSparkline({ data, color = "#64748b" }: { data: number[]; color?: string }) {
  if (data.length === 0) return null;

  const width = 60;
  const height = 20;
  const max = Math.max(1, ...data);
  const range = max;

  const points = data.map((value, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = height - (value / range) * height;
    return `${x},${y}`;
  });

  const areaPath = `M0,${height} L${points.join(" L")} L${width},${height} Z`;
  const linePath = data.length === 1 ? undefined : `M${points.join(" L")}`;

  return (
    <svg width={width} height={height} className="shrink-0 opacity-70">
      <path d={areaPath} fill={color} fillOpacity={0.15} />
      {linePath ? <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}
