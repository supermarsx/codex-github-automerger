export function abbreviate(text: string, maxLength = 30): string {
  if (text.length <= maxLength) return text;
  const head = Math.ceil(maxLength / 2) - 1;
  const tail = maxLength - head - 3;
  return text.slice(0, head) + '...' + text.slice(text.length - tail);
}
