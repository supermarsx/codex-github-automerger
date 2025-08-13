export function matchesPattern(value: string, pattern: string): boolean {
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp("^" + pattern.split("*").map(escapeRegex).join(".*") + "$");
  return regex.test(value);
}
