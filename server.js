/**
 * בית אור – שרת שיבוץ שיעורים למרחב הלמידה (בנות מנחם).
 * Node ללא תלויות. מגיש את public/index.html ומממש API ב-POST /api/<פעולה>.
 * הנתונים נשמרים בקובץ JSON בתיקייה DATA_DIR (ב-Railway: volume ב-/data).
 *
 * כניסה: מורה מקלידה את מספר הטלפון שלה (כפי שהוזן ברשימת המורות בצד הניהול).
 * הנהלה: קוד ניהול (משתנה הסביבה ADMIN_CODE).
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
  // כמה ימים קדימה פתוח לשיבוץ (שבוע וחצי)
  DAYS_AHEAD: 10,
  // 0=ראשון ... 5=שישי
  SCHOOL_DAYS: [0, 1, 2, 3, 4, 5],
  // מספר השיעורים בכל יום (שעות השיעורים נקבעות בצד הניהול)
  LESSON_COUNT: 6,
  // כמה ימים אחורה שיעור שעבר מופיע כ"ממתין למשוב"
  FEEDBACK_DAYS: 60,
};

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ADMIN_CODE = process.env.ADMIN_CODE || '';

/* ---------- Storage ---------- */

fs.mkdirSync(DATA_DIR, { recursive: true });
let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {};
db.teachers = db.teachers || [];
db.bookings = db.bookings || [];
db.sessions = db.sessions || {};
// הגדרות שהמנהלת קובעת: תקופת הפעילות, ימי חופש ושעות השיעורים
db.settings = Object.assign({ startDate: '', endDate: '', vacations: [], lessonTimes: [], weeklyLimit: 0 }, db.settings);

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

/** The visible range: from the Sunday of the first school week through the Saturday after the last open day. */
function windowNow() {
  const today = todayStr();
  const last = addDays(today, CONFIG.DAYS_AHEAD);
  const start = dow(today) === 6 ? addDays(today, 1) : addDays(today, -dow(today));
  return { today, last, start, end: addDays(last, 6 - dow(last)) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function lessons() {
  const times = db.settings.lessonTimes || [];
  return Array.from({ length: CONFIG.LESSON_COUNT }, (_, i) => ({ id: i + 1, name: 'שיעור ' + (i + 1), time: times[i] || '' }));
}

/** Why a day is closed ('' if open): vacation name, or outside the active period. */
function closedReason(date) {
  const st = db.settings;
  if (st.startDate && date < st.startDate) return 'לפני תחילת הפעילות';
  if (st.endDate && date > st.endDate) return 'אחרי סיום הפעילות';
  const v = st.vacations.find(x => date >= x.from && date <= x.to);
  return v ? v.name || 'חופש' : '';
}

function closedDatesBetween(start, end) {
  const out = {};
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const r = closedReason(d);
    if (r) out[d] = r;
  }
  return out;
}

function isBookable(date, w) {
  if (!DATE_RE.test(date)) return false;
  if (date < w.today || date > w.last) return false;
  if (CONFIG.SCHOOL_DAYS.indexOf(dow(date)) < 0) return false;
  return !closedReason(date);
}

/* ---------- Calendar (Hebcal, Israel) ---------- */

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
      if (it.category === 'parashat') out.parashot[d] = /^פרשת/.test(title) ? title : 'פרשת ' + title;
      else (out.holidays[d] = out.holidays[d] || []).push(title);
    });
    calCache.set(key, { value: out, until: Date.now() + 6 * 3600 * 1000 });
  } catch (e) {
    console.error('Hebcal:', e.message);
  }
  return out;
}

/* ---------- Helpers ---------- */

class UserError extends Error {}
class AuthError extends UserError {}
const fail = (msg) => { throw new UserError(msg); };

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}
/** Like clean() but keeps line breaks (for feedback text). */
function cleanMultiline(v, max) {
  return String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

/** Normalize an Israeli phone number to 0XXXXXXXXX, or '' if invalid. */
function normPhone(v) {
  let d = String(v == null ? '' : v).replace(/\D/g, '');
  if (d.startsWith('972')) d = '0' + d.slice(3);
  if (d && d[0] !== '0') d = '0' + d;
  return /^0\d{8,9}$/.test(d) ? d : '';
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function teacherById(id) { return db.teachers.find(t => t.id === id); }

function publicBooking(b, ctx) {
  return {
    id: b.id, date: b.date, lesson: b.lesson, teacher: b.teacher, className: b.className, topic: b.topic,
    mine: !!(ctx && ctx.teacher) && b.teacherId === ctx.teacher.id,
    hasFeedback: !!(b.feedback && b.feedback.text),
  };
}

function requireTeacher(ctx) { if (!ctx.teacher) throw new AuthError('יש להיכנס עם מספר הטלפון'); }
/** Effective weekly limit for a teacher (0 = unlimited): her personal limit, else the general one. */
function weeklyLimitOf(t) {
  if (t && t.weeklyLimit > 0) return t.weeklyLimit;
  return db.settings.weeklyLimit > 0 ? db.settings.weeklyLimit : 0;
}
function weekStartOf(date) { return addDays(date, -dow(date)); }
function countInWeek(teacherId, date) {
  const ws = weekStartOf(date), we = addDays(ws, 6);
  return db.bookings.filter(b => b.teacherId === teacherId && b.date >= ws && b.date <= we).length;
}
/** Parse an admin-entered limit: '' or 0 = none, otherwise 1..30. */
function parseLimit(v) {
  if (v === '' || v == null) return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 30) fail('מגבלת השעות צריכה להיות מספר שלם בין 0 ל־30');
  return n;
}

function requireView(ctx) { if (!ctx.teacher && !ctx.admin && !ctx.guest) throw new AuthError('יש להיכנס עם מספר הטלפון'); }
function requireAny(ctx) { if (!ctx.teacher && !ctx.admin) throw new AuthError('יש להיכנס עם מספר הטלפון'); }
function requireAdmin(ctx) { if (!ctx.admin) throw new AuthError('קוד ניהול שגוי'); }
function canManage(ctx, b) { return ctx.admin || (ctx.teacher && b.teacherId === ctx.teacher.id); }

function resolveCtx(auth) {
  auth = auth || {};
  const ctx = { teacher: null, admin: false, guest: !!auth.guest };
  if (ADMIN_CODE && auth.adminCode && safeEqual(auth.adminCode, ADMIN_CODE)) ctx.admin = true;
  const s = auth.token && Object.prototype.hasOwnProperty.call(db.sessions, auth.token) ? db.sessions[auth.token] : null;
  if (s) {
    const t = teacherById(s.teacherId);
    if (t && t.active) ctx.teacher = t;
  }
  return ctx;
}

function adminData() {
  const w = windowNow();
  const from = addDays(w.today, -CONFIG.FEEDBACK_DAYS);
  return {
    today: w.today,
    teachers: db.teachers.map(t => ({ id: t.id, name: t.name, phone: t.phone, active: t.active, weeklyLimit: t.weeklyLimit || 0 })),
    settings: db.settings,
    lessonCount: CONFIG.LESSON_COUNT,
    bookings: db.bookings.filter(b => b.date >= from).map(b => publicBooking(b, null))
      .sort((a, b) => (a.date + a.lesson).localeCompare(b.date + b.lesson)),
  };
}

/* ---------- Login rate limit ---------- */

const attempts = new Map();
function checkRate(ip) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || a.reset < now) { attempts.set(ip, { n: 0, reset: now + 15 * 60 * 1000 }); return; }
  if (a.n >= 15) fail('יותר מדי ניסיונות כניסה. נסי שוב בעוד כמה דקות');
}
function noteFailure(ip) { const a = attempts.get(ip); if (a) a.n++; }

/* ---------- API ---------- */

const api = {
  login(ctx, phone, meta) {
    checkRate(meta.ip);
    const p = normPhone(phone);
    const t = p && db.teachers.find(x => x.phone === p && x.active);
    if (!t) { noteFailure(meta.ip); fail('המספר לא נמצא ברשימת המורות. אם זו טעות, פני לאחראית המרחב'); }
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { teacherId: t.id, createdAt: new Date().toISOString() };
    save();
    return { token, me: { id: t.id, name: t.name } };
  },

  logout(ctx, _x, meta) {
    if (meta.token && db.sessions[meta.token]) { delete db.sessions[meta.token]; save(); }
    return true;
  },

  async getState(ctx) {
    requireView(ctx);
    const w = windowNow();
    return {
      me: ctx.teacher ? { id: ctx.teacher.id, name: ctx.teacher.name, weeklyLimit: weeklyLimitOf(ctx.teacher) } : null,
      admin: ctx.admin,
      guest: !ctx.teacher && !ctx.admin,
      window: w,
      config: {
        schoolName: CONFIG.SCHOOL_NAME, spaceName: CONFIG.SPACE_NAME, daysAhead: CONFIG.DAYS_AHEAD,
        schoolDays: CONFIG.SCHOOL_DAYS, lessons: lessons(), closedDates: closedDatesBetween(w.start, w.end),
      },
      teachers: ctx.admin ? db.teachers.filter(t => t.active).map(t => ({ id: t.id, name: t.name })) : [],
      bookings: db.bookings.filter(b => b.date >= w.start && b.date <= w.end).map(b => publicBooking(b, ctx)),
      calendar: await getCalendar(w.start, w.end),
    };
  },

  book(ctx, req) {
    requireAny(ctx);
    req = req || {};
    let t = ctx.teacher;
    if (ctx.admin && req.teacherId) t = teacherById(String(req.teacherId));
    if (!t) fail('יש לבחור מורה');
    const date = String(req.date || '');
    const lesson = Number(req.lesson);
    const className = clean(req.className, 30);
    const topic = clean(req.topic, 120);
    if (!className) fail('יש למלא כיתה');
    if (!(lesson >= 1 && lesson <= CONFIG.LESSON_COUNT)) fail('שיעור לא תקין');
    if (!isBookable(date, windowNow())) fail('לא ניתן להשתבץ בתאריך זה');
    // No await between the check and the write, so concurrent requests cannot double-book.
    const taken = db.bookings.find(b => b.date === date && b.lesson === lesson);
    if (taken) fail('השעה הזו כבר תפוסה – ' + taken.teacher + ' השתבצה אליה');
    const limit = weeklyLimitOf(t);
    if (limit && !ctx.admin && countInWeek(t.id, date) >= limit) {
      fail('הגעת למכסה של ' + (limit === 1 ? 'שעה אחת' : limit + ' שעות') + ' בשבוע הזה. אפשר לבטל שיבוץ אחר או לפנות להנהלה');
    }
    db.bookings.push({
      id: crypto.randomUUID(), date, lesson, teacherId: t.id, teacher: t.name, className, topic,
      createdAt: new Date().toISOString(),
    });
    save();
    return api.getState(ctx);
  },

  cancel(ctx, id) {
    requireAny(ctx);
    const b = db.bookings.find(x => x.id === String(id || ''));
    if (!b) fail('השיבוץ לא נמצא (אולי כבר בוטל)');
    if (!canManage(ctx, b)) fail('אפשר לבטל רק שיבוץ שלך');
    if (b.date < windowNow().today && !ctx.admin) fail('לא ניתן לבטל שיעור שכבר עבר');
    db.bookings = db.bookings.filter(x => x !== b);
    save();
    return api.getState(ctx);
  },

  /** דף המשובים: כל המשובים, ושיעורים שעברו וממתינים למשוב. */
  async getFeedback(ctx) {
    requireAny(ctx);
    const w = windowNow();
    const from = addDays(w.today, -CONFIG.FEEDBACK_DAYS);
    const has = b => !!(b.feedback && b.feedback.text);
    const feed = db.bookings.filter(has);
    const pending = db.bookings.filter(b => !has(b) && b.date <= w.today && b.date >= from && canManage(ctx, b));
    const all = feed.concat(pending);
    let calendar = { parashot: {}, holidays: {} };
    if (all.length) {
      const min = all.reduce((m, b) => (b.date < m ? b.date : m), w.today);
      calendar = await getCalendar(addDays(min, -dow(min)), addDays(w.today, 6 - dow(w.today)));
    }
    const out = b => Object.assign(publicBooking(b, ctx), { feedback: b.feedback || null, canEdit: canManage(ctx, b) });
    const byDateDesc = (a, b) => (b.date + b.lesson).localeCompare(a.date + a.lesson);
    return {
      today: w.today,
      lessons: lessons(),
      feed: feed.map(out).sort(byDateDesc),
      pending: pending.map(out).sort(byDateDesc),
      calendar,
    };
  },

  /** כתיבה/עריכה של משוב על שיעור שעבר. טקסט ריק מוחק את המשוב. */
  saveFeedback(ctx, req) {
    requireAny(ctx);
    req = req || {};
    const b = db.bookings.find(x => x.id === String(req.id || ''));
    if (!b) fail('השיעור לא נמצא');
    if (!canManage(ctx, b)) fail('רק המורה שלימדה את השיעור יכולה לכתוב עליו משוב');
    if (b.date > windowNow().today) fail('אפשר לכתוב משוב רק אחרי שהשיעור התקיים');
    const text = cleanMultiline(req.text, 2000);
    if (!text) {
      delete b.feedback;
    } else {
      const rating = Number(req.rating);
      const now = new Date().toISOString();
      b.feedback = {
        text,
        rating: rating >= 1 && rating <= 5 ? Math.round(rating) : null,
        createdAt: (b.feedback && b.feedback.createdAt) || now,
        updatedAt: now,
      };
    }
    save();
    return api.getFeedback(ctx);
  },

  /* ----- Admin ----- */

  adminLogin(ctx) { requireAdmin(ctx); return adminData(); },

  adminSaveTeacher(ctx, teacher) {
    requireAdmin(ctx);
    teacher = teacher || {};
    const name = clean(teacher.name, 40);
    const phone = normPhone(teacher.phone);
    const active = teacher.active !== false;
    const weeklyLimit = parseLimit(teacher.weeklyLimit);
    if (!name) fail('יש למלא שם');
    if (!phone) fail('מספר הטלפון לא תקין');
    const existing = teacher.id ? teacherById(String(teacher.id)) : null;
    if (teacher.id && !existing) fail('המורה לא נמצאה');
    if (db.teachers.some(t => t !== existing && t.name === name)) fail('כבר קיימת מורה בשם הזה');
    const dup = db.teachers.find(t => t !== existing && t.phone === phone);
    if (dup) fail('מספר הטלפון כבר שייך ל' + dup.name);
    if (existing) {
      existing.name = name; existing.phone = phone; existing.active = active; existing.weeklyLimit = weeklyLimit;
      db.bookings.forEach(b => { if (b.teacherId === existing.id) b.teacher = name; });
    } else {
      db.teachers.push({ id: crypto.randomUUID(), name, phone, active, weeklyLimit });
    }
    save();
    return adminData();
  },

  /** הוספת רשימה: שורה לכל מורה, "שם, טלפון" (גם טאב או מקף מפרידים). */
  adminAddTeachers(ctx, lines) {
    requireAdmin(ctx);
    const errors = [];
    let added = 0;
    (Array.isArray(lines) ? lines : []).forEach(line => {
      line = clean(line, 120);
      if (!line) return;
      const m = line.match(/^(.*?)[\s,;\t–-]*((?:\+?972|0)[\d\s-]{8,14})\s*$/);
      const name = m ? clean(m[1].replace(/[,;\t–-]+$/, ''), 40) : '';
      const phone = m ? normPhone(m[2]) : '';
      if (!name || !phone) { errors.push(line + ' – חסר שם או טלפון תקין'); return; }
      if (db.teachers.some(t => t.phone === phone)) { errors.push(line + ' – הטלפון כבר קיים'); return; }
      if (db.teachers.some(t => t.name === name)) { errors.push(line + ' – השם כבר קיים'); return; }
      db.teachers.push({ id: crypto.randomUUID(), name, phone, active: true });
      added++;
    });
    save();
    return Object.assign(adminData(), { added, errors });
  },

  adminDeleteTeacher(ctx, id) {
    requireAdmin(ctx);
    const t = teacherById(String(id || ''));
    if (!t) fail('המורה לא נמצאה');
    db.teachers = db.teachers.filter(x => x !== t);
    Object.keys(db.sessions).forEach(k => { if (db.sessions[k].teacherId === t.id) delete db.sessions[k]; });
    save();
    return adminData();
  },

  /** תקופת הפעילות ושעות השיעורים. */
  adminSaveSettings(ctx, req) {
    requireAdmin(ctx);
    req = req || {};
    const startDate = String(req.startDate || '');
    const endDate = String(req.endDate || '');
    if (startDate && !DATE_RE.test(startDate)) fail('תאריך התחלה לא תקין');
    if (endDate && !DATE_RE.test(endDate)) fail('תאריך סיום לא תקין');
    if (startDate && endDate && endDate < startDate) fail('תאריך הסיום לפני תאריך ההתחלה');
    db.settings.startDate = startDate;
    db.settings.endDate = endDate;
    if (req.weeklyLimit !== undefined) db.settings.weeklyLimit = parseLimit(req.weeklyLimit);
    if (Array.isArray(req.lessonTimes)) {
      db.settings.lessonTimes = Array.from({ length: CONFIG.LESSON_COUNT }, (_, i) => clean(req.lessonTimes[i], 20));
    }
    save();
    return adminData();
  },

  /** ימי חופש: יום בודד או טווח, עם שם (למשל "חנוכה"). */
  adminAddVacation(ctx, req) {
    requireAdmin(ctx);
    req = req || {};
    const from = String(req.from || '');
    const to = String(req.to || '') || from;
    const name = clean(req.name, 40) || 'חופש';
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) fail('יש לבחור תאריך');
    if (to < from) fail('תאריך הסיום לפני תאריך ההתחלה');
    db.settings.vacations.push({ id: crypto.randomUUID(), from, to, name });
    db.settings.vacations.sort((a, b) => a.from.localeCompare(b.from));
    save();
    return adminData();
  },

  adminDeleteVacation(ctx, id) {
    requireAdmin(ctx);
    db.settings.vacations = db.settings.vacations.filter(v => v.id !== id);
    save();
    return adminData();
  },

  /** חגים מהלוח העברי בחודשים הקרובים – כהצעה להוספה כימי חופש. */
  async adminHolidaySuggestions(ctx) {
    requireAdmin(ctx);
    const w = windowNow();
    const cal = await getCalendar(w.today, addDays(w.today, 300));
    return Object.keys(cal.holidays).sort()
      .filter(d => CONFIG.SCHOOL_DAYS.indexOf(dow(d)) >= 0)
      .map(d => ({ date: d, names: cal.holidays[d].filter(n => !/^ראש חודש/.test(n)) }))
      .filter(x => x.names.length);
  },

  adminCancel(ctx, id) {
    requireAdmin(ctx);
    api.cancel(ctx, id);
    return adminData();
  },
};

/* ---------- HTTP ---------- */

const INDEX_FILE = path.join(__dirname, 'public', 'index.html');

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return send(res, 200, fs.readFileSync(INDEX_FILE), 'text/html; charset=utf-8');
  }
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, '{"ok":true}');

  const m = url.pathname.match(/^\/api\/(\w+)$/);
  if (req.method === 'POST' && m && Object.prototype.hasOwnProperty.call(api, m[1])) {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 100000) req.destroy(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const auth = payload.auth || {};
        const ctx = resolveCtx(auth);
        const meta = { ip: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), token: auth.token };
        const args = Array.isArray(payload.args) ? payload.args : [];
        const result = await api[m[1]](ctx, args[0], m[1] === 'login' || m[1] === 'logout' ? meta : args[1]);
        send(res, 200, JSON.stringify({ ok: true, result }));
      } catch (e) {
        if (!(e instanceof UserError)) console.error(e);
        const status = e instanceof AuthError ? 401 : e instanceof UserError ? 400 : 500;
        send(res, status, JSON.stringify({ ok: false, auth: e instanceof AuthError, error: e instanceof UserError ? e.message : 'שגיאת שרת' }));
      }
    });
    return;
  }
  send(res, 404, 'Not found', 'text/plain; charset=utf-8');
});

server.listen(PORT, () => {
  console.log('בית אור listening on :' + PORT + ' (data: ' + DB_FILE + ')' + (ADMIN_CODE ? '' : ' – ADMIN_CODE not set, admin disabled'));
});
