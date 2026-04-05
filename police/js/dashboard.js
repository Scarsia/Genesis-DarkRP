window.__mdtModule('dashboard', function(){
// TABLEAU DE BORD  —  Dashboard stats + activity feed
// ════════════════════════════════════════════════════════════════
window._dashStats = window._dashStats || null;
window._dashOfficers = window._dashOfficers || null;

window.__mdt_set_dashboard = function(jsonStr){
  try{
    const d = JSON.parse(jsonStr);
    window._dashStats = d;
    window.__mdt_runDataHooks('dashboard', d);
    renderDashboard(d);
  }catch(e){ console.warn('[MDT] dashboard parse error',e); }
};

function requestDashboardStats(){
  try{if(window.mdtBridge&&window.mdtBridge.request){window.mdtBridge.request('get_dashboard','{}','req_dash_'+Date.now());return;}}catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'get_dashboard',reqId:'req_dash_'+Date.now(),data:{}}));
}

function renderDashboard(d){
  // KPIs
  const setKpi=(id,val,sub,cls)=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.textContent=val;
    el.classList.remove('kpi-loading');
    if(cls)el.className='kpi-val '+cls;
    const s=document.getElementById(id+'-sub');
    if(s)s.textContent=sub;
  };
  setKpi('kpi-arrests',  d.arrests_today??'—',    'Depuis minuit',     'blue');
  setKpi('kpi-warrants', d.active_warrants??'—',  'En attente',        'red');
  setKpi('kpi-officers', d.active_officers??'—',  'Actuellement',      'green');
  setKpi('kpi-wanted',   d.wanted_citizens??'—',  'Personnes fichées', 'amber');

  // Activity feed
  const actEl = document.getElementById('dash-activity');
  const acts  = d.recent_activity || [];
  if(!actEl) return;
  if(acts.length===0){
    actEl.innerHTML='<div style="color:var(--text-dim);font-size:12px;font-style:italic;padding:12px 0;text-align:center">Aucune activité récente</div>';
  } else {
    actEl.innerHTML = acts.map(a=>`
      <div class="act-row">
        <div class="act-dot-wrap"><div class="act-dot ${esc(a.type||'report')}"></div></div>
        <div class="act-body">
          <div class="act-title">${esc(a.title||'')}</div>
          <div class="act-meta">${esc(a.meta||'')}</div>
        </div>
        <div class="act-time">${esc(a.time||'')}</div>
      </div>`).join('');
  }

  // Roster (online officers)
  const rEl = document.getElementById('dash-roster');
  const roster = d.online_officers || (window.OFFICERS||[]).filter(o=>o.is_online);
  if(!rEl) return;
  if(roster.length===0){
    rEl.innerHTML='<div style="color:var(--text-dim);font-size:12px;font-style:italic;padding:12px 0;text-align:center">Aucun agent en service</div>';
  } else {
    rEl.innerHTML = roster.map(o=>{
      const fn=esc(o.firstname||''); const ln=esc(o.lastname||'');
      const ini=((fn[0]||'')+(ln[0]||'')).toUpperCase()||'?';
      return `<div class="roster-row">
        <div class="roster-ava online">${ini}</div>
        <div class="roster-info">
          <div class="roster-name">${fn} ${ln}</div>
          <div class="roster-mat">${esc(o.matricule||'—')}</div>
        </div>
        <span class="roster-status online">En service</span>
      </div>`;
    }).join('');
  }

  // Wanted mini-list
  const wEl = document.getElementById('dash-wanted-list');
  const wanted = d.wanted_list || (window.CITIZENS||[]).filter(c=>c.wanted).slice(0,5);
  if(!wEl) return;
  if(wanted.length===0){
    wEl.innerHTML='<div style="color:var(--text-dim);font-size:12px;font-style:italic;padding:12px 0;text-align:center">Aucune personne recherchée</div>';
  } else {
    wEl.innerHTML = wanted.map(c=>{
      const fn=esc(c.firstname||c.rp_name||''); const ln=esc(c.lastname||'');
      const ini=((fn[0]||'')+(ln[0]||'')).toUpperCase()||'?';
      return `<div class="wanted-row">
        <div class="wanted-ava">${ini}</div>
        <div class="wanted-info">
          <div class="wanted-name">${fn} ${ln}</div>
          <div class="wanted-sid">${esc(c.steamid64||'—')}</div>
        </div>
        <span class="wanted-badge">⚑ WANTED</span>
      </div>`;
    }).join('');
  }
}

window.__mdt_addDataHook('citizens', function(){
  if(document.getElementById('page-dashboard')?.classList.contains('active')) renderDashboard(window._dashStats||{});
});
window.__mdt_addDataHook('officers', function(){
  if(document.getElementById('page-dashboard')?.classList.contains('active')) renderDashboard(window._dashStats||{});
});
window.__mdt_addDataHook('dashboard', function(payload){
  if(payload) renderDashboard(payload);
});


window.requestDashboardStats = requestDashboardStats;
window.renderDashboard = renderDashboard;


});
