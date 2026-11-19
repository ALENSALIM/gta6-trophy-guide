// Leonida Legend — GTA VI trophy guide and tracker.
// Loads the trophy list from data/trophies.json, renders the checklist,
// and keeps earned trophies in this browser only (localStorage).
(function () {
  var STORE_KEY = 'leonida-legend-progress-v1';
  var SPOILER_KEY = 'leonida-legend-spoiler-v1';
  var listEl = document.getElementById('trophyList');
  var watchEl = document.getElementById('watchList');
  var searchEl = document.getElementById('searchBox');
  var spoilerEl = document.getElementById('spoilerToggle');
  var hideEarnedEl = document.getElementById('hideEarnedToggle');
  var progressText = document.getElementById('progressText');
  var progressFill = document.getElementById('progressFill');
  var gradeText = document.getElementById('gradeText');
  var resultCount = document.getElementById('resultCount');
  var emptyState = document.getElementById('emptyState');
  var detailEl = document.getElementById('detail');
  var currentKind = 'all';
  var earned = new Set();
  var trophies = [];
  var openId = null;

  try {
    earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'));
  } catch (e) { earned = new Set(); }
  spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1';

  var params = new URLSearchParams(location.search);
  if (params.get('spoiler') === '1') spoilerEl.checked = true;
  if (params.get('filter')) currentKind = params.get('filter');
  if (params.get('view')) showView(params.get('view'));
  if (params.get('check')) {
    params.get('check').split(',').forEach(function (id) {
      var t = trophies.find(function (x) { return String(x.id) === id; });
      if (t) earned.add(t.name);
    });
  }

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(earned)));
  }
  function isEarned(t) { return earned.has(t.name); }
  function kindLabel(k) {
    return { story: 'Story', side: 'Side missions', collectibles: 'Collectibles',
      activities: 'Activities', combat: 'Combat & co-op', money: 'Money & misc',
      completion: 'Completion' }[k] || k;
  }
  function stageName(n) {
    return { 1: 'Stage 1 · Story', 2: 'Stage 2 · Side missions',
      3: 'Stage 3 · Collectibles & activities', 4: 'Stage 4 · The grind',
      5: 'Stage 5 · 100% completion', 6: 'Stage 6 · Platinum' }[n] || ('Stage ' + n);
  }
  function hiddenBySpoiler(t) {
    return spoilerEl.checked && t.kind === 'story' && !isEarned(t);
  }
  function visible(t) {
    var q = searchEl.value.trim().toLowerCase();
    if (q && (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().indexOf(q) === -1) return false;
    if (hideEarnedEl.checked && isEarned(t)) return false;
    if (currentKind === 'earned') return isEarned(t);
    if (currentKind === 'todo') return !isEarned(t);
    if (currentKind === 'missable') return t.missable === true;
    if (currentKind === 'all') return true;
    return t.kind === currentKind;
  }

  function badge(t) {
    var s = document.createElement('span');
    s.className = 'badge ' + t.grade;
    s.textContent = t.grade;
    return s;
  }

  function makeRow(t, showGuideHint) {
    var li = document.createElement('li');
    li.className = 'trophy' + (isEarned(t) ? ' earned' : '');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isEarned(t);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    box.addEventListener('click', function (ev) { ev.stopPropagation(); });
    box.addEventListener('change', function () {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      save(); render();
      if (openId === t.id) fillDetail(t);
    });
    var body = document.createElement('div');
    var name = document.createElement('p');
    name.className = 'trophy-name';
    name.textContent = hiddenBySpoiler(t) ? 'Hidden story trophy' : t.name;
    var desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = hiddenBySpoiler(t)
      ? 'Spoiler hidden — earn this story trophy to reveal its name and description.'
      : t.description;
    var meta = document.createElement('p');
    meta.className = 'trophy-meta';
    meta.textContent = kindLabel(t.kind) + ' · ' + stageName(t.roadmapStage);
    if (showGuideHint) {
      var hint = document.createElement('span');
      hint.textContent = ' — click for the full guide';
      meta.appendChild(hint);
    }
    if (t.missableNote && t.missableNote.indexOf('Watch') === 0) {
      var w = document.createElement('span');
      w.className = 'watch';
      w.textContent = ' · Watchlist — not yet confirmed missable';
      meta.appendChild(w);
    }
    body.append(name, desc, meta);
    li.append(box, body, badge(t));
    li.addEventListener('click', function () { openDetail(t); });
    return li;
  }

  function render() {
    var total = trophies.length;
    var done = trophies.filter(isEarned).length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    progressText.textContent = done + ' of ' + total + ' earned · ' + pct + '%';
    progressFill.style.width = pct + '%';
    var grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    trophies.forEach(function (t) { if (isEarned(t)) grades[t.grade]++; });
    gradeText.textContent = 'Platinum ' + grades.platinum + '/1 · Gold ' + grades.gold + '/2 · Silver ' + grades.silver + '/6 · Bronze ' + grades.bronze + '/46';
    listEl.replaceChildren();
    var shown = 0;
    trophies.forEach(function (t) {
      if (!visible(t)) return;
      listEl.appendChild(makeRow(t, true));
      shown++;
    });
    emptyState.hidden = shown !== 0;
    if (currentKind === 'missable') {
      resultCount.textContent = 'No trophy is flagged as missable — the official descriptions do not clearly tie any trophy to a one-time story moment or choice. See the Missable Watchlist tab for the trophies to double-check.';
    } else {
      resultCount.textContent = 'Showing ' + shown + ' of ' + total + ' trophies. Click any trophy for its full guide and sources.';
    }
    renderRoadmap();
    renderWatchlist();
  }

  var STAGES = [
    [1, 'Story chapters in order', 'Play the story from the opening mission through Chapter 4 and the final mission. Chapter and named-mission trophies all land here.'],
    [2, 'Side missions', 'Finish the contact finales — Andy, Kenton, Billy, Randy and Tyrone — plus the stranger strands, Bret\u2019s hunt and Cal\u2019s fishing challenge.'],
    [3, 'Collectibles and activities', 'Cards, WAiNK spots, vehicles, areas, garages, meditation spots, drone races and the activity sampler.'],
    [4, 'The grind', 'The big cumulative counts and the combat, co-op, robbery and money trophies. Save these for after the story, when the map is open.'],
    [5, '100% completion', 'Clear whatever the in-game completion checklist still shows, then A Long Road pops.'],
    [6, 'Platinum last', 'Vice Got a Price! unlocks automatically once the other 54 trophies are earned.']
  ];
  function renderRoadmap() {
    var ol = document.getElementById('roadmapList');
    if (!ol || !trophies.length) return;
    ol.replaceChildren();
    STAGES.forEach(function (st) {
      var li = document.createElement('li');
      var h = document.createElement('h3');
      h.textContent = st[1];
      var p = document.createElement('p');
      p.className = 'section-intro';
      p.textContent = st[2];
      var ul = document.createElement('ul');
      ul.className = 'stage-trophies';
      trophies.filter(function (t) { return t.roadmapStage === st[0]; }).forEach(function (t) {
        var item = document.createElement('li');
        item.textContent = (isEarned(t) ? '✓ ' : '') + t.name;
        if (isEarned(t)) item.className = 'done';
        ul.appendChild(item);
      });
      li.append(h, p, ul);
      ol.appendChild(li);
    });
  }

  function renderWatchlist() {
    if (!watchEl || !trophies.length) return;
    watchEl.replaceChildren();
    var watch = trophies.filter(function (t) {
      return (t.missableNote && t.missableNote.indexOf('Watch') === 0) || t.id === 52 || t.id === 53;
    });
    watch.forEach(function (t) { watchEl.appendChild(makeRow(t, true)); });
  }

  function fillDetail(t) {
    document.getElementById('detailGrade').textContent = t.grade;
    document.getElementById('detailKind').textContent = kindLabel(t.kind);
    document.getElementById('detailStage').textContent = stageName(t.roadmapStage);
    document.getElementById('detailName').textContent = hiddenBySpoiler(t) ? 'Hidden story trophy' : t.name;
    document.getElementById('detailDesc').textContent = hiddenBySpoiler(t)
      ? 'Spoiler hidden — earn this story trophy to reveal its name and description.'
      : t.description;
    var cb = document.getElementById('detailEarned');
    cb.checked = isEarned(t);
    cb.onchange = function () {
      if (cb.checked) earned.add(t.name); else earned.delete(t.name);
      save(); render(); fillDetail(t);
    };
    document.getElementById('detailGuide').textContent = t.guide;
    var steps = document.getElementById('detailSteps');
    steps.replaceChildren();
    (t.steps || []).forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s;
      steps.appendChild(li);
    });
    document.getElementById('detailMissable').textContent = t.missableNote || '';
    var src = document.getElementById('detailSources');
    src.replaceChildren();
    (t.sources || []).forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s;
      src.appendChild(li);
    });
  }
  function openDetail(t) {
    openId = t.id;
    fillDetail(t);
    detailEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeDetail() {
    openId = null;
    detailEl.hidden = true;
    document.body.style.overflow = '';
  }
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  detailEl.addEventListener('click', function (e) { if (e.target === detailEl) closeDetail(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });

  function showView(name) {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === name);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.hidden = v.id !== 'view-' + name;
    });
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { showView(b.dataset.view); });
  });
  document.querySelectorAll('#filters .chip').forEach(function (b) {
    b.addEventListener('click', function () {
      currentKind = b.dataset.kind;
      document.querySelectorAll('#filters .chip').forEach(function (c) {
        c.classList.toggle('active', c === b);
      });
      render();
    });
  });
  searchEl.addEventListener('input', render);
  spoilerEl.addEventListener('change', function () {
    localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0');
    render();
  });
  hideEarnedEl.addEventListener('change', render);

  document.getElementById('exportBtn').addEventListener('click', function () {
    var data = { game: 'Grand Theft Auto VI', exportedAt: new Date().toISOString(), earned: Array.from(earned) };
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('importFile').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var names = Array.isArray(data) ? data : data.earned;
        var known = new Set(trophies.map(function (t) { return t.name; }));
        earned = new Set((names || []).filter(function (n) { return known.has(n); }));
        save(); render();
        resultCount.textContent = 'Imported ' + earned.size + ' earned trophies.';
      } catch (err) {
        resultCount.textContent = 'That file could not be read as a progress export. Nothing was changed.';
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!confirm('Clear all earned trophies from this checklist?')) return;
    earned = new Set();
    save(); render();
  });

  fetch('data/trophies.json')
    .then(function (r) { return r.json(); })
    .then(function (doc) {
      trophies = doc.trophies;
      if (params.get('check')) {
        params.get('check').split(',').forEach(function (id) {
          var t = trophies.find(function (x) { return String(x.id) === id; });
          if (t) earned.add(t.name);
        });
        save();
      }
      document.querySelectorAll('#filters .chip').forEach(function (c) {
        c.classList.toggle('active', c.dataset.kind === currentKind);
      });
      render();
      if (params.get('open')) {
        var t = trophies.find(function (x) { return String(x.id) === params.get('open'); });
        if (t) openDetail(t);
      }
    })
    .catch(function () {
      listEl.replaceChildren();
      var li = document.createElement('li');
      li.textContent = 'Could not load data/trophies.json. Open this guide through a local server or a browser that can read local files.';
      listEl.appendChild(li);
    });
})();
