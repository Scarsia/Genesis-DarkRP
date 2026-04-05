window.__mdtModule('operations', function(){
// EXTENSIONS MODULAIRES — RAPPORTS D'OPÉRATION + NAV REGISTRES
// N'écrasent pas l'auto-login.
// ════════════════════════════════════════════════════════════════
(function(){
  if(window.__mdt_operations_loaded) return;
  window.__mdt_operations_loaded = true;

  const REGISTRY_PAGES = new Set(['arrest','operations','complaints','weapons','delits','bracelets','dossier-photos']);

  let OPS_REPORTS = [];
  let OPS_SELECTED_ID = null;
  let OPS_ACTIVE_OFFICERS = [];
  let OPS_ACTIVE_CIVILIANS = [];
  let OPS_EVIDENCE_FOLDERS = [];
  let OPS_SELECTED_OFFICERS = [];
  let OPS_SELECTED_HOSTAGES = [];
  let OPS_SELECTED_EVIDENCE = null;
  let OPS_QUILL = null;
  const NYPD_BADGE_URL =
    window.__mdt_nypd_badge_url ||
    'assets/nypd_badge.png';
  let OPS_OPEN_MENU_ID = null;
  let OPS_EDITING_ID = null;
  let OPS_SUBMIT_BUSY = false;
  let OPS_LAST_SUBMIT_SIG = '';
  let OPS_LAST_SUBMIT_AT = 0;

  function parseJsonSafe(json){
    try{ return typeof json === 'string' ? JSON.parse(json) : (json || {}); }
    catch(e){ return {}; }
  }

  function req(action, data, prefix){
    const reqId = prefix + Date.now();

    try{
      if(typeof window.loReq === 'function'){
        window.loReq(action, data || {}, reqId);
        return reqId;
      }
    }catch(e){}

    try{
      if(window.mdtBridge && window.mdtBridge.request){
        window.mdtBridge.request(action, JSON.stringify(data || {}), reqId);
        return reqId;
      }
    }catch(e){}

    console.log('MDT>>' + JSON.stringify({action:action, reqId:reqId, data:data || {}}));
    return reqId;
  }

  function uniqById(arr){
    const map = new Map();
    (arr || []).forEach(item=>{
      const id = String(item.steamid64 || '');
      if(id && !map.has(id)) map.set(id, item);
    });
    return Array.from(map.values());
  }

  function personLabel(person){
    const full = (((person.firstname||'') + ' ' + (person.lastname||'')).trim()) || person.name || 'Inconnu';
    const phone = String(person.phone || '').trim();
    return phone && phone !== '—' ? (full + ' (' + phone + ')') : full;
  }

  function shortPerson(person){
    return (((person.firstname||'') + ' ' + (person.lastname||'')).trim()) || person.name || 'Inconnu';
  }

  function closeOperationMenus(){
    OPS_OPEN_MENU_ID = null;
    document.querySelectorAll('.ops-row-menu').forEach(function(menu){
      menu.style.display = 'none';
    });
  }

  function normalizeSubmitHtml(html){
    return String(html || '')
      .replace(/<p><br><\/p>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function makeOperationSubmitSignature(payload){
    return JSON.stringify({
      id: Number(OPS_EDITING_ID || 0) || 0,
      operation_datetime: String(payload.operation_datetime || ''),
      incident_type: String(payload.incident_type || ''),
      officer_ids: (payload.officer_ids || []).map(String).sort(),
      hostage_ids: (payload.hostage_ids || []).map(String).sort(),
      location: String(payload.location || ''),
      demands: String(payload.demands || ''),
      lead_negotiator_sid: String(payload.lead_negotiator_sid || ''),
      lead_field_sid: String(payload.lead_field_sid || ''),
      narrative_html: normalizeSubmitHtml(payload.narrative_html || ''),
      evidence_folder_ref: String(payload.evidence_folder_ref || ''),
      evidence_folder_label: String(payload.evidence_folder_label || '')
    });
  }

  function setOperationSubmitBusy(busy){
    OPS_SUBMIT_BUSY = !!busy;
    const submit = document.getElementById('ops-submit-report-btn');
    if(submit){
      submit.disabled = !!busy;
      if(busy){
        submit.setAttribute('data-prev-label', submit.textContent || '');
        submit.textContent = OPS_EDITING_ID ? 'Enregistrement…' : 'Création…';
      }else{
        const prev = submit.getAttribute('data-prev-label');
        submit.textContent = prev || (OPS_EDITING_ID ? 'Enregistrer les modifications' : 'Créer le rapport');
      }
    }
  }

  function formatOpDocDate(value){
    if(!value) return '—';
    const d = new Date(value);
    if(isNaN(d.getTime())) return String(value);

    const months = [
      'janvier','février','mars','avril','mai','juin',
      'juillet','août','septembre','octobre','novembre','décembre'
    ];

    const dd = d.getDate();
    const mm = months[d.getMonth()] || '';
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');

    return 'Le ' + dd + ' ' + mm + ' ' + yyyy + ' à ' + hh + ':' + mi;
  }

  function operationOfficerLine(person){
    const matricule = String(person.matricule || person.badge_number || person.badge || person.callsign || '—').trim();
    const fullname = shortPerson(person);
    return esc(matricule + ' | ' + fullname);
  }

  function operationHostageLine(person){
    const phone = String(person.phone || '').trim();
    const fullname = shortPerson(person);
    return esc(phone ? (phone + ' - ' + fullname) : fullname);
  }

  function buildOperationPdfList(items, type){
    if(!Array.isArray(items) || !items.length){
      return '<ul class="opdoc-list"><li>Aucun</li></ul>';
    }

    return '<ul class="opdoc-list">' + items.map(function(item){
      return '<li>' + (type === 'officer' ? operationOfficerLine(item) : operationHostageLine(item)) + '</li>';
    }).join('') + '</ul>';
  }

  function getOperationReportById(id){
    return OPS_REPORTS.find(function(r){
      return Number(r.id || 0) === Number(id || 0);
    }) || null;
  }

  function ensureOpsQuill(){
    if(OPS_QUILL) return OPS_QUILL;
    const host = document.getElementById('ops-quill');
    if(!host) return null;
    OPS_QUILL = window.__mdtCreateRichEditor('#ops-quill',{
      theme:'snow',
      placeholder:'Rédigez le rapport complet…',
      modules:{toolbar:[['bold','italic','underline'],[{'list':'ordered'},{'list':'bullet'}],['clean']]}
    });
    return OPS_QUILL;
  }

  function setDefaultOperationDatetime(){
    const el = document.getElementById('ops-datetime');
    if(!el || el.value) return;
    const n = new Date(), p = x => String(x).padStart(2,'0');
    el.value = `${n.getFullYear()}-${p(n.getMonth()+1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`;
  }

  function renderOperationList(){
    const list = document.getElementById('ops-list');
    const count = document.getElementById('ops-count');
    if(!list) return;

    if(count){
      count.textContent = OPS_REPORTS.length + ' rapport' + (OPS_REPORTS.length > 1 ? 's' : '');
    }

    if(!OPS_REPORTS.length){
      list.innerHTML = '<div class="ops-empty">Aucun rapport d\'opération enregistré.</div>';
      renderOperationDetail(null);
      return;
    }

    list.innerHTML = OPS_REPORTS.map(function(report){
      const reportId = Number(report.id || 0);
      const active = reportId === Number(OPS_SELECTED_ID || 0);
      const officerCount = Array.isArray(report.officers) ? report.officers.length : 0;
      const hostageCount = Array.isArray(report.hostages) ? report.hostages.length : 0;
      const menuOpen = reportId === Number(OPS_OPEN_MENU_ID || 0);

      return ''
        + '<div class="ops-row' + (active ? ' active' : '') + '" data-ops-action="view" data-report-id="' + reportId + '">'
        +   '<div class="ops-row-main">'
        +     '<div class="ops-row-title">' + esc(report.incident_type || "Rapport d\'opération") + '</div>'
        +     '<div class="ops-row-meta">' + esc(report.operation_datetime || '—') + ' · ' + esc(report.location || 'Lieu inconnu') + '</div>'
        +     '<div class="ops-row-tags">'
        +       '<span class="ops-mini-badge">' + officerCount + ' officier(s)</span>'
        +       '<span class="ops-mini-badge">' + hostageCount + ' otage(s)</span>'
        +     '</div>'
        +   '</div>'

        +   '<div class="ops-row-actions">'
        +     '<button class="ops-more" type="button" onclick="window.toggleOperationRowMenu(event,' + reportId + ')" title="Options">⋯</button>'
        +     '<div class="ops-row-menu" id="ops-row-menu-' + reportId + '" style="display:' + (menuOpen ? 'block' : 'none') + ';">'
        +       '<button class="ops-row-menu-item" type="button" onclick="window.viewOperationReport(' + reportId + ')">'
        +         '<span class="ops-row-menu-ico">👁️</span>'
        +         '<span>Afficher le rapport</span>'
        +       '</button>'
        +       '<button class="ops-row-menu-item" type="button" onclick="window.editOperationReport(' + reportId + ')">'
        +         '<span class="ops-row-menu-ico">✏️</span>'
        +         '<span>Modifier le rapport</span>'
        +       '</button>'
        +       '<button class="ops-row-menu-item danger" type="button" onclick="window.deleteOperationReport(' + reportId + ')">'
        +         '<span class="ops-row-menu-ico">🗑️</span>'
        +         '<span>Supprimer le rapport</span>'
        +       '</button>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    }).join('');
  }

  function renderPeopleList(people){
    if(!Array.isArray(people) || !people.length) return '<div class="ops-detail-v">Aucun</div>';
    return '<div class="ops-detail-v"><ul>' + people.map(p=>'<li>' + esc(personLabel(p)) + '</li>').join('') + '</ul></div>';
  }

  function renderOperationDetail(report){
    const placeholder = document.getElementById('ops-detail-placeholder');
    const viewer = document.getElementById('report-viewer');
    if(!placeholder || !viewer) return;

    if(!report){
      placeholder.style.display = 'flex';
      viewer.style.display = 'none';
      viewer.innerHTML = '';
      return;
    }

    placeholder.style.display = 'none';
    viewer.style.display = 'block';

    const photoFolderRef = String(report.evidence_folder_ref || report.evidence_folder_label || '');
    const photoFolderLabel = String(report.evidence_folder_label || report.evidence_folder_ref || '');
    const photoButtonHtml = photoFolderRef
      ? '<button class="opdoc-photo-open-btn" type="button" data-dossier-ref="' + escAttr(photoFolderRef) + '" data-dossier-name="' + escAttr(photoFolderLabel) + '" onclick="window.openPhotoFolderFromButton(this,\'operations\')">Ouvrir le dossier</button>'
      : '';

    viewer.innerHTML = ''
      + '<div class="opdoc-page">'
      +   '<div class="opdoc-head">'
      +     '<img class="opdoc-badge" src="' + escAttr(NYPD_BADGE_URL) + '" alt="Badge NYPD" onerror="this.style.display=\'none\'">'
      +     '<div class="opdoc-head-right">New York City Police Department<br>NYPD State Police | Precinct<br>New York City, NY<br>United States of America</div>'
      +   '</div>'

      +   '<hr class="opdoc-rule">'
      +   '<h2 class="opdoc-title">Rapport d\'opération n°#' + esc(report.id || report.report_number || '—') + '</h2>'
      +   '<hr class="opdoc-rule">'

      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Informations générales</div>'
      +     '<div class="opdoc-lines">'
      +       '<div class="opdoc-line">' + esc(formatOpDocDate(report.operation_datetime)) + '</div>'
      +       '<div class="opdoc-line">Rédacteur : ' + esc(report.created_by_name || '—') + '</div>'
      +       '<div class="opdoc-line">Lieu : ' + esc(report.location || '—') + '</div>'
      +       '<div class="opdoc-line">Type d\'incident : ' + esc(report.incident_type || '—') + '</div>'
      +       '<div class="opdoc-line">Lead terrain : ' + esc(report.lead_field_name || '—') + '</div>'
      +       '<div class="opdoc-line">Lead négociateur : ' + esc(report.lead_negotiator_name || '—') + '</div>'
      +     '</div>'
      +   '</div>'

      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Agents impliqués</div>'
      +     buildOperationPdfList(report.officers, 'officer')
      +   '</div>'

      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Otage(s)</div>'
      +     buildOperationPdfList(report.hostages, 'hostage')
      +   '</div>'

      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Rapport détaillé</div>'
      +     '<div class="opdoc-report-box">' + (report.narrative_html || '<p>Aucun contenu.</p>') + '</div>'
      +   '</div>'
      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Preuves photographiques</div>'
      +     '<div class="opdoc-photo-head">'
      +       '<div class="opdoc-line">Dossier lié : ' + esc(photoFolderLabel || 'Aucun') + '</div>'
      +       photoButtonHtml
      +     '</div>'
      +     '<div class="opdoc-photo-preview" id="ops-photo-preview-' + report.id + '"></div>'
      +   '</div>'
      + '</div>';

    if(typeof window.loadEvidencePreview === 'function'){
      window.loadEvidencePreview('ops-photo-preview-' + report.id, report.evidence_folder_ref || '', report.evidence_folder_label || report.evidence_folder_ref || '', { limit: 6 });
    }
  }

  window.viewOperationReport = function(id){
    OPS_SELECTED_ID = Number(id || 0);
    closeOperationMenus();

    const report = getOperationReportById(id);
    renderOperationList();
    renderOperationDetail(report);
  };

  window.selectOperationReport = window.viewOperationReport;

  window.toggleOperationRowMenu = function(ev, id){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }

    const targetId = Number(id || 0);
    OPS_OPEN_MENU_ID = (Number(OPS_OPEN_MENU_ID || 0) === targetId) ? null : targetId;
    renderOperationList();
  };

  window.editOperationReport = function(id){
    closeOperationMenus();
    window.openOperationModal(Number(id || 0));
  };

  window.editOperationReportPlaceholder = window.editOperationReport;

  window.deleteOperationReport = function(id){
    closeOperationMenus();

    const numId = Number(id || 0);
    if(!numId) return;

    console.log('[MDT] deleteOperationReport request', { id: numId });
    req('delete_operation_report', { id: numId }, 'req_ops_delete_');
  };

  function buildLeadOptions(selected){
    const current = String(selected || '');
    const options = ['<option value="">— Aucun —</option>'];
    OPS_ACTIVE_OFFICERS.forEach(function(officer){
      const sid = String(officer.steamid64 || '');
      options.push('<option value="' + escAttr(sid) + '"' + (sid === current ? ' selected' : '') + '>' + esc(personLabel(officer)) + '</option>');
    });
    return options.join('');
  }

  function renderLeadSelects(){
    const neg = document.getElementById('ops-lead-negotiator');
    const field = document.getElementById('ops-lead-field');
    if(neg) neg.innerHTML = buildLeadOptions(neg.value);
    if(field) field.innerHTML = buildLeadOptions(field.value);
  }

  function renderTagBox(targetId, items, removeFnName){
    const host = document.getElementById(targetId);
    if(!host) return;
    host.innerHTML = (items || []).map(function(item){
      return "<span class=\"ops-tag\">" + esc(shortPerson(item)) + "<button type=\"button\" onclick=\"" + removeFnName + "('" + escAttr(item.steamid64 || '') + "')\">✕</button></span>";
    }).join('');
  }

  function filterPool(pool, query, selectedArr){
    const q = String(query || '').trim().toLowerCase();
    if(q.length < 2) return [];
    const selected = new Set((selectedArr || []).map(item => String(item.steamid64 || '')));
    return pool.filter(function(person){
      const sid = String(person.steamid64 || '');
      if(selected.has(sid)) return false;
      const hay = (shortPerson(person) + ' ' + (person.phone || '') + ' ' + (person.current_job || '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    }).slice(0, 8);
  }

  function renderSuggest(boxId, list, addFnName){
    const box = document.getElementById(boxId);
    if(!box) return;
    if(!list.length){
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }
    box.innerHTML = list.map(function(item){
      return "<div class=\"ops-suggest-item\" onclick=\"" + addFnName + "('" + escAttr(item.steamid64 || '') + "')\">"
        + esc(shortPerson(item))
        + '<span class="ops-suggest-meta">' + esc((item.current_job || '—') + ' · ' + (item.phone || '—')) + '</span>'
        + '</div>';
    }).join('');
    box.style.display = 'block';
  }

  function refreshOfficerSuggest(){
    const input = document.getElementById('ops-officers-input');
    renderSuggest('ops-officers-suggest', filterPool(OPS_ACTIVE_OFFICERS, input ? input.value : '', OPS_SELECTED_OFFICERS), 'addOperationOfficer');
  }

  function refreshHostageSuggest(){
    const input = document.getElementById('ops-hostages-input');
    renderSuggest('ops-hostages-suggest', filterPool(OPS_ACTIVE_CIVILIANS, input ? input.value : '', OPS_SELECTED_HOSTAGES), 'addOperationHostage');
  }

  function findBySid(pool, sid){
    return (pool || []).find(item => String(item.steamid64 || '') === String(sid || '')) || null;
  }

  window.addOperationOfficer = function(sid){
    const person = findBySid(OPS_ACTIVE_OFFICERS, sid);
    if(!person) return;
    OPS_SELECTED_OFFICERS = uniqById([].concat(OPS_SELECTED_OFFICERS, [person]));
    renderTagBox('ops-officers-tags', OPS_SELECTED_OFFICERS, 'removeOperationOfficer');
    const input = document.getElementById('ops-officers-input');
    if(input) input.value = '';
    refreshOfficerSuggest();
  };

  window.removeOperationOfficer = function(sid){
    OPS_SELECTED_OFFICERS = OPS_SELECTED_OFFICERS.filter(item => String(item.steamid64 || '') !== String(sid || ''));
    renderTagBox('ops-officers-tags', OPS_SELECTED_OFFICERS, 'removeOperationOfficer');
    refreshOfficerSuggest();
  };

  window.addOperationHostage = function(sid){
    const person = findBySid(OPS_ACTIVE_CIVILIANS, sid);
    if(!person) return;
    OPS_SELECTED_HOSTAGES = uniqById([].concat(OPS_SELECTED_HOSTAGES, [person]));
    renderTagBox('ops-hostages-tags', OPS_SELECTED_HOSTAGES, 'removeOperationHostage');
    const input = document.getElementById('ops-hostages-input');
    if(input) input.value = '';
    refreshHostageSuggest();
  };

  window.removeOperationHostage = function(sid){
    OPS_SELECTED_HOSTAGES = OPS_SELECTED_HOSTAGES.filter(item => String(item.steamid64 || '') !== String(sid || ''));
    renderTagBox('ops-hostages-tags', OPS_SELECTED_HOSTAGES, 'removeOperationHostage');
    refreshHostageSuggest();
  };

  function renderEvidenceResults(list){
    const box = document.getElementById('ops-evidence-results');
    if(!box) return;
    if(!list.length){
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }
    box.innerHTML = list.map(function(item){
      return "<div class=\"ops-evidence-item\" onclick=\"selectOperationEvidence('" + escAttr(item.ref || '') + "')\">" + esc(item.label || item.ref || 'Dossier') + '</div>';
    }).join('');
    box.style.display = 'block';
  }

  function refreshEvidenceSearch(){
    const input = document.getElementById('ops-evidence-search');
    const q = String(input ? input.value : '').trim().toLowerCase();
    if(q.length < 2){
      renderEvidenceResults([]);
      return;
    }
    const filtered = OPS_EVIDENCE_FOLDERS.filter(function(item){
      const hay = String((item.label || item.ref || '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    }).slice(0, 10);
    renderEvidenceResults(filtered);
  }

  window.selectOperationEvidence = function(ref){
    OPS_SELECTED_EVIDENCE = OPS_EVIDENCE_FOLDERS.find(item => String(item.ref || '') === String(ref || '')) || { ref: ref, label: ref };
    const selected = document.getElementById('ops-selected-evidence');
    const input = document.getElementById('ops-evidence-search');
    const results = document.getElementById('ops-evidence-results');
    if(input) input.value = OPS_SELECTED_EVIDENCE.label || OPS_SELECTED_EVIDENCE.ref || '';
    if(selected) selected.innerHTML = 'Dossier sélectionné : <strong>' + esc(OPS_SELECTED_EVIDENCE.label || OPS_SELECTED_EVIDENCE.ref || '—') + '</strong>';
    if(results){ results.style.display = 'none'; results.innerHTML = ''; }
  };

  function resetOperationForm(){
    OPS_SELECTED_OFFICERS = [];
    OPS_SELECTED_HOSTAGES = [];
    OPS_SELECTED_EVIDENCE = null;
    ['ops-incident-type','ops-location','ops-demands','ops-evidence-search'].forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.value = '';
    });
    const selected = document.getElementById('ops-selected-evidence');
    if(selected) selected.textContent = 'Aucun dossier sélectionné.';
    renderTagBox('ops-officers-tags', OPS_SELECTED_OFFICERS, 'removeOperationOfficer');
    renderTagBox('ops-hostages-tags', OPS_SELECTED_HOSTAGES, 'removeOperationHostage');
    renderLeadSelects();
    setDefaultOperationDatetime();
    const q = ensureOpsQuill();
    if(q) q.root.innerHTML = '';
  }

  function requestOperationFormData(){
    req('get_operation_form_data', {}, 'req_ops_form_');
  }

  function requestOperationReports(){
    req('get_operations_list', {}, 'req_ops_list_');
  }

  function updateOperationModalLabels(){
    const title = document.getElementById('ops-modal-title');
    const sub = document.querySelector('#operations-modal .modal-sub');
    const submit = document.getElementById('ops-submit-report-btn');
    const close = document.getElementById('ops-close-modal-btn');

    if(title) title.textContent = OPS_EDITING_ID ? "Modifier un rapport d'opération" : "Créer un rapport d'opération";
    if(sub) sub.textContent = OPS_EDITING_ID ? 'Modification enregistrée en base SQLite.' : 'Dossier autonome — création liée à SQLite';
    if(submit) submit.textContent = OPS_EDITING_ID ? 'Enregistrer les modifications' : 'Créer le rapport';
    if(close) close.textContent = OPS_EDITING_ID ? 'Fermer' : 'Fermer';
  }

  function ensureLeadOption(selectEl, value, label){
    if(!selectEl || !value) return;
    const wanted = String(value || '');
    const exists = Array.from(selectEl.options || []).some(function(opt){ return String(opt.value || '') === wanted; });
    if(exists) return;
    const opt = document.createElement('option');
    opt.value = wanted;
    opt.textContent = label || wanted;
    selectEl.appendChild(opt);
  }

  function fillOperationFormFromReport(report){
    if(!report) return;

    const dt = document.getElementById('ops-datetime');
    const inc = document.getElementById('ops-incident-type');
    const loc = document.getElementById('ops-location');
    const dem = document.getElementById('ops-demands');
    const leadNeg = document.getElementById('ops-lead-negotiator');
    const leadField = document.getElementById('ops-lead-field');
    const selected = document.getElementById('ops-selected-evidence');
    const evidenceInput = document.getElementById('ops-evidence-search');

    if(dt) dt.value = String(report.operation_datetime || '').replace(' ', 'T').slice(0,16);
    if(inc) inc.value = report.incident_type || '';
    if(loc) loc.value = report.location || '';
    if(dem) dem.value = report.demands || '';

    OPS_SELECTED_OFFICERS = Array.isArray(report.officers) ? uniqById(report.officers.slice()) : [];
    OPS_SELECTED_HOSTAGES = Array.isArray(report.hostages) ? uniqById(report.hostages.slice()) : [];
    OPS_SELECTED_EVIDENCE = report.evidence_folder_ref ? {
      ref: String(report.evidence_folder_ref || ''),
      label: String(report.evidence_folder_label || report.evidence_folder_ref || '')
    } : null;

    renderTagBox('ops-officers-tags', OPS_SELECTED_OFFICERS, 'removeOperationOfficer');
    renderTagBox('ops-hostages-tags', OPS_SELECTED_HOSTAGES, 'removeOperationHostage');
    refreshOfficerSuggest();
    refreshHostageSuggest();

    renderLeadSelects();
    ensureLeadOption(leadNeg, report.lead_negotiator_sid, report.lead_negotiator_name || report.lead_negotiator_sid || '—');
    ensureLeadOption(leadField, report.lead_field_sid, report.lead_field_name || report.lead_field_sid || '—');
    if(leadNeg) leadNeg.value = report.lead_negotiator_sid || '';
    if(leadField) leadField.value = report.lead_field_sid || '';

    if(evidenceInput) evidenceInput.value = OPS_SELECTED_EVIDENCE ? (OPS_SELECTED_EVIDENCE.label || OPS_SELECTED_EVIDENCE.ref || '') : '';
    if(selected) selected.innerHTML = OPS_SELECTED_EVIDENCE
      ? ('Dossier sélectionné : <strong>' + esc(OPS_SELECTED_EVIDENCE.label || OPS_SELECTED_EVIDENCE.ref || '—') + '</strong>')
      : 'Aucun dossier sélectionné.';

    const q = ensureOpsQuill();
    if(q) q.root.innerHTML = String(report.narrative_html || '');
  }

  window.openOperationModal = function(reportId){
    const modal = document.getElementById('operations-modal');
    if(!modal) return;

    const report = reportId ? getOperationReportById(reportId) : null;
    OPS_EDITING_ID = report ? Number(report.id || 0) : null;

    modal.style.display = 'flex';
    modal.classList.add('is-open');
    ensureOpsQuill();
    if(!OPS_ACTIVE_OFFICERS.length && !OPS_ACTIVE_CIVILIANS.length) requestOperationFormData();
    resetOperationForm();
    if(report) fillOperationFormFromReport(report);
    updateOperationModalLabels();
    bindOperationInputs();
    bindOperationActionButtons();

    setTimeout(function(){
      const input = document.getElementById('ops-incident-type');
      if(input) input.focus();
    }, 0);
  };

  window.closeOperationModal = function(){
    const modal = document.getElementById('operations-modal');
    OPS_EDITING_ID = null;
    setOperationSubmitBusy(false);
    if(modal){
      modal.style.display = 'none';
      modal.classList.remove('is-open');
      modal.scrollTop = 0;
      const body = modal.querySelector('.mdt-modal-body');
      if(body) body.scrollTop = 0;
    }
    updateOperationModalLabels();
  };

  window.openRapportOperationModal = window.openOperationModal;
  window.closeRapportOperationModal = window.closeOperationModal;

  function bindOperationActionButtons(){
    const openBtn = document.getElementById('ops-open-create-btn');
    const closeBtn = document.getElementById('ops-close-modal-btn');
    const submitBtn = document.getElementById('ops-submit-report-btn');

    if(openBtn && !openBtn.__mdtBound){
      openBtn.__mdtBound = true;
      openBtn.addEventListener('click', function(ev){
        ev.preventDefault();
        window.openOperationModal();
      });
    }

    if(closeBtn && !closeBtn.__mdtBound){
      closeBtn.__mdtBound = true;
      closeBtn.addEventListener('click', function(ev){
        ev.preventDefault();
        window.closeOperationModal();
      });
    }

    if(submitBtn && !submitBtn.__mdtBound){
      submitBtn.__mdtBound = true;
      submitBtn.addEventListener('click', function(ev){
        ev.preventDefault();
        window.submitOperationReport();
      });
    }
  }

  window.submitOperationReport = function(){
    const q = ensureOpsQuill();
    const payload = {
      operation_datetime: (document.getElementById('ops-datetime')?.value || '').trim(),
      incident_type: (document.getElementById('ops-incident-type')?.value || '').trim(),
      officer_ids: OPS_SELECTED_OFFICERS.map(item => String(item.steamid64 || '')),
      hostage_ids: OPS_SELECTED_HOSTAGES.map(item => String(item.steamid64 || '')),
      location: (document.getElementById('ops-location')?.value || '').trim(),
      demands: (document.getElementById('ops-demands')?.value || '').trim(),
      lead_negotiator_sid: (document.getElementById('ops-lead-negotiator')?.value || '').trim(),
      lead_field_sid: (document.getElementById('ops-lead-field')?.value || '').trim(),
      narrative_html: q ? String(q.root.innerHTML || '').trim() : '',
      evidence_folder_ref: OPS_SELECTED_EVIDENCE ? String(OPS_SELECTED_EVIDENCE.ref || '') : '',
      evidence_folder_label: OPS_SELECTED_EVIDENCE ? String(OPS_SELECTED_EVIDENCE.label || OPS_SELECTED_EVIDENCE.ref || '') : ''
    };

    if(!payload.incident_type || !payload.location || !payload.narrative_html || payload.narrative_html === '<p><br></p>'){
      showToast('⚠️ Champs obligatoires manquants', null, true);
      return;
    }

    const now = Date.now();
    const sig = makeOperationSubmitSignature(payload);
    if(OPS_SUBMIT_BUSY){
      showToast('⚠️ Envoi déjà en cours', 'Patientez une seconde.', true);
      return;
    }
    if(sig && OPS_LAST_SUBMIT_SIG === sig && (now - OPS_LAST_SUBMIT_AT) < 2500){
      showToast('⚠️ Double clic bloqué', 'Le rapport est déjà en cours d’envoi.', true);
      return;
    }

    OPS_LAST_SUBMIT_SIG = sig;
    OPS_LAST_SUBMIT_AT = now;
    setOperationSubmitBusy(true);

    if(OPS_EDITING_ID){
      payload.id = Number(OPS_EDITING_ID || 0);
      req('update_operation_report', payload, 'req_ops_update_');
    }else{
      req('create_operation_report', payload, 'req_ops_create_');
    }
  };


  function bindOperationRowView(){
    if(document.__mdtOpsRowViewBound) return;
    document.__mdtOpsRowViewBound = true;

    document.addEventListener('click', function(ev){
      if(ev.target && ev.target.closest && ev.target.closest('.ops-row-menu')) return;
      if(ev.target && ev.target.closest && ev.target.closest('.ops-more')) return;

      const actEl = ev.target && ev.target.closest ? ev.target.closest('[data-ops-action="view"]') : null;
      if(!actEl) return;

      const id = Number(actEl.getAttribute('data-report-id') || 0);
      if(!id) return;

      ev.preventDefault();
      window.viewOperationReport(id);
    }, false);
  }

  function bindOperationInputs(){
    const offInput = document.getElementById('ops-officers-input');
    const hostInput = document.getElementById('ops-hostages-input');
    const evidenceInput = document.getElementById('ops-evidence-search');

    if(offInput && !offInput.__mdtBound){
      offInput.__mdtBound = true;
      offInput.addEventListener('input', refreshOfficerSuggest);
      offInput.addEventListener('focus', refreshOfficerSuggest);
    }
    if(hostInput && !hostInput.__mdtBound){
      hostInput.__mdtBound = true;
      hostInput.addEventListener('input', refreshHostageSuggest);
      hostInput.addEventListener('focus', refreshHostageSuggest);
    }
    if(evidenceInput && !evidenceInput.__mdtBound){
      evidenceInput.__mdtBound = true;
      evidenceInput.addEventListener('input', refreshEvidenceSearch);
      evidenceInput.addEventListener('focus', refreshEvidenceSearch);
    }
  }

  document.addEventListener('click', function(ev){
    const officerBox = document.getElementById('ops-officers-suggest');
    const hostageBox = document.getElementById('ops-hostages-suggest');
    const evidenceBox = document.getElementById('ops-evidence-results');
    const rowActions = ev.target && ev.target.closest ? ev.target.closest('.ops-row-actions') : null;

    if(officerBox && !document.getElementById('ops-officers-wrap')?.contains(ev.target)) officerBox.style.display = 'none';
    if(hostageBox && !document.getElementById('ops-hostages-wrap')?.contains(ev.target)) hostageBox.style.display = 'none';
    if(evidenceBox){
      const input = document.getElementById('ops-evidence-search');
      if(ev.target !== input && !evidenceBox.contains(ev.target)) evidenceBox.style.display = 'none';
    }

    if(!rowActions){
      closeOperationMenus();
    }
  }, false);
  if(typeof window.__mdt_addPageHook === 'function'){
    window.__mdt_addPageHook(function(name){
      if(REGISTRY_PAGES.has(name)){
        const target = document.querySelector('.acc-item[data-page="' + name + '"]');
        if(target) setAccItem(target);
      }else{
        document.querySelectorAll('.acc-item').forEach(i=>i.classList.remove('active'));
      }

      if(name === 'operations'){
        requestOperationReports();
        requestOperationFormData();
      }
    });
  }

  if(typeof window.__mdt_addResponseHook === 'function'){
    window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
      if(reqId && reqId.indexOf('req_ops_form_') === 0){
        if(ok){
          OPS_ACTIVE_OFFICERS = Array.isArray(data.officers) ? data.officers : [];
          OPS_ACTIVE_CIVILIANS = Array.isArray(data.civilians) ? data.civilians : [];
          OPS_EVIDENCE_FOLDERS = Array.isArray(data.evidence_folders) ? data.evidence_folders : [];
          renderLeadSelects();
          bindOperationInputs();
        }else{
          showToast('⚠️ Impossible de charger les listes actives', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_ops_list_') === 0){
        if(ok){
          OPS_REPORTS = Array.isArray(data.reports) ? data.reports : [];
          const pendingId = Number(window.__mdtPendingOperationReportId || 0);
          const preferred = pendingId ? OPS_REPORTS.find(function(row){
            return Number(row.id || 0) === pendingId;
          }) : null;

          OPS_SELECTED_ID = preferred
            ? Number(preferred.id || 0)
            : (OPS_REPORTS[0] ? Number(OPS_REPORTS[0].id || 0) : null);

          renderOperationList();

          if(preferred){
            window.__mdtPendingOperationReportId = null;
            viewOperationReport(preferred.id);
          }else if(OPS_REPORTS[0]){
            viewOperationReport(OPS_REPORTS[0].id);
          }else{
            renderOperationDetail(null);
          }
        }else{
          showToast('⚠️ Impossible de charger les rapports', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_ops_create_') === 0){
        setOperationSubmitBusy(false);
        if(ok && data.report){
          OPS_REPORTS.unshift(data.report);
          OPS_SELECTED_ID = Number(data.report.id || 0);
          renderOperationList();
          viewOperationReport(data.report.id);
          closeOperationModal();
          showToast('✓ Rapport d\'opération créé', {report_number:data.report.report_number || '—'}, false);
        }else{
          showToast('⚠️ Création impossible', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_ops_update_') === 0){
        setOperationSubmitBusy(false);
        if(ok && data.report){
          const updatedId = Number(data.report.id || 0);
          OPS_REPORTS = OPS_REPORTS.map(function(row){
            return Number(row.id || 0) === updatedId ? data.report : row;
          });
          OPS_SELECTED_ID = updatedId;
          renderOperationList();
          viewOperationReport(updatedId);
          closeOperationModal();
          showToast('✓ Rapport modifié', {report_number:data.report.report_number || '—'}, false);
        }else{
          showToast('⚠️ Modification impossible', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_ops_delete_') === 0){
        if(ok){
          const deletedId = Number((data && data.id) || 0);
          OPS_REPORTS = OPS_REPORTS.filter(function(row){
            return Number(row.id || 0) !== deletedId;
          });

          if(Number(OPS_SELECTED_ID || 0) === deletedId){
            OPS_SELECTED_ID = OPS_REPORTS[0] ? Number(OPS_REPORTS[0].id || 0) : null;
          }

          renderOperationList();

          if(OPS_SELECTED_ID){
            renderOperationDetail(getOperationReportById(OPS_SELECTED_ID));
          }else{
            renderOperationDetail(null);
          }

          showToast('✓ Rapport supprimé', null, false);
        }else{
          showToast('⚠️ Suppression impossible', err || data.message || null, true);
        }
        return true;
      }

      return false;
    });
  }

  window.resetOperationForm = resetOperationForm;
  bindOperationInputs();
  bindOperationActionButtons();
  bindOperationRowView();
  updateOperationModalLabels();
  setDefaultOperationDatetime();
})();

window.__mdt_notify    = window.__mdt_notify    || function(t,m){ showToast((t==='error'?'⚠️ ':t==='success'?'✓ ':'')+m,null,t==='error'); };
window.__mdt_broadcast = window.__mdt_broadcast || function(e,j){};

});
