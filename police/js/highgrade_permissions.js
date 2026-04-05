window.__mdtModule('highgrade_permissions', function(){
const state = window.__mdtRankPermState = window.__mdtRankPermState || {
  canHighGrade: false,
  groupId: '',
  groups: [],
  grades: [],
  rules: {},
  catalog: [],
  selectedRankId: null,
  filter: '',
  waiting: false,
  waitingMessage: '',
  retryTimer: null,
  retryCount: 0,
  savePending: false,
  lastSavedAt: 0
};

function esc(s){ return typeof window.esc === 'function' ? window.esc(s) : String(s || ''); }
function req(action, data, reqId){
  if(typeof window.loReq === 'function') return window.loReq(action, data || {}, reqId);
  if(window.mdtBridge && window.mdtBridge.request) return window.mdtBridge.request(action, JSON.stringify(data || {}), reqId);
  console.log('MDT>>' + JSON.stringify({ action: action, reqId: reqId, data: data || {} }));
}
function clearRetry(){
  if(state.retryTimer){
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
  }
}

function normalizeGradeKey(rank){
  var raw = String((rank && (rank.grade_key || rank.name || rank.short_name || rank.label)) || '').toLowerCase();
  raw = raw.replace(/[_\-]+/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if(!raw) return '';
  if(raw.indexOf('deputy commissioner') !== -1) return 'deputy_commissioner';
  if(raw.indexOf('commissioner') !== -1 || raw.indexOf('chief') !== -1 || raw.indexOf('chef') !== -1 || raw.indexOf('commander') !== -1) return 'commissioner';
  if(raw.indexOf('captain') !== -1) return 'captain';
  if(raw.indexOf('lieutenant') !== -1) return 'lieutenant';
  if(raw.indexOf('sergeant') !== -1 || raw.indexOf('sergent') !== -1) return 'sergeant';
  if(raw.indexOf('officer iii') !== -1 || raw.indexOf('officer 3') !== -1 || raw.indexOf('officier iii') !== -1 || raw.indexOf('officier 3') !== -1 || raw.indexOf('policier iii') !== -1 || raw.indexOf('policier 3') !== -1) return 'officer_3';
  if(raw.indexOf('officer ii') !== -1 || raw.indexOf('officer 2') !== -1 || raw.indexOf('officier ii') !== -1 || raw.indexOf('officier 2') !== -1 || raw.indexOf('policier ii') !== -1 || raw.indexOf('policier 2') !== -1) return 'officer_2';
  if(raw.indexOf('officer i') !== -1 || raw.indexOf('officer 1') !== -1 || raw.indexOf('officier i') !== -1 || raw.indexOf('officier 1') !== -1 || raw.indexOf('policier i') !== -1 || raw.indexOf('policier 1') !== -1) return 'officer_1';
  if(raw.indexOf('officer') !== -1 || raw.indexOf('officier') !== -1 || raw.indexOf('policier') !== -1 || raw.indexOf('detective') !== -1) return 'officer_1';
  if(raw.indexOf('cadet') !== -1 || raw.indexOf('recruit') !== -1 || raw.indexOf('recrue') !== -1) return 'cadet';
  return raw;
}
function getGradeSortOrder(rank){
  var explicit = Number(rank && rank.sort_order);
  if(Number.isFinite(explicit) && explicit > 0) return explicit;
  var key = normalizeGradeKey(rank);
  var orderMap = {
    cadet: 100,
    officer_1: 200,
    officer_2: 300,
    officer_3: 400,
    sergeant: 500,
    lieutenant: 600,
    captain: 700,
    deputy_commissioner: 800,
    commissioner: 900
  };
  if(orderMap[key]) return orderMap[key];
  var id = Number(rank && rank.id);
  if(Number.isFinite(id) && id > 0) return 1000 + id;
  return 9999;
}
function sortGrades(grades){
  return (Array.isArray(grades) ? grades.slice() : []).sort(function(a, b){
    var oa = getGradeSortOrder(a);
    var ob = getGradeSortOrder(b);
    if(oa !== ob) return oa - ob;
    var ia = Number(a && a.id);
    var ib = Number(b && b.id);
    if(Number.isFinite(ia) && Number.isFinite(ib) && ia !== ib) return ia - ib;
    return String((a && (a.name || a.label || ''))).localeCompare(String((b && (b.name || b.label || ''))));
  });
}
function setSaveState(mode){
  var labels = {
    idle: 'Enregistrer les permissions',
    pending: 'Enregistrement...',
    saved: 'Permissions enregistrées'
  };
  var text = labels[mode] || labels.idle;
  ['rankperm-save-btn','rankperm-save-btn-bottom'].forEach(function(id){
    var btn = document.getElementById(id);
    if(!btn) return;
    btn.textContent = text;
    btn.classList.toggle('is-saving', mode === 'pending');
    btn.classList.toggle('is-saved', mode === 'saved');
  });
}
function scheduleRetry(){
  clearRetry();
  if(!state.waiting || state.retryCount >= 10) return;
  state.retryTimer = setTimeout(function(){
    state.retryCount += 1;
    requestData(state.groupId || '');
  }, 1500);
}
function getSelectedGrade(){
  return (state.grades || []).find(function(rank){ return Number(rank.id) === Number(state.selectedRankId); }) || null;
}
function getCurrentPerms(){
  var key = String(state.selectedRankId || '');
  return ((state.rules || {})[key] && Array.isArray(state.rules[key].permissions)) ? state.rules[key].permissions.slice() : [];
}
function setStatus(message){
  var el = document.getElementById('rankperm-group-status');
  if(el) el.textContent = String(message || '');
}
function renderGroups(){
  var select = document.getElementById('rankperm-group-select');
  if(!select) return;
  var groups = Array.isArray(state.groups) ? state.groups : [];
  if(!groups.length){
    select.innerHTML = '<option value="">Rangs [Ranks] en attente...</option>';
    select.value = '';
    return;
  }

  select.innerHTML = groups.map(function(group){
    var suffix = group && group.police_like ? ' · police' : '';
    return '<option value="' + esc(group.id || '') + '">' + esc((group.label || group.id || 'Groupe') + suffix) + '</option>';
  }).join('');

  if(state.groupId && groups.some(function(group){ return String(group.id) === String(state.groupId); })) {
    select.value = String(state.groupId);
  } else {
    state.groupId = String(groups[0].id || '');
    select.value = state.groupId;
  }
}
function setSelectedRank(rankId){
  state.selectedRankId = Number(rankId || 0) || null;
  renderGrades();
  renderPermissions();
  updateSaveButton();
}
function renderGrades(){
  var host = document.getElementById('rankperm-grade-list');
  if(!host) return;
  if(!(state.grades || []).length){
    host.innerHTML = '<div class="rankperm-empty">Aucun grade disponible.</div>';
    return;
  }

  var grades = sortGrades(state.grades || []);
  host.innerHTML = grades.map(function(rank){
    var active = Number(rank.id) === Number(state.selectedRankId) ? ' active' : '';
    var permCount = (((state.rules || {})[String(rank.id)] || {}).permissions || []).length;
    var meta = (rank.virtual ? 'Profil MDT' : ('ID #' + esc(rank.id))) + ' · ' + permCount + ' permission' + (permCount > 1 ? 's' : '');
    return ''
      + '<div class="rankperm-grade' + active + '" onclick="window.selectRankPermissionGrade(' + Number(rank.id) + ')">'
      + '  <div class="rankperm-grade-name">' + esc(rank.name || ('Rang #' + rank.id)) + '</div>'
      + '  <div class="rankperm-grade-meta">' + meta + '</div>'
      + '</div>';
  }).join('');
}
function renderPermissions(){
  var host = document.getElementById('rankperm-categories');
  var title = document.getElementById('rankperm-current-grade');
  if(!host) return;

  var grade = getSelectedGrade();
  if(title) title.textContent = grade ? (grade.name || ('Rang #' + grade.id)) : 'Aucun grade sélectionné';
  if(!grade){
    host.innerHTML = '<div class="rankperm-empty">Sélectionne un grade à gauche pour gérer ses permissions.</div>';
    return;
  }

  var active = {};
  getCurrentPerms().forEach(function(key){ active[key] = true; });
  var filter = String(state.filter || '').trim().toLowerCase();
  var blocks = [];

  (state.catalog || []).forEach(function(cat){
    var entries = (cat.entries || []).filter(function(entry){
      if(!filter) return true;
      var hay = [entry.label, entry.desc, entry.key].join(' ').toLowerCase();
      return hay.indexOf(filter) !== -1;
    });
    if(!entries.length) return;

    var items = entries.map(function(entry){
      var checked = active[entry.key] ? ' checked' : '';
      var disabled = !state.groupId ? ' disabled' : '';
      return ''
        + '<label class="rankperm-item">'
        + '  <input type="checkbox" class="rankperm-checkbox" data-perm="' + esc(entry.key) + '"' + checked + disabled + ' onchange="window.onRankPermToggle()">'
        + '  <div><strong>' + esc(entry.label || entry.key) + '</strong><span>' + esc(entry.desc || '') + '</span></div>'
        + '</label>';
    }).join('');

    blocks.push(''
      + '<div class="rankperm-category">'
      + '  <div class="rankperm-category-title">' + esc(cat.label || cat.id || 'Catégorie') + '</div>'
      + '  <div class="rankperm-grid">' + items + '</div>'
      + '</div>');
  });

  host.innerHTML = blocks.join('') || '<div class="rankperm-empty">Aucune permission ne correspond à la recherche.</div>';
}
function collectPerms(){
  var arr = [];
  document.querySelectorAll('.rankperm-checkbox:checked').forEach(function(el){
    arr.push(String(el.getAttribute('data-perm') || ''));
  });
  return arr.filter(Boolean);
}
function updateSaveButton(){
  var disabled = state.savePending || !getSelectedGrade() || !state.groupId;
  var btn = document.getElementById('rankperm-save-btn');
  if(btn) btn.disabled = disabled;
  var btn2 = document.getElementById('rankperm-save-btn-bottom');
  if(btn2) btn2.disabled = disabled;
  if(state.savePending) setSaveState('pending');
  else if(state.lastSavedAt && (Date.now() - state.lastSavedAt) < 2200) setSaveState('saved');
  else setSaveState('idle');
}
function renderError(message){
  clearRetry();
  var host = document.getElementById('rankperm-grade-list');
  var perms = document.getElementById('rankperm-categories');
  var title = document.getElementById('rankperm-current-grade');
  var msg = String(message || 'Chargement impossible.');
  if(title) title.textContent = 'Chargement impossible';
  if(host) host.innerHTML = '<div class="rankperm-empty">' + esc(msg) + '</div>';
  if(perms) perms.innerHTML = '<div class="rankperm-empty">' + esc(msg) + '</div>';
  setStatus(msg);
}
function requestData(preferredGroup){
  if(!state.canHighGrade) return;
  req('get_rank_permissions_data', {
    group_id: String(preferredGroup || state.groupId || '')
  }, 'rank_permissions_data_' + Date.now());
}
function saveCurrent(){
  var grade = getSelectedGrade();
  if(!grade || !state.groupId || state.savePending) return;
  state.savePending = true;
  updateSaveButton();
  req('save_rank_permissions', {
    group_id: String(state.groupId || ''),
    rank_id: Number(grade.id),
    permissions: collectPerms()
  }, 'rank_permissions_save_' + Date.now());
}

window.__mdt_addAfterInitHook(function(json){
  window.__mdtPlayerAccess = (json && json.access) || {};
  state.canHighGrade = !!(window.__mdtPlayerAccess && window.__mdtPlayerAccess.can_high_grade);
  if(json && json.config && Array.isArray(json.config.permissions_catalog)) state.catalog = json.config.permissions_catalog.slice();
  updateSaveButton();
});

window.__mdt_addPageHook(function(name){
  if(name === 'rank-permissions'){
    state.retryCount = 0;
    requestData(state.groupId || '');
  }
});

window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
  if(reqId && reqId.indexOf('rank_permissions_data_') === 0){
    clearRetry();
    if(ok){
      state.waiting = !!(data && data.waiting_for_mrs);
      state.waitingMessage = String((data && data.message) || '');
      state.groups = Array.isArray(data && data.groups) ? data.groups : [];
      state.groupId = String((data && data.group_id) || state.groupId || '');
      state.savePending = false;
      state.grades = sortGrades(Array.isArray(data && data.grades) ? data.grades : []);
      state.rules = (data && data.rules) || {};
      state.catalog = Array.isArray(data && data.permissions_catalog) ? data.permissions_catalog : (state.catalog || []);
      if(!state.selectedRankId && state.grades[0]) state.selectedRankId = Number(state.grades[0].id || 0) || null;
      if(state.selectedRankId && !(state.grades || []).some(function(rank){ return Number(rank.id) === Number(state.selectedRankId); })) {
        state.selectedRankId = state.grades[0] ? Number(state.grades[0].id || 0) || null : null;
      }
      renderGroups();
      renderGrades();
      renderPermissions();
      updateSaveButton();
      if(state.waiting){
        setStatus(state.waitingMessage || 'Profils MDT provisoires chargés. Réessai automatique en cours...');
        scheduleRetry();
      }else if(data && data.using_virtual_profiles){
        setStatus((state.waitingMessage || 'Profils MDT chargés.') + ' Groupe actif : ' + state.groupId);
      }else if(state.groupId){
        setStatus('Groupe MRS actif : ' + state.groupId);
      }else{
        setStatus(state.waitingMessage || 'Aucun groupe MRS disponible.');
      }
    }else{
      var msg = (data && data.message) || err || 'Impossible de charger les permissions';
      renderError(msg);
      if(typeof window.showToast === 'function') window.showToast(msg, data || {}, true);
    }
    return true;
  }

  if(reqId && reqId.indexOf('rank_permissions_save_') === 0){
    state.savePending = false;
    if(ok){
      if(state.selectedRankId) state.rules[String(state.selectedRankId)] = { permissions: collectPerms() };
      state.lastSavedAt = Date.now();
      renderGrades();
      updateSaveButton();
      if(typeof window.showToast === 'function') window.showToast('Permissions enregistrées', data || {}, false);
    }else{
      updateSaveButton();
      if(typeof window.showToast === 'function'){
        window.showToast((data && data.message) || err || 'Enregistrement impossible', data || {}, true);
      }
    }
    return true;
  }

  return false;
});

window.selectRankPermissionGrade = setSelectedRank;
window.onRankPermToggle = function(){};
window.onRankPermSearch = function(){
  var input = document.getElementById('rankperm-search');
  state.filter = String(input && input.value || '');
  renderPermissions();
};
window.onRankPermGroupChange = function(){
  var select = document.getElementById('rankperm-group-select');
  state.groupId = String(select && select.value || '');
  state.retryCount = 0;
  requestData(state.groupId || '');
};
window.saveRankPermissions = saveCurrent;

renderGroups();
renderGrades();
renderPermissions();
updateSaveButton();
});
