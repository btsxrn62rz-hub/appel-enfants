
(function(){
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const storageKey = 'appel_scouts_v1';
  const historyKey = 'appel_scouts_history_v1';
  const themeKey = 'appel_scouts_theme';

  const state = {
    groups: {
      LL: { name: 'Louveteaux-Louvettes', children: [] },
      EE: { name: 'Éclaireurs-Éclaireuses', children: [] }
    }
  };

  function load() {
    const raw = localStorage.getItem(storageKey);
    if (raw) state.groups = JSON.parse(raw).groups;
    const savedTheme = localStorage.getItem(themeKey);
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  }
  function save() { localStorage.setItem(storageKey, JSON.stringify({ groups: state.groups })); }
  function saveHistory(entry) {
    const raw = localStorage.getItem(historyKey);
    const list = raw ? JSON.parse(raw) : [];
    list.push(entry);
    localStorage.setItem(historyKey, JSON.stringify(list));
  }
  function getHistory() { return JSON.parse(localStorage.getItem(historyKey) || '[]'); }

  function renderGroup(id) {
    const ul = qs(`#list-${id}`); ul.innerHTML = '';
    state.groups[id].children.forEach((child, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<input type="checkbox" ${child.present?'checked':''}/> ${child.name} <button>Supprimer</button>`;
      li.querySelector('input').addEventListener('change', e => child.present = e.target.checked);
      li.querySelector('button').addEventListener('click', () => { state.groups[id].children.splice(idx,1); save(); renderGroup(id); });
      ul.appendChild(li);
    });
  }
  function renderAll() { renderGroup('LL'); renderGroup('EE'); renderHistory(); renderChart(); }

  function addChild(id, name) {
    if (!name.trim()) return;
    state.groups[id].children.push({ name, present:false });
    save(); renderGroup(id);
  }

  function validateCall() {
    const date = qs('#callDate').value || new Date().toISOString().slice(0,10);
    const entry = { date, groups: {
      LL: state.groups.LL.children.map(c => ({ name:c.name, present:c.present })),
      EE: state.groups.EE.children.map(c => ({ name:c.name, present:c.present }))
    }};
    saveHistory(entry);
    ['LL','EE'].forEach(g => state.groups[g].children.forEach(c => c.present=false));
    save(); renderAll(); renderQR();
  }

  function renderHistory() {
    const container = qs('#historyContainer');
    const filter = qs('#filterDate').value;
    const list = getHistory().filter(e => !filter || e.date===filter);
    container.innerHTML = list.length? '' : '<p>Aucun enregistrement.</p>';
    list.slice().reverse().forEach(e => {
      const div = document.createElement('div');
      div.textContent = `${e.date}: LL ${e.groups.LL.filter(c=>c.present).length}/${e.groups.LL.length}, EE ${e.groups.EE.filter(c=>c.present).length}/${e.groups.EE.length}`;
      container.appendChild(div);
    });
  }

  // --- Chart.js ---
  let chart;
  function renderChart() {
    const ctx = qs('#presenceChart');
    const history = getHistory();
    const labels = history.map(e => e.date);
    const llData = history.map(e => e.groups.LL.filter(c=>c.present).length);
    const eeData = history.map(e => e.groups.EE.filter(c=>c.present).length);
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'Louveteaux', data: llData, borderColor:'#2563eb', fill:false },
          { label:'Éclaireurs', data: eeData, borderColor:'#f97316', fill:false }
        ]
      }
    });
  }

  // --- QR Code ---
  function renderQR() {
    new QRCode(qs('#qrcode'), {
      text: window.location.href,
      width: 128,
      height: 128
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    qsa('.addBtn').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.target;
      addChild(id, qs(`#addName-${id}`).value);
      qs(`#addName-${id}`).value='';
    }));
    qsa('.exportBtn').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.target;
      const rows = [['Nom','Présent']].concat(state.groups[id].children.map(c=>[c.name,c.present?'Oui':'Non']));
      const csv = rows.map(r=>r.join(';')).join('\\n');
      const blob = new Blob([csv],{type:'text/csv'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${id}.csv`;
      a.click();
    }));
    qs('#validateCall').addEventListener('click', validateCall);
    qs('#filterDate').addEventListener('change', renderHistory);
    qs('#clearFilter').addEventListener('click', () => { qs('#filterDate').value=''; renderHistory(); });
    renderAll();
    renderQR();
  });
})();
