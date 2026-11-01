/** כתובת מלאה בשורה אחת */
export function fullAddress(y: { street: string; houseNumber: string; apartment?: string | null; city: string }) {
  return `${y.street} ${y.houseNumber}${y.apartment ? `, ${y.apartment}` : ""}, ${y.city}`;
}

/** קישור לניווט בוויז */
export function wazeLink(y: { street: string; houseNumber: string; city: string }) {
  return `https://waze.com/ul?q=${encodeURIComponent(`${y.street} ${y.houseNumber} ${y.city}`)}&navigate=yes`;
}

/** טלפון לתצוגה: 050-1234567 */
export function fmtPhone(p: string) {
  return /^0\d{9}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : /^0\d{8}$/.test(p) ? `${p.slice(0, 2)}-${p.slice(2)}` : p;
}
