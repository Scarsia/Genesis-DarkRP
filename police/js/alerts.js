window.__mdtModule('alerts', function(){
// ALERTES ACTIVES  (WANTED / BOLO)
// ════════════════════════════════════════════════════════════════
window.ALERTS = window.ALERTS || [];

window.__mdt_set_alerts = function(jsonStr){
  try{
    const parsed = JSON.parse(jsonStr);
    if(!Array.isArray(parsed)) throw new Error('not array');
    window.ALERTS = parsed;
    window.__mdt_runDataHooks('alerts', window.ALERTS);
    renderAlerts();
  }catch(e){ console.warn('[MDT] alerts parse error',e); }
};

function requestAlertsList(){
  // Les alertes = citoyens wanted + mandats actifs
  // On les construit localement depuis CITIZENS et WARRANTS déjà chargés
  const alerts = [];

  // 1. Wanted citizens
  (window.CITIZENS||[]).filter(c=>c.wanted).forEach(c=>{
    alerts.push({
      id:     'w_'+c.steamid64,
      type:   'wanted',
      name:   ((c.firstname||c.rp_name||'')+(c.lastname?' '+c.lastname:'')).trim(),
      sid64:  c.steamid64||'—',
      reason: 'Mandat actif',
      job:    c.job||'—',
      online: c.is_online||false,
    });
  });

  // 2. Active warrants
  (window.WARRANTS||[]).filter(w=>w.status==='active').forEach(w=>{
    if(!alerts.find(a=>a.sid64===w.citizen_sid64)){
      alerts.push({
        id:     'wrn_'+w.id,
        type:   'bolo',
        name:   w.citizen_name||w.citizen_sid64||'Inconnu',
        sid64:  w.citizen_sid64||'—',
        reason: w.reason||'—',
        warrant:w.warrant_number||'—',
        issued: w.issued_by_name||'—',
        online: false,
      });
    }
  });

  window.ALERTS = alerts;
  renderAlerts();

  // Demander aussi au serveur une liste fraîche
  try{if(window.mdtBridge&&window.mdtBridge.request){window.mdtBridge.request('get_alerts','{}','req_alt_'+Date.now());return;}}catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'get_alerts',reqId:'req_alt_'+Date.now(),data:{}}));
}

function filterAlerts(){
  const q=(document.getElementById('alert-search')?.value||'').toLowerCase();
  const filtered = q
    ? window.ALERTS.filter(a=>(a.name||'').toLowerCase().includes(q)||(a.sid64||'').includes(q)||(a.reason||'').toLowerCase().includes(q))
    : window.ALERTS;
  renderAlertCards(filtered);
}

function renderAlerts(){
  renderAlertCards(ALERTS);
  const el=document.getElementById('alert-count');
  if(el) el.textContent=window.ALERTS.length+' alerte'+(window.ALERTS.length!==1?'s':'');
}

function renderAlertCards(list){
  const grid = document.getElementById('alert-grid');
  if(!grid) return;
  if(list.length===0){
    const msg = window.ALERTS.length===0
      ? '<div class="alert-empty"><div class="alert-empty-ico">✅</div><div class="alert-empty-txt">Aucune alerte active — secteur sécurisé</div></div>'
      : '<div class="alert-empty"><div class="alert-empty-ico">🔎</div><div class="alert-empty-txt">Aucun résultat</div></div>';
    grid.innerHTML=msg; return;
  }
  grid.innerHTML = list.map(a=>{
    const isWanted = a.type==='wanted';
    const initials = ((a.name||'?')[0]+(a.name||'?').split(' ').pop()?.[0]||'').toUpperCase();
    const extraFields = isWanted
      ? `<div class="alert-field"><span class="af-key">Emploi</span><span class="af-val">${esc(a.job||'—')}</span></div>
         <div class="alert-field"><span class="af-key">Statut</span><span class="af-val">${a.online?'<span style="color:var(--success)">● En ligne</span>':'<span style="color:var(--text-dim)">● Hors ligne</span>'}</span></div>`
      : `<div class="alert-field"><span class="af-key">N° Mandat</span><span class="af-val mono">${esc(a.warrant||'—')}</span></div>
         <div class="alert-field"><span class="af-key">Émis par</span><span class="af-val">${esc(a.issued||'—')}</span></div>`;
    return `
      <div class="alert-card ${a.type}">
        <div class="alert-card-hdr">
          <div class="ac-ava ${a.type}">${initials}</div>
          <div>
            <div class="ac-name">${esc(a.name||'Inconnu')}</div>
            <span class="ac-type-pill ${a.type}">${isWanted?'⚑ WANTED':'BOLO'}</span>
          </div>
        </div>
        <div class="alert-body">
          <div class="alert-field"><span class="af-key">Steam ID</span><span class="af-val mono">${esc(a.sid64||'—')}</span></div>
          <div class="alert-field"><span class="af-key">Motif</span><span class="af-val">${esc(a.reason||'—')}</span></div>
          ${extraFields}
        </div>
      </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════════


window.requestAlertsList = requestAlertsList;
window.filterAlerts = filterAlerts;
window.renderAlerts = renderAlerts;


});
