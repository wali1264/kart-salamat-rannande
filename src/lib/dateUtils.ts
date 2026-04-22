import { toJalaali } from 'jalaali-js';

/**
 * Converts a Gregorian date string (YYYY-MM-DD) to a Jalali date string.
 * @param gregorianDate Gregorian date string or Date object
 * @returns Formatted Jalali date string (e.g., "1403/01/29")
 */
export function formatToJalali(gregorianDate: string | Date): string {
  try {
    const d = typeof gregorianDate === 'string' ? new Date(gregorianDate) : gregorianDate;
    if (isNaN(d.getTime())) return 'نامعتبر';
    
    const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    
    // Format numbers as English as requested previously, but maintain Persian structure
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting date to Jalali:', error);
    return 'خطا';
  }
}

/**
 * Gets the current date in Jalali format.
 */
export function getCurrentJalaliDate(): string {
  const now = new Date();
  const j = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
}
