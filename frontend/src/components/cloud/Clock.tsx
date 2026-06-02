import { useState, useEffect } from "react";

export function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const peruTime = time.toLocaleTimeString("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const peruDate = time.toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="text-right">
      <div className="text-3xl font-bold text-slate-100">{peruTime}</div>
      <div className="text-xs text-slate-400 capitalize">{peruDate} · Hora Perú</div>
    </div>
  );
}
