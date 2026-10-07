/**
 * בית אור – מערכת שיבוץ שיעורים למרחב הלמידה
 * בית הספר בנות מנחם
 *
 * הנתונים נשמרים בגיליון Google Sheets:
 *   "שיבוצים" – כל שיבוץ בשורה
 *   "מורות"   – רשימת המורות (מנוהלת מצד הניהול באתר)
 */

const CONFIG = {
  SCHOOL_NAME: 'בנות מנחם',
  SPACE_NAME: 'בית אור',
  TIMEZONE: 'Asia/Jerusalem',
  // כמה ימים קדימה פתוח לשיבוץ (שבוע וחצי)
  DAYS_AHEAD: 10,
  // 0=ראשון ... 5=שישי
  SCHOOL_DAYS: [0, 1, 2, 3, 4, 5],
  // השיעורים בכל יום. אפשר להוסיף שעות, למשל: time: '08:00–08:45'
  LESSONS: [
    { id: 1, name: 'שיעור 1', time: '' },
    { id: 2, name: 'שיעור 2', time: '' },
    { id: 3, name: 'שיעור 3', time: '' },
    { id: 4, name: 'שיעור 4', time: '' },
    { id: 5, name: 'שיעור 5', time: '' },
  ],
  // ימים שבהם המרחב סגור, למשל: { '2026-12-10': 'טיול שנתי' }
  CLOSED_DATES: {},
  BOOKINGS_SHEET: 'שיבוצים',
  TEACHERS_SHEET: 'מורות',
};

const BOOKING_HEADERS = ['מזהה', 'תאריך', 'שיעור', 'מורה', 'כיתה', 'נושא', 'מפתח', 'נוצר'];
const TEACHER_HEADERS = ['שם', 'קוד אישי', 'פעילה'];

/* ---------- Web app ---------- */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(CONFIG.SPACE_NAME + ' · שיבוץ שיעורים')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** הרצה חד-פעמית מהעורך: יוצרת את הגיליונות וקוד ניהול. */
function setup() {
  getSheet_(CONFIG.BOOKINGS_SHEET);
  getSheet_(CONFIG.TEACHERS_SHEET);
  const props = PropertiesService.getScriptProperties();
  let code = props.getProperty('ADMIN_CODE');
  if (!code) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    props.setProperty('ADMIN_CODE', code);
  }
  Logger.log('הגיליון מוכן. קוד הניהול: ' + code);
}

/* ---------- Public API (called from the page) ---------- */

function getState(ownerKey) {
  const w = window_();
  const teachers = readTeachers_();
  const pinOf = {};
  teachers.forEach(t => { pinOf[t.name] = t.pin; });
  const bookings = readBookings_()
    .filter(b => b.date >= w.start && b.date <= w.end)
    .map(b => publicBooking_(b, ownerKey));
  return {
    window: w,
    config: {
      schoolName: CONFIG.SCHOOL_NAME,
      spaceName: CONFIG.SPACE_NAME,
      daysAhead: CONFIG.DAYS_AHEAD,
      schoolDays: CONFIG.SCHOOL_DAYS,
      lessons: CONFIG.LESSONS,
      closedDates: CONFIG.CLOSED_DATES,
    },
    teachers: teachers.filter(t => t.active).map(t => ({ name: t.name, hasPin: !!t.pin })),
    bookings: bookings,
    calendar: getCalendar_(w.start, w.end),
  };
}

function book(req) {
  req = req || {};
  const date = String(req.date || '');
  const lesson = Number(req.lesson);
  const teacher = clean_(req.teacher, 40);
  const className = clean_(req.className, 30);
  const topic = clean_(req.topic, 120);
  const ownerKey = clean_(req.ownerKey, 64);

  if (!teacher) throw new Error('יש לבחור שם מורה');
  if (!className) throw new Error('יש למלא כיתה');
  if (!ownerKey) throw new Error('שגיאה בזיהוי הדפדפן, נסי לרענן את הדף');
  if (!CONFIG.LESSONS.some(l => l.id === lesson)) throw new Error('שיעור לא תקין');
  const w = window_();
  if (!isBookable_(date, w)) throw new Error('לא ניתן להשתבץ בתאריך זה');

  const teachers = readTeachers_();
  if (teachers.length) {
    const t = teachers.find(x => x.name === teacher && x.active);
    if (!t) throw new Error('המורה לא נמצאת ברשימה');
    if (t.pin && String(req.pin || '') !== t.pin) throw new Error('הקוד האישי שגוי');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const taken = readBookings_().find(b => b.date === date && b.lesson === lesson);
    if (taken) throw new Error('השעה הזו כבר תפוסה – ' + taken.teacher + ' השתבצה אליה');
    const sh = getSheet_(CONFIG.BOOKINGS_SHEET);
    sh.getRange(sh.getLastRow() + 1, 1, 1, BOOKING_HEADERS.length).setValues([[
      Utilities.getUuid(), text_(date), lesson, text_(teacher), text_(className), text_(topic),
      ownerKey, new Date(),
    ]]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getState(ownerKey);
}

/** ביטול: מאותו דפדפן שבו נעשה השיבוץ, או עם הקוד האישי של המורה, או עם קוד ניהול. */
function cancel(req) {
  req = req || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const found = findBookingRow_(String(req.id || ''));
    if (!found) throw new Error('השיבוץ לא נמצא (אולי כבר בוטל)');
    const b = found.booking;
    const t = readTeachers_().find(x => x.name === b.teacher);
    const allowed =
      (req.ownerKey && req.ownerKey === b.ownerKey) ||
      (t && t.pin && String(req.pin || '') === t.pin) ||
      isAdmin_(req.adminCode);
    if (!allowed) throw new Error('אין הרשאה לבטל שיבוץ זה');
    found.sheet.deleteRow(found.row);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getState(req.ownerKey);
}

/* ---------- Admin API ---------- */

function adminLogin(code) {
  if (!isAdmin_(code)) throw new Error('קוד ניהול שגוי');
  return adminData_();
}

function adminSaveTeacher(code, teacher, originalName) {
  requireAdmin_(code);
  const name = clean_(teacher && teacher.name, 40);
  const pin = clean_(teacher && teacher.pin, 12);
  const active = !teacher || teacher.active !== false;
  if (!name) throw new Error('יש למלא שם');
  if (pin && !/^\d{3,12}$/.test(pin)) throw new Error('הקוד האישי צריך להיות ספרות בלבד (3 לפחות)');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getSheet_(CONFIG.TEACHERS_SHEET);
    const teachers = readTeachers_();
    const idx = originalName ? teachers.findIndex(t => t.name === originalName) : -1;
    if (teachers.some((t, i) => t.name === name && i !== idx)) throw new Error('כבר קיימת מורה בשם הזה');
    const values = [[text_(name), text_(pin), active ? 'כן' : 'לא']];
    if (idx >= 0) {
      sh.getRange(idx + 2, 1, 1, TEACHER_HEADERS.length).setValues(values);
      if (originalName !== name) renameTeacherInBookings_(originalName, name);
    } else {
      sh.getRange(sh.getLastRow() + 1, 1, 1, TEACHER_HEADERS.length).setValues(values);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return adminData_();
}

/** הוספת רשימת מורות בבת אחת (שם בכל שורה). שמות קיימים מדולגים. */
function adminAddTeachers(code, names) {
  requireAdmin_(code);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const existing = {};
    readTeachers_().forEach(t => { existing[t.name] = true; });
    const rows = [];
    (names || []).forEach(n => {
      const name = clean_(n, 40);
      if (name && !existing[name]) { existing[name] = true; rows.push([text_(name), '', 'כן']); }
    });
    if (rows.length) {
      const sh = getSheet_(CONFIG.TEACHERS_SHEET);
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, TEACHER_HEADERS.length).setValues(rows);
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }
  return adminData_();
}

function adminDeleteTeacher(code, name) {
  requireAdmin_(code);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const idx = readTeachers_().findIndex(t => t.name === name);
    if (idx < 0) throw new Error('המורה לא נמצאה');
    getSheet_(CONFIG.TEACHERS_SHEET).deleteRow(idx + 2);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return adminData_();
}

function adminCancel(code, id) {
  requireAdmin_(code);
  cancel({ id: id, adminCode: code });
  return adminData_();
}

function adminData_() {
  const w = window_();
  const from = addDays_(w.today, -60);
  const bookings = readBookings_()
    .filter(b => b.date >= from)
    .map(b => publicBooking_(b, null))
    .sort((a, b) => (a.date + a.lesson).localeCompare(b.date + b.lesson));
  return { today: w.today, teachers: readTeachers_(), bookings: bookings };
}

/* ---------- Calendar (Hebcal) ---------- */

function getCalendar_(start, end) {
  const cache = CacheService.getScriptCache();
  const key = 'cal:' + start + ':' + end;
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const out = { parashot: {}, holidays: {} };
  try {
    const url = 'https://www.hebcal.com/hebcal?v=1&cfg=json&i=on&lg=he&s=on&maj=on&min=on&mod=on&nx=on&ss=off&mf=off&c=off' +
      '&start=' + start + '&end=' + addDays_(end, 1);
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return out;
    (JSON.parse(res.getContentText()).items || []).forEach(it => {
      const d = String(it.date).slice(0, 10);
      const title = it.hebrew || it.title;
      if (it.category === 'parashat') out.parashot[d] = title;
      else (out.holidays[d] = out.holidays[d] || []).push(title);
    });
    cache.put(key, JSON.stringify(out), 6 * 60 * 60);
  } catch (e) {
    Logger.log('Hebcal: ' + e);
  }
  return out;
}

/* ---------- Data helpers ---------- */

function getSheet_(name) {
  let ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { /* standalone script */ }
  if (!ss) {
    const props = PropertiesService.getScriptProperties();
    const id = props.getProperty('SPREADSHEET_ID');
    if (id) {
      ss = SpreadsheetApp.openById(id);
    } else {
      ss = SpreadsheetApp.create(CONFIG.SPACE_NAME + ' – שיבוצים');
      props.setProperty('SPREADSHEET_ID', ss.getId());
    }
  }
  let sh = ss.getSheetByName(name);
  if (!sh) {
    const headers = name === CONFIG.TEACHERS_SHEET ? TEACHER_HEADERS : BOOKING_HEADERS;
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  return sh;
}

function readBookings_() {
  const sh = getSheet_(CONFIG.BOOKINGS_SHEET);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, BOOKING_HEADERS.length).getValues().map(r => ({
    id: String(r[0]),
    date: r[1] instanceof Date ? Utilities.formatDate(r[1], CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(r[1]),
    lesson: Number(r[2]),
    teacher: String(r[3]),
    className: String(r[4]),
    topic: String(r[5]),
    ownerKey: String(r[6]),
  })).filter(b => b.id);
}

function readTeachers_() {
  const sh = getSheet_(CONFIG.TEACHERS_SHEET);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, TEACHER_HEADERS.length).getValues().map(r => ({
    name: String(r[0]).trim(),
    pin: String(r[1]).trim(),
    active: String(r[2]).trim() !== 'לא',
  }));
}

function findBookingRow_(id) {
  if (!id) return null;
  const sh = getSheet_(CONFIG.BOOKINGS_SHEET);
  const all = readBookings_();
  const i = all.findIndex(b => b.id === id);
  return i < 0 ? null : { sheet: sh, row: i + 2, booking: all[i] };
}

function renameTeacherInBookings_(from, to) {
  const sh = getSheet_(CONFIG.BOOKINGS_SHEET);
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const range = sh.getRange(2, 4, n, 1);
  const vals = range.getValues().map(r => [String(r[0]) === from ? text_(to) : text_(String(r[0]))]);
  range.setValues(vals);
}

function publicBooking_(b, ownerKey) {
  return {
    id: b.id, date: b.date, lesson: b.lesson, teacher: b.teacher,
    className: b.className, topic: b.topic,
    mine: !!ownerKey && b.ownerKey === ownerKey,
  };
}

function isAdmin_(code) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_CODE');
  return !!real && String(code || '') === real;
}

function requireAdmin_(code) {
  if (!isAdmin_(code)) throw new Error('קוד ניהול שגוי');
}

/** Strip control chars and trim to a max length. */
function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

/** Force Sheets to store the value as plain text (no formulas, no date parsing). */
function text_(v) {
  return v === '' ? '' : "'" + v;
}

/* ---------- Dates (yyyy-MM-dd strings) ---------- */

function todayStr_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function parseDate_(s) {
  const p = s.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
}

function addDays_(s, n) {
  const d = parseDate_(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dow_(s) {
  return parseDate_(s).getUTCDay();
}

/** The visible range: from the Sunday of the first school week through the Saturday after the last open day. */
function window_() {
  const today = todayStr_();
  const last = addDays_(today, CONFIG.DAYS_AHEAD);
  const start = dow_(today) === 6 ? addDays_(today, 1) : addDays_(today, -dow_(today));
  const end = addDays_(last, 6 - dow_(last));
  return { today: today, last: last, start: start, end: end };
}

function isBookable_(date, w) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (date < w.today || date > w.last) return false;
  if (CONFIG.SCHOOL_DAYS.indexOf(dow_(date)) < 0) return false;
  return !CONFIG.CLOSED_DATES[date];
}
