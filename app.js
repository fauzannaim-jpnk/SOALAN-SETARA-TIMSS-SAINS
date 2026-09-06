(function () {
  'use strict';

  var CFG = window.APP_CONFIG || { subjek: 'Soalan', dataFile: 'questions.json' };

  var state = {
    all: [],
    filtered: [],
    highlighted: -1,
    currentId: null,
    query: ''
  };

  var el = {
    app: document.getElementById('app'),
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('sidebarOverlay'),
    searchInput: document.getElementById('searchInput'),
    listCount: document.getElementById('listCount'),
    questionList: document.getElementById('questionList'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    questionView: document.getElementById('questionView'),
    activeQuestionBar: document.getElementById('activeQuestionBar'),
    qTopik: document.getElementById('qTopik'),
    qMeta: document.getElementById('qMeta'),
    qFrame: document.getElementById('qFrame'),
    btnList: document.getElementById('btnList'),
    btnDownload: document.getElementById('btnDownload'),
    btnNewTab: document.getElementById('btnNewTab'),
    btnPrint: document.getElementById('btnPrint'),
    btnToggleSidebar: document.getElementById('btnToggleSidebar'),
    statTotal: document.getElementById('statTotal'),
    statGuru: document.getElementById('statGuru'),
    statSekolah: document.getElementById('statSekolah')
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>' + escapeHtml(text.slice(idx + query.length));
  }

  function loadData() {
    return fetch(CFG.dataFile)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        state.all = data;
        state.filtered = data.slice();
        renderStats();
        renderList();
        openFromHash();
      })
      .catch(function (err) {
        el.questionList.innerHTML = '<li class="empty-hint">Gagal muatkan data.<br>' + escapeHtml(err.message) + '</li>';
        console.error(err);
      });
  }

  function renderStats() {
    var guruSet = {}, sekolahSet = {};
    state.all.forEach(function (q) {
      if (q.guru) guruSet[q.guru.toLowerCase()] = true;
      if (q.sekolah) sekolahSet[q.sekolah.toLowerCase()] = true;
    });
    if (el.statTotal) el.statTotal.textContent = state.all.length;
    if (el.statGuru) el.statGuru.textContent = Object.keys(guruSet).length;
    if (el.statSekolah) el.statSekolah.textContent = Object.keys(sekolahSet).length;
  }

  function applyFilter() {
    var q = state.query.trim().toLowerCase();
    if (!q) {
      state.filtered = state.all.slice();
    } else {
      state.filtered = state.all.filter(function (item) {
        return (item.topik && item.topik.toLowerCase().indexOf(q) !== -1) ||
               (item.guru && item.guru.toLowerCase().indexOf(q) !== -1) ||
               (item.sekolah && item.sekolah.toLowerCase().indexOf(q) !== -1);
      });
    }
    state.highlighted = state.filtered.length ? 0 : -1;
    renderList();
  }

  function renderList() {
    var q = state.query.trim();
    el.listCount.textContent = state.filtered.length + ' drpd ' + state.all.length + ' soalan';
    if (!state.filtered.length) {
      el.questionList.innerHTML = '<li class="empty-hint">Tiada soalan sepadan carian.</li>';
      return;
    }
    var html = '';
    state.filtered.forEach(function (item, i) {
      var cls = 'q-item';
      if (item.id === state.currentId) cls += ' active';
      if (i === state.highlighted) cls += ' highlighted';
      html += '<li class="' + cls + '" data-idx="' + i + '" data-id="' + item.id + '" role="option">' +
              '<div class="q-title">' + highlightMatch(item.topik || '(Tiada topik)', q) + '</div>' +
              '<div class="q-sub">' + highlightMatch(item.guru || '', q) + ' • ' + highlightMatch(item.sekolah || '', q) + '</div>' +
              '</li>';
    });
    el.questionList.innerHTML = html;
  }

  function scrollHighlightedIntoView() {
    var node = el.questionList.querySelector('.q-item.highlighted');
    if (node) node.scrollIntoView({ block: 'nearest' });
  }

  function findById(id) {
    for (var i = 0; i < state.all.length; i++) {
      if (state.all[i].id === id) return state.all[i];
    }
    return null;
  }

  function openFromHash() {
    var m = /#q=(\d+)/.exec(location.hash);
    if (m) {
      var id = parseInt(m[1], 10);
      var item = findById(id);
      if (item) { selectQuestion(item, { updateHash: false }); return; }
    }
    showWelcome();
  }

  function selectQuestion(item, opts) {
    opts = opts || {};
    state.currentId = item.id;
    el.qTopik.textContent = item.topik || '(Tiada topik)';
    el.qMeta.innerHTML = '👤 ' + escapeHtml(item.guru || '-') +
      '<span class="dot">•</span>🏫 ' + escapeHtml(item.sekolah || '-');
    el.qFrame.srcdoc = item.html || '<p style="font-family:sans-serif;padding:20px;color:#900">Kod HTML tiada untuk soalan ini.</p>';
    el.welcomeScreen.hidden = true;
    el.questionView.hidden = false;
    if (el.activeQuestionBar) el.activeQuestionBar.hidden = false;
    if (opts.updateHash !== false) {
      history.replaceState(null, '', '#q=' + item.id);
    }
    renderList();
    closeMobileSidebar();
  }

  function showWelcome() {
    state.currentId = null;
    el.welcomeScreen.hidden = false;
    el.questionView.hidden = true;
    if (el.activeQuestionBar) el.activeQuestionBar.hidden = true;
    el.qFrame.srcdoc = '';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    renderList();
  }

  function toggleSidebar() {
    if (window.innerWidth <= 860) {
      el.app.classList.toggle('sidebar-mobile-open');
    } else {
      el.app.classList.toggle('sidebar-collapsed');
    }
  }
  function closeMobileSidebar() {
    if (window.innerWidth <= 860) el.app.classList.remove('sidebar-mobile-open');
  }
  function openSidebarForList() {
    if (window.innerWidth <= 860) {
      el.app.classList.add('sidebar-mobile-open');
    } else {
      el.app.classList.remove('sidebar-collapsed');
    }
    el.searchInput.focus();
  }

  function sanitizeFilename(s) {
    return (s || 'soalan').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_').slice(0, 80);
  }

  function currentItem() { return state.currentId != null ? findById(state.currentId) : null; }

  function downloadCurrent() {
    var item = currentItem();
    if (!item) return;
    var blob = new Blob([item.html || ''], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(item.topik) + '_' + sanitizeFilename(item.guru) + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function openCurrentInNewTab() {
    var item = currentItem();
    if (!item) return;
    var blob = new Blob([item.html || ''], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
  }

  function printCurrent() {
    try {
      el.qFrame.contentWindow.focus();
      el.qFrame.contentWindow.print();
    } catch (e) {
      window.print();
    }
  }

  function moveHighlight(delta) {
    if (!state.filtered.length) return;
    if (state.highlighted === -1) {
      state.highlighted = 0;
    } else {
      state.highlighted = (state.highlighted + delta + state.filtered.length) % state.filtered.length;
    }
    renderList();
    scrollHighlightedIntoView();
  }

  function openHighlighted() {
    if (state.highlighted >= 0 && state.filtered[state.highlighted]) {
      selectQuestion(state.filtered[state.highlighted]);
    }
  }

  // ---------- Event wiring ----------
  el.searchInput.addEventListener('input', function (e) {
    state.query = e.target.value;
    applyFilter();
  });

  el.questionList.addEventListener('click', function (e) {
    var li = e.target.closest('.q-item');
    if (!li) return;
    var id = parseInt(li.getAttribute('data-id'), 10);
    var item = findById(id);
    if (item) selectQuestion(item);
  });

  if (el.btnList) el.btnList.addEventListener('click', openSidebarForList);
  if (el.btnDownload) el.btnDownload.addEventListener('click', downloadCurrent);
  if (el.btnNewTab) el.btnNewTab.addEventListener('click', openCurrentInNewTab);
  if (el.btnPrint) el.btnPrint.addEventListener('click', printCurrent);
  if (el.btnToggleSidebar) el.btnToggleSidebar.addEventListener('click', toggleSidebar);
  if (el.overlay) el.overlay.addEventListener('click', closeMobileSidebar);

  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var inSearch = document.activeElement === el.searchInput;

    // "/" quick search focus
    if (e.key === '/' && !inSearch && tag !== 'TEXTAREA') {
      e.preventDefault();
      el.searchInput.focus();
      el.searchInput.select();
      return;
    }

    // Ctrl+B / Cmd+B toggle sidebar
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHighlight(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (e.key === 'Enter') {
      if (inSearch || tag !== 'INPUT') {
        e.preventDefault();
        openHighlighted();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (inSearch) el.searchInput.blur();
      state.query = '';
      el.searchInput.value = '';
      applyFilter();
      showWelcome();
      return;
    }
  });

  window.addEventListener('hashchange', openFromHash);

  loadData();
})();
