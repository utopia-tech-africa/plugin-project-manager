export const formatDaysOnFloor = (days: number): string => {
  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "1 day";
  }
  return `${String(days)} days`;
};

export const formatHandoffTime = (iso: string): string => {
  if (iso.length === 0) {
    return "";
  }
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};
