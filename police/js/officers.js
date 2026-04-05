window.__mdtModule('officers', function(){
window.OFFICERS = window.OFFICERS || [];
window.__mdtHistoriqueAgentState = window.__mdtHistoriqueAgentState || { officer: null, reports: [] };

function esc(v){ return (typeof window.esc === 'function') ? window.esc(v) : String(v == null ? '' : v); }
function escAttr(v){ return (typeof window.escAttr === 'function') ? window.escAttr(v) : esc(v).replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function req(action, data, reqId){
  try{ if(typeof window.loReq === 'function'){ window.loReq(action, data || {}, reqId); return reqId; } }catch(e){}
  try{ if(window.mdtBridge && window.mdtBridge.request){ window.mdtBridge.request(action, JSON.stringify(data || {}), reqId); return reqId; } }catch(e){}
  console.log('MDT>>' + JSON.stringify({ action: action, reqId: reqId, data: data || {} }));
  return reqId;
}
function hasActivityPermission(){ return !!(window.__mdtPlayerAccess && window.__mdtPlayerAccess.can_officer_activity); }
function activityColspan(){ return hasActivityPermission() ? 7 : 6; }
function formatDate(v){
  var s = String(v || '').trim();
  if(!s) return '—';
  var d = new Date(s.replace(' ', 'T'));
  if(!isNaN(d.getTime())){
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() + ' · ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  return s.replace('T',' ').replace(/\.\d+$/, '');
}
function buildHead(){
  var row = document.getElementById('officers-head-row');
  if(!row) return;
  var html = ''
    + '<th>Statut</th>'
    + '<th>Matricule</th>'
    + '<th>Prénom</th>'
    + '<th>Nom</th>'
    + '<th>Téléphone</th>'
    + '<th>Email</th>';
  if(hasActivityPermission()) html += '<th>Dossiers rédigés</th>';
  row.innerHTML = html;
}

window.__mdt_set_officers = function(jsonStr){
  try{
    const parsed = JSON.parse(jsonStr);
    if(!Array.isArray(parsed)) throw new Error('not array');
    window.OFFICERS = Array.isArray(parsed) ? parsed : [];
    buildHead();
    renderOfficersTable();
    window.__mdt_runDataHooks('officers', OFFICERS);
    console.log('[MDT] Effectifs chargés : ' + window.OFFICERS.length + ' agents');
  }catch(e){
    console.warn('[MDT] __mdt_set_officers parse error', e);
    window.OFFICERS = [];
    buildHead();
    renderOfficersTable();
    window.__mdt_runDataHooks('officers', OFFICERS);
  }
};

function requestOfficersList(){
  var rid = 'req_off_' + Date.now();
  try{ if(window.mdtBridge&&window.mdtBridge.request){ window.mdtBridge.request('get_officers_list','{}',rid); return; } }catch(e){}
  try{ if(typeof window.loReq === 'function'){ window.loReq('get_officers_list', {}, rid); return; } }catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'get_officers_list',reqId:rid,data:{}}));
}

function renderOfficersTable(){
  buildHead();
  const q      = (document.getElementById('off-search')?.value||'').toLowerCase();
  const tbody  = document.getElementById('officers-tbody');
  const countEl= document.getElementById('off-count');
  if(!tbody) return;
  const src = window.OFFICERS.length > 0 ? window.OFFICERS : [];
  const filtered = src.filter(function(o){
    if(!q) return true;
    return ((o.firstname||'')+' '+(o.lastname||'')).toLowerCase().includes(q)
        || (o.matricule||'').toLowerCase().includes(q)
        || (o.phone||'').includes(q)
        || (o.email||'').toLowerCase().includes(q);
  });
  if(countEl) countEl.textContent = filtered.length+' / '+src.length+' agents';
  if(src.length===0){
    tbody.innerHTML='<tr><td colspan="'+activityColspan()+'" class="dt-empty">Aucun agent en ligne.</td></tr>';
    return;
  }
  if(filtered.length===0){
    tbody.innerHTML='<tr><td colspan="'+activityColspan()+'" class="dt-empty">Aucun résultat pour &laquo;'+esc(q)+'&raquo;</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(function(o){
    const online = !!o.is_online;
    const mock   = !!o.is_mock;
    const mockBadge = mock ? '<span class="dt-mock-badge">DEMO</span>' : '';
    const stats = o.activity || {};
    const total = Number(o.drafted_reports_total || 0);
    const detailsBtn = hasActivityPermission()
      ? (`<td class="dt-activity"><button class="dt-activity-btn" type="button" onclick="window.openHistoriqueAgentModal('${escAttr(o.steamid64 || '')}')">`
          + `<span>${total} dossier${total > 1 ? 's' : ''}</span>`
          + `<span class="dt-activity-meta">Op ${Number(stats.operations || 0)} · RA ${Number(stats.arrest_reports || 0)} · P ${Number(stats.complaints || 0)}</span>`
          + '</button></td>')
      : '';
    return '<tr>'
      +'<td><div class="dt-status"><div class="dt-dot '+(online?'online':'offline')+'"></div>'
      +'<span class="dt-stxt '+(online?'online':'offline')+'">'+(online?'EN SERVICE':'HORS SERVICE')+'</span></div></td>'
      +'<td><span class="dt-mat'+(mock?' mock':'')+'">'+esc(o.matricule||'—')+mockBadge+'</span></td>'
      +'<td>'+esc(o.firstname||'—')+'</td>'
      +'<td>'+esc(o.lastname||'—')+'</td>'
      +'<td class="dt-phone">'+esc(o.phone||'—')+'</td>'
      +'<td class="dt-email">'+esc(o.email||'—')+'</td>'
      + detailsBtn
      +'</tr>';
  }).join('');
}

function filterOfficers(){ renderOfficersTable(); }
function getOfficerBySid(sid){
  sid = String(sid || '');
  return (window.OFFICERS || []).find(function(row){ return String(row.steamid64 || '') === sid; }) || null;
}

function renderHistoriqueAgentModal(){
  var state = window.__mdtHistoriqueAgentState || {};
  var officer = state.officer || null;
  var reports = Array.isArray(state.reports) ? state.reports : [];
  var title = document.getElementById('historique-agent-title');
  var subtitle = document.getElementById('historique-agent-subtitle');
  var summary = document.getElementById('historique-agent-summary');
  var body = document.getElementById('historique-agent-tbody');
  if(title) title.textContent = "Historique de l'agent";
  if(subtitle) subtitle.textContent = officer ? ((((officer.firstname || '') + ' ' + (officer.lastname || '')).trim()) || 'Agent') + ' · ' + (officer.matricule || '—') : "Historique détaillé de l'agent";
  if(summary){
    var stats = (officer && officer.activity) || {};
    summary.innerHTML = ''
      + '<div class="agent-history-pill">Total : <strong>' + Number(officer && officer.drafted_reports_total || reports.length || 0) + '</strong></div>'
      + '<div class="agent-history-pill">Rapports d\'opération : <strong>' + Number(stats.operations || 0) + '</strong></div>'
      + '<div class="agent-history-pill">Rapports d\'arrestation : <strong>' + Number(stats.arrest_reports || 0) + '</strong></div>'
      + '<div class="agent-history-pill">Plaintes : <strong>' + Number(stats.complaints || 0) + '</strong></div>';
  }
  if(!body) return;
  if(!reports.length){
    body.innerHTML = '<tr><td colspan="3" class="dt-empty">Aucun dossier rédigé trouvé pour cet agent.</td></tr>';
    return;
  }
  body.innerHTML = reports.map(function(row){
    return `<tr class="agent-history-row" onclick="window.openHistoriqueAgentRecord('${escAttr(row.kind || '')}',${Number(row.id || 0)},'${escAttr(row.record_type || '')}')">`
      + `<td>${esc(row.type_label || row.kind || 'Document')}</td>`
      + `<td><span class="agent-history-ref">${esc(row.reference || ('#' + Number(row.id || 0)))}</span><span class="agent-history-sub">${esc(row.title || row.subtitle || '—')}</span></td>`
      + `<td class="agent-history-date">${esc(formatDate(row.created_at || row.date || ''))}</td>`
      + '</tr>';
  }).join('');
}

window.openHistoriqueAgentModal = function(sid){
  if(!hasActivityPermission()) return false;
  var officer = getOfficerBySid(sid);
  var modal = document.getElementById('modal-historique-agent');
  if(!modal || !officer) return false;
  window.__mdtHistoriqueAgentState = { officer: officer, reports: [] };
  modal.style.display = 'flex';
  renderHistoriqueAgentModal();
  var body = document.getElementById('historique-agent-tbody');
  if(body) body.innerHTML = '<tr><td colspan="3" class="dt-empty">Chargement de l\'historique…</td></tr>';
  var reqId = 'req_historique_agent_' + Date.now();
  req('get_historique_agent', { agent_id: String(officer.steamid64 || ''), steamid64: String(officer.steamid64 || '') }, reqId);
  return false;
};

window.closeHistoriqueAgentModal = function(){
  var modal = document.getElementById('modal-historique-agent');
  if(modal) modal.style.display = 'none';
};

window.openHistoriqueAgentRecord = function(kind, id, recordType){
  var numId = Number(id || 0);
  if(!numId) return false;
  window.closeHistoriqueAgentModal();
  if(kind === 'operation'){
    window.__mdtPendingOperationReportId = numId;
    if(typeof window.setPage === 'function') window.setPage('operations');
    return false;
  }
  if(kind === 'complaint'){
    if(typeof window.openComplaintRecord === 'function') return window.openComplaintRecord(numId);
    if(typeof window.setPage === 'function') window.setPage('complaints');
    return false;
  }
  if(kind === 'arrest_report'){
    if(typeof window.openArrestRegistryRecord === 'function') return window.openArrestRegistryRecord(numId, recordType || 'report');
    if(typeof window.setPage === 'function') window.setPage('arrest');
    return false;
  }
  return false;
};

if(typeof window.__mdt_addAfterInitHook === 'function'){
  window.__mdt_addAfterInitHook(function(){ buildHead(); renderOfficersTable(); });
}
if(typeof window.__mdt_addResponseHook === 'function'){
  window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
    if(reqId && reqId.indexOf('req_historique_agent_') === 0){
      if(ok){
        window.__mdtHistoriqueAgentState = window.__mdtHistoriqueAgentState || {};
        window.__mdtHistoriqueAgentState.reports = Array.isArray(data && data.reports) ? data.reports : [];
        renderHistoriqueAgentModal();
      }else{
        var body = document.getElementById('historique-agent-tbody');
        if(body) body.innerHTML = '<tr><td colspan="3" class="dt-empty">Impossible de charger le détail : ' + esc(err || (data && data.message) || 'Erreur inconnue') + '</td></tr>';
      }
      return true;
    }
    return false;
  });
}

window.requestOfficersList = requestOfficersList;
window.renderOfficersTable = renderOfficersTable;
window.filterOfficers = filterOfficers;
});
