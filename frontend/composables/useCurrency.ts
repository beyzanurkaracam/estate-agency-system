/**
 * Currency-aware helpers. All amounts in the system are integers in the
 * currency's minor unit (kuruş for TRY, cents for EUR/USD, yen for JPY, …).
 * Decimal counts and symbols are derived from `Intl.NumberFormat` so any
 * ISO 4217 code works without a hard-coded table.
 */

const DEFAULT_LOCALE = 'tr-TR'

const decimalsCache = new Map<string, number>()
const symbolCache = new Map<string, string>()

const safeCurrency = (c?: string): string =>
  (c && /^[A-Z]{3}$/i.test(c) ? c.toUpperCase() : 'TRY')

export const useCurrency = () => {
  const minorUnitDecimals = (currency?: string): number => {
    const code = safeCurrency(currency)
    if (decimalsCache.has(code)) return decimalsCache.get(code)!
    try {
      const opts = new Intl.NumberFormat(DEFAULT_LOCALE, {
        style: 'currency',
        currency: code,
      }).resolvedOptions()
      const d = opts.maximumFractionDigits ?? 2
      decimalsCache.set(code, d)
      return d
    } catch {
      return 2
    }
  }

  const minorUnitFactor = (currency?: string): number =>
    Math.pow(10, minorUnitDecimals(currency))

  const symbolFor = (currency?: string): string => {
    const code = safeCurrency(currency)
    if (symbolCache.has(code)) return symbolCache.get(code)!
    try {
      const parts = new Intl.NumberFormat(DEFAULT_LOCALE, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'symbol',
      }).formatToParts(0)
      const sym = parts.find((p) => p.type === 'currency')?.value ?? code
      symbolCache.set(code, sym)
      return sym
    } catch {
      return code
    }
  }

  /** Convert a major-unit decimal (e.g. "12.50") into integer minor units. */
  const toMinorUnits = (display: string | number, currency?: string): number => {
    const factor = minorUnitFactor(currency)
    const num = typeof display === 'string' ? Number(display.replace(',', '.')) : display
    if (!Number.isFinite(num)) return 0
    return Math.round(num * factor)
  }

  /** Convert integer minor units into a major-unit string for display. */
  const fromMinorUnits = (minor: number, currency?: string): string => {
    if (!minor) return ''
    const factor = minorUnitFactor(currency)
    const decimals = minorUnitDecimals(currency)
    return (minor / factor).toFixed(decimals).replace(/\.?0+$/, '')
  }

  return {
    minorUnitDecimals,
    minorUnitFactor,
    symbolFor,
    toMinorUnits,
    fromMinorUnits,
  }
}
