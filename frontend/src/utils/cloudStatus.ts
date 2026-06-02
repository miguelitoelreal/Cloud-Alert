export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function relativeFreshness(value: string | null): string {
  if (!value) return "Sin sincronización reciente";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Actualizado hace menos de 1 min";
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) return `Actualizado hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  return `Actualizado hace ${diffHours} h`;
}

export function relativeTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatDateTime(value);
  if (diffMs < 60_000) return "hace un momento";
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays} d`;
  return formatDateTime(value);
}

export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => string,
): { label: string; items: T[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);

  const groups: Record<string, T[]> = {
    Hoy: [],
    Ayer: [],
    "Últimos 7 días": [],
    "Más antiguos": [],
  };

  for (const item of items) {
    const date = new Date(getDate(item));
    if (date.getTime() >= startOfToday.getTime()) {
      groups["Hoy"].push(item);
    } else if (date.getTime() >= startOfYesterday.getTime()) {
      groups["Ayer"].push(item);
    } else if (date.getTime() >= startOf7DaysAgo.getTime()) {
      groups["Últimos 7 días"].push(item);
    } else {
      groups["Más antiguos"].push(item);
    }
  }

  const result: { label: string; items: T[] }[] = [];
  if (groups["Hoy"].length > 0) result.push({ label: "Hoy", items: groups["Hoy"] });
  if (groups["Ayer"].length > 0) result.push({ label: "Ayer", items: groups["Ayer"] });
  if (groups["Últimos 7 días"].length > 0)
    result.push({ label: "Últimos 7 días", items: groups["Últimos 7 días"] });
  if (groups["Más antiguos"].length > 0)
    result.push({ label: "Más antiguos", items: groups["Más antiguos"] });
  return result;
}
