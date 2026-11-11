/**
 * الربط عبر Google — متتبع نافس ولوحة المشرف وشاهد
 * يعمل على حساب المالك فقط: بياناته في جدول Google Sheets يُنشأ في Drive المالك.
 * ما يُحفظ: ملخصات المدارس (أرقام إجمالية)، ملاحظات المشرفين وردود المدارس، ونتائج المعلمين مشفرة بمفتاح المدرسة.
 * لا أسماء طلاب ولا سجلات مدنية ولا جوالات.
 *
 * الإعداد مرة واحدة:
 *  1) شغّل الدالة setup واقبل الصلاحيات، وانسخ «رمز المالك» من السجل (Execution log).
 *  2) نشر ← نشر جديد ← تطبيق ويب: «التنفيذ بصفتي» و«من يمكنه الوصول: أي شخص». انسخ رابط تطبيق الويب.
 *  3) في لوحة المشرف ← «الربط عبر Google»: الصق الرابط ورمز المالك.
 */
var VERSION = 1
var CHUNK = 45000

function setup() {
  var p = PropertiesService.getScriptProperties()
  var id = p.getProperty('SHEET'), ss
  if (id) { try { ss = SpreadsheetApp.openById(id) } catch (e) { ss = null } }
  if (!ss) { ss = SpreadsheetApp.create('متتبع نافس — بيانات الربط (لا تعدّلها يدويًا)'); p.setProperty('SHEET', ss.getId()) }
  ;['users', 'store'].forEach(function (n) { if (!ss.getSheetByName(n)) ss.insertSheet(n) })
  ss.getSheets().forEach(function (sh) { if (['users', 'store'].indexOf(sh.getName()) < 0 && ss.getSheets().length > 2) ss.deleteSheet(sh) })
  var admin = p.getProperty('ADMIN'); if (!admin) { admin = tok(); p.setProperty('ADMIN', admin) }
  Logger.log('رمز المالك (انسخه إلى لوحة المشرف ولا تشاركه): ' + admin)
  Logger.log('جدول البيانات: ' + ss.getUrl())
}
/** رمز مالك جديد (يُبطل القديم) */
function newAdminToken() { var t = tok(); PropertiesService.getScriptProperties().setProperty('ADMIN', t); Logger.log('رمز المالك الجديد: ' + t) }

function tok() { return 'k' + (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 39) }
/** كل نص يُخزن في الجدول يبدأ بـ ~ حتى لا يحوّله Sheets إلى رقم أو تاريخ أو صيغة */
function w(v) { return '~' + String(v == null ? '' : v) }
function r_(v) { var s = String(v == null ? '' : v); return s.charAt(0) === '~' ? s.slice(1) : s }
function book() { return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET')) }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON) }
function doGet() { return out({ ok: true, app: 'nafes-cloud', v: VERSION }) }

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    var me = auth(String(b.t || ''))
    if (!me) return out({ ok: false, error: 'رمز الربط غير صحيح أو أُلغي' })
    var lock = LockService.getScriptLock(); lock.waitLock(20000)
    try { return out(run(me, String(b.op || ''), b)) } finally { lock.releaseLock() }
  } catch (err) { return out({ ok: false, error: String(err && err.message || err) }) }
}

// ───────── المستخدمون: token | role | name | school | json | at ─────────
function users() {
  var v = book().getSheetByName('users').getDataRange().getValues()
  return v.filter(function (r) { return r[0] }).map(function (r, i) { var x = {}; try { x = JSON.parse(r_(r[4]) || '{}') } catch (e) {} ; return { row: i + 1, token: r_(r[0]), role: r_(r[1]), name: r_(r[2]), school: r_(r[3]), x: x, at: r_(r[5]) } })
}
function auth(t) {
  if (!t || t.length < 20) return null
  if (t === PropertiesService.getScriptProperties().getProperty('ADMIN')) return { role: 'admin', name: 'المالك', token: t }
  var u = users().filter(function (x) { return x.token === t })[0]
  return u || null
}
function putUser(u) {
  var sh = book().getSheetByName('users'), all = users(), cur = u.token && all.filter(function (x) { return x.token === u.token })[0]
  var token = u.token || tok()
  var row = [token, u.role, u.name || '', u.school || '', JSON.stringify(u.x || {}), new Date().toISOString()].map(w)
  if (cur) sh.getRange(cur.row, 1, 1, 6).setValues([row]); else sh.appendRow(row)
  return token
}
function delUser(t) { var u = users().filter(function (x) { return x.token === t })[0]; if (u) book().getSheetByName('users').deleteRow(u.row) }

// ───────── المخزن: kind | id | school | by | at | json (مقسّم على الأعمدة) ─────────
function rows(kind, school) {
  var sh = book().getSheetByName('store'), n = sh.getLastRow(); if (!n) return []
  var v = sh.getRange(1, 1, n, Math.max(6, sh.getLastColumn())).getValues(), res = []
  for (var i = 0; i < v.length; i++) {
    var r = v[i], k0 = r_(r[0]); if (!k0 || (kind && k0 !== kind) || (school !== undefined && r_(r[2]) !== school)) continue
    var j = ''; for (var c = 5; c < r.length && r[c] !== ''; c++) j += r_(r[c])
    var d = null; try { d = JSON.parse(j) } catch (e) {}
    res.push({ row: i + 1, kind: k0, id: r_(r[1]), school: r_(r[2]), by: r_(r[3]), at: r_(r[4]), data: d })
  }
  return res
}
function put(kind, id, school, by, data) {
  var sh = book().getSheetByName('store'), j = JSON.stringify(data), parts = []
  for (var i = 0; i < j.length; i += CHUNK) parts.push(j.slice(i, i + CHUNK))
  var row = [kind, id, school, by, new Date().toISOString()].concat(parts).map(w)
  var cur = rows(kind).filter(function (x) { return x.id === id })[0]
  if (cur) { sh.getRange(cur.row, 1, 1, sh.getLastColumn()).clearContent(); sh.getRange(cur.row, 1, 1, row.length).setValues([row]) }
  else sh.appendRow(row)
}
function del(kind, ids) {
  var sh = book().getSheetByName('store'), rs = rows(kind).filter(function (x) { return ids.indexOf(x.id) >= 0 }).map(function (x) { return x.row }).sort(function (a, b) { return b - a })
  rs.forEach(function (r) { sh.deleteRow(r) })
  return rs.length
}

// ───────── العمليات ─────────
function schoolsOf(me) {
  var all = users().filter(function (u) { return u.role === 'school' })
  if (me.role === 'admin') return all
  var mine = (me.x && me.x.schools) || []
  return all.filter(function (u) { return mine.indexOf(u.school) >= 0 })
}
function brief(u) { return { key: u.school, name: u.name, ministry: (u.x && u.x.ministry) || '', app: (u.x && u.x.app) || 'tracker' } }

function run(me, op, b) {
  if (op === 'whoami') {
    var r = { ok: true, role: me.role, name: me.name, v: VERSION }
    if (me.role === 'school' || me.role === 'teacher') { var s = users().filter(function (u) { return u.role === 'school' && u.school === me.school })[0]; r.school = s ? brief(s) : { key: me.school, name: '', ministry: '' } }
    return r
  }
  // ── المالك: المشرفون والمدارس ──
  if (op.indexOf('admin.') === 0) {
    if (me.role !== 'admin') return { ok: false, error: 'للمالك فقط' }
    if (op === 'admin.list') return { ok: true, users: users().filter(function (u) { return u.role !== 'teacher' }).map(function (u) { return { token: u.token, role: u.role, name: u.name, school: u.school, x: u.x, at: u.at } }) }
    if (op === 'admin.user') {
      var role = b.role === 'supervisor' ? 'supervisor' : 'school'
      var key = role === 'school' ? String(b.school || '').slice(0, 40) : ''
      if (role === 'school' && !/^\d{3,10}$/.test(key)) return { ok: false, error: 'الرقم الوزاري للمدرسة مطلوب (أرقام فقط)' }
      var existing = role === 'school' && !b.token ? users().filter(function (u) { return u.role === 'school' && u.school === key })[0] : null
      var t = putUser({ token: b.token || (existing && existing.token), role: role, name: String(b.name || '').slice(0, 120), school: key, x: role === 'school' ? { ministry: String(b.ministry || '').slice(0, 20), app: b.app === 'shahid' ? 'shahid' : 'tracker' } : { schools: (b.schools || []).map(String).slice(0, 200) } })
      return { ok: true, token: t }
    }
    if (op === 'admin.del') { delUser(String(b.token || '')); return { ok: true } }
  }
  // ── المشرف (والمالك): ملخصات مدارسه وملاحظاته ──
  if (op === 'sup.pull') {
    if (me.role !== 'admin' && me.role !== 'supervisor') return { ok: false, error: 'للمشرف فقط' }
    var sc = schoolsOf(me), keys = sc.map(function (u) { return u.school })
    return { ok: true, schools: sc.map(brief),
      summaries: rows('summary').filter(function (x) { return keys.indexOf(x.school) >= 0 }).map(function (x) { return x.data }),
      notes: rows('notes').filter(function (x) { return keys.indexOf(x.school) >= 0 }).map(function (x) { return { school: x.school, by: x.by, at: x.at, notes: x.data || [] } }) }
  }
  if (op === 'sup.notes') {
    if (me.role !== 'admin' && me.role !== 'supervisor') return { ok: false, error: 'للمشرف فقط' }
    var k = String(b.school || ''); if (schoolsOf(me).map(function (u) { return u.school }).indexOf(k) < 0) return { ok: false, error: 'المدرسة ليست ضمن مدارسك' }
    var by = me.role === 'admin' && b.as ? String(b.as).slice(0, 80) : me.name
    put('notes', k + '|' + by, k, by, (b.notes || []).slice(0, 500)); return { ok: true }
  }
  // ── المدرسة ──
  if (op === 'school.push') { if (me.role !== 'school') return { ok: false, error: 'للمدرسة فقط' }; put('summary', me.school, me.school, me.name, b.summary || {}); return { ok: true } }
  if (op === 'school.pull') {
    if (me.role !== 'school') return { ok: false, error: 'للمدرسة فقط' }
    var ns = []; rows('notes', me.school).forEach(function (x) { (x.data || []).forEach(function (n) { n.by = x.by; ns.push(n) }) })
    return { ok: true, notes: ns, results: rows('result', me.school).map(function (x) { return { id: x.id, teacher: x.by, at: x.at, data: x.data } }) }
  }
  if (op === 'school.ack') { if (me.role !== 'school') return { ok: false, error: 'للمدرسة فقط' }; var ids = (b.ids || []).map(String).filter(function (id) { return rows('result', me.school).some(function (x) { return x.id === id }) }); return { ok: true, n: del('result', ids) } }
  if (op === 'school.teacher') {
    if (me.role !== 'school') return { ok: false, error: 'للمدرسة فقط' }
    var nm = String(b.name || '').slice(0, 120), ex = users().filter(function (u) { return u.role === 'teacher' && u.school === me.school && u.name === nm })[0]
    return { ok: true, token: ex ? ex.token : putUser({ role: 'teacher', name: nm, school: me.school, x: {} }) }
  }
  // ── المعلم: نتائجه مشفرة إلى مدرسته ──
  if (op === 'teacher.push') {
    if (me.role !== 'teacher') return { ok: false, error: 'للمعلم فقط' }
    var d = b.data; if (!d || typeof d !== 'object' || !d.data) return { ok: false, error: 'ملف نتائج غير صالح' }
    put('result', 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), me.school, me.name, d); return { ok: true }
  }
  return { ok: false, error: 'عملية غير معروفة' }
}
