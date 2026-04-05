window.__mdtModule('promotions', function(){
const state = window.__mdtPromotionsState = window.__mdtPromotionsState || {
  canHighGrade: false,
  ranks: [],
  agents: [],
  selectedRankId: null,
  selectedAgentSid: null,
  loaded: false
};

function getAccess(){ return window.__mdtPlayerAccess || {}; }
function esc(s){ return typeof window.esc === 'function' ? window.esc(s) : String(s || ''); }
function escAttr(s){ return esc(s).replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }
function req(action, data, reqId){
  if(typeof window.loReq === 'function') return window.loReq(action, data || {}, reqId);
  if(window.mdtBridge && window.mdtBridge.request) return window.mdtBridge.request(action, JSON.stringify(data || {}), reqId);
  console.log('MDT>>' + JSON.stringify({ action: action, reqId: reqId, data: data || {} }));
}

function ensureSidebar(){
  var slot = document.getElementById('sidebar-high-grade-slot');
  if(!slot) return;
  if(!state.canHighGrade){ slot.innerHTML = ''; return; }
  if(document.getElementById('sidebar-menu-high-grade-header')) return;

  slot.innerHTML = ''
    + '<div class="acc-hdr" id="sidebar-menu-high-grade-header" onclick="toggleSidebarMenu(\'high-grade\', event)">'
    + '  <div class="acc-ico">⭐</div>'
    + '  <span class="acc-lbl">Haut Grade</span>'
    + '  <span class="acc-arr">▾</span>'
    + '</div>'
    + '<div class="acc-body" id="sidebar-menu-high-grade-body">'
    + '  <div class="acc-item" data-page="promotions" onclick="setAccItem(this);ensureSidebarMenuOpen(\'high-grade\', true);setPage(\'promotions\')">Promotions</div>'
    + '  <div class=\"acc-item\" data-page=\"rank-permissions\" onclick=\"setAccItem(this);ensureSidebarMenuOpen(\'high-grade\', true);setPage(\'rank-permissions\')\">Permissions</div>'
    + '</div>';

  try{ if(typeof window.ensureSidebarMenuOpen === 'function') window.ensureSidebarMenuOpen('high-grade', false); }catch(e){}
}

function setSelectedAgent(sid){
  state.selectedAgentSid = String(sid || '');
  renderAgents();
  renderSelectionSummary();
}

function setSelectedRank(val){
  state.selectedRankId = val !== null && val !== undefined && val !== '' ? Number(val) : null;
  renderSelectionSummary();
  updateApplyButton();
}

function getSelectedAgent(){
  return (state.agents || []).find(function(agent){ return String(agent.steamid64) === String(state.selectedAgentSid || ''); }) || null;
}

function getSelectedRank(){
  return (state.ranks || []).find(function(rank){ return Number(rank.id) === Number(state.selectedRankId); }) || null;
}

function renderSelectionSummary(){
  var box = document.getElementById('promo-selected-summary');
  if(!box) return;
  var agent = getSelectedAgent();
  var rank = getSelectedRank();
  box.innerHTML = ''
    + '<div class="promo-selected-line"><strong>Agent :</strong> ' + esc(agent ? (agent.fullname || ((agent.firstname || '') + ' ' + (agent.lastname || '')).trim()) : 'Aucun agent sélectionné') + '</div>'
    + '<div class="promo-selected-line"><strong>Grade cible :</strong> ' + esc(rank ? rank.name : 'Aucun grade sélectionné') + '</div>'
    + '<div class="promo-selected-line"><strong>Rang actuel :</strong> ' + esc(agent ? (agent.current_rank_name || 'Inconnu') : '—') + '</div>';
  updateApplyButton();
}

function updateApplyButton(){
  var btn = document.getElementById('promo-apply-btn');
  if(!btn) return;
  btn.disabled = !(getSelectedAgent() && getSelectedRank());
}

function renderRanks(){
  var select = document.getElementById('promo-rank-select');
  if(!select) return;
  var html = '<option value="">— Sélectionner un grade —</option>';
  (state.ranks || []).forEach(function(rank){
    var selected = Number(rank.id) === Number(state.selectedRankId) ? ' selected' : '';
    html += '<option value="' + esc(rank.id) + '"' + selected + '>' + esc(rank.name || ('Rang #' + rank.id)) + '</option>';
  });
  select.innerHTML = html;
}

function getFilteredAgents(){
  var input = document.getElementById('promo-search');
  var q = String(input && input.value || '').trim().toLowerCase();
  if(q.length < 2) return state.agents || [];
  return (state.agents || []).filter(function(agent){
    var hay = [
      agent.fullname,
      agent.firstname,
      agent.lastname,
      agent.matricule,
      agent.current_rank_name,
      agent.current_job
    ].join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  });
}

function renderAgents(){
  var host = document.getElementById('promo-agents-list');
  var count = document.getElementById('promo-count');
  if(!host) return;
  var rows = getFilteredAgents();
  if(count) count.textContent = rows.length + ' agent' + (rows.length > 1 ? 's' : '');
  if(!rows.length){
    host.innerHTML = '<div class="promo-empty">Aucun agent trouvé pour cette recherche.</div>';
    return;
  }

  host.innerHTML = rows.map(function(agent){
    var selected = String(agent.steamid64) === String(state.selectedAgentSid || '') ? ' active' : '';
    var fullname = agent.fullname || ((agent.firstname || '') + ' ' + (agent.lastname || '')).trim();
    return ''
      + '<div class="promo-agent' + selected + '" onclick="window.selectPromotionAgent(\'' + escAttr(String(agent.steamid64 || '')) + '\')">'
      + '  <div class="promo-agent-name">' + esc(fullname || agent.firstname || agent.lastname || 'Agent') + '</div>'
      + '  <div class="promo-agent-meta">'
      + '    <div><strong>Matricule :</strong> ' + esc(agent.matricule || '—') + '</div>'
      + '    <div><strong>Grade :</strong> ' + esc(agent.current_rank_name || '—') + '</div>'
      + '    <div><strong>Métier :</strong> ' + esc(agent.current_job || '—') + '</div>'
      + '    <div><strong>Téléphone :</strong> ' + esc(agent.phone || '—') + '</div>'
      + '  </div>'
      + '</div>';
  }).join('');
}

function hydrateFromPayload(data){
  state.ranks = Array.isArray(data && data.ranks) ? data.ranks : [];
  state.agents = Array.isArray(data && data.agents) ? data.agents : [];
  state.loaded = true;

  if(state.selectedAgentSid && !(state.agents || []).some(function(agent){ return String(agent.steamid64) === String(state.selectedAgentSid); })){
    state.selectedAgentSid = null;
  }
  if(state.selectedRankId !== null && !(state.ranks || []).some(function(rank){ return Number(rank.id) === Number(state.selectedRankId); })){
    state.selectedRankId = null;
  }

  renderRanks();
  renderAgents();
  renderSelectionSummary();
}

function requestPromotionsData(){
  if(!state.canHighGrade) return;
  req('get_promotions_data', {}, 'promotions_data_' + Date.now());
}

function applyPromotion(){
  var agent = getSelectedAgent();
  var rank = getSelectedRank();
  if(!agent || !rank){
    if(typeof window.showToast === 'function') window.showToast('Sélection incomplète', { agent: !!agent, grade: !!rank }, true);
    return;
  }
  req('promouvoir_agent', {
    target_sid: String(agent.steamid64 || ''),
    nouveau_grade: Number(rank.id)
  }, 'promote_agent_' + Date.now());
}

window.__mdt_addAfterInitHook(function(json){
  window.__mdtPlayerAccess = (json && json.access) || {};
  state.canHighGrade = !!(window.__mdtPlayerAccess && window.__mdtPlayerAccess.can_high_grade);
  if((json && json.config && Array.isArray(json.config.promotions_ranks)) && json.config.promotions_ranks.length){
    state.ranks = json.config.promotions_ranks.slice();
  }
  ensureSidebar();
  renderRanks();
  renderSelectionSummary();
});

window.__mdt_addPageHook(function(name){
  if(name === 'promotions') requestPromotionsData();
});

window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
  if(reqId && reqId.indexOf('promotions_data_') === 0){
    if(ok){
      hydrateFromPayload(data || {});
    }else if(typeof window.showToast === 'function'){
      window.showToast(err || 'Impossible de charger les promotions', data || {}, true);
    }
    return true;
  }
  if(reqId && reqId.indexOf('promote_agent_') === 0){
    if(ok){
      if(typeof window.showToast === 'function') window.showToast('Promotion appliquée', data || {}, false);
      requestPromotionsData();
      if(typeof window.requestOfficersList === 'function') window.requestOfficersList();
    }else if(typeof window.showToast === 'function'){
      window.showToast(err || 'Échec de la promotion', data || {}, true);
    }
    return true;
  }
  return false;
});

window.selectPromotionAgent = setSelectedAgent;
window.filterPromotionAgents = renderAgents;
window.applyPromotionAgent = applyPromotion;
window.onPromotionRankChange = function(){
  var select = document.getElementById('promo-rank-select');
  setSelectedRank(select ? select.value : null);
};

ensureSidebar();
renderRanks();
renderSelectionSummary();
});
