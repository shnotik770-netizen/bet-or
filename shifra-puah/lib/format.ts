type Addr = { street: string | null; houseNumber: string | null; apartment?: string | null; city: string | null };

export function hasAddress(y: Addr) {
  return !!y.street;
}

/** כתובת מלאה בשורה אחת, או "" אם אין */
export function fullAddress(y: Addr) {
  if (!y.street) return "";
  return [`${y.street}${y.houseNumber ? ` ${y.houseNumber}` : ""}`, y.apartment, y.city].filter(Boolean).join(", ");
}

/** קישור לניווט בוויז */
export function wazeLink(y: Addr) {
  return `https://waze.com/ul?q=${encodeURIComponent([y.street, y.houseNumber, y.city].filter(Boolean).join(" "))}&navigate=yes`;
}

/** טלפון לתצוגה: 050-1234567 */
export function fmtPhone(p: string) {
  return /^0\d{9}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : /^0\d{8}$/.test(p) ? `${p.slice(0, 2)}-${p.slice(2)}` : p;
}
