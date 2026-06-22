export function formatRoundFormat(format: string): string {
  if (format === "best_ball") return "2v2 Best Ball";
  if (format === "match_play") return "1v1 Match Play";
  if (format === "net_score") return "Individual Net Score";
  if (format === "casual") return "Casual / Optional";
  return format;
}

export function formatPlusMinus(value: number | null): string {
  if (value === null) return "-";
  if (value > 0) return `+${value}`;
  return String(value);
}
