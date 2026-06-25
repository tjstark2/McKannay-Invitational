export function formatRoundFormat(
  format: string,
  groupSize?: number | null
): string {
  const sized = (base: string) =>
    groupSize === 4 ? `4v4 ${base}` : groupSize === 2 ? `2v2 ${base}` : base;
  switch (format) {
    case "best_ball":
      return sized("Best Ball");
    case "scramble":
      return sized("Scramble");
    case "match_play":
      return "1v1 Match Play";
    case "net_score":
      return "Individual Net Score";
    case "casual":
      return "Casual / Optional";
    default:
      // Never show a raw snake_case value: Title-Case it.
      return format
        .split("_")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
  }
}

export function formatPlusMinus(value: number | null): string {
  if (value === null) return "-";
  if (value > 0) return `+${value}`;
  return String(value);
}
