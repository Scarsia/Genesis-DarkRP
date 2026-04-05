window.__mdtModule('bracelets', function(){
window.BRACELETS = window.BRACELETS || [];

function esc(v){ return typeof window.esc === 'function' ? window.esc(v) : String(v || ''); }
function escAttr(v){ return typeof window.escAttr === 'function' ? window.escAttr(v) : esc(v); }

function toInputDateTime(value){
  const d = value ? new Date(value) : new Date();
  if(Number.isNaN(d.getTime())) return '';
  const pad = function(n){ return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function displayDateTime(value){
  const raw = String(value || '').trim();
  if(!raw) return '—';
  return raw.replace('T', ' ').slice(0, 16);
}

function getBraceletStatus(row){
  const status = String((row && row.status) || '').toLowerCase();
  if(status) return status;
  const endAt = String((row && row.end_at) || '').trim();
  if(endAt){
    const ts = Date.parse(endAt.replace(' ', 'T'));
    if(!Number.isNaN(ts) && ts <= Date.now()) return 'closed';
  }
  return 'active';
}


function getLastCheckin(row){
  if(!row) return '';
  if(row.last_checkin_at) return displayDateTime(row.last_checkin_at);
  var parsed = null;
  if(Array.isArray(row.checkins_json)) parsed = row.checkins_json;
  else if(typeof row.checkins_json === 'string'){
    try{ parsed = JSON.parse(row.checkins_json); }catch(e){ parsed = null; }
  }
  if(Array.isArray(parsed) && parsed.length){
    var last = parsed[parsed.length - 1] || {};
    return displayDateTime(last.at || last.date || '');
  }
  return '';
}

function closeBraceletMenus(){
  document.querySelectorAll('.bracelet-row-menu').forEach(function(menu){ menu.style.display='none'; });
}

window.toggleBraceletMenu = function(ev, id){
  if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }catch(e){} }
  var menu = document.getElementById('bracelet-row-menu-' + String(id || ''));
  if(!menu) return false;
  document.querySelectorAll('.bracelet-row-menu').forEach(function(node){ if(node !== menu) node.style.display='none'; });
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  return false;
};

function replaceBraceletInCollections(updated){
  if(!updated) return;
  var targetId = Number(updated.id || 0);
  window.BRACELETS = Array.isArray(window.BRACELETS) ? window.BRACELETS : [];
  window.BRACELETS = window.BRACELETS.map(function(row){ return Number(row.id || 0) === targetId ? updated : row; });
  var sid = String(updated.citizen_sid64 || '');
  var mapped = {
    id: String(updated.id || ''),
    date: displayDateTime(updated.start_at || updated.created_at || ''),
    expiry: updated.end_at ? displayDateTime(updated.end_at) : '—',
    reason: String(updated.reason || ''),
    status: getBraceletStatus(updated),
    checkins_count: Array.isArray(updated.checkins_json) ? updated.checkins_json.length : (Number(updated.checkins_count || 0) || 0),
    last_checkin_at: getLastCheckin(updated)
  };
  if(Array.isArray(window.CITIZENS)){
    window.CITIZENS.forEach(function(cit){
      if(String(cit.steamid64 || '') !== sid) return;
      cit.bracelets = Array.isArray(cit.bracelets) ? cit.bracelets : [];
      cit.bracelets = cit.bracelets.map(function(row){ return Number(row.id || 0) === targetId ? Object.assign({}, row, mapped) : row; });
    });
  }
  if(window.selectedCitizen && String(window.selectedCitizen.steamid64 || '') === sid){
    window.selectedCitizen.bracelets = Array.isArray(window.selectedCitizen.bracelets) ? window.selectedCitizen.bracelets : [];
    window.selectedCitizen.bracelets = window.selectedCitizen.bracelets.map(function(row){ return Number(row.id || 0) === targetId ? Object.assign({}, row, mapped) : row; });
    if(typeof window.renderTabs === 'function') window.renderTabs(window.selectedCitizen);
  }
}

function removeBraceletFromCollections(id){
  var targetId = Number(id || 0);
  window.BRACELETS = Array.isArray(window.BRACELETS) ? window.BRACELETS.filter(function(row){ return Number(row.id || 0) !== targetId; }) : [];
  if(Array.isArray(window.CITIZENS)){
    window.CITIZENS.forEach(function(cit){
      cit.bracelets = Array.isArray(cit.bracelets) ? cit.bracelets.filter(function(row){ return Number(row.id || 0) !== targetId; }) : [];
    });
  }
  if(window.selectedCitizen){
    window.selectedCitizen.bracelets = Array.isArray(window.selectedCitizen.bracelets) ? window.selectedCitizen.bracelets.filter(function(row){ return Number(row.id || 0) !== targetId; }) : [];
    if(typeof window.renderTabs === 'function') window.renderTabs(window.selectedCitizen);
  }
}

window.checkinBracelet = function(id, at){
  var value = String(at || '').trim();
  if(!value){
    if(typeof window.showToast === 'function') window.showToast('⚠️ Date de pointage requise', null, true);
    return false;
  }
  closeBraceletMenus();
  req('checkin_bracelet', { id: Number(id || 0), checkin_at: value }, 'req_bracelets_checkin_');
  return false;
};

window.deleteBraceletRecord = function(id){
  closeBraceletMenus();
  req('delete_bracelet', { id: Number(id || 0) }, 'req_bracelets_delete_');
  return false;
};

function setBraceletMsg(message, isError){
  const box = document.getElementById('bracelet-msg');
  if(!box) return;
  if(!message){
    box.style.display = 'none';
    box.textContent = '';
    box.className = 'bracelet-msg';
    return;
  }
  box.textContent = message;
  box.className = 'bracelet-msg ' + (isError ? 'error' : 'success');
  box.style.display = 'block';
}

function req(action, data, prefix){
  const reqId = String(prefix || 'req_bracelets_') + Date.now();
  try{
    if(typeof window.loReq === 'function'){
      window.loReq(action, data || {}, reqId);
      return reqId;
    }
  }catch(e){}
  try{
    if(window.mdtBridge && typeof window.mdtBridge.request === 'function'){
      window.mdtBridge.request(action, JSON.stringify(data || {}), reqId);
      return reqId;
    }
  }catch(e){}
  console.log('MDT>>' + JSON.stringify({ action: action, reqId: reqId, data: data || {} }));
  return reqId;
}

function requestBraceletsList(){
  return req('get_bracelets_list', {}, 'req_bracelets_list_');
}

function renderBraceletsTable(){
  const tbody = document.getElementById('bracelets-tbody');
  if(!tbody) return;

  if(!Array.isArray(window.BRACELETS) || !window.BRACELETS.length){
    tbody.innerHTML = '<tr><td colspan="5" class="dt-empty">Aucun bracelet electronique enregistre</td></tr>';
    return;
  }

  tbody.innerHTML = window.BRACELETS.map(function(row){
    const sid = String(row.citizen_sid64 || '');
    const canOpenCitizen = Array.isArray(window.CITIZENS) && window.CITIZENS.some(function(c){ return String(c.steamid64 || '') === sid; });
    const checkin = getLastCheckin(row);
    return '<tr>'
      + '<td>' + esc(displayDateTime(row.start_at || row.created_at || '')) + (checkin ? '<div class="bracelet-checkin-meta">Pointage : ' + esc(checkin) + '</div>' : '') + '</td>'
      + '<td>' + esc(displayDateTime(row.end_at || '')) + '</td>'
      + '<td><strong>' + esc(row.citizen_name || row.citizen_sid64 || '—') + '</strong></td>'
      + '<td><div class="bracelet-reason-cell" title="' + escAttr(row.reason || '') + '">' + esc(row.reason || '—') + '</div></td>'
      + '<td><div class="bracelet-actions">'
        + (canOpenCitizen ? '<button class="btn btn-sm btn-ghost" type="button" onclick="openBraceletCitizen(&#39;' + escAttr(sid) + '&#39;)">Voir</button>' : '<span style="color:var(--text-dim)">—</span>')
        + '<div class="cit-history-actions">'
        +   '<button class="ops-more" type="button" onclick="window.toggleBraceletMenu(event,' + Number(row.id || 0) + ')">⋯</button>'
        +   '<div class="ops-row-menu bracelet-row-menu" id="bracelet-row-menu-' + Number(row.id || 0) + '" style="display:none">'
        +     '<button class="ops-row-menu-item" type="button" onclick="window.citizenBraceletCheckin(' + Number(row.id || 0) + ')"><span class="ops-row-menu-ico">📍</span><span>Pointer le citoyen</span></button>'
        +     '<button class="ops-row-menu-item danger" type="button" onclick="window.citizenBraceletDelete(' + Number(row.id || 0) + ')"><span class="ops-row-menu-ico">🗑️</span><span>Supprimer le bracelet</span></button>'
        +   '</div>'
        + '</div>'
      + '</div></td>'
      + '</tr>';
  }).join('');
}


function closeBraceletModal(){
  const modal = document.getElementById('bracelet-modal');
  if(modal) modal.style.display = 'none';
  const ids = ['bracelet-citizen-sid64', 'bracelet-citizen-name', 'bracelet-start-at', 'bracelet-end-at', 'bracelet-reason'];
  ids.forEach(function(id){
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  const submitBtn = document.getElementById('bracelet-submit-btn');
  if(submitBtn){
    submitBtn.disabled = false;
    submitBtn.textContent = 'Ajouter le bracelet electronique';
  }
  setBraceletMsg('', false);
}

function openBraceletModal(citizen){
  const target = citizen || window.selectedCitizen || null;
  if(!target){
    showToast('⚠️ Aucun citoyen sélectionné', null, true);
    return false;
  }

  const sid = String(target.steamid64 || target.sid64 || '');
  const name = String(target.name || ((target.firstname || '') + ' ' + (target.lastname || '')).trim() || target.citizen_name || '').trim();

  document.getElementById('bracelet-citizen-sid64').value = sid;
  document.getElementById('bracelet-citizen-name').value = name;
  document.getElementById('bracelet-start-at').value = toInputDateTime();
  document.getElementById('bracelet-end-at').value = '';
  document.getElementById('bracelet-reason').value = '';

  setBraceletMsg('', false);
  const modal = document.getElementById('bracelet-modal');
  if(modal) modal.style.display = 'flex';

  setTimeout(function(){
    const reasonInput = document.getElementById('bracelet-reason');
    if(reasonInput) reasonInput.focus();
  }, 40);

  return false;
}

function openBraceletFromCitizen(citizen){
  return openBraceletModal(citizen || window.selectedCitizen || null);
}

function pushBraceletIntoCitizenHistory(bracelet){
  const sid = String((bracelet && bracelet.citizen_sid64) || '');
  if(!sid || !Array.isArray(window.CITIZENS)) return;

  const asHistory = {
    id: String(bracelet.id || ''),
    date: displayDateTime(bracelet.start_at || bracelet.created_at || ''),
    expiry: displayDateTime(bracelet.end_at || ''),
    reason: String(bracelet.reason || ''),
    status: getBraceletStatus(bracelet),
    checkins_count: Array.isArray(bracelet.checkins_json) ? bracelet.checkins_json.length : (Number(bracelet.checkins_count || 0) || 0),
    last_checkin_at: getLastCheckin(bracelet)
  };

  const citizen = window.CITIZENS.find(function(row){ return String(row.steamid64 || '') === sid; });
  if(citizen){
    citizen.bracelets = Array.isArray(citizen.bracelets) ? citizen.bracelets : [];
    citizen.bracelets.unshift(asHistory);
  }

  if(window.selectedCitizen && String(window.selectedCitizen.steamid64 || '') === sid){
    window.selectedCitizen.bracelets = Array.isArray(window.selectedCitizen.bracelets) ? window.selectedCitizen.bracelets : [];
    window.selectedCitizen.bracelets.unshift(asHistory);
    if(typeof window.renderTabs === 'function') window.renderTabs(window.selectedCitizen);
  }
}

function submitBracelet(){
  const citizenSid = String(document.getElementById('bracelet-citizen-sid64')?.value || '').trim();
  const citizenName = String(document.getElementById('bracelet-citizen-name')?.value || '').trim();
  const startAt = String(document.getElementById('bracelet-start-at')?.value || '').trim();
  const endAt = String(document.getElementById('bracelet-end-at')?.value || '').trim();
  const reason = String(document.getElementById('bracelet-reason')?.value || '').trim();
  const submitBtn = document.getElementById('bracelet-submit-btn');

  if(!citizenSid && !citizenName){ setBraceletMsg('Le citoyen concerne est introuvable.', true); return; }
  if(!startAt){ setBraceletMsg('La date et heure de pose du bracelet est requise.', true); return; }
  if(!reason){ setBraceletMsg('La raison est requise.', true); return; }

  setBraceletMsg('', false);
  if(submitBtn){
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ajout…';
  }

  req('create_bracelet', {
    citizen_sid64: citizenSid,
    citizen_name: citizenName,
    start_at: startAt,
    end_at: endAt,
    reason: reason
  }, 'req_bracelets_create_');
}

function openBraceletCitizen(sid64){
  const sid = String(sid64 || '').trim();
  if(!sid) return false;

  if(typeof window.setPage === 'function') window.setPage('citizens');

  const trySelect = function(remaining){
    const citizen = Array.isArray(window.CITIZENS) ? window.CITIZENS.find(function(row){ return String(row.steamid64 || '') === sid; }) : null;
    if(citizen && typeof window.selectCitizen === 'function'){
      window.selectCitizen(sid);
      return;
    }
    if(remaining > 0){
      if(typeof window.requestActiveCitizens === 'function') window.requestActiveCitizens();
      setTimeout(function(){ trySelect(remaining - 1); }, 250);
      return;
    }
    showToast('⚠️ Citoyen indisponible dans la liste active', { steamid64: sid }, true);
  };

  trySelect(4);
  return false;
}

if(typeof window.__mdt_addResponseHook === 'function'){
  window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
    if(reqId && reqId.indexOf('req_bracelets_list_') === 0){
      if(ok){
        window.BRACELETS = Array.isArray(data.bracelets) ? data.bracelets : [];
        renderBraceletsTable();
      }else{
        showToast('⚠️ Impossible de charger le registre des bracelets', err || data.message || null, true);
      }
      return true;
    }

    if(reqId && reqId.indexOf('req_bracelets_checkin_') === 0){
      if(ok && data.bracelet){
        replaceBraceletInCollections(data.bracelet);
        renderBraceletsTable();
        if(typeof window.showToast === 'function') window.showToast('✓ Pointage enregistré', { bracelet: data.bracelet.id || '—' }, false);
      }else if(typeof window.showToast === 'function') window.showToast('⚠️ Pointage impossible', err || data.message || null, true);
      return true;
    }

    if(reqId && reqId.indexOf('req_bracelets_delete_') === 0){
      if(ok){
        removeBraceletFromCollections((data && data.id) || 0);
        renderBraceletsTable();
        if(typeof window.showToast === 'function') window.showToast('✓ Bracelet supprimé', null, false);
      }else if(typeof window.showToast === 'function') window.showToast('⚠️ Suppression impossible', err || data.message || null, true);
      return true;
    }

    if(reqId && reqId.indexOf('req_bracelets_create_') === 0){
      const submitBtn = document.getElementById('bracelet-submit-btn');
      if(submitBtn){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ajouter le bracelet electronique';
      }

      if(ok && data.bracelet){
        window.BRACELETS = Array.isArray(window.BRACELETS) ? window.BRACELETS : [];
        window.BRACELETS.unshift(data.bracelet);
        renderBraceletsTable();
        pushBraceletIntoCitizenHistory(data.bracelet);
        setBraceletMsg('Bracelet electronique ajoute avec succes.', false);
        setTimeout(function(){ closeBraceletModal(); }, 250);
        showToast('✓ Bracelet electronique cree', { citoyen: data.bracelet.citizen_name || '—' }, false);
      }else{
        setBraceletMsg(err || data.message || 'Creation impossible.', true);
      }
      return true;
    }
    return false;
  });
}

document.addEventListener('click', function(ev){
  if(!ev.target || !ev.target.closest || !ev.target.closest('.cit-history-actions')) closeBraceletMenus();
}, false);

window.requestBraceletsList = requestBraceletsList;
window.renderBraceletsTable = renderBraceletsTable;
window.openBraceletModal = openBraceletModal;
window.closeBraceletModal = closeBraceletModal;
window.submitBracelet = submitBracelet;
window.openBraceletFromCitizen = openBraceletFromCitizen;
window.openBraceletCitizen = openBraceletCitizen;
window.checkinBracelet = window.checkinBracelet;
window.deleteBraceletRecord = window.deleteBraceletRecord;
});
