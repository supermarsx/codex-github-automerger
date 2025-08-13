import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexToHSL(hex: string): string {
  let hHex = hex.replace('#', '')
  if (hHex.length === 3) {
    hHex = hHex.split('').map((x) => x + x).join('')
  }
  const r = parseInt(hHex.slice(0, 2), 16) / 255
  const g = parseInt(hHex.slice(2, 4), 16) / 255
  const b = parseInt(hHex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h *= 60
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export { matchesPattern } from '../../shared/matchesPattern'
