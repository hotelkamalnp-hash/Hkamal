import { ThemePalette, CurrencyCode } from '../types/hotel';

export const getThemeClasses = (palette: ThemePalette) => {
  switch (palette) {
    case 'bright-himalayan-gold':
      return {
        primary:
          'bg-[#96682E] hover:bg-[#7D5522] dark:bg-[#C69553] dark:hover:bg-[#D4A76A] text-white dark:text-[#14110E] shadow-xs',
        primaryText: 'text-[#8A5D25] dark:text-[#D4A76A] font-semibold',
        accentBg: 'bg-[#C69553] text-[#14110E] font-semibold',
        borderAccent: 'border-[#D6C3A8] dark:border-[#4A3B28]',
        ringFocus: 'focus:ring-[#96682E] dark:focus:ring-[#C69553]',
        badge: 'text-[#7D5522] bg-[#F3EAD9] dark:bg-[#2A2116] dark:text-[#DFBE88]',
        heroOverlay: 'from-[#14110E]/85 via-[#14110E]/45 to-transparent',
        heroKicker: 'text-[#DFBE88] font-semibold',
        statCard:
          'bg-[#FAF7F2] dark:bg-[#171411] border-[#E6DFD3] dark:border-[#2B241D] text-[#1A1714] dark:text-[#F4EFE6]',
      };
    case 'luminous-emerald':
      return {
        primary:
          'bg-[#1D5B4C] hover:bg-[#16463A] dark:bg-[#3A8E77] dark:hover:bg-[#4AA38B] text-white dark:text-[#0F1412] shadow-xs',
        primaryText: 'text-[#1D5B4C] dark:text-[#63B8A0] font-semibold',
        accentBg: 'bg-[#3A8E77] text-white font-semibold',
        borderAccent: 'border-[#BBD5CD] dark:border-[#24473D]',
        ringFocus: 'focus:ring-[#1D5B4C]',
        badge: 'text-[#1D5B4C] bg-[#E8F2EE] dark:bg-[#172B25] dark:text-[#7ACBB4]',
        heroOverlay: 'from-[#0E1714]/85 via-[#0E1714]/45 to-transparent',
        heroKicker: 'text-[#8AD2BD] font-semibold',
        statCard:
          'bg-[#F4F8F6] dark:bg-[#121917] border-[#DCE8E3] dark:border-[#23322D] text-[#141D1A] dark:text-[#ECF3F0]',
      };
    case 'radiant-terracotta':
      return {
        primary:
          'bg-[#9A4E32] hover:bg-[#7E3F27] dark:bg-[#CE7A58] dark:hover:bg-[#DC8D6D] text-white dark:text-[#18110E] shadow-xs',
        primaryText: 'text-[#9A4E32] dark:text-[#DF8F70] font-semibold',
        accentBg: 'bg-[#CE7A58] text-white font-semibold',
        borderAccent: 'border-[#DFC2B6] dark:border-[#4F2D21]',
        ringFocus: 'focus:ring-[#9A4E32]',
        badge: 'text-[#843F26] bg-[#F7ECE7] dark:bg-[#2F1B14] dark:text-[#E7A38A]',
        heroOverlay: 'from-[#18110E]/85 via-[#18110E]/45 to-transparent',
        heroKicker: 'text-[#E7A38A] font-semibold',
        statCard:
          'bg-[#FAF6F4] dark:bg-[#1A1311] border-[#EAE0DB] dark:border-[#32241F] text-[#1D1512] dark:text-[#F5ECE8]',
      };
    case 'mountain-emerald':
      return {
        primary: 'bg-[#1D5242] hover:bg-[#164134] text-white shadow-xs',
        primaryText: 'text-[#1D5242] dark:text-[#6EC2A6]',
        accentBg: 'bg-[#2A6F5A] text-white',
        borderAccent: 'border-[#2A6F5A]',
        ringFocus: 'focus:ring-[#1D5242]',
        badge: 'text-[#1D5242] dark:text-[#6EC2A6]',
        heroOverlay: 'from-[#0F1815]/85 via-[#0F1815]/45 to-transparent',
        heroKicker: 'text-[#83D0B6] font-semibold',
        statCard: 'bg-[#FAF7F2] dark:bg-[#161412] border-[#E6DFD3] dark:border-[#2A241E]',
      };
    case 'heritage-bronze':
      return {
        primary: 'bg-[#855A2B] hover:bg-[#6E4922] text-white shadow-xs',
        primaryText: 'text-[#855A2B] dark:text-[#D1A166]',
        accentBg: 'bg-[#9E6E36] text-white',
        borderAccent: 'border-[#855A2B]',
        ringFocus: 'focus:ring-[#855A2B]',
        badge: 'text-[#855A2B] dark:text-[#D1A166]',
        heroOverlay: 'from-[#14110E]/85 via-[#14110E]/45 to-transparent',
        heroKicker: 'text-[#DEC08F] font-semibold',
        statCard: 'bg-[#FAF7F2] dark:bg-[#161412] border-[#E6DFD3] dark:border-[#2A241E]',
      };
    case 'midnight-navy':
      return {
        primary: 'bg-[#1D2D44] hover:bg-[#142032] text-white shadow-xs',
        primaryText: 'text-[#1D2D44] dark:text-[#8FB3D9]',
        accentBg: 'bg-[#2E476B] text-white',
        borderAccent: 'border-[#2E476B]',
        ringFocus: 'focus:ring-[#2E476B]',
        badge: 'text-[#1D2D44] dark:text-[#8FB3D9]',
        heroOverlay: 'from-[#0D131D]/88 via-[#0D131D]/50 to-transparent',
        heroKicker: 'text-[#A8C6E6] font-semibold',
        statCard: 'bg-[#F6F8FB] dark:bg-[#12161E] border-[#DCE2EC] dark:border-[#242C3A]',
      };
    case 'royal-maroon':
    default:
      return {
        primary: 'bg-[#6F2330] hover:bg-[#591B26] text-white shadow-xs',
        primaryText: 'text-[#6F2330] dark:text-[#DC8E9A]',
        accentBg: 'bg-[#96682E] text-white',
        borderAccent: 'border-[#6F2330]',
        ringFocus: 'focus:ring-[#6F2330]',
        badge: 'text-[#6F2330] dark:text-[#DC8E9A]',
        heroOverlay: 'from-[#161011]/85 via-[#161011]/45 to-transparent',
        heroKicker: 'text-[#DFBE88] font-semibold',
        statCard: 'bg-[#FAF7F2] dark:bg-[#161412] border-[#E6DFD3] dark:border-[#2A241E]',
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
    return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`;
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
