/* جالب نور — «متتبع نافس»
 * يعمل داخل نظام نور بصلاحية «مدير مدرسة» على جهاز المستخدم (قراءة فقط):
 * يفتح التقارير بنفسه في الخلفية (كما يفعل المستخدم من القوائم)، ويختار خياراتها، ويقرأ جداول نتائجها،
 * ثم يرسلها إلى نافذة متتبع نافس في المتصفح نفسه. لا يعدّل شيئًا في نور، ولا يمر بأي خادم آخر،
 * ويحذف أرقام الهوية والجوالات قبل الإرسال. */
;(function () {
  'use strict'
  if (!/(^|\.)noor\.moe\.gov\.sa$/.test(location.hostname)) return
  if (document.getElementById('nafesNoor')) { document.getElementById('nafesNoor').style.display = 'flex'; return }
  var APP = 'https://alwalisystem-cloud.github.io/nafes-tracker', ORIGIN = 'https://alwalisystem-cloud.github.io', FORMAT = 'nafes-noor/1'
  var PACKS = [
    ['students', 'بيانات الطلاب وأولياء الأمور', 'من «كشف بيانات الطلاب» و«كشف الطلاب»: لكل طالب الاسم والسجل المدني والصف والفصل وولي الأمر وجواله ← «الطلاب» في المتتبع على هذا الجهاز فقط (تُحجب في العرض والطباعة).'],
    ['academic', 'السجل الأكاديمي ودرجات المواد', 'من «المبيضات» لآخر عام أُغلقت درجاته: درجة كل مادة والمعدل لكل طالب ← مواد التميز ومواد الضعف في ملف الطالب.'],
    ['schedule', 'المعلمون والجدول المدرسي (إسناد المواد)', 'من «الجدول الشامل حسب المعلمين والمادة»: معلم كل مادة في كل فصل ← ربط كل طالب بمعلمه في «المعلمون والإسناد» وتقارير المعلم.'],
    ['absence', 'غياب الطلاب وتأخرهم', 'لكل طالب: أيام الغياب بعذر وبدون عذر ومرات التأخر منذ بداية العام ← تقرير الغياب والمتابعة الأسبوعية.'],
    ['school', 'البيانات الأساسية للمدرسة ومعلموها', 'الرقم الوزاري والمرحلة وعدد الطلاب والفصول، وأسماء المعلمين بسجلاتهم المدنية ← فتح ملف التصحيح لكل معلم بسجله المدني.']
  ]
  var saved = {}; try { saved = JSON.parse(localStorage.getItem('nafesNoorPacks') || '{}') } catch (e) { }

  // ───────── الواجهة ─────────
  var css = '#nafesNoor{position:fixed;inset:0;z-index:2147483000;background:rgba(10,30,40,.55);display:flex;align-items:center;justify-content:center;font-family:Tahoma,Arial,sans-serif;direction:rtl}' +
    '#nafesNoor .box{background:#fff;color:#18343b;border-radius:16px;width:min(560px,94vw);max-height:92vh;overflow:auto;padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.3)}' +
    '#nafesNoor h3{margin:0 0 6px;color:#006941;font-size:19px}#nafesNoor p{margin:6px 0;font-size:13.5px;line-height:1.8;color:#3b5560}' +
    '#nafesNoor label.pk{display:flex;gap:10px;align-items:flex-start;border:1px solid #d6e2e3;border-radius:10px;padding:8px 10px;margin:6px 0;cursor:pointer;font-size:13.5px}#nafesNoor label.pk small{display:block;color:#5b6d74;font-size:12px;line-height:1.6}' +
    '#nafesNoor .row{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}#nafesNoor button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:10px 16px;cursor:pointer}' +
    '#nafesNoor .go{background:#006941;color:#fff;flex:1}#nafesNoor .go:disabled{opacity:.5}#nafesNoor .x{background:#eef3f4;color:#18343b}' +
    '#nafesNoor .bar{height:10px;background:#e6efef;border-radius:6px;overflow:hidden;margin-top:12px}#nafesNoor .bar i{display:block;height:100%;width:0;background:#1b8a7a;transition:width .2s}' +
    '#nafesNoor .st{font-size:13px;margin-top:8px;min-height:20px}#nafesNoor .ok{color:#15784f;font-weight:700}#nafesNoor .err{color:#b3261e;font-weight:700}#nafesNoor ul.log{margin:6px 0 0;padding-inline-start:18px;font-size:12.5px;color:#3b5560;line-height:1.8}'
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st)
  var wrap = document.createElement('div'); wrap.id = 'nafesNoor'
  wrap.innerHTML = '<div class="box"><h3>متتبع نافس · جالب نور</h3>' +
    '<p>اختر البيانات مرة واحدة (يُحفظ اختيارك)، ثم «جلب وإرسال»: يفتح الجالب التقارير في الخلفية ويرسلها إلى متتبع نافس آليًا. قراءة فقط، وتُحذف أرقام الهوية والجوالات من كل البيانات عدا حزمة «بيانات الطلاب وأولياء الأمور» (تصل إلى المتتبع على جهاز المدرسة فقط).</p>' +
    PACKS.map(function (p) { return '<label class="pk"><input type="checkbox" data-k="' + p[0] + '"' + ((saved[p[0]] !== false) ? ' checked' : '') + '><span><b>' + p[1] + '</b><small>' + p[2] + '</small></span></label>' }).join('') +
    '<div class="bar"><i id="snBar"></i></div><div class="st" id="snSt"></div><ul class="log" id="snLog"></ul>' +
    '<div class="row"><button class="go" id="snGo">📤 جلب وإرسال إلى متتبع نافس</button><button class="x" id="snOnly" title="للنسخة غير المتصلة (مثل أدوات دعم المدارس): يُنزّل ملفًا تستورده فيها">📥 جلب وتنزيل الملف فقط</button><button class="x" id="snDl" style="display:none">تنزيل الملف</button><button class="x" id="snX">إغلاق</button></div></div>'
  document.body.appendChild(wrap)
  var $ = function (id) { return document.getElementById(id) }
  $('snX').onclick = function () { wrap.style.display = 'none' }
  var say = function (t, cls) { $('snSt').className = 'st ' + (cls || ''); $('snSt').textContent = t }
  var prog = function (a, b) { $('snBar').style.width = (b ? Math.round(a / b * 100) : 0) + '%' }
  var logLine = function (t, bad) { var li = document.createElement('li'); li.textContent = t; if (bad) li.style.color = '#9a5a00'; $('snLog').appendChild(li) }

  // ───────── أدوات نور (نماذج ASP.NET) ─────────
  var P = function (h) { return new DOMParser().parseFromString(h, 'text/html') }
  var clean = function (s) { return String(s || '').replace(/[‎‏]/g, '').replace(/\s+/g, ' ').trim() }
  function fields(doc) {
    var fd = new URLSearchParams()
    doc.querySelectorAll('form input, form select, form textarea').forEach(function (e) {
      if (!e.name || e.type === 'submit' || e.type === 'button' || e.type === 'image') return
      if ((e.type === 'checkbox' || e.type === 'radio') && !e.checked) return
      fd.append(e.name, e.value)
    })
    return fd
  }
  async function get(url) { var r = await fetch(url, { credentials: 'include' }); return { url: r.url, doc: P(await r.text()) } }
  async function post(url, fd) {
    var r = await fetch(url, { method: 'POST', credentials: 'include', body: fd, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    var h = await r.text(); return { url: r.url, doc: P(h), html: h }
  }
  /** تنفيذ رابط داخلي (__doPostBack) في صفحة */
  async function postBack(page, target, arg) { var fd = fields(page.doc); fd.set('__EVENTTARGET', target); fd.set('__EVENTARGUMENT', arg || ''); return post(page.url, fd) }
  /** ضغط زر في الصفحة */
  async function press(page, label, set) {
    var b = [].find.call(page.doc.querySelectorAll('form input[type=submit]'), function (x) { return clean(x.value) === label })
    if (!b) throw new Error('لم يُعثر على زر «' + label + '»')
    var fd = fields(page.doc); fd.set('__EVENTTARGET', ''); fd.set('__EVENTARGUMENT', ''); fd.set(b.name, b.value)
    // قيم إضافية (مثل خيار «الكل» في الجنسية): اسم الحقل بنهايته
    if (set) Object.keys(set).forEach(function (suffix) { var e = [].find.call(page.doc.querySelectorAll('form [name]'), function (x) { return x.name.slice(-suffix.length) === suffix }); if (e) fd.set(e.name, set[suffix]) })
    return post(page.url, fd)
  }
  /** اختيار قيمة قائمة (مع إعادة تحميل الصفحة إن كانت القائمة تُحدّث غيرها) */
  async function choose(page, nameRe, pick) {
    var s = [].find.call(page.doc.querySelectorAll('form select'), function (x) { return nameRe.test(x.name) })
    if (!s) return page
    var opts = [].filter.call(s.options, function (o) { return o.value && !/^--/.test(clean(o.text)) })
    var o = pick(opts); if (!o) return null
    if (!s.getAttribute('onchange')) { [].forEach.call(s.options, function (x) { x.selected = x.value === o.value }); return page }
    var fd = fields(page.doc); fd.set(s.name, o.value); fd.set('__EVENTTARGET', s.name); fd.set('__EVENTARGUMENT', ''); return post(page.url, fd)
  }
  var optionsOf = function (page, nameRe) { var s = [].find.call(page.doc.querySelectorAll('form select'), function (x) { return nameRe.test(x.name) }); return s ? [].filter.call(s.options, function (o) { return o.value && !/^--/.test(clean(o.text)) }).map(function (o) { return clean(o.text) }) : [] }
  var noData = function (page) { return /لا يوجد بيانات|لا توجد بيانات|لا يوجد نتائج/.test(page.html || '') && !page.doc.querySelector('[id*=ReportViewer] table') }

  /** جدول التقرير (ReportViewer) شبكةً بعد فك دمج الخلايا */
  function reportGrid(doc, headerRe) {
    var rv = doc.querySelector('[id*=ReportViewer]'); if (!rv) return null
    // أعمق جدول (بلا جداول داخله) يحوي العنوان المطلوب، والأكبر بينها — لا جداول التخطيط الخارجية
    var tbs = [].slice.call(rv.querySelectorAll('table')).filter(function (t) { return !t.querySelector('table') && (!headerRe || headerRe.test(t.textContent)) })
      .map(function (t) { return { t: t, n: t.rows.length * Math.max.apply(null, [].map.call(t.rows, function (r) { return r.cells.length }).concat([1])) } }).sort(function (a, b) { return b.n - a.n })
    if (!tbs.length) return null
    var T = tbs[0].t, grid = []
    ;[].forEach.call(T.rows, function (r, ri) {
      var col = 0; grid[ri] = grid[ri] || []
      ;[].forEach.call(r.cells, function (c) {
        while (grid[ri][col] !== undefined) col++
        var t = clean(c.textContent)
        for (var k = 0; k < (c.colSpan || 1); k++) for (var m = 0; m < (c.rowSpan || 1); m++) { grid[ri + m] = grid[ri + m] || []; grid[ri + m][col + k] = t }
        col += (c.colSpan || 1)
      })
    })
    return grid
  }
  /** صفوف الجدول كائنات بعناوين أعمدته (يُدمج عنوانان متتاليان مثل «الطلبة الذين تغيبوا…» + «عدد/نسبة») */
  function reportRows(doc, headerRe) {
    var g = reportGrid(doc, headerRe); if (!g) return []
    var hi = g.findIndex(function (r) { return r && r.some(function (t) { return headerRe.test(t || '') }) }); if (hi < 0) return []
    var head = g[hi].slice(), start = hi + 1
    if (g[hi + 1] && g[hi + 1].some(function (t) { return /^(عدد|نسبة)$/.test(t || '') })) { head = head.map(function (h, i) { var s = g[hi + 1][i]; return s && /^(عدد|نسبة)$/.test(s) ? h + ' — ' + s : h }); start = hi + 2 }
    var out = []
    for (var i = start; i < g.length; i++) {
      var r = g[i]; if (!r || !r.some(function (t) { return t })) continue
      var o = {}, seen = {}
      head.forEach(function (h, ci) { if (!h || seen[h + ci]) return; var v = r[ci] || ''; if (o[h] === undefined || o[h] === '') o[h] = v; seen[h + ci] = 1 })
      if (Object.keys(o).filter(function (k) { return o[k] }).length >= 2) out.push(o)
    }
    return out
  }

  // ───────── تصدير تقرير نور إلى Excel (كل الصفحات والصفوف في ملف واحد بدل صفحات العرض) ─────────
  /** أوراق ملف Excel (xlsx) شبكاتٍ بعد فك دمج الخلايا — دون أي مكتبة */
    async function xlsxRows(buf) {
    var dv = new DataView(buf), u8 = new Uint8Array(buf), files = {}
    // الدليل المركزي لملف zip
    var eocd = -1; for (var i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
    if (eocd < 0) throw new Error('ملف Excel غير صالح')
    var n = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true)
    for (var k = 0; k < n; k++) {
      var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true)
      var name = new TextDecoder().decode(u8.slice(p + 46, p + 46 + nl))
      files[name] = { method: method, csize: csize, off: off }
      p += 46 + nl + el + cl
    }
    async function read(name) {
      var f = files[name]; if (!f) return ''
      var lo = f.off, start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true)
      var data = u8.slice(start, start + f.csize)
      if (f.method === 0) return new TextDecoder().decode(data)
      var s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      return await new Response(s).text()
    }
    var parse = function (x) { return new DOMParser().parseFromString(x, 'application/xml') }
    var ss = [], sst = await read('xl/sharedStrings.xml')
    if (sst) [].forEach.call(parse(sst).getElementsByTagName('si'), function (si) { ss.push([].map.call(si.getElementsByTagName('t'), function (t) { return t.textContent }).join('')) })
    var sheets = Object.keys(files).filter(function (f) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(f) }).sort(function (a, b) { return Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]) })
    var all = []
    for (var si = 0; si < sheets.length; si++) all.push(sheetGrid(parse(await read(sheets[si]))))
    return all
    function sheetGrid(doc) {
    var grid = []
    var colIdx = function (ref) { var m = ref.match(/^[A-Z]+/)[0], c = 0; for (var i = 0; i < m.length; i++) c = c * 26 + (m.charCodeAt(i) - 64); return c - 1 }
    ;[].forEach.call(doc.getElementsByTagName('row'), function (r) {
      var ri = Number(r.getAttribute('r')) - 1, row = []
      ;[].forEach.call(r.getElementsByTagName('c'), function (c) {
        var t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], val = ''
        if (t === 's') val = ss[Number(v && v.textContent)] || ''
        else if (t === 'inlineStr') val = [].map.call(c.getElementsByTagName('t'), function (x) { return x.textContent }).join('')
        else val = v ? v.textContent : ''
        row[colIdx(c.getAttribute('r'))] = String(val).replace(/\s+/g, ' ').trim()
      })
      grid[ri] = row
    })
    // الخلايا المدمجة: تُنسخ قيمتها إلى بقية الخلايا
    ;[].forEach.call(doc.getElementsByTagName('mergeCell'), function (m) {
      var ref = m.getAttribute('ref').split(':'); if (ref.length < 2) return
      var r0 = Number(ref[0].match(/\d+/)[0]) - 1, r1 = Number(ref[1].match(/\d+/)[0]) - 1, c0 = colIdx(ref[0]), c1 = colIdx(ref[1])
      var v = (grid[r0] || [])[c0] || ''
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) { grid[r] = grid[r] || []; if (!grid[r][c]) grid[r][c] = v }
    })
    for (var i2 = 0; i2 < grid.length; i2++) grid[i2] = grid[i2] || []
    return grid
    }
  }

  /** أوراق التقرير المعروض في الصفحة بصيغة Excel؛ أو null إن لم يظهر تقرير */
  async function reportSheets(page) {
    var h = page.html || page.doc.documentElement.innerHTML
    var m = h.match(/"ExportUrlBase":"([^"]+)"/); if (!m) return null
    var base = m[1].replace(/\\u0026/g, '&').replace(/&amp;/g, '&')
    var r = await fetch(base + 'EXCELOPENXML', { credentials: 'include' }); if (!r.ok) return null
    var buf = await r.arrayBuffer(); if (new Uint8Array(buf)[0] !== 0x50) return null
    return xlsxRows(buf)
  }
  /** قيمة حقل في ترويسة الورقة: «الصف : الخامس الابتدائي» (القيمة يسار العنوان) */
  function sheetLabel(g, label, before) {
    for (var i = 0; i < Math.min(before || g.length, g.length); i++) {
      var r = g[i] || [], j = r.indexOf(label); if (j < 0) continue
      for (var k = j - 1; k >= 0; k--) { var t = r[k]; if (t && t !== ':' && t !== label) return t }
    }
    return ''
  }
  /** صفوف جدول الورقة كائنات بعناوين أعمدته؛ وإن كان العنوان سطرين («بيانات الهوية» ثم «رقمها») يُجمعان */
  function sheetTable(g, headerRe) {
    var hi = g.findIndex(function (r) { return r.some(function (t) { return headerRe.test(t || '') }) }); if (hi < 0) return { rows: [], hi: -1 }
    var H = g[hi], S = g[hi + 1] || [], nameCol = H.findIndex(function (t) { return headerRe.test(t || '') })
    var two = !nameOk(S[nameCol]) && S.some(function (t, i) { return t && t !== H[i] })
    var head = H.map(function (h, i) { var s = two ? S[i] : ''; return h ? (s && s !== h ? h + ' — ' + s : h) : (s || '') })
    var rows = []
    for (var i = hi + (two ? 2 : 1); i < g.length; i++) {
      var r = g[i]; if (!r || !r.some(function (t) { return t })) continue
      var o = {}; head.forEach(function (h, ci) { if (h && !o[h] && r[ci]) o[h] = r[ci] })
      rows.push(o)
    }
    return { rows: rows, hi: hi }
  }
  var num = function (s) { var m = String(s || '').replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660) }).match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null }
  var pick = function (o, re) { var k = Object.keys(o).find(function (x) { return re.test(x) }); return k ? o[k] : '' }
  // حذف ما يشبه أرقام الهوية والإقامة والجوال من أي نص قبل الإرسال
  // حذف أي رقم هوية أو جوال من كل نصوص البيانات قبل إرسالها أو تنزيلها (الأرقام العربية تُوحَّد أولًا، ومنها المفصولة بمسافات)
  function deepScrub(v) {
    if (typeof v === 'string') {
      if (/^data:/.test(v)) return v
      var t = v.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660) }).replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0) })
      return t.replace(/(?:\+?966|00966|0)?[\s-]*5(?:[\s-]*\d){8}(?!\d)/g, '').replace(/(?<!\d)[12](?:[\s-]?\d){9}(?!\d)/g, '').replace(/\s{2,}/g, ' ')
    }
    if (Array.isArray(v)) return v.map(deepScrub)
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = deepScrub(v[k]) }); return o }
    return v
  }
  var scrub = function (s) { return clean(s).replace(/\b[12]\d{9}\b/g, '').replace(/\b05\d{8}\b/g, '').replace(/\b9665\d{8}\b/g, '').trim() }

  // ───────── الوصول إلى القوائم والتقارير ─────────
  var menus = null
  async function loadMenus() {
    if (menus) return menus
    var home = await get('/Noor/EduWavek12Portal/HomePage.aspx')
    var link = function (title) {
      var a = [].find.call(home.doc.querySelectorAll('a'), function (x) { return clean(x.textContent) === title })
      var m = a && (a.getAttribute('onclick') || a.getAttribute('href') || '').match(/MenuItemRedirect'\s*,\s*'([^']+)'/)
      return m ? '/Noor/' + m[1] : ''
    }
    menus = { reports: link('التقارير'), schedule: link('الجدول المدرسي') }
    if (!menus.reports) throw new Error('لم تظهر قائمة «التقارير». بدّل الدور إلى «مدير مدرسة» من أعلى صفحة نور ثم أعد المحاولة.')
    return menus
  }
  /** فتح تقرير من قائمة باسمه كما يظهر فيها */
  var opOf = function (a) { return a && (a.getAttribute('onclick') || '').match(/MenuOrder_Operation\('([^']*)','(\d+)','(\d+)'/) }
  var findItem = function (doc, title) {
    var as = [].filter.call(doc.querySelectorAll('a'), function (x) { return opOf(x) })
    return as.find(function (x) { return clean(x.textContent) === title }) || as.find(function (x) { return clean(x.textContent).indexOf(title) >= 0 })
  }
  /** فتح تقرير من قائمة باسمه؛ وإن كان داخل قسم مطوي تُفتح الأقسام المرشحة (hint) حتى يظهر */
  async function openReport(menuUrl, title, hint) {
    var menu = await get(menuUrl)
    var a = findItem(menu.doc, title)
    if (!a && hint) {
      var seen = {}, tries = 0
      var queue = [].filter.call(menu.doc.querySelectorAll('a'), function (x) { return opOf(x) && hint.test(clean(x.textContent)) })
      while (!a && queue.length && tries < 8) {
        var f = queue.shift(), k = clean(f.textContent); if (seen[k]) continue; seen[k] = 1; tries++
        var fm = opOf(f), sub = await postBack(menu, 'OperationOnMenu', fm[1] + ',' + fm[2] + ',' + fm[3])
        // القسم المفتوح يعيد القائمة نفسها بعناصره؛ وإن فُتح تقرير بدلًا منه نعود إلى القائمة
        if (!/MenuOrder_Operation/.test(sub.doc.documentElement.innerHTML)) { menu = await get(menuUrl); continue }
        menu = sub; a = findItem(menu.doc, title)
        if (!a) [].forEach.call(menu.doc.querySelectorAll('a'), function (x) { if (opOf(x) && hint.test(clean(x.textContent)) && !seen[clean(x.textContent)]) queue.push(x) })
      }
    }
    var m = opOf(a)
    if (!m) throw new Error('لم يُعثر على «' + title + '» في قائمة نور')
    return postBack(menu, 'OperationOnMenu', m[1] + ',' + m[2] + ',' + m[3])
  }

  // ───────── الحزم ─────────
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
  /** الجدول الشامل حسب المعلمين والمادة: المعلمون وموادهم ونصابهم، وحصص النشاط */
  async function packSchedule(out) {
    var mn = await loadMenus(); if (!mn.schedule) throw new Error('لم تظهر قائمة «الجدول المدرسي»')
    var p = await openReport(mn.schedule, 'الجدول الشامل')
    var years = optionsOf(p, /ddlStudyYear/)
    p = await choose(p, /ddlStudyYear/, function (o) { return o[0] }) || p
    p = await postBack(p, 'ctl00$PlaceHolderMain$lbtnGeneralScheduleByTeacherAndCourse')
    // كل المعلمين محددون ثم «عرض»
    var fd = fields(p.doc)
    ;[].forEach.call(p.doc.querySelectorAll('form input[type=checkbox]'), function (c) { if (/gvTeachers/.test(c.name)) fd.set(c.name, c.value || 'on') })
    var b = [].find.call(p.doc.querySelectorAll('form input[type=submit]'), function (x) { return clean(x.value) === 'عرض' })
    if (!b) throw new Error('الجدول المدرسي غير منشور في نور')
    fd.set('__EVENTTARGET', ''); fd.set(b.name, b.value)
    var r = await post(p.url, fd)
    var g = reportGrid(r.doc, /الحصة الأولى/); if (!g) throw new Error('لم يظهر الجدول الشامل')
    var dayRow = g.findIndex(function (x) { return x && x.filter(function (t) { return DAYS.indexOf(t) >= 0 }).length >= 3 })
    var perRow = g.findIndex(function (x) { return x && x.filter(function (t) { return /^الحصة /.test(t || '') }).length >= 5 })
    var cols = {}
    ;(g[perRow] || []).forEach(function (t, ci) { if (/^الحصة /.test(t || '') && DAYS.indexOf(g[dayRow][ci]) >= 0) cols[ci] = { day: g[dayRow][ci], period: t.replace('الحصة ', '') } })
    var teachers = [], activity = []
    g.forEach(function (row, ri) {
      if (ri <= perRow || !row) return
      var name = ''
      for (var ci = row.length - 1; ci >= 0; ci--) { var t = row[ci] || ''; if (t && !cols[ci] && t.split(' ').length >= 3 && !/الابتدائي|المتوسط|الثانوي|^\d/.test(t)) { name = scrub(t); break } }
      if (!name) return
      var subj = {}, classes = {}, pairs = {}, n = 0
      Object.keys(cols).forEach(function (ci) {
        var t = row[ci] || ''; if (!t) return
        n++
        var m = t.match(/^(.*?(?:الابتدائي|المتوسط|الثانوي))\s+(\d+)\s+(.+)$/)
        var s = m ? m[3] : t; subj[s] = (subj[s] || 0) + 1
        if (m) { classes[m[1] + ' ' + m[2]] = 1; pairs[m[1] + ' ' + m[2] + '|' + m[3]] = 1 }
        if (/نشاط/.test(s)) activity.push({ day: cols[ci].day, period: cols[ci].period, cls: m ? m[1] + ' ' + m[2] : '', teacher: name })
      })
      teachers.push({ name: name, subjects: Object.keys(subj).sort(function (a, b) { return subj[b] - subj[a] }), periods: n, classes: Object.keys(classes), pairs: Object.keys(pairs).map(function (k) { var a = k.split('|'); return { cls: a[0], subject: a[1] } }) })
    })
    out.year = out.year || (years[0] || '')
    out.teachers = teachers; out.activity = activity
    logLine('المعلمون: ' + teachers.length + ' معلمًا · حصص النشاط: ' + activity.length + ' حصة')
  }
  async function packLeaders(out) {
    var mn = await loadMenus()
    var p; try { p = await openReport(mn.reports, 'تقرير بأسماء رواد الفصول', /رواد|الفصول|الطلاب|المدرسة/) } catch (e) { logLine('رواد الفصول: لا يتوفر تقريرهم في قائمة نور لهذه المرحلة (عدد الفصول يُؤخذ من «إحصائيات عامة عن المدرسة»)'); return }
    var rows = reportRows(p.doc, /رائد الفصل/)
    out.leaders = rows.map(function (o) { return { grade: pick(o, /^الصف$/), section: pick(o, /^الفصل$/), students: num(pick(o, /عدد الطلاب/)), teacher: scrub(pick(o, /رائد/)) } }).filter(function (x) { return x.grade })
    logLine('رواد الفصول: ' + out.leaders.length + ' فصلًا')
  }
  async function packAttendance(out) {
    var mn = await loadMenus()
    var p = await openReport(mn.reports, 'الأداء العام للمواظبة', /مواظب|غياب|سلوك|شؤون الطلاب|الطلاب/)
    var r = await press(p, 'ابحث')
    var rows = reportRows(r.doc, /عدد الطلاب الكلي/)
    var o = rows.find(function (x) { return num(pick(x, /عدد الطلاب الكلي/)) }) || {}
    var a = {
      total: num(pick(o, /عدد الطلاب الكلي/)), noAbsence: num(pick(o, /لم يتغيبوا/)),
      days3cons: num(pick(o, /3 أيام بدون عذر متصلة.*عدد/)), days3sep: num(pick(o, /3 أيام بدون عذر منفصلة.*عدد/)),
      days5: num(pick(o, /5 أيام.*عدد/)), days10: num(pick(o, /10 أيام.*عدد/)),
      daysNoExcuse: num(pick(o, /أيام الغياب بدون عذر/)), daysExcuse: num(pick(o, /أيام الغياب بعذر/)), deducted: num(pick(o, /الدرجات المحسومة/))
    }
    if (!a.total) throw new Error('لم تُقرأ أرقام المواظبة')
    out.attendance = a
    logLine('المواظبة: ' + a.total + ' طالبًا، لم يتغيب ' + a.noAbsence)
  }
  async function packResults(out) {
    var mn = await loadMenus()
    var p0 = await openReport(mn.reports, 'تقرير نسبة (النجاح و الرسوب) في المراحل و الصفوف', /نجاح|رسوب|نتائج|الاختبارات|التقويم/)
    var years = optionsOf(p0, /ddlStudyYear/), classes = optionsOf(p0, /ddlClass/)
    // آخر عام فيه نتائج: الحالي ثم السابق
    for (var yi = 0; yi < Math.min(3, years.length); yi++) {
      var rows = []
      for (var ci = 0; ci < classes.length; ci++) {
        say('النجاح والرسوب ' + years[yi] + ': ' + classes[ci])
        var p = await choose(p0, /ddlStudyYear/, function (o) { return o.find(function (x) { return clean(x.text) === years[yi] }) })
        p = p && await choose(p, /ddlClass/, function (o) { return o.find(function (x) { return clean(x.text) === classes[ci] }) })
        if (!p) continue
        var r = await press(p, 'عرض')
        var o = reportRows(r.doc, /عدد الطلاب الكلي/).find(function (x) { return num(pick(x, /عدد الطلاب الكلي/)) })
        if (o) rows.push({ grade: classes[ci], total: num(pick(o, /عدد الطلاب الكلي/)), passed: num(pick(o, /عدد الطلاب الناجحين/)), failed: num(pick(o, /عدد الطلاب الراسبين/)), passPct: num(pick(o, /نسبة الطلاب الناجحين/)) })
      }
      // عام فيه نتائج فعلية (لا العام الجاري قبل رصد النتائج: لا ناجحين بعد)
      if (rows.some(function (x) { return (x.passed || 0) > 0 })) { out.results = { year: years[yi], rows: rows }; logLine('النجاح والرسوب ' + years[yi] + ': ' + rows.length + ' صفوف'); return }
      logLine('لا نتائج في ' + years[yi] + ' — يُجرَّب العام السابق', true)
    }
    logLine('النجاح والرسوب: لا نتائج مرصودة', true)
  }
  async function packSkills(out) {
    var mn = await loadMenus()
    var p0 = await openReport(mn.reports, 'بيان بأرقام المهارات التي لم يتقنها طلاب الصف')
    var res = [], tried = 0
    var grades = optionsOf(p0, /ddlClass/).filter(function (g) { return /الأول|الثاني|الثالث/.test(g) })
    var byText = function (t) { return function (o) { return o.find(function (x) { return clean(x.text) === t }) } }
    async function skillsOf(page) {
      tried++
      var r = await press(page, 'عرض')
      if (noData(r) || !reportGrid(r.doc)) return null
      // تُحفظ أرقام المهارات وعدد من لم يتقنها فقط (دون أسماء الطلاب)
      var counts = {}
      reportRows(r.doc, /المهار|رقم المهارة/).forEach(function (o) { Object.keys(o).forEach(function (k) { if (/المهار/.test(k)) String(o[k]).split(/[،,\s-]+/).filter(function (x) { return /^\d{1,3}$/.test(x) }).forEach(function (x) { counts[x] = (counts[x] || 0) + 1 }) }) })
      return Object.keys(counts).length ? counts : null
    }
    for (var gi = 0; gi < grades.length; gi++) {
      var pg = await choose(p0, /ddlClass/, byText(grades[gi])); if (!pg) continue
      pg = await choose(pg, /ddlSpecialty/, function (o) { return o[0] }) || pg
      var sections = optionsOf(pg, /ddlSection/); if (!sections.length) continue
      // استكشاف سريع: أحدث فترة فيها رصد (بأول فصل وكل مواده) — وإن لم يوجد رصد يُتجاوز الصف
      var ps0 = await choose(pg, /ddlSection/, byText(sections[0])); if (!ps0) continue
      var periods = optionsOf(ps0, /ddlPeriodEnter/).reverse(), period = ''
      for (var pi = 0; pi < periods.length && !period; pi++) {
        say('المهارات: ' + grades[gi] + ' — البحث عن فترة مرصودة (' + periods[pi] + ')')
        var pp = await choose(ps0, /ddlPeriodEnter/, byText(periods[pi])); if (!pp) continue
        var cs = optionsOf(pp, /ddlCourse/)
        for (var ci = 0; ci < Math.min(3, cs.length) && !period; ci++) { var pc = await choose(pp, /ddlCourse/, byText(cs[ci])); if (pc && await skillsOf(pc)) period = periods[pi] }
      }
      if (!period) { logLine('المهارات: ' + grades[gi] + ' — لا رصد بعد', true); continue }
      for (var si = 0; si < sections.length; si++) {
        var ps = await choose(pg, /ddlSection/, byText(sections[si])); if (!ps) continue
        var pq = await choose(ps, /ddlPeriodEnter/, byText(period)); if (!pq) continue
        var courses = optionsOf(pq, /ddlCourse/)
        for (var ki = 0; ki < courses.length; ki++) {
          say('المهارات: ' + grades[gi] + ' ' + sections[si] + ' — ' + courses[ki] + ' (' + period + ')')
          var pk = await choose(pq, /ddlCourse/, byText(courses[ki])); if (!pk) continue
          var counts = await skillsOf(pk)
          if (counts) res.push({ grade: grades[gi], section: sections[si], course: courses[ki], period: period, skills: counts })
        }
      }
    }
    out.skills = res
    if (res.length) logLine('المهارات: ' + res.length + ' مادة/فصل فيها مهارات غير متقنة')
  }
  /** غياب كل طالب وتأخره: «إحصائية الغياب والتأخير على مستوى الطالب» لكل صف وفصل منذ بداية العام الدراسي */
  async function packAbsence(out) {
    var mn = await loadMenus()
    // الابتدائي لا يعرض «إحصائية الغياب والتأخير…»؛ فيُجرَّب «تقرير الغياب على مستوى الطالب»
    var p0 = null, ABS_TITLES = ['إحصائية الغياب والتأخير على مستوى الطالب', 'تقرير الغياب على مستوى الطالب']
    for (var at = 0; at < ABS_TITLES.length && !p0; at++) { try { p0 = await openReport(mn.reports, ABS_TITLES[at], /غياب|مواظب|شؤون الطلاب|الطلاب/) } catch (e) { if (at === ABS_TITLES.length - 1) throw e } }
    var now = new Date(), y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    var from = '01/08/' + y
    // المدرسة كلها في طلب واحد (الصف: الكل) بتصدير Excel — كل الصفحات دون نقص؛ وإن تعذر فلكل صف وفصل
    try {
      var b0 = [].find.call(p0.doc.querySelectorAll('form input[type=submit]'), function (x) { return clean(x.value) === 'عرض' })
      var fd0 = fields(p0.doc); fd0.set('__EVENTTARGET', ''); fd0.set('__EVENTARGUMENT', ''); fd0.set(b0.name, b0.value)
      ;Array.from(fd0.keys()).forEach(function (k) { if (/clrFromDate$/.test(k)) fd0.set(k, from) })
      say('غياب الطلاب: كل الصفوف…')
      var sh0 = await reportSheets(await post(p0.url, fd0)), all = []
      ;(sh0 || []).forEach(function (g) {
        sheetTable(g, /^الاس[ـ]*م$|^اسم الطالب$/).rows.forEach(function (o) {
          var name = scrub(pick(o, /^الا?س/)); if (!nameOk(name)) return
          all.push({ name: name, cls: clean(pick(o, /^الصف$/)) + ' ' + clean(pick(o, /^الفصل$/)), days: num(pick(o, /بدون عذر/)) || 0, excused: num(pick(o, /^غياب بعذر/)) || 0, late: num(pick(o, /التأخ/)) || 0 })
        })
      })
      if (all.length) {
        out.absenceRows = all
        logLine('غياب الطلاب: ' + all.length + ' طالبًا منذ ' + from + ' · بلغ 3 أيام بدون عذر فأكثر: ' + all.filter(function (x) { return x.days >= 3 }).length)
        return
      }
    } catch (e) { /* يُجلب لكل صف وفصل */ }
    var byText = function (t) { return function (o) { return o.find(function (x) { return clean(x.text) === t }) } }
    var rows = [], partial = []
    var grades = optionsOf(p0, /ddlClass$/)
    for (var gi = 0; gi < grades.length; gi++) {
      var pg = await choose(p0, /ddlClass$/, byText(grades[gi])); if (!pg) continue
      var sections = optionsOf(pg, /ddlSection$/)
      for (var si = 0; si < sections.length; si++) {
        say('غياب الطلاب: ' + grades[gi] + ' — فصل ' + sections[si])
        var ps = await choose(pg, /ddlSection$/, byText(sections[si])); if (!ps) continue
        var b = [].find.call(ps.doc.querySelectorAll('form input[type=submit]'), function (x) { return clean(x.value) === 'عرض' })
        if (!b) throw new Error('لم يُعثر على زر «عرض»')
        var fd = fields(ps.doc); fd.set('__EVENTTARGET', ''); fd.set('__EVENTARGUMENT', ''); fd.set(b.name, b.value)
        ;Array.from(fd.keys()).forEach(function (k) { if (/clrFromDate$/.test(k)) fd.set(k, from) })
        var r = await post(ps.url, fd)
        var tp = num(clean((r.doc.querySelector('[id*=TotalPages]') || {}).textContent))
        if (tp && tp > 1) partial.push(grades[gi] + ' ' + sections[si])
        reportRows(r.doc, /غياب بدون عذر/).forEach(function (o) {
          var name = scrub(pick(o, /^الا?س/))
          if ((name.match(/[ء-ي]/g) || []).length < 4) return
          rows.push({ name: name, cls: clean(pick(o, /^الصف$/) || grades[gi]) + ' ' + clean(pick(o, /^الفصل$/) || sections[si]), days: num(pick(o, /بدون عذر/)) || 0, excused: num(pick(o, /^غياب بعذر/)) || 0, late: num(pick(o, /التأخ/)) || 0 })
        })
      }
    }
    if (!rows.length) throw new Error('لم يُقرأ غياب أي طالب')
    out.absenceRows = rows
    logLine('غياب الطلاب: ' + rows.length + ' طالبًا منذ ' + from + ' · بلغ 3 أيام بدون عذر فأكثر: ' + rows.filter(function (x) { return x.days >= 3 }).length)
    if (partial.length) logLine('فصول تقريرها أكثر من صفحة (قد يكون ناقصًا): ' + partial.join('، '), true)
  }
  // ───────── بيانات الطلاب وأولياء الأمور، والسجل الأكاديمي (بيانات شخصية: لملف الطلاب على جهاز المدرسة فقط) ─────────
  var digits = function (s) { return String(s || '').replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660) }).replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0) }) }
  var nidOf = function (s) { var m = digits(s).replace(/[\s-]/g, '').match(/(?<!\d)[12]\d{9}(?!\d)/); return m ? m[0] : '' }
  var phoneOf = function (s) { var d = digits(s).replace(/[^\d]/g, '').replace(/^00/, ''); if (/^9665\d{8}$/.test(d)) return '0' + d.slice(3); if (/^5\d{8}$/.test(d)) return '0' + d; return /^05\d{8}$/.test(d) ? d : '' }
  var nameOk = function (t) { return (String(t || '').match(/[ء-ي]/g) || []).length >= 4 }
  /** يجرب تقارير نور المرشحة بالترتيب، ويجمع صفوف كل الصفوف والفصول؛ وإن لم يجد أيًا منها يسجل عناوين التقارير المتاحة */
  async function studentReport(titles, hint, headerRe, label) {
    var mn = await loadMenus(), p0 = null, used = ''
    for (var ti = 0; ti < titles.length && !p0; ti++) { try { p0 = await openReport(mn.reports, titles[ti], hint); used = titles[ti] } catch (e) { p0 = null } }
    if (!p0) {
      var menu = await get(mn.reports), names = [].filter.call(menu.doc.querySelectorAll('a'), function (x) { return opOf(x) && /طالب|طلاب|أولياء|معدل|أكاديمي|نتائج/.test(clean(x.textContent)) }).map(function (x) { return clean(x.textContent) })
      throw new Error('لم يُعثر على تقرير ' + label + ' في قائمة التقارير' + (names.length ? ' — التقارير الظاهرة: ' + names.slice(0, 12).join('، ') : ''))
    }
    var rows = [], partial = []
    var collect = function (doc, g, sct) { reportRows(doc, headerRe).forEach(function (o) { o.__g = g; o.__s = sct; rows.push(o) }); var tp = num(clean((doc.querySelector('[id*=TotalPages]') || {}).textContent)); if (tp && tp > 1) partial.push((g || '') + ' ' + (sct || '')) }
    var grades = optionsOf(p0, /ddlClass$|ddlGrade$/)
    var byText = function (t) { return function (o) { return o.find(function (x) { return clean(x.text) === t }) } }
    if (!grades.length) { try { collect((await press(p0, 'عرض')).doc, '', '') } catch (e) { collect(p0.doc, '', '') } }
    for (var gi = 0; gi < grades.length; gi++) {
      var pg = await choose(p0, /ddlClass$|ddlGrade$/, byText(grades[gi])); if (!pg) continue
      var sections = optionsOf(pg, /ddlSection$/)
      if (!sections.length) { say(label + ': ' + grades[gi]); try { collect((await press(pg, 'عرض')).doc, grades[gi], '') } catch (e) { logLine(grades[gi] + ': ' + (e.message || e), true) } continue }
      for (var si = 0; si < sections.length; si++) {
        say(label + ': ' + grades[gi] + ' — فصل ' + sections[si])
        var ps = await choose(pg, /ddlSection$/, byText(sections[si])); if (!ps) continue
        try { collect((await press(ps, 'عرض')).doc, grades[gi], sections[si]) } catch (e) { logLine(grades[gi] + ' ' + sections[si] + ': ' + (e.message || e), true) }
      }
    }
    if (partial.length) logLine(label + ': فصول تقريرها أكثر من صفحة (قد يكون ناقصًا): ' + partial.join('، '), true)
    return { rows: rows, used: used }
  }
  /** دمج صفوف الطالب من التقريرين: بالسجل المدني، أو بالاسم إن غاب السجل عن أحدهما */
  function mergeStudents(out, list) {
    var rows = out.studentRows || []
    list.forEach(function (r) {
      var o = rows.find(function (x) { return (r.nid && x.nid === r.nid) || ((!r.nid || !x.nid) && x.name === r.name) })
      if (!o) { o = {}; rows.push(o) }
      Object.keys(r).forEach(function (f) { if (r[f]) o[f] = r[f] })
    })
    out.studentRows = rows
  }
  async function packStudentsOld(out) {
    var r = await studentReport(['بيانات الطلاب', 'بيانات الطالب', 'بيانات أولياء الأمور', 'أولياء الأمور', 'كشف بأسماء الطلاب', 'أسماء الطلاب'], /طلاب|طالب|أولياء|شؤون الطلاب|بيانات|كشوف/, /اسم الطالب|^الا?سم$/, 'بيانات الطلاب')
    var list = r.rows.map(function (o) {
      var name = clean(pick(o, /اسم الطالب|^الا?سم$|^اسم$/)); if (!nameOk(name)) return null
      var phoneKey = Object.keys(o).find(function (k) { return /ولي/.test(k) && /جوال|هاتف|اتصال/.test(k) }) || Object.keys(o).find(function (k) { return /جوال|هاتف/.test(k) })
      var gName = Object.keys(o).find(function (k) { return /ولي الأمر|اسم ولي|اسم الأب|اسم الوالد/.test(k) && !/جوال|هاتف|هوية|سجل/.test(k) })
      return { name: name, nid: nidOf(pick(o, /السجل المدني|الهوية|الإقامة|رقم السجل/)), grade: clean(pick(o, /^الصف$/) || o.__g), cls: clean(pick(o, /^الفصل$/) || o.__s), guardian: gName ? clean(o[gName]) : '', gPhone: phoneKey ? phoneOf(o[phoneKey]) : '' }
    }).filter(Boolean)
    if (!list.length) throw new Error('لم يُقرأ أي طالب من تقرير «' + r.used + '»')
    mergeStudents(out, list)
    logLine('بيانات الطلاب (من «' + r.used + '»): ' + list.length + ' طالبًا · بسجل مدني: ' + list.filter(function (x) { return x.nid }).length + ' · بجوال ولي أمر: ' + list.filter(function (x) { return x.gPhone }).length)
  }
  async function packAcademicOld(out) {
    var r = await studentReport(['السجل الأكاديمي', 'المعدل التراكمي', 'معدلات الطلاب', 'كشف المعدلات', 'نتائج الطلاب'], /أكاديمي|معدل|نتائج|درجات|طلاب|اختبارات/, /اسم الطالب|^الا?سم$/, 'السجل الأكاديمي')
    // درجات المواد بأحد شكلين: عمود لكل مادة، أو صف لكل مادة («المادة» و«الدرجة») يتكرر فيه اسم الطالب
    var META = /اسم|السجل|الهوية|الإقامة|^الصف$|^الفصل$|^م$|^#$|رقم|المعدل|التراكمي|النسبة|المسار|التخصص|الترتيب|التقدير|النتيجة|الحالة|المجموع الكلي|ولي|الجنسية|الميلاد|الغياب|السلوك|المواظبة|^المادة$|^الدرجة$|^المجموع$|النهائي|الفصل الدراسي/
    var score = function (v) { var x = num(v); return x !== null && x >= 0 && x <= 100 ? x : null }
    var byName = {}
    r.rows.forEach(function (o) {
      var name = clean(pick(o, /اسم الطالب|^الا?سم$|^اسم$/)); if (!nameOk(name)) return
      var s = byName[name] || (byName[name] = { name: name, nid: '', gpa: '', track: '', grade: '', cls: '', subjects: {} })
      s.nid = s.nid || nidOf(pick(o, /السجل المدني|الهوية|الإقامة|رقم السجل/))
      var g = num(pick(o, /المعدل التراكمي|التراكمي|^المعدل|النسبة/)); if (g !== null && !s.gpa) s.gpa = String(g)
      s.track = s.track || clean(pick(o, /المسار|التخصص/)); s.grade = s.grade || clean(pick(o, /^الصف$/) || o.__g); s.cls = s.cls || clean(pick(o, /^الفصل$/) || o.__s)
      var subj = clean(pick(o, /^المادة$|^اسم المادة$/))
      if (subj) { var v = score(pick(o, /^الدرجة$|^المجموع$|النهائي|الدرجة النهائية|المجموع الكلي/)); if (v !== null) s.subjects[subj] = v }
      else Object.keys(o).forEach(function (k) { if (k.indexOf('__') === 0 || META.test(k)) return; var v = score(o[k]); if (v !== null && /[ء-ي]{3}/.test(k)) s.subjects[k] = v })
    })
    var list = Object.keys(byName).map(function (k) { var s = byName[k]; if (!Object.keys(s.subjects).length) delete s.subjects; return s }).filter(function (x) { return x.gpa || x.track || x.subjects })
    if (!list.length) throw new Error('لم يُقرأ معدل أي طالب من تقرير «' + r.used + '»')
    mergeStudents(out, list)
    logLine('السجل الأكاديمي (من «' + r.used + '»): ' + list.length + ' طالبًا · بدرجات المواد: ' + list.filter(function (x) { return x.subjects }).length)
  }

  // ───────── التقارير الفعلية في نور (تُقرأ بتصدير Excel لتشمل كل الصفوف والصفحات) ─────────
  var byText = function (t) { return function (o) { return o.find(function (x) { return clean(x.text) === t }) } }
  /** فتح تقرير بعنوانه ثم «عرض» لكل الطلاب وقراءة أوراقه */
  async function reportOf(title, hint, set) {
    var mn = await loadMenus()
    var p = await openReport(mn.reports, title, hint)
    say('بيانات الطلاب: «' + title + '»…')
    var sh = await reportSheets(await press(p, 'عرض', set))
    if (!sh) throw new Error('لم يظهر التقرير (قد لا تكون له بيانات)')
    return sh
  }
  var guardianKey = function (o) { return Object.keys(o).find(function (k) { return /ولي ال[أا]مر|[اإ]سم ولي|اسم الأب|اسم الوالد/.test(k) && !/جوال|هاتف|هوية|سجل/.test(k) }) }
  /** بيانات الطلاب: «كشف بيانات الطلاب» (الاسم والسجل المدني لكل الجنسيات) + «كشف الطلاب» (الفصل وولي الأمر وجواله) */
  async function packStudents(out) {
    var ids = [], contacts = [], used = []
    try {
      ;(await reportOf('كشف بيانات الطلاب', /الطلاب/, { rblStudentNationality: '-99' })).forEach(function (g) {
        var t = sheetTable(g, /^اسم الطالب$/), grade = clean(sheetLabel(g, 'الصف', t.hi)), cls = clean(sheetLabel(g, 'الفصل', t.hi))
        t.rows.forEach(function (o) {
          var name = clean(pick(o, /^اسم الطالب/)); if (!nameOk(name)) return
          ids.push({ name: name, nid: nidOf(pick(o, /رقمها|السجل المدني|رقم الهوية|الإقامة/)), grade: /الكل/.test(grade) ? '' : grade, cls: /الكل|لا يوجد/.test(cls) ? '' : cls })
        })
      })
      if (ids.length) used.push('كشف بيانات الطلاب')
    } catch (e) { logLine('كشف بيانات الطلاب: ' + (e.message || e), true) }
    try {
      ;(await reportOf('كشف الطلاب', /الطلاب/)).forEach(function (g) {
        var t = sheetTable(g, /^اسم الطالب$/), grade = clean(sheetLabel(g, 'الصف', t.hi))
        t.rows.forEach(function (o) {
          var name = clean(pick(o, /^اسم الطالب/)); if (!nameOk(name)) return
          var gk = guardianKey(o)
          var phone = phoneOf(pick(o, /جوال ولي|جوال الطالب|^الجوال|جوال/)) || phoneOf(pick(o, /هاتف المنزل/)) || phoneOf(pick(o, /هاتف العمل/))
          contacts.push({ name: name, nid: nidOf(pick(o, /السجل المدني|رقم الهوية/)), grade: /الكل/.test(grade) ? '' : grade, cls: clean(pick(o, /^الفصل$/)), guardian: gk ? scrub(o[gk]) : '', gPhone: phone })
        })
      })
      if (contacts.length) used.push('كشف الطلاب')
    } catch (e) { logLine('كشف الطلاب: ' + (e.message || e), true) }
    if (!ids.length && !contacts.length) { logLine('لم تُقرأ بيانات الطلاب من «كشف بيانات الطلاب» و«كشف الطلاب» — تجربة التقارير الأخرى…', true); return packStudentsOld(out) }
    mergeStudents(out, ids); mergeStudents(out, contacts)
    var all = out.studentRows || []
    logLine('بيانات الطلاب (من ' + used.map(function (u) { return '«' + u + '»' }).join(' و') + '): ' + all.length + ' طالبًا · بسجل مدني: ' + all.filter(function (x) { return x.nid }).length + ' · بجوال ولي أمر: ' + all.filter(function (x) { return x.gPhone }).length)
  }
  /** «المبيضات»: درجة كل مادة (المجموع النهائي من 100) والمعدل والتقدير لكل طالب في آخر عام أُغلقت درجاته */
  function mubayyadat(g) {
    var hi = g.findIndex(function (r) { return r.some(function (t) { return /^النتيجة$/.test(t || '') }) }); if (hi < 0) return []
    var H = g[hi], body = g.slice(hi + 1)
    var labCol = -1, idCol = -1
    body.forEach(function (r) { r.forEach(function (t, ci) { if (labCol < 0 && t === 'المجموع النهائي') labCol = ci; if (idCol < 0 && /رقم الهوية/.test(t || '')) idCol = ci }) })
    if (labCol < 0 || idCol < 0) return []
    var blocks = {}
    body.forEach(function (r) { var id = r[idCol]; if (!id) return; (blocks[id] = blocks[id] || []).push(r) })
    var SKIP = /^النتيجة$|المواظبة|السلوك|^النشاط$/
    return Object.keys(blocks).map(function (id) {
      var m = digits(id).match(/رقم الهوية\s*:?\s*(\d*)\s*الاسم\s*:?\s*(.+)$/), rs = blocks[id]
      var name = clean(m ? m[2] : id.replace(/.*الاسم\s*:?/, '')); if (!nameOk(name)) return null
      var fin = rs.find(function (r) { return r[labCol] === 'المجموع النهائي' }), subjects = {}, gpa = '', rating = ''
      if (fin) H.forEach(function (h, ci) {
        if (!h || ci === labCol || ci === idCol || SKIP.test(h)) return
        var subj = clean(h.replace(/ـ/g, '')); if (subjects[subj] !== undefined) return
        var v = num(fin[ci]); if (v !== null && v >= 0 && v <= 100 && /^[\d.]+$/.test(fin[ci] || '')) subjects[subj] = v
      })
      rs.forEach(function (r) { r.forEach(function (t) { var a = /المعدل\s*:\s*([\d.]+)/.exec(t || ''); if (a && !gpa) gpa = a[1]; var b = /التقدير\s*:\s*(.+)/.exec(t || ''); if (b && !rating) rating = clean(b[1]) }) })
      return { name: scrub(name), nid: m ? nidOf(m[1]) : '', gpa: gpa, rating: rating, subjects: Object.keys(subjects).length ? subjects : undefined }
    }).filter(Boolean)
  }
  /** «كشف درجات العام الدراسي» (الثانوي): ورقة لكل طالب — درجة كل مادة (معدل المادة الممتدة، أو متوسط درجتي الفصلين) والمعدل السنوي والمسار */
  function yearSheet(g) {
    var name = '', nid = ''
    g.forEach(function (r) { r.forEach(function (t) { var a = /الاسم\s*:\s*(.+)/.exec(t || ''); if (a && !name) name = clean(a[1]); var b = /رقم الهوية\s*:\s*([\d٠-٩]+)/.exec(t || ''); if (b && !nid) nid = nidOf(b[1]) }) })
    if (!nameOk(name)) return null
    var si = g.findIndex(function (r) { return r.indexOf('الدرجة') >= 0 && r.indexOf('المادة') >= 0 }); if (si < 0) return null
    var S = g[si], subjCol = S.indexOf('المادة'), extCol = S.findIndex(function (t) { return /^معدل المادة الممتدة/.test(t || '') })
    var gradeCols = S.map(function (t, i) { return t === 'الدرجة' ? i : -1 }).filter(function (i) { return i >= 0 })
    var subjects = {}, gpa = '', rating = '', track = ''
    for (var i = si + 1; i < g.length; i++) {
      var r = g[i], subj = clean((r[subjCol] || '').replace(/ـ/g, '')); if (!subj || /السلوك|المواظبة|^الحالة$|^المعدل$/.test(subj)) break
      var ext = num(r[extCol]), vals = gradeCols.map(function (c) { return /^[\d.]+$/.test(r[c] || '') ? Number(r[c]) : null }).filter(function (v) { return v !== null })
      var v = extCol >= 0 && /^[\d.]+$/.test(r[extCol] || '') ? ext : vals.length ? Math.round(vals.reduce(function (a, b) { return a + b }, 0) / vals.length * 10) / 10 : null
      if (v !== null && v >= 0 && v <= 100 && subjects[subj] === undefined) subjects[subj] = v
    }
    var gi = g.findIndex(function (r) { return r.indexOf('المعدل') >= 0 })
    if (gi >= 0) { var c = g[gi].findIndex(function (t) { return /^\d+(\.\d+)?\s/.test(t || '') }); if (c >= 0) { var m = /^([\d.]+)\s*(.*)$/.exec(g[gi][c]); gpa = m[1]; rating = clean(m[2]) } }
    track = clean((sheetLabel(g, 'القسم الحالي') || sheetLabel(g, 'القسم')).replace(/\s*-\s*(منتظم|انتساب|التعليم الإلكتروني).*$/, ''))
    return { name: scrub(name), nid: nid, gpa: gpa, rating: rating, track: track, subjects: Object.keys(subjects).length ? subjects : undefined }
  }
  async function yearReport(mn, years0) {
    var p = await openReport(mn.reports, 'كشف درجات العام الدراسي', /الدرجات|الاختبارات/)
    var lk = [].find.call(p.doc.querySelectorAll('form a'), function (a) { return /معايير البحث/.test(a.textContent) })
    var pb = lk && (lk.getAttribute('href') || '').match(/__doPostBack\('([^']+)'/); if (pb) p = await postBack(p, pb[1], '')
    var years = optionsOf(p, /ddlStudyYear$/); if (!years.length) years = years0 || []
    for (var yi = 0; yi < Math.min(2, years.length); yi++) {
      var list = [], tries = 0, py = await choose(p, /ddlStudyYear$/, byText(years[yi])); if (!py) continue
      var grades = optionsOf(py, /ddlClass$/)
      for (var gi = 0; gi < grades.length; gi++) {
        var pg = await choose(py, /ddlClass$/, byText(grades[gi])); if (!pg) continue
        var specs = optionsOf(pg, /ddlSpecial\w*$/); if (!specs.length) continue // صف لا طلاب له في المدرسة
        for (var sp = 0; sp < specs.length; sp++) {
          var ps = await choose(pg, /ddlSpecial\w*$/, byText(specs[sp])); if (!ps) continue
          var secs = optionsOf(ps, /ddlSection$/); if (!secs.length) secs = ['']
          for (var si = 0; si < secs.length; si++) {
            say('السجل الأكاديمي ' + years[yi] + ': ' + grades[gi] + (secs[si] ? ' — فصل ' + secs[si] : ''))
            var pc = secs[si] ? await choose(ps, /ddlSection$/, byText(secs[si])) : ps; if (!pc) continue
            try { var sh = await reportSheets(await press(pc, 'عرض')); (sh || []).forEach(function (g) { var x = yearSheet(g); if (x) list.push(x) }) } catch (e) { /* فصل بلا درجات */ }
            // عام لم تُغلق درجاته: ثلاثة فصول بلا نتائج تكفي لتجاوزه إلى العام السابق
            if (++tries >= 3 && !list.length) { gi = grades.length; sp = specs.length; break }
          }
        }
      }
      if (list.length) return { list: list, year: '«كشف درجات العام الدراسي» ' + years[yi] }
    }
    return { list: [], year: '' }
  }
  async function packAcademic(out) {
    var mn = await loadMenus(), p0
    try { p0 = await openReport(mn.reports, 'المبيضات', /الدرجات|السابقة|الاختبارات/) } catch (e) { logLine('المبيضات: ' + (e.message || e) + ' — تجربة التقارير الأخرى…', true); return packAcademicOld(out) }
    var years = optionsOf(p0, /ddlStudyYear$/), list = [], year = ''
    // العام الحالي إن أُغلقت درجاته، وإلا العام السابق
    for (var yi = 0; yi < Math.min(2, years.length) && !list.length; yi++) {
      var mt = 0, py = await choose(p0, /ddlStudyYear$/, byText(years[yi])); if (!py) continue
      py = await choose(py, /ddlSystemSt\w*$|ddlStudySystem$/, function (o) { return o.find(function (x) { return /منتظم/.test(x.text) }) || o[0] }) || py
      var grades = optionsOf(py, /ddlClass$/)
      for (var gi = 0; gi < grades.length; gi++) {
        var pg = await choose(py, /ddlClass$/, byText(grades[gi])); if (!pg) continue
        var specs = optionsOf(pg, /ddlSpecial\w*$/); if (!specs.length) specs = ['']
        for (var sp = 0; sp < specs.length; sp++) {
          var ps = specs[sp] ? await choose(pg, /ddlSpecial\w*$/, byText(specs[sp])) : pg; if (!ps) continue
          var secs = optionsOf(ps, /ddlSection$/); if (!secs.length) secs = ['']
          for (var si = 0; si < secs.length; si++) {
            say('السجل الأكاديمي ' + years[yi] + ': ' + grades[gi] + (secs[si] ? ' — فصل ' + secs[si] : ''))
            var pc = secs[si] ? await choose(ps, /ddlSection$/, byText(secs[si])) : ps; if (!pc) continue
            pc = await choose(pc, /ddlParts$/, function (o) { return o.find(function (x) { return /الأول/.test(x.text) }) || o[0] }) || pc
            try { var sh = await reportSheets(await press(pc, 'عرض')); if (sh) sh.forEach(function (g) { list = list.concat(mubayyadat(g)) }) } catch (e) { /* فصل بلا درجات */ }
            if (++mt >= 3 && !list.length) { gi = grades.length; sp = specs.length; break }
          }
        }
      }
      if (list.length) year = years[yi]
    }
    // الثانوي: «كشف درجات العام الدراسي» (ورقة لكل طالب بدرجات المواد والمعدل والمسار)
    if (!list.length) { try { var yr = await yearReport(mn, years); list = yr.list; year = yr.year } catch (e) { logLine('كشف درجات العام الدراسي: ' + (e.message || e), true) } }
    if (!list.length) { logLine('المبيضات وكشف درجات العام الدراسي: لم تظهر درجات معتمدة للعام الحالي أو السابق — تجربة التقارير الأخرى…', true); return packAcademicOld(out) }
    // طلاب المدرسة الحاليون فقط (من تخرّج أو انتقل منها بعد العام السابق لا يُضاف)
    var cur = out.studentRows || [], left = 0
    if (cur.length) list = list.filter(function (r) { var ok = cur.some(function (x) { return (r.nid && x.nid === r.nid) || ((!r.nid || !x.nid) && x.name === r.name) }); if (!ok) left++; return ok })
    if (!list.length) { logLine('المبيضات ' + year + ': لا درجات لطلاب المدرسة الحاليين (طلاب جدد عليها)', true); return }
    mergeStudents(out, list)
    if (left) logLine('لم تُضف درجات ' + left + ' طالبًا تخرجوا أو انتقلوا من المدرسة بعد ' + year)
    logLine('السجل الأكاديمي (' + year + '): ' + list.length + ' طالبًا · بدرجات المواد: ' + list.filter(function (x) { return x.subjects }).length + ' · بمعدل: ' + list.filter(function (x) { return x.gpa }).length)
  }

  // ───────── البيانات الأساسية للمدرسة ومنسوبوها (تقرير الواقع: «أولًا: البيانات الأساسية») ─────────
  var JOB_KEY = { 'معلم': 'teachers', 'اداري': 'admins', 'إداري': 'admins', 'وكيل': 'deputies', 'موجه طلابي': 'counselor', 'رائد النشاط': 'activity', 'محضر مختبر': 'labTechs', 'أمين مصادر تعلم': 'lrc' }
  async function packSchool(out) {
    var mn = await loadMenus(), school = { counts: {} }, staff = []
    try {
      var p = await openReport(mn.reports, 'إحصائيات عامة عن المدرسة', /الإحصائية|المدرسة/)
      var sh = null
      for (var tr = 0; tr < 3 && !sh; tr++) { if (tr) { await new Promise(function (r) { setTimeout(r, 1500) }); p = await openReport(mn.reports, 'إحصائيات عامة عن المدرسة', /الإحصائية|المدرسة/) } sh = await reportSheets(p); if (!sh) { try { sh = await reportSheets(await press(p, 'عرض')) } catch (e) { sh = null } } }
      if (!sh) throw new Error('لم يظهر التقرير')
      var g = sh[0]
      // العنوان في سطر وقيمته تحته في العمود نفسه
      var under = function (label) { for (var i = 0; i < g.length - 1; i++) { var j = g[i].indexOf(label); if (j >= 0) return clean(g[i + 1][j] || '') } return '' }
      school.ministryNo = under('الرقم الوزاري').replace(/\s+/g, ''); school.stage = under('المرحلة'); school.eduType = under('نوع التعليم'); school.classification = under('تصنيف المدرسة'); school.shift = under('وقت الدراسة')
      school.principal = scrub(sheetLabel(g, 'اسم مدير المدرسة'))
      var ti = g.findIndex(function (r) { return r.indexOf('المجموع الكلي') >= 0 })
      // عدد الفصول: صفوف الإحصائية (صف لكل فصل) قبل «المجموع الكلي»
      if (ti >= 0) school.classes = g.filter(function (r, i) { return i < ti && r.some(function (t) { return /^(الأول|الثاني|الثالث|الرابع|الخامس|السادس) (الابتدائي|المتوسط|الثانوي)$/.test(t || '') }) }).length || undefined
      if (ti >= 0) { var nums = g[ti].map(function (t, ci) { return /^\d+$/.test(t || '') ? Number(t) : null }).filter(function (x) { return x !== null }); if (nums.length) school.students = nums[0] }
      logLine('بيانات المدرسة: الرقم الوزاري ' + (school.ministryNo || '—') + ' · ' + (school.stage || '') + ' · ' + (school.shift || '') + (school.students !== undefined ? ' · ' + school.students + ' طالبًا' : ''))
    } catch (e) { logLine('إحصائيات عامة عن المدرسة: ' + (e.message || e), true) }
    try {
      var p0 = await openReport(mn.reports, 'بيانات شاغلو الوظائف للمدارس', /الإحصائية|المدرسة|المعلمين/)
      var types = optionsOf(p0, /ddlUserTypes$/)
      for (var ti2 = 0; ti2 < types.length; ti2++) {
        var job = types[ti2]; say('المنسوبون: ' + job)
        var pt = await choose(p0, /ddlUserTypes$/, byText(job)); if (!pt) continue
        var n = 0, sh2 = null
        try { sh2 = await reportSheets(await press(pt, 'عرض')) } catch (e) { sh2 = null }
        ;(sh2 || []).forEach(function (g2) {
          sheetTable(g2, /^اسم الموظف$/).rows.forEach(function (o) {
            var name = scrub(pick(o, /^اسم الموظف$/)); if (!nameOk(name)) return
            n++; var since = digits(pick(o, /المباشرة — في الوزارة|المباشرة/)).match(/(\d{4})/); staff.push({ name: name, job: job, subject: clean(pick(o, /^التخصص$/)), qualification: clean(pick(o, /^المؤهل$/)), load: num(pick(o, /الحصص/)), since: since ? since[1] : '', phone: phoneOf(pick(o, /^الجوال$|جوال/)), nid: /معلم/.test(job) ? nidOf(pick(o, /السجل المدني|رقم الهوية|^الهوية$|رقم السجل|^السجل$/)) : '' })
          })
        })
        if (JOB_KEY[job]) school.counts[JOB_KEY[job]] = (school.counts[JOB_KEY[job]] || 0) + n
      }
      var c = school.counts
      logLine('المنسوبون: ' + staff.length + ' · معلمون ' + (c.teachers || 0) + ' · وكلاء ' + (c.deputies || 0) + ' · إداريون ' + (c.admins || 0) + ' · موجه طلابي ' + (c.counselor || 0) + ' · رائد نشاط ' + (c.activity || 0) + ' · محضرو مختبر ' + (c.labTechs || 0) + ' · أمين مصادر ' + (c.lrc || 0))
    } catch (e) { logLine('بيانات شاغلي الوظائف: ' + (e.message || e), true) }
    if (!school.ministryNo && !staff.length) throw new Error('لم تُقرأ بيانات المدرسة')
    out.school = school; out.staffRows = staff
  }
  var RUN = { school: packSchool, schedule: packSchedule, leaders: packLeaders, attendance: packAttendance, results: packResults, skills: packSkills, absence: packAbsence, students: packStudents, academic: packAcademic }

  // ───────── التشغيل والإرسال ─────────
  var last = null
  function download() {
    if (!last) return
    var blob = new Blob([JSON.stringify(last)], { type: 'application/json' })
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'بيانات-نور-' + new Date().toISOString().slice(0, 10) + '.nafes.json'; document.body.appendChild(a); a.click(); a.remove()
  }
  $('snDl').onclick = download
  var dlOnly = false
  $('snOnly').onclick = function () { dlOnly = true; $('snGo').onclick() }
  $('snGo').onclick = async function () {
    var only = dlOnly; dlOnly = false
    var chosen = [].filter.call(wrap.querySelectorAll('input[data-k]'), function (c) { return c.checked }).map(function (c) { return c.getAttribute('data-k') })
    var keep = {}; [].forEach.call(wrap.querySelectorAll('input[data-k]'), function (c) { keep[c.getAttribute('data-k')] = c.checked }); try { localStorage.setItem('nafesNoorPacks', JSON.stringify(keep)) } catch (e) { }
    if (!chosen.length) { say('اختر بيانات واحدة على الأقل.', 'err'); return }
    // نافذة متتبع نافس تُفتح فورًا (بضغطة المستخدم) وتنتظر البيانات
    var w = window.__nafesTest || only ? null : window.open(APP + '/#noor', 'nafesTracker')
    $('snGo').disabled = true; $('snLog').innerHTML = ''; $('snDl').style.display = 'none'
    var school = clean((document.querySelector('.user-info, #lblUserInfo, [id*=lblSchool]') || {}).textContent || '')
    var out = { format: FORMAT, fetchedAt: new Date().toISOString(), school: school.replace(/.*-\s*/, '').slice(0, 80), schoolName: school.replace(/.*-\s*/, '').slice(0, 80), year: '' }
    try {
      for (var i = 0; i < chosen.length; i++) {
        var label = PACKS.find(function (p) { return p[0] === chosen[i] })[1]
        say('جلب: ' + label + '…'); prog(i, chosen.length)
        try { await RUN[chosen[i]](out) } catch (e) { logLine(label + ': تعذر — ' + (e && e.message || e), true) }
      }
      // تُحذف الهوية والجوالات من كل البيانات؛ وبيانات الطلاب المختارة صراحةً تبقى لملف الطلاب على جهاز المدرسة
      var keepStudents = out.studentRows; delete out.studentRows
      // المنسوبون بأسمائهم وأعمالهم؛ والجوال فقط إن اختيرت حزمة البيانات الشخصية
      var keepStaff = out.staffRows, withPhones = chosen.indexOf('students') >= 0; delete out.staffRows
      out = deepScrub(out)
      if (keepStaff && keepStaff.length) out.staffRows = keepStaff.map(function (r) { return { name: deepScrub(r.name), job: r.job, subject: deepScrub(r.subject || ''), qualification: deepScrub(r.qualification || ''), load: r.load, since: r.since || '', phone: withPhones ? r.phone || '' : '', nid: r.nid || '' } })
      if (keepStudents && keepStudents.length) out.studentRows = keepStudents.map(function (r) { return { name: deepScrub(r.name || ''), nid: r.nid || '', grade: r.grade || '', cls: r.cls || '', guardian: deepScrub(r.guardian || ''), gPhone: r.gPhone || '', gpa: r.gpa || '', track: r.track || '', subjects: r.subjects || undefined } })
      prog(1, 1); last = out
      if (window.__nafesTest) { window.__nafesOut = out; say('اختبار: انتهى الجلب', 'ok'); return }
      $('snDl').style.display = ''
      if (only) { download(); say('انتهى الجلب ونُزّل الملف ✓ — استورده في البرنامج من «استيراد ملف من الجالب».', 'ok'); return }
      if (!w) { say('انتهى الجلب. منع المتصفح فتح نافذة متتبع نافس: اسمح بالنوافذ المنبثقة لنور، أو نزّل الملف واستورده.', 'err'); return }
      say('انتهى الجلب — جارٍ الإرسال إلى متتبع نافس…')
      var sent = false, done = false
      var on = function (ev) {
        if (ev.origin !== ORIGIN || ev.source !== w || !ev.data) return
        if (ev.data.type === 'nafes-ready' && !sent) { sent = true; w.postMessage({ type: 'nafes-import', name: 'بيانات-نور.nafes.json', payload: out }, ORIGIN) }
        else if (ev.data.type === 'nafes-received') { done = true; window.removeEventListener('message', on); say('وصلت بيانات نور إلى متتبع نافس ✓ — تُستورد آليًا في نافذة النظام.', 'ok') }
      }
      window.addEventListener('message', on)
      try { w.location.href = APP + '/#noor-' + Date.now() } catch (e) { }
      setTimeout(function () { if (!done) say('لم يستجب متتبع نافس بعد. تأكد أن نافذته فُتحت وأنك دخلت إليه، أو نزّل الملف.', 'err') }, 45000)
    } catch (e) { say(e && e.message || String(e), 'err') } finally { $('snGo').disabled = false }
  }
})()
