import { ThemePalette, CurrencyCode } from '../types/hotel';

export const getThemeClasses = (palette: ThemePalette) => {
  switch (palette) {
    case 'bright-himalayan-gold':
      return {
        primary: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 shadow-md shadow-amber-600/25',
        primaryText: 'text-amber-800 dark:text-amber-300 font-bold',
        accentBg: 'bg-amber-500 text-stone-950 font-semibold',
        borderAccent: 'border-amber-400 dark:border-amber-600',
        ringFocus: 'focus:ring-amber-500',
        badge: 'text-amber-800 bg-amber-100 dark:bg-amber-950/70 dark:text-amber-300',
        heroOverlay: 'from-stone-950/70 via-stone-950/30 to-amber-950/10',
        heroKicker: 'text-amber-300 font-bold drop-shadow',
        statCard: 'bg-amber-50/80 dark:bg-stone-900/90 border-amber-200/80 dark:border-amber-800/40 text-stone-900 dark:text-stone-100',
      };
    case 'luminous-emerald':
      return {
        primary: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/25',
        primaryText: 'text-emerald-700 dark:text-emerald-300 font-bold',
        accentBg: 'bg-emerald-500 text-stone-950 font-semibold',
        borderAccent: 'border-emerald-400 dark:border-emerald-600',
        ringFocus: 'focus:ring-emerald-500',
        badge: 'text-emerald-800 bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-300',
        heroOverlay: 'from-stone-950/70 via-stone-950/25 to-emerald-950/15',
        heroKicker: 'text-emerald-300 font-bold drop-shadow',
        statCard: 'bg-emerald-50/80 dark:bg-stone-900/90 border-emerald-200/80 dark:border-emerald-800/40 text-stone-900 dark:text-stone-100',
      };
    case 'radiant-terracotta':
      return {
        primary: 'bg-gradient-to-r from-orange-600 to-amber-700 text-white hover:from-orange-700 hover:to-amber-800 shadow-md shadow-orange-600/25',
        primaryText: 'text-orange-800 dark:text-orange-300 font-bold',
        accentBg: 'bg-orange-500 text-white font-semibold',
        borderAccent: 'border-orange-400 dark:border-orange-600',
        ringFocus: 'focus:ring-orange-500',
        badge: 'text-orange-800 bg-orange-100 dark:bg-orange-950/70 dark:text-orange-300',
        heroOverlay: 'from-stone-950/70 via-stone-950/25 to-orange-950/15',
        heroKicker: 'text-orange-300 font-bold drop-shadow',
        statCard: 'bg-orange-50/80 dark:bg-stone-900/90 border-orange-200/80 dark:border-orange-800/40 text-stone-900 dark:text-stone-100',
      };
    case 'mountain-emerald':
      return {
        primary: 'bg-emerald-800 text-white hover:bg-emerald-700 shadow-sm',
        primaryText: 'text-emerald-900 dark:text-emerald-300',
        accentBg: 'bg-emerald-700 text-white',
        borderAccent: 'border-emerald-700',
        ringFocus: 'focus:ring-emerald-700',
        badge: 'text-emerald-800 dark:text-emerald-300',
        heroOverlay: 'from-emerald-950/80 via-emerald-950/40 to-transparent',
        heroKicker: 'text-emerald-300 font-semibold',
        statCard: 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800',
      };
    case 'heritage-bronze':
      return {
        primary: 'bg-amber-800 text-white hover:bg-amber-700 shadow-sm',
        primaryText: 'text-amber-900 dark:text-amber-400',
        accentBg: 'bg-amber-700 text-white',
        borderAccent: 'border-amber-700',
        ringFocus: 'focus:ring-amber-700',
        badge: 'text-amber-800 dark:text-amber-400',
        heroOverlay: 'from-stone-950/80 via-stone-950/40 to-transparent',
        heroKicker: 'text-amber-300 font-semibold',
        statCard: 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800',
      };
    case 'midnight-navy':
      return {
        primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
        primaryText: 'text-slate-900 dark:text-sky-400',
        accentBg: 'bg-sky-800 text-white',
        borderAccent: 'border-sky-800',
        ringFocus: 'focus:ring-sky-700',
        badge: 'text-sky-800 dark:text-sky-400',
        heroOverlay: 'from-slate-950/85 via-slate-950/45 to-transparent',
        heroKicker: 'text-sky-300 font-semibold',
        statCard: 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800',
      };
    case 'royal-maroon':
    default:
      return {
        primary: 'bg-rose-900 text-white hover:bg-rose-800 shadow-sm',
        primaryText: 'text-rose-900 dark:text-rose-300',
        accentBg: 'bg-amber-600 text-white',
        borderAccent: 'border-rose-900',
        ringFocus: 'focus:ring-rose-800',
        badge: 'text-rose-900 dark:text-rose-300',
        heroOverlay: 'from-stone-950/80 via-stone-950/40 to-transparent',
        heroKicker: 'text-amber-300 font-semibold',
        statCard: 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800',
      };
  }
};

export const convertPrice = (
  priceUSD: number,
  targetCurrency: CurrencyCode,
  exchangeRates: { USD: number; NPR: number; INR: number } = { USD: 1, NPR: 135, INR: 84.5 }
): number => {
  if (targetCurrency === 'NPR') {
    return Math.round(priceUSD * (exchangeRates.NPR || 135));
  }
  if (targetCurrency === 'INR') {
    return Math.round(priceUSD * (exchangeRates.INR || 84.5));
  }
  return priceUSD;
};

export const formatCurrency = (amount: number, currency: CurrencyCode = 'NPR'): string => {
  if (currency === 'NPR') {
    return `रू ${Math.round(amount).toLocaleString('en-IN')}`;
  }
  if (currency === 'INR') {
    return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const calculateStayDuration = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
};
