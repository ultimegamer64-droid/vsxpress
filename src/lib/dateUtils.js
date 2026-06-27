// timezone: America/Port-au-Prince (UTC-5 / UTC-4 DST)

export const toDateSafe = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  let s = String(value);
  const hasTime = s.includes('T');
  const hasZ = s.endsWith('Z');
  const hasOffset = /[+-]\d{2}:?\d{2}$/.test(s);

  if (hasTime && !hasZ && !hasOffset) s += 'Z';

  const date = new Date(s);
  return isNaN(date.getTime()) ? null : date;
};

export const formatDateLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date);
  } catch { return ''; }
};

export const formatTimeLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  } catch { return ''; }
};

export const formatDateTimeLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  } catch { return ''; }
};

export const formatDateTimeLongLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
  } catch { return ''; }
};

export const formatDateLongLocal = (value, locale = 'fr-FR') => {
  const date = toDateSafe(value);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
  } catch { return ''; }
};

export const getTodayHaitiString = () => {
  const haitiDate = new Date().toLocaleString('en-US', {
    timeZone: 'America/Port-au-Prince'
  });
  const date = new Date(haitiDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const convertHaitiDateToISO = (haitiDateString) => {
  if (!haitiDateString) return null;

  const [year, month, day] = haitiDateString.split('-');
  const haitiDateStr = new Date(year, parseInt(month) - 1, parseInt(day)).toLocaleString('en-US', {
    timeZone: 'America/Port-au-Prince',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });

  const [m, d, y] = haitiDateStr.split('/');
  return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d))).toISOString();
};
