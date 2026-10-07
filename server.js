/**
 * בית אור – שרת Node לפריסה ב-Railway (ללא תלויות).
 * מגיש את src/Index.html ומממש את אותו API כמו src/Code.gs,
 * כשהנתונים נשמרים בקובץ JSON (DATA_DIR, למשל volume ב-/data).
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  SCHOOL_NAME: 'בנות מנחם',
  SPACE_NAME: 'בית אור',
  TIMEZONE: 'Asia/Jerusalem',
  DAYS_AHEAD: 10,
  SCHOOL_DAYS: [0, 1, 2, 3, 4, 5],
  LESSONS: [
    { id: 1, name: 'שיעור 1', time: '' },
    { id: 2, name: 'שיעור 2', time: '' },
    { id: 3, name: 'שיעור 3', time: '' },
    { id: 4, name: 'שיעור 4', time: '' },
    { id: 5, name: 'שיעור 5', time: '' },
  ],
  CLOSED_DATES: {},
};

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ADMIN_CODE = process.env.ADMIN_CODE || '';

/* ---------- Storage ---------- */

fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { teachers: [], bookings: [] };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_FILE);
}

/* ---------- Dates ---------- */

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function parseDate(s) { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
function addDays(s, n) { const d = parseDate(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function dow(s) { return parseDate(s).getUTCDay(); }

function windowNow() {
  const today = todayStr();
  const last = addDays(today, CONFIG.DAYS_AHEAD);
  const start = dow(today) === 6 ? addDays(today, 1) : addDays(today, -dow(today));
  return { today, last, start, end: addDays(last, 6 - dow(last)) };
}

function isBookable(date, w) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (date < w.today || date > w.last) return false;
  if (CONFIG.SCHOOL_DAYS.indexOf(dow(date)) < 0) return false;
  return !CONFIG.CLOSED_DATES[date];
}

/* ---------- Calendar (Hebcal) ---------- */

const calCache = new Map();
async function getCalendar(start, end) {
  const key = start + ':' + end;
  const hit = calCache.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const out = { parashot: {}, holidays: {} };
  try {
    const url = 'https://www.hebcal.com/hebcal?v=1&cfg=json&i=on&lg=he&s=on&maj=on&min=on&mod=on&nx=on&ss=off&mf=off&c=off' +
      '&start=' + start + '&end=' + addDays(end, 1);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return out;
    ((await res.json()).items || []).forEach(it => {
      const d = String(it.date).slice(0, 10);
      const title = it.hebrew || it.title;
      if (it.category === 'parashat') out.parashot[d] = title;
      else (out.holidays[d] = out.holidays[d] || []).push(title);
    });
    calCache.set(key, { value: out, until: Date.now() + 6 * 3600 * 1000 });
  } catch (e) {
    console.error('Hebcal:', e.message);
  }
  return out;
}

/* ---------- API ---------- */

class UserError extends Error {}
const fail = (msg) => { throw new UserError(msg); };

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}
function publicBooking(b, ownerKey) {
  return {
    id: b.id, date: b.date, lesson: b.lesson, teacher: b.teacher, className: b.className, topic: b.topic,
    mine: !!ownerKey && b.ownerKey === ownerKey,
  };
}
function isAdmin(code) {
  if (!ADMIN_CODE || !code) return false;
  const a = Buffer.from(String(code)), b = Buffer.from(ADMIN_CODE);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function requireAdmin(code) { if (!isAdmin(code)) fail('קוד ניהול שגוי'); }

function adminData() {
  const w = windowNow();
  const from = addDays(w.today, -60);
  return {
    today: w.today,
    teachers: db.teachers,
    bookings: db.bookings.filter(b => b.date >= from).map(b => publicBooking(b, null))
      .sort((a, b) => (a.date + a.lesson).localeCompare(b.date + b.lesson)),
  };
}

const api = {
  async getState(ownerKey) {
    const w = windowNow();
    return {
      window: w,
      config: {
        schoolName: CONFIG.SCHOOL_NAME, spaceName: CONFIG.SPACE_NAME, daysAhead: CONFIG.DAYS_AHEAD,
        schoolDays: CONFIG.SCHOOL_DAYS, lessons: CONFIG.LESSONS, closedDates: CONFIG.CLOSED_DATES,
      },
      teachers: db.teachers.filter(t => t.active).map(t => ({ name: t.name, hasPin: !!t.pin })),
      bookings: db.bookings.filter(b => b.date >= w.start && b.date <= w.end).map(b => publicBooking(b, ownerKey)),
      calendar: await getCalendar(w.start, w.end),
    };
  },

  book(req) {
    req = req || {};
    const date = String(req.date || '');
    const lesson = Number(req.lesson);
    const teacher = clean(req.teacher, 40);
    const className = clean(req.className, 30);
    const topic = clean(req.topic, 120);
    const ownerKey = clean(req.ownerKey, 64);
    if (!teacher) fail('יש לבחור שם מורה');
    if (!className) fail('יש למלא כיתה');
    if (!ownerKey) fail('שגיאה בזיהוי הדפדפן, נסי לרענן את הדף');
    if (!CONFIG.LESSONS.some(l => l.id === lesson)) fail('שיעור לא תקין');
    if (!isBookable(date, windowNow())) fail('לא ניתן להשתבץ בתאריך זה');
    if (db.teachers.length) {
      const t = db.teachers.find(x => x.name === teacher && x.active);
      if (!t) fail('המורה לא נמצאת ברשימה');
      if (t.pin && String(req.pin || '') !== t.pin) fail('הקוד האישי שגוי');
    }
    // Node handles one request at a time here (no await between check and write), so this is race-free.
    const taken = db.bookings.find(b => b.date === date && b.lesson === lesson);
    if (taken) fail('השעה הזו כבר תפוסה – ' + taken.teacher + ' השתבצה אליה');
    db.bookings.push({ id: crypto.randomUUID(), date, lesson, teacher, className, topic, ownerKey, createdAt: new Date().toISOString() });
    save();
    return api.getState(ownerKey);
  },

  cancel(req) {
    req = req || {};
    const b = db.bookings.find(x => x.id === String(req.id || ''));
    if (!b) fail('השיבוץ לא נמצא (אולי כבר בוטל)');
    const t = db.teachers.find(x => x.name === b.teacher);
    const allowed = (req.ownerKey && req.ownerKey === b.ownerKey) ||
      (t && t.pin && String(req.pin || '') === t.pin) || isAdmin(req.adminCode);
    if (!allowed) fail('אין הרשאה לבטל שיבוץ זה');
    db.bookings = db.bookings.filter(x => x !== b);
    save();
    return api.getState(req.ownerKey);
  },

  adminLogin(code) { requireAdmin(code); return adminData(); },

  adminSaveTeacher(code, teacher, originalName) {
    requireAdmin(code);
    const name = clean(teacher && teacher.name, 40);
    const pin = clean(teacher && teacher.pin, 12);
    const active = !teacher || teacher.active !== false;
    if (!name) fail('יש למלא שם');
    if (pin && !/^\d{3,12}$/.test(pin)) fail('הקוד האישי צריך להיות ספרות בלבד (3 לפחות)');
    const idx = originalName ? db.teachers.findIndex(t => t.name === originalName) : -1;
    if (db.teachers.some((t, i) => t.name === name && i !== idx)) fail('כבר קיימת מורה בשם הזה');
    if (idx >= 0) {
      db.teachers[idx] = { name, pin, active };
      if (originalName !== name) db.bookings.forEach(b => { if (b.teacher === originalName) b.teacher = name; });
    } else {
      db.teachers.push({ name, pin, active });
    }
    save();
    return adminData();
  },

  adminAddTeachers(code, names) {
    requireAdmin(code);
    (Array.isArray(names) ? names : []).forEach(n => {
      const name = clean(n, 40);
      if (name && !db.teachers.some(t => t.name === name)) db.teachers.push({ name, pin: '', active: true });
    });
    save();
    return adminData();
  },

  adminDeleteTeacher(code, name) {
    requireAdmin(code);
    const before = db.teachers.length;
    db.teachers = db.teachers.filter(t => t.name !== name);
    if (db.teachers.length === before) fail('המורה לא נמצאה');
    save();
    return adminData();
  },

  adminCancel(code, id) {
    requireAdmin(code);
    api.cancel({ id, adminCode: code });
    return adminData();
  },
};

/* ---------- HTTP ---------- */

const INDEX = fs.readFileSync(path.join(__dirname, 'src', 'Index.html'), 'utf8')
  .replace('<script>', '<script>window.BEITOR_SERVER = true;</script>\n<script>');

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return send(res, 200, INDEX, 'text/html; charset=utf-8');
  }
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, '{"ok":true}');

  const m = url.pathname.match(/^\/api\/(\w+)$/);
  if (req.method === 'POST' && m && Object.prototype.hasOwnProperty.call(api, m[1])) {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 100000) req.destroy(); });
    req.on('end', async () => {
      try {
        const args = (JSON.parse(body || '{}').args) || [];
        send(res, 200, JSON.stringify({ ok: true, result: await api[m[1]].apply(null, args) }));
      } catch (e) {
        if (!(e instanceof UserError)) console.error(e);
        send(res, e instanceof UserError ? 400 : 500, JSON.stringify({ ok: false, error: e instanceof UserError ? e.message : 'שגיאת שרת' }));
      }
    });
    return;
  }
  send(res, 404, 'Not found', 'text/plain; charset=utf-8');
}).listen(PORT, () => {
  console.log('בית אור listening on :' + PORT + ' (data: ' + DB_FILE + ')' + (ADMIN_CODE ? '' : ' – ADMIN_CODE not set, admin disabled'));
});
