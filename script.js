
(function(){
  // Helpers & keys
  const qs  = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const storageKey = 'appel_scouts_v1';
  const historyKey = 'appel_scouts_history_v1';
  const themeKey   = 'appel_scouts_theme';

  const state = {
    groups: {
      LL: { name: 'Louveteaux-Louvettes', children: [] },
      EE: { name: 'Éclaireurs-Éclaireuses', children: [] }
    }
  };

  // Storage
  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.groups && data.groups.LL && data.groups.EE) {
          state.groups = data.groups;
        }
      }
    } catch (e) { console.warn('⚠️ Erreur lecture LocalStorage:', e); }
    const savedTheme = localStorage.getItem(themeKey);
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ groups: state.groups })); }
    catch (e) { console.warn('⚠️ Erreur écriture LocalStorage:', e); }
  }
  function saveHistory(entry) {
    try {
      const raw = localStorage.getItem(historyKey);
      const list = raw ? JSON.parse(raw) : [];
      list.push(entry);
      localStorage.setItem(historyKey, JSON.stringify(list));
    } catch (e) { console.warn('⚠️ Erreur écriture historique:', e); }
  }
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(historyKey) || '[]'); }
    catch (e) { return []; }
  }

  // Rendering groups
  function renderGroup(id) {
    const ul = qs(`#list-${id}`);
    if (!ul) return;
    ul.innerHTML = '';
    state.groups[id].children.forEach((child, idx) => {
      const li = document.createElement('li');
      li.className = 'child-item';
      li.innerHTML = `
        <div class="child-left">
          <input type="checkbox" aria-label="Présent" ${child.present ? 'checked' : ''} />
          <span class="child-name">${child.name}</span>
        </div>
        <div class="child-actions">
          <button class="delBtn">Supprimer</button>
        </div>`;
      const checkbox = qs('input[type="checkbox"]', li);
      checkbox.addEventListener('change', (e) => { child.present = e.target.checked; });
      const del = qs('.delBtn', li);
      del.addEventListener('click', () => {
        state.groups[id].children.splice(idx, 1);
        save();
        renderGroup(id);
      });
      ul.appendChild(li);
    });
  }

  function renderAll() {
    renderGroup('LL');
    renderGroup('EE');
    renderHistory();
    renderChart();   // ne plante pas si Chart absent (guard ci-dessous)
  }

  // Actions
  function addChild(id, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    state.groups[id].children.push({ name: trimmed, present: false });
    save();
    renderGroup(id);
  }

  function exportCSV(id) {
    const group = state.groups[id];
    const rows = [['Nom', 'Présent']].concat(
      group.children.map(c => [c.name, c.present ? 'Oui' : 'Non'])
    );
    const csv = rows.map(r => r.map(v => '"' + String(v).replace('"', '""') + '"').join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const dateStr = new Date().toISOString().slice(0,10);
    a.download = `${group.name.replace(/\s+/g,'_')}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function validateCall() {
    const date = qs('#callDate').value || new Date().toISOString().slice(0,10);
    const entry = {
      date,
      groups: {
        LL: state.groups.LL.children.map(c => ({ name: c.name, present: !!c.present })),
        EE: state.groups.EE.children.map(c => ({ name: c.name, present: !!c.present }))
      }
    };
    saveHistory(entry);
    // reset présences
    ['LL','EE'].forEach(g => state.groups[g].children.forEach(c => c.present = false));
    save();
    renderAll();
    renderQR();
  }

  // Historique
  function renderHistory() {
    const container = qs('#historyContainer');
    const filterDate = qs('#filterDate').value;
    const list = getHistory().filter(e => !filterDate || e.date === filterDate);
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<p>Aucun enregistrement pour cette sélection.</p>';
      return;
    }
    list.slice().reverse().forEach(entry => {
      const div = document.createElement('div');
      div.className = 'history-entry';
      const llPresent = entry.groups.LL.filter(c => c.present).length;
      const eePresent = entry.groups.EE.filter(c => c.present).length;
      div.innerHTML = `
        <strong>${entry.date}</strong><br>
        ${state.groups.LL.name}: ${llPresent}/${entry.groups.LL.length} présents<br>
        ${state.groups.EE.name}: ${eePresent}/${entry.groups.EE.length} présents`;
      container.appendChild(div);
    });
  }

  // Chart.js (guard si librairie absente)
  let chart;
  function renderChart() {
    const ctx = qs('#presenceChart');
    const status = qs('#chartStatus');
    if (!ctx) return;
    if (typeof window.Chart === 'undefined') {
      if (status) status.textContent = 'ℹ️ Chart.js non chargé : les statistiques ne s’affichent pas (connexion requise).';
      console.warn('Chart.js non disponible. Graphique non rendu.');
      return;
    }
    const history = getHistory();
    const labels = history.map(e => e.date);
    const llData = history.map(e => e.groups.LL.filter(c=>c.present).length);
    const eeData = history.map(e => e.groups.EE.filter(c=>c.present).length);
    if (chart) chart.destroy();
    const cs = getComputedStyle(document.documentElement);
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Louveteaux-Louvettes', data: llData, borderColor: cs.getPropertyValue('--primary').trim(), tension: 0.2 },
          { label: 'Éclaireurs-Éclaireuses', data: eeData, borderColor: cs.getPropertyValue('--accent').trim(), tension: 0.2 }
        ]
      },
      options: {
        plugins: { legend: { labels: { color: cs.getPropertyValue('--fg').trim() } } },
        scales: {
          x: { ticks: { color: cs.getPropertyValue('--fg').trim() }, grid: { color: cs.getPropertyValue('--border').trim() } },
          y: { ticks: { color: cs.getPropertyValue('--fg').trim() }, grid: { color: cs.getPropertyValue('--border').trim() } }
        }
      }
    });
    if (status) status.textContent = '';
  }

  // QR Code (guard si librairie absente)
  function renderQR() {
    const container = qs('#qrcode');
    const status = qs('#qrStatus');
    if (!container) return;
    if (typeof window.QRCode === 'undefined') {
      if (status) status.textContent = 'ℹ️ QRCode.js non chargé : QR indisponible (connexion requise).';
      console.warn('QRCode.js non disponible. QR non rendu.');
      return;
    }
    container.innerHTML = '';
    new QRCode(container, { text: window.location.href, width: 128, height: 128 });
    if (status) status.textContent = '';
  }

  // Thème
  function setupTheme() {
    const btn = qs('#themeToggle');
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(themeKey, next);
      renderChart(); // rafraîchir couleurs
    });
    if (!localStorage.getItem(themeKey)) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  // Wiring
  function setupEvents() {
    qsa('.addBtn').forEach(btn => {
      const id = btn.getAttribute('data-target');
      btn.addEventListener('click', () => {
        const input = qs(`#addName-${id}`);
        addChild(id, input.value);
        input.value = '';
        input.focus();
      });
    });
    qsa('.exportBtn').forEach(btn => {
      const id = btn.getAttribute('data-target');
      btn.addEventListener('click', () => exportCSV(id));
    });
    qs('#validateCall').addEventListener('click', validateCall);
    qs('#filterDate').addEventListener('change', renderHistory);
    qs('#clearFilter').addEventListener('click', () => { qs('#filterDate').value=''; renderHistory(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    setupTheme();
    setupEvents();
    renderAll();
    renderQR();
    console.log('%c✅ Application chargée', 'background: #22c55e; color: white; padding:2px 6px; border-radius:4px');
  });
})();
