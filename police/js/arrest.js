window.__mdtModule('arrest', function(){
(function(){
  if(window.__mdt_arrest_registry_loaded) return;
  window.__mdt_arrest_registry_loaded = true;

  var ARREST_REPORTS = [];
  var ARREST_SELECTED_ID = null;
  var ARREST_FILTER_CITIZEN = null;
  var ARREST_PENDING_SELECT_ID = null;
  var ARREST_OPEN_MENU_ID = null;

  var NYPD_BADGE_URL = window.__mdt_nypd_badge_url || 'assets/nypd_badge.png';

  function escSafe(v){
    if(typeof window.esc === 'function') return window.esc(v);
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function escAttrSafe(v){
    if(typeof window.escAttr === 'function') return window.escAttr(v);
    return escSafe(v).replace(/"/g,'&quot;').replace(/\'/g,'&#039;');
  }
  function req(action, data, prefix){
    var reqId = String(prefix || 'req_arrest_') + Date.now() + '_' + Math.floor(Math.random() * 1000);
    try{ if(typeof window.loReq === 'function'){ window.loReq(action, data || {}, reqId); return reqId; } }catch(e){}
    try{ if(window.mdtBridge && window.mdtBridge.request){ window.mdtBridge.request(action, JSON.stringify(data || {}), reqId); return reqId; } }catch(e){}
    console.log('MDT>>' + JSON.stringify({ action: action, reqId: reqId, data: data || {} }));
    return reqId;
  }

  function parseList(value){
    if(Array.isArray(value)) return value;
    if(typeof value === 'string'){
      try{ var parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }catch(e){ return []; }
    }
    return [];
  }

  function getReportById(id){ return ARREST_REPORTS.find(function(row){ return Number(row.id || 0) === Number(id || 0); }) || null; }

  function formatCompactDate(value){
    if(!value) return '—';
    var d = new Date(String(value).replace(' ', 'T'));
    if(isNaN(d.getTime())) return String(value);
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() + ' · ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  function formatHumanDate(value){
    if(!value) return '—';
    var d = new Date(String(value).replace(' ', 'T'));
    if(isNaN(d.getTime())) return String(value);
    var months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return 'Le ' + d.getDate() + ' ' + (months[d.getMonth()] || '') + ' ' + d.getFullYear() + ' à ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  function ensureArrayFields(report){
    if(!report) return report;
    report.agents = parseList(report.agents || report.agents_json || report.agents_involved_json || []);
    return report;
  }

  function updateCitizenFilterPill(){
    var pill = document.getElementById('arrest-citizen-filter-pill');
    if(!pill) return;
    if(!ARREST_FILTER_CITIZEN || !ARREST_FILTER_CITIZEN.sid64){ pill.style.display = 'none'; pill.innerHTML = ''; return; }
    pill.style.display = 'inline-flex';
    pill.innerHTML = '<span>Citoyen : <strong>' + escSafe(ARREST_FILTER_CITIZEN.name || ARREST_FILTER_CITIZEN.sid64) + '</strong></span><button type="button" onclick="window.clearArrestCitizenFilter()">✕</button>';
  }

  function getFilteredReports(){
    var q = String((document.getElementById('arrest-search') || {}).value || '').trim().toLowerCase();
    return ARREST_REPORTS.filter(function(row){
      var haystack = [row.reference,row.citizen_name,row.officer_name,row.precinct,row.lawyer_name,row.agents_involved,row.possession,row.body_text,formatCompactDate(row.created_at)].join(' ').toLowerCase();
      return !q || haystack.indexOf(q) !== -1;
    });
  }

  function closeArrestMenus(){
    ARREST_OPEN_MENU_ID = null;
    document.querySelectorAll('.ops-row-menu').forEach(function(menu){ menu.style.display = 'none'; });
  }

  function buildReportDocumentHtml(report, options){
    options = options || {};
    var photosCount = Number(options.photosCount != null ? options.photosCount : report.pasted_images_count || 0) || 0;
    var proofContainerId = options.proofContainerId || '';
    var proofHtml = proofContainerId
      ? '<div class="opdoc-photo-note">Photos liées : ' + photosCount + '</div><div id="' + escAttrSafe(proofContainerId) + '" class="opdoc-photo-preview"><div class="report-photo-empty">Chargement des preuves photographiques…</div></div>'
      : '<div class="opdoc-photo-note">Photos liées : ' + photosCount + '</div>';
    return ''
      + '<div class="opdoc-page arrestdoc-page">'
      +   '<div class="opdoc-head">'
      +     '<img class="opdoc-badge" src="' + escAttrSafe(NYPD_BADGE_URL) + '" alt="Badge NYPD" onerror="this.style.display=\'none\'">'
      +     '<div style="flex:1;text-align:center;"><div class="opdoc-title">Rapport d\'arrestation</div><div class="opdoc-muted" style="text-align:center;margin-top:3px;">Référence : ' + escSafe(report.reference || '—') + '</div></div>'
      +     '<div class="opdoc-head-right">New York City Police Department<br>' + escSafe(report.precinct || 'Poste non renseigné') + '</div>'
      +   '</div>'
      +   '<hr class="opdoc-rule">'
      +   '<div class="opdoc-grid-two">'
      +     '<div class="opdoc-section"><div class="opdoc-section-title">Informations générales</div><div class="opdoc-lines">'
      +       '<div class="opdoc-line">Date et heure : ' + escSafe(formatHumanDate(report.created_at)) + '</div>'
      +       '<div class="opdoc-line">Rédigé par : ' + escSafe(report.officer_name || '—') + '</div>'
      +       '<div class="opdoc-line">Citoyen concerné : ' + escSafe(report.citizen_name || '—') + '</div>'
      +       '<div class="opdoc-line">Poste : ' + escSafe(report.precinct || '—') + '</div>'
      +     '</div></div>'
      +     '<div class="opdoc-section"><div class="opdoc-section-title">Détails d\'interpellation</div><div class="opdoc-lines">'
      +       '<div class="opdoc-line">Possession : ' + escSafe(report.possession || '—') + '</div>'
      +       '<div class="opdoc-line">Avocat : ' + escSafe(report.lawyer_name || 'Aucun') + '</div>'
      +       '<div class="opdoc-line">Agents impliqués : ' + escSafe(report.agents_involved || '—') + '</div>'
      +       '<div class="opdoc-line">Photos preuves : ' + photosCount + '</div>'
      +     '</div></div>'
      +   '</div>'
      +   '<div class="opdoc-section"><div class="opdoc-section-title">Rapport</div><div class="opdoc-report-box">' + (report.body_html || '<p>Aucun contenu.</p>') + '</div></div>'
      +   '<div class="opdoc-section"><div class="opdoc-section-title">Photos preuves</div>' + proofHtml + '</div>'
      + '</div>';
  }

  window.buildReportDocumentHtml = buildReportDocumentHtml;

  function renderArrestList(){
    var list = document.getElementById('arrest-list');
    var count = document.getElementById('arrest-count');
    if(!list) return;
    var rows = getFilteredReports();
    if(count) count.textContent = rows.length + ' rapport' + (rows.length > 1 ? 's' : '');
    if(!rows.length){
      var msg = ARREST_FILTER_CITIZEN && ARREST_FILTER_CITIZEN.sid64 ? 'Aucun rapport d\'arrestation pour ce citoyen.' : 'Aucun rapport d\'arrestation enregistré.';
      list.innerHTML = '<div class="ops-empty">' + escSafe(msg) + '</div>';
      renderArrestDetail(null);
      return;
    }
    list.innerHTML = rows.map(function(report){
      ensureArrayFields(report);
      var active = Number(report.id || 0) === Number(ARREST_SELECTED_ID || 0);
      var photosCount = Number(report.pasted_images_count || 0);
      var reportId = Number(report.id || 0);
      var menuOpen = reportId === Number(ARREST_OPEN_MENU_ID || 0);
      return ''
        + '<div class="ops-row arrest-row' + (active ? ' active' : '') + '">'
        +   '<div class="ops-row-main" data-arrest-action="view" data-report-id="' + reportId + '">'
        +     '<div class="ops-row-title">' + escSafe(report.reference || 'Rapport d\'arrestation') + '</div>'
        +     '<div class="ops-row-meta">' + escSafe(report.citizen_name || 'Citoyen inconnu') + ' · ' + escSafe(formatCompactDate(report.created_at)) + '</div>'
        +     '<div class="ops-row-tags">'
        +       '<span class="ops-mini-badge">' + escSafe(report.precinct || 'Poste non renseigné') + '</span>'
        +       '<span class="ops-mini-badge">Possession : ' + escSafe(report.possession || '—') + '</span>'
        +       '<span class="ops-mini-badge">' + photosCount + ' photo(s)</span>'
        +     '</div>'
        +   '</div>'
        +   '<div class="ops-row-actions">'
        +     '<button class="ops-more" type="button" onclick="window.toggleArrestRowMenu(event,' + reportId + ')" title="Options">⋯</button>'
        +     '<div class="ops-row-menu" id="arrest-row-menu-' + reportId + '" style="display:' + (menuOpen ? 'block' : 'none') + ';">'
        +       '<button class="ops-row-menu-item" type="button" onclick="window.viewArrestReport(' + reportId + ')"><span class="ops-row-menu-ico">👁️</span><span>Afficher le rapport</span></button>'
        +       '<button class="ops-row-menu-item" type="button" onclick="window.editArrestReport(' + reportId + ')"><span class="ops-row-menu-ico">✏️</span><span>Modifier le rapport</span></button>'
        +       '<button class="ops-row-menu-item danger" type="button" onclick="window.deleteArrestReport(' + reportId + ')"><span class="ops-row-menu-ico">🗑️</span><span>Supprimer le rapport</span></button>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    }).join('');
  }

  function renderArrestDetail(report){
    var placeholder = document.getElementById('arrest-detail-placeholder');
    var viewer = document.getElementById('arrest-report-viewer');
    if(!placeholder || !viewer) return;
    if(!report){ placeholder.style.display = 'flex'; viewer.style.display = 'none'; viewer.innerHTML = ''; return; }
    ensureArrayFields(report);
    placeholder.style.display = 'none'; viewer.style.display = 'block';
    var proofContainerId = 'arrest-proof-preview-' + Number(report.id || 0);
    viewer.innerHTML = buildReportDocumentHtml(report, { proofContainerId: proofContainerId, photosCount: Number(report.pasted_images_count || 0) || 0 });
    if(typeof window.loadEvidencePreview === 'function'){
      window.loadEvidencePreview(proofContainerId, report.evidence_folder_ref || '', report.evidence_folder_label || report.evidence_folder_ref || '', { limit: 12 });
    }
  }

  window.toggleArrestRowMenu = function(ev, id){
    if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }catch(e){} }
    var targetId = Number(id || 0);
    ARREST_OPEN_MENU_ID = (Number(ARREST_OPEN_MENU_ID || 0) === targetId) ? null : targetId;
    renderArrestList();
  };
  window.viewArrestReport = function(id){ closeArrestMenus(); ARREST_SELECTED_ID = Number(id || 0); renderArrestList(); renderArrestDetail(getReportById(id)); };
  window.editArrestReport = function(id){ closeArrestMenus(); var report = getReportById(id); if(report && typeof window.openModalRapportArrestation === 'function') window.openModalRapportArrestation(report); };
  window.deleteArrestReport = function(id){ closeArrestMenus(); var numId = Number(id || 0); if(!numId) return; req('delete_arrestation', { id: numId }, 'req_arrest_delete_'); };
  window.filterArrestReports = function(){ var filtered = getFilteredReports(); if(filtered.length && !filtered.some(function(row){ return Number(row.id || 0) === Number(ARREST_SELECTED_ID || 0); })){ ARREST_SELECTED_ID = Number(filtered[0].id || 0); } renderArrestList(); renderArrestDetail(getReportById(ARREST_SELECTED_ID)); };
  window.clearArrestCitizenFilter = function(){ ARREST_FILTER_CITIZEN = null; updateCitizenFilterPill(); requestArrestReports(); };

  function setArrestCitizenFilter(citizen){
    if(citizen && (citizen.steamid64 || citizen.id)) ARREST_FILTER_CITIZEN = { sid64: String(citizen.steamid64 || citizen.id || ''), name: (((citizen.firstname || '') + ' ' + (citizen.lastname || '')).trim()) || citizen.name || 'Citoyen' };
    else ARREST_FILTER_CITIZEN = null;
    updateCitizenFilterPill();
  }

  function requestArrestReports(extra){
    var payload = {};
    if(ARREST_FILTER_CITIZEN && ARREST_FILTER_CITIZEN.sid64) payload.citizen_sid64 = ARREST_FILTER_CITIZEN.sid64;
    if(extra && extra.id) ARREST_PENDING_SELECT_ID = Number(extra.id || 0);
    req('get_arrestations_list', payload, 'req_arrest_list_');
  }

  window.openCitizenArrestationPdf = function(citizen){
    if(citizen) window.selectedCitizen = citizen;
    if(window.selectedCitizen) setArrestCitizenFilter(window.selectedCitizen);
    if(typeof window.setPage === 'function') window.setPage('arrest');
    var accH = document.getElementById('acc-h');
    if(accH && !accH.classList.contains('open') && typeof window.toggleAcc === 'function') window.toggleAcc();
    document.querySelectorAll('.acc-item').forEach(function(i){ i.classList.remove('active'); });
    var target = document.querySelector('.acc-item[data-page="arrest"]');
    if(target && typeof window.setAccItem === 'function') window.setAccItem(target);
    requestArrestReports();
    if(window.selectedCitizen && typeof window.showToast === 'function') window.showToast('📄 Rapport d\'arrestation', 'Citoyen : ' + ((((window.selectedCitizen.firstname||'') + ' ' + (window.selectedCitizen.lastname||'')).trim()) || '—'));
  };

  window.afterCreateArrestation = function(report){ if(typeof window.setPage === 'function') window.setPage('arrest'); if(report && report.citizen_sid64){ setArrestCitizenFilter({ steamid64: report.citizen_sid64, name: report.citizen_name || 'Citoyen' }); } else { setArrestCitizenFilter(null); } requestArrestReports({ id: report && report.id ? Number(report.id || 0) : 0 }); };

  window.openArrestRegistryRecord = function(id){
    ARREST_FILTER_CITIZEN = null; updateCitizenFilterPill(); ARREST_PENDING_SELECT_ID = Number(id || 0); if(typeof window.setPage === 'function') window.setPage('arrest'); requestArrestReports({ id: ARREST_PENDING_SELECT_ID }); return false;
  };

  function bindArrestRowView(){ if(document.__mdtArrestRowViewBound) return; document.__mdtArrestRowViewBound = true; document.addEventListener('click', function(ev){ var row = ev.target && ev.target.closest ? ev.target.closest('[data-arrest-action="view"]') : null; if(!row) return; ev.preventDefault(); var id = Number(row.getAttribute('data-report-id') || 0); if(id) window.viewArrestReport(id); }, false); }
  document.addEventListener('click', function(ev){ var rowActions = ev.target && ev.target.closest ? ev.target.closest('.ops-row-actions') : null; if(!rowActions) closeArrestMenus(); }, false);

  if(typeof window.__mdt_addPageHook === 'function') window.__mdt_addPageHook(function(name){ if(name === 'arrest'){ updateCitizenFilterPill(); requestArrestReports(); } });
  if(typeof window.__mdt_addResponseHook === 'function') window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
    if(reqId && reqId.indexOf('req_arrest_list_') === 0){
      if(ok){
        ARREST_REPORTS = Array.isArray(data.reports) ? data.reports.map(ensureArrayFields) : [];
        var filtered = getFilteredReports();
        if(ARREST_PENDING_SELECT_ID && filtered.some(function(row){ return Number(row.id || 0) === Number(ARREST_PENDING_SELECT_ID || 0); })){ ARREST_SELECTED_ID = Number(ARREST_PENDING_SELECT_ID || 0); }
        else if(filtered.length && !filtered.some(function(row){ return Number(row.id || 0) === Number(ARREST_SELECTED_ID || 0); })){ ARREST_SELECTED_ID = Number(filtered[0].id || 0); }
        else if(!filtered.length){ ARREST_SELECTED_ID = null; }
        ARREST_PENDING_SELECT_ID = null;
        renderArrestList();
        renderArrestDetail(getReportById(ARREST_SELECTED_ID));
        if(!ARREST_REPORTS.length && ARREST_FILTER_CITIZEN && typeof window.showToast === 'function') window.showToast('ℹ️ Aucun rapport trouvé', 'Aucun rapport d\'arrestation pour ce citoyen.');
      }else if(typeof window.showToast === 'function') window.showToast('⚠️ Impossible de charger les rapports d\'arrestation', err || (data && data.message) || null, true);
      return true;
    }
    if(reqId && reqId.indexOf('req_arrest_delete_') === 0){
      if(ok){
        if(typeof window.showToast === 'function') window.showToast('✓ Rapport supprimé', (data && (data.reference || data.id)) || 'Le rapport a été supprimé.', false);
        if(Number(ARREST_SELECTED_ID || 0) === Number(data && data.id || 0)) ARREST_SELECTED_ID = null;
        requestArrestReports();
      }else if(typeof window.showToast === 'function') window.showToast('⚠️ Suppression impossible', err || (data && data.message) || 'Erreur inconnue', true);
      return true;
    }
    return false;
  });

  bindArrestRowView();
  updateCitizenFilterPill();
})();
});
