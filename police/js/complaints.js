window.__mdtModule('complaints', function(){
(function(){
  if(window.__mdt_complaints_loaded) return;
  window.__mdt_complaints_loaded = true;

  let COMPLAINTS = [];
  let COMPLAINT_SELECTED_ID = null;

  let COMPLAINT_EDIT_ID = null;
  let COMPLAINT_ACTIVE_CIVILIANS = [];
  let COMPLAINT_ACTIVE_OFFICERS = [];
  let COMPLAINT_CITIZEN_LOCKED = false;

  let COMPLAINT_SELECTED_CITIZEN = null;
  let COMPLAINT_QUILL = null;
  let COMPLAINT_SUBMIT_BUSY = false;
  let COMPLAINT_LAST_SUBMIT_SIG = '';
  let COMPLAINT_LAST_SUBMIT_AT = 0;

  const NYPD_BADGE_URL =
    window.__mdt_nypd_badge_url ||
    'assets/nypd_badge.png';

  function stripHtml(html){
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
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

    console.log('MDT>>' + JSON.stringify({
      action: action,
      reqId: reqId,
      data: data || {}
    }));

    return reqId;
  }

  function complaintStatusLabel(status){
    return String(status || '') === 'Terminee sans suite'
      ? 'Terminée sans suite'
      : 'Ouvert';
  }

  function complaintStatusHtml(status){
    const s = String(status || 'En cours');

    if(s === 'Terminee sans suite'){
      return ''
        + '<span class="plaints-status is-closed">'
        +   '<span class="plaints-status-check">✓</span>'
        +   '<span>' + esc(complaintStatusLabel(s)) + '</span>'
        + '</span>';
    }

    return ''
      + '<span class="plaints-status is-open">'
      +   '<span class="plaints-status-dot"></span>'
      +   '<span>' + esc(complaintStatusLabel(s)) + '</span>'
      + '</span>';
  }

  function formatComplaintDate(value){
    if(!value) return '—';

    const raw = String(value).replace(' ', 'T');
    const d = new Date(raw);
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

    return 'Le ' + dd + ' ' + mm + ' ' + yyyy + ' a ' + hh + ':' + mi;
  }

  function shortPerson(person){
    return (((person.firstname || '') + ' ' + (person.lastname || '')).trim()) || person.name || 'Inconnu';
  }

  function citizenLabel(person){
    if(!person) return '—';
    const name = shortPerson(person);
    const phone = String(person.phone || '').trim();
    return phone && phone !== '—' ? (name + ' (' + phone + ')') : name;
  }

  function officerLabel(person){
    if(!person) return '—';
    const mat = String(person.matricule || '—').trim() || '—';
    return mat + ' | ' + shortPerson(person);
  }

  function getComplaintById(id){
    return COMPLAINTS.find(function(row){
      return Number(row.id || 0) === Number(id || 0);
    }) || null;
  }

  function ensureComplaintQuill(){
    if(COMPLAINT_QUILL) return COMPLAINT_QUILL;

    const host = document.getElementById('complaint-quill');
    if(!host) return null;

    COMPLAINT_QUILL = window.__mdtCreateRichEditor('#complaint-quill', {
      theme: 'snow',
      placeholder: 'Rédigez la déclaration détaillée…',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          ['clean']
        ]
      }
    });

    return COMPLAINT_QUILL;
  }

  function setDefaultComplaintDatetime(){
    const el = document.getElementById('complaint-datetime');
    if(!el || el.value) return;

    const n = new Date();
    const p = x => String(x).padStart(2, '0');

    el.value =
      n.getFullYear() + '-'
      + p(n.getMonth() + 1) + '-'
      + p(n.getDate()) + 'T'
      + p(n.getHours()) + ':'
      + p(n.getMinutes());
  }

  function closeComplaintMenus(){
    document.querySelectorAll('.plaints-dropdown').forEach(function(d){
      d.style.display = 'none';
    });
  }

  function getComplaintsFiltered(){
    const status = String(document.getElementById('plaints-status-filter')?.value || 'all');
    const q = String(document.getElementById('plaints-search')?.value || '').trim().toLowerCase();

    return COMPLAINTS.filter(function(row){
      if(status !== 'all' && String(row.status || '') !== status) return false;

      if(!q) return true;

      const hay =
        (
          String(row.motif || '') + ' '
          + String(row.citizen_name || '') + ' '
          + String(row.citizen_phone || '') + ' '
          + String(row.status || '') + ' '
          + stripHtml(row.declaration_html || '')
        ).toLowerCase();

      return hay.indexOf(q) !== -1;
    });
  }

  function renderComplaintsViewer(complaint){
    const placeholder = document.getElementById('plaints-viewer-placeholder');
    const viewer = document.getElementById('complaint-viewer');
    if(!placeholder || !viewer) return;

    if(!complaint){
      placeholder.style.display = 'flex';
      viewer.style.display = 'none';
      viewer.innerHTML = '';
      return;
    }

    placeholder.style.display = 'none';
    viewer.style.display = 'block';

    viewer.innerHTML = ''
      + '<div class="opdoc-page">'
      +   '<div class="opdoc-head">'
      +     '<img class="opdoc-badge" src="' + escAttr(NYPD_BADGE_URL) + '" alt="Badge NYPD" onerror="this.style.display=\'none\'">'
      +     '<div class="opdoc-head-right">New York City Police Department<br>NYPD State Police | Precinct<br>New York City, NY<br>United States of America</div>'
      +   '</div>'

      +   '<hr class="opdoc-rule">'
      +   '<h2 class="opdoc-title">Plainte n° ' + esc(complaint.plainte_number || ('#' + complaint.id)) + '</h2>'
      +   '<hr class="opdoc-rule">'

      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Informations générales</div>'
      +     '<div class="opdoc-lines">'
      +       '<div class="opdoc-line">' + esc(formatComplaintDate(complaint.plainte_datetime)) + '</div>'
      +       '<div class="opdoc-line">Motif : ' + esc(complaint.motif || '—') + '</div>'
      +       '<div class="opdoc-line">Statut : ' + esc(complaintStatusLabel(complaint.status || 'En cours')) + '</div>'
      +       '<div class="opdoc-line">Enregistrée par : ' + esc(complaint.created_by_name || '—') + '</div>'
      +     '</div>'
      +   '</div>'

      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Citoyen plaignant</div>'
      +     '<div class="opdoc-lines">'
      +       '<div class="opdoc-line">Identité : ' + esc(complaint.citizen_name || '—') + '</div>'
      +       '<div class="opdoc-line">Téléphone : ' + esc(complaint.citizen_phone || '—') + '</div>'
      +     '</div>'
      +   '</div>'

      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Prise en charge</div>'
      +     '<div class="opdoc-lines">'
      +       '<div class="opdoc-line">Pris par : ' + esc((complaint.taken_by_matricule || '—') + ' | ' + (complaint.taken_by_name || '—')) + '</div>'
      +     '</div>'
      +   '</div>'

      +   '<div class="opdoc-section">'
      +     '<div class="opdoc-section-title">Déclaration détaillée</div>'
      +     '<div class="opdoc-report-box">' + (complaint.declaration_html || '<p>Aucun contenu.</p>') + '</div>'
      +   '</div>'
      + '</div>';
  }

  function renderComplaintsTable(){
    const body = document.getElementById('plaints-table-body');
    const count = document.getElementById('plaints-count');
    if(!body) return;

    const rows = getComplaintsFiltered();

    if(count){
      count.textContent = rows.length + ' plainte' + (rows.length > 1 ? 's' : '');
    }

    if(!rows.length){
      body.innerHTML = '<div class="plaints-empty">Aucune plainte trouvée.</div>';
      renderComplaintsViewer(null);
      return;
    }

    body.innerHTML = rows.map(function(row){
      const id = Number(row.id || 0);
      const isActive = id === Number(COMPLAINT_SELECTED_ID || 0);
      const citizen = row.citizen_name || 'Citoyen inconnu';
      const phone = row.citizen_phone && row.citizen_phone !== '—' ? (' · ' + row.citizen_phone) : '';

      return ''
        + '<div class="plaints-row' + (isActive ? ' active' : '') + '" data-complaint-action="view" data-complaint-id="' + id + '">'
        +   '<div class="plaints-row-main">'
        +     '<div class="plaints-row-title">' + esc(row.motif || ('Plainte #' + id)) + '</div>'
        +     '<div class="plaints-row-meta">' + esc(formatComplaintDate(row.plainte_datetime || row.created_at || '')) + '<br>' + esc(citizen + phone) + '</div>'
        +     '<div class="plaints-row-tags">'
        +       '<span class="plaints-mini-badge">' + esc(complaintStatusLabel(row.status || 'En cours')) + '</span>'
        +       '<span class="plaints-mini-badge">' + esc(row.plainte_number || ('#' + id)) + '</span>'
        +     '</div>'
        +   '</div>'
        +   '<div class="plaints-actions">'
        +     '<button class="plaints-more" type="button" onclick="window.togglePlainteDropdown(event,' + id + ')" title="Options">⋯</button>'
        +     '<div class="plaints-dropdown" id="plaints-dd-' + id + '" style="display:none">'
        +       '<button class="plaints-dd-item" type="button" onclick="window.viewComplaint(' + id + ')"><span>👁️</span><span>Afficher</span></button>'
        +       '<button class="plaints-dd-item" type="button" onclick="window.editComplaint(' + id + ')"><span>✏️</span><span>Modifier</span></button>'
        +       '<button class="plaints-dd-item danger" type="button" onclick="window.deleteComplaint(' + id + ')"><span>🗑️</span><span>Supprimer</span></button>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    }).join('');

    if(COMPLAINT_SELECTED_ID){
      const selected = getComplaintById(COMPLAINT_SELECTED_ID);
      renderComplaintsViewer(selected);
    }
  }

  function findBySid(pool, sid){
    return (pool || []).find(function(item){
      return String(item.steamid64 || '') === String(sid || '');
    }) || null;
  }

  function filterPool(pool, query, selectedSid){
    const q = String(query || '').trim().toLowerCase();
    if(q.length < 2) return [];

    return (pool || []).filter(function(person){
      const sid = String(person.steamid64 || '');
      if(selectedSid && sid === String(selectedSid)) return false;

      const hay = (
        shortPerson(person) + ' '
        + String(person.phone || '') + ' '
        + String(person.current_job || '') + ' '
        + String(person.matricule || '')
      ).toLowerCase();

      return hay.indexOf(q) !== -1;
    }).slice(0, 8);
  }

  function renderSuggest(boxId, list, selectFnName, isOfficer){
    const box = document.getElementById(boxId);
    if(!box) return;

    if(!list.length){
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }

    box.innerHTML = list.map(function(item){
      const main = isOfficer ? officerLabel(item) : citizenLabel(item);
      const meta = isOfficer
        ? ((item.current_job || '—') + ' · ' + (item.phone || '—'))
        : ((item.current_job || '—') + ' · ' + (item.phone || '—'));

      return ''
        + '<div class="complaint-suggest-item" onclick="window.' + selectFnName + '(\'' + escAttr(item.steamid64 || '') + '\')">'
        +   esc(main)
        +   '<span class="complaint-suggest-meta">' + esc(meta) + '</span>'
        + '</div>';
    }).join('');

    box.style.display = 'block';
  }

  function renderPicked(containerId, item, clearFnName, isOfficer){
    const host = document.getElementById(containerId);
    if(!host) return;

    if(!item){
      host.innerHTML = '';
      return;
    }

    const label = isOfficer ? officerLabel(item) : citizenLabel(item);

    host.innerHTML = ''
      + '<span class="complaint-picked-pill">'
      +   esc(label)
      +   '<button type="button" onclick="window.' + clearFnName + '()">✕</button>'
      + '</span>';
  }

  function refreshCitizenSuggest(){
    if(COMPLAINT_CITIZEN_LOCKED) return;
    const input = document.getElementById('complaint-citizen-search');
    const selectedSid = COMPLAINT_SELECTED_CITIZEN ? COMPLAINT_SELECTED_CITIZEN.steamid64 : '';
    renderSuggest(
      'complaint-citizen-suggest',
      filterPool(COMPLAINT_ACTIVE_CIVILIANS, input ? input.value : '', selectedSid),
      'selectComplaintCitizen',
      false
    );
  }


  window.selectComplaintCitizen = function(sid){
    const found = findBySid(COMPLAINT_ACTIVE_CIVILIANS, sid);
    if(!found) return;

    COMPLAINT_SELECTED_CITIZEN = found;
    renderPicked('complaint-citizen-picked', COMPLAINT_SELECTED_CITIZEN, 'clearComplaintCitizen', false);

    const input = document.getElementById('complaint-citizen-search');
    const box = document.getElementById('complaint-citizen-suggest');
    if(input) input.value = shortPerson(found);
    if(box){
      box.style.display = 'none';
      box.innerHTML = '';
    }
  };

  window.clearComplaintCitizen = function(){
    if(COMPLAINT_CITIZEN_LOCKED) return;
    COMPLAINT_SELECTED_CITIZEN = null;
    renderPicked('complaint-citizen-picked', null, 'clearComplaintCitizen', false);

    const input = document.getElementById('complaint-citizen-search');
    if(input) input.value = '';
  };



  function normalizeComplaintCitizenPreset(person){
    if(!person) return null;
    const firstname = String(person.firstname || '').trim();
    const lastname = String(person.lastname || '').trim();
    const name = String(person.name || ((firstname + ' ' + lastname).trim()) || '').trim();
    return {
      steamid64: String(person.steamid64 || person.sid64 || '').trim(),
      firstname: firstname,
      lastname: lastname,
      name: name,
      phone: String(person.phone || '—').trim() || '—'
    };
  }

  function setComplaintCitizenLock(isLocked){
    COMPLAINT_CITIZEN_LOCKED = !!isLocked;
    const input = document.getElementById('complaint-citizen-search');
    const wrap = document.getElementById('complaint-citizen-wrap');
    const box = document.getElementById('complaint-citizen-suggest');
    if(input){
      input.readOnly = !!isLocked;
      input.placeholder = isLocked ? 'Citoyen sélectionné depuis la fiche' : 'Rechercher un civil en ligne...';
    }
    if(wrap) wrap.classList.toggle('is-locked', !!isLocked);
    if(box && isLocked) box.style.display = 'none';
  }

  function applyComplaintCitizenPreset(person, lockCitizen){
    const normalized = normalizeComplaintCitizenPreset(person);
    COMPLAINT_SELECTED_CITIZEN = normalized;
    renderPicked('complaint-citizen-picked', normalized, 'clearComplaintCitizen', false);
    const input = document.getElementById('complaint-citizen-search');
    if(input) input.value = normalized ? (shortPerson(normalized) || normalized.name || '') : '';
    setComplaintCitizenLock(!!lockCitizen);
  }

  function navigateToComplaintsRegistry(selectedRow){
    const accH = document.getElementById('acc-h');
    if(accH && !accH.classList.contains('open') && typeof window.toggleAcc === 'function') window.toggleAcc();
    document.querySelectorAll('.acc-item').forEach(function(i){ i.classList.remove('active'); });
    const items = Array.from(document.querySelectorAll('.acc-item'));
    const target = items.find(function(i){ return String(i.textContent || '').toLowerCase().indexOf('plaint') !== -1; });
    if(target) target.classList.add('active');
    if(typeof window.setPage === 'function') window.setPage('complaints');
    if(selectedRow && selectedRow.id) COMPLAINT_SELECTED_ID = Number(selectedRow.id || 0);
    requestComplaintsList();
  }

  function pushComplaintIntoCitizenHistory(complaint){
    const sid = String((complaint && complaint.citizen_sid64) || '');
    if(!sid || !Array.isArray(window.CITIZENS)) return;
    const asHistory = {
      id: complaint.plainte_number || ('#' + complaint.id),
      row_id: Number(complaint.id || 0),
      type: complaint.motif || 'Plainte',
      date: formatComplaintDate(complaint.plainte_datetime || complaint.created_at || ''),
      description: stripHtml(complaint.declaration_html || '').slice(0, 140),
      status: String(complaint.status || '').toLowerCase().indexOf('suite') !== -1 ? 'closed' : 'active'
    };
    const citizen = window.CITIZENS.find(function(row){ return String(row.steamid64 || '') === sid; });
    if(citizen){
      citizen.complaints = Array.isArray(citizen.complaints) ? citizen.complaints : [];
      citizen.complaints.unshift(asHistory);
    }
    var asDeposition = {
      id: 'DEP-' + (complaint.plainte_number || complaint.id || ''),
      complaint_id: Number(complaint.id || 0),
      date: formatComplaintDate(complaint.plainte_datetime || complaint.created_at || ''),
      description: stripHtml(complaint.declaration_html || '').slice(0, 220),
      source: complaint.plainte_number || ('#' + complaint.id)
    };
    if(citizen){
      citizen.depositions = Array.isArray(citizen.depositions) ? citizen.depositions : [];
      if(asDeposition.description) citizen.depositions.unshift(asDeposition);
    }
    if(window.selectedCitizen && String(window.selectedCitizen.steamid64 || '') === sid){
      window.selectedCitizen.complaints = Array.isArray(window.selectedCitizen.complaints) ? window.selectedCitizen.complaints : [];
      window.selectedCitizen.complaints.unshift(asHistory);
      window.selectedCitizen.depositions = Array.isArray(window.selectedCitizen.depositions) ? window.selectedCitizen.depositions : [];
      if(asDeposition.description) window.selectedCitizen.depositions.unshift(asDeposition);
      if(typeof window.renderTabs === 'function') window.renderTabs(window.selectedCitizen);
    }
  }

  function bindComplaintInputs(){
    const citizenInput = document.getElementById('complaint-citizen-search');

    if(citizenInput && !citizenInput.__mdtBound){
      citizenInput.__mdtBound = true;
      citizenInput.addEventListener('input', refreshCitizenSuggest);
      citizenInput.addEventListener('focus', refreshCitizenSuggest);
    }

  }

  function resetComplaintForm(){
    COMPLAINT_SELECTED_CITIZEN = null;
    setComplaintCitizenLock(false);

    const ids = [
      'complaint-reason',
      'complaint-citizen-search',
    ];

    ids.forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.value = '';
    });

    const status = document.getElementById('complaint-status');
    if(status) status.value = 'En cours';

    renderPicked('complaint-citizen-picked', null, 'clearComplaintCitizen', false);

    const q = ensureComplaintQuill();
    if(q) q.root.innerHTML = '';

    const dt = document.getElementById('complaint-datetime');
    if(dt) dt.value = '';
    setDefaultComplaintDatetime();
  }

  function requestComplaintFormData(){
    req('get_complaints_form_data', {}, 'req_complaint_form_');
  }

  function requestComplaintsList(){
    req('get_complaints_list', {}, 'req_complaint_list_');
  }

  function setComplaintSubmitBusy(isBusy){
    COMPLAINT_SUBMIT_BUSY = !!isBusy;
    var btn = document.getElementById('complaint-submit-btn');
    if(btn){
      btn.disabled = !!isBusy;
      btn.classList.toggle('is-loading', !!isBusy);
    }
  }

  function makeComplaintSubmitSignature(payload){
    try{
      return JSON.stringify({
        dt: String(payload && payload.plainte_datetime || ''),
        motif: String(payload && payload.motif || ''),
        citizen_sid64: String(payload && payload.citizen_sid64 || ''),
        citizen_name: String(payload && payload.citizen_name || ''),
        citizen_phone: String(payload && payload.citizen_phone || ''),
        status: String(payload && payload.status || ''),
        declaration_html: String(payload && payload.declaration_html || '')
      });
    }catch(e){
      return '';
    }
  }

  window.openComplaintRecord = function(id){
    var numId = Number(id || 0);
    if(!numId){ return false; }
    if(typeof window.setPage === 'function') window.setPage('complaints');
    COMPLAINT_SELECTED_ID = numId;
    requestComplaintsList();
    return false;
  };

  window.openPlainteModal = function(editId, options){
    var modal = document.getElementById('complaint-modal');
    if(!modal){
      console.error('[MDT Plaintes] #complaint-modal introuvable dans le DOM');
      return;
    }

    var opts = options && typeof options === 'object' ? options : {};
    var complaint = editId ? getComplaintById(editId) : null;

    modal.style.display    = 'flex';
    modal.style.position   = 'fixed';
    modal.style.top        = '0';
    modal.style.left       = '0';
    modal.style.right      = '0';
    modal.style.bottom     = '0';
    modal.style.zIndex     = '99999';
    modal.style.background = 'rgba(0,0,0,.72)';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding    = '20px';
    modal.style.visibility = 'visible';
    modal.style.opacity    = '1';
    modal.style.pointerEvents = 'auto';
    modal.classList.add('is-open');

    COMPLAINT_EDIT_ID = complaint ? Number(complaint.id || 0) : null;
    var titleEl   = document.getElementById('complaint-modal-title');
    var submitBtn = document.getElementById('complaint-submit-btn');
    if(titleEl)   titleEl.textContent   = complaint ? 'Modifier la plainte' : 'Encoder une plainte';
    if(submitBtn) submitBtn.textContent = complaint ? 'Enregistrer les modifications' : 'Enregistrer la plainte';

    try { ensureComplaintQuill(); } catch(e){ console.warn('[MDT] Quill:', e); }
    bindComplaintInputs();
    bindComplaintActionButtons();

    if(!COMPLAINT_ACTIVE_CIVILIANS.length && !COMPLAINT_ACTIVE_OFFICERS.length){
      requestComplaintFormData();
    }

    resetComplaintForm();
    if(complaint){
      fillComplaintFormFromRow(complaint);
    }else if(opts.citizen){
      applyComplaintCitizenPreset(opts.citizen, opts.lockCitizen !== false);
    }

    setTimeout(function(){
      var input = document.getElementById('complaint-reason');
      if(input) input.focus();
    }, 50);
  };

  window.closePlainteModal = function(){
    var modal = document.getElementById('complaint-modal');
    if(!modal) return;

    modal.classList.remove('is-open');
    modal.style.display = 'none';
    modal.style.visibility = '';
    modal.style.opacity = '';
    COMPLAINT_EDIT_ID = null;

    var titleEl = document.getElementById('complaint-modal-title');
    var submitBtn = document.getElementById('complaint-submit-btn');
    if(titleEl) titleEl.textContent = 'Encoder une plainte';
    if(submitBtn) submitBtn.textContent = 'Enregistrer la plainte';
    setComplaintSubmitBusy(false);
  };

  window.openComplaintModal = window.openPlainteModal;
  window.openComplaintRecord = window.openComplaintRecord;
  window.closeComplaintModal = window.closePlainteModal;

  window.openComplaintFromCitizen = function(citizen){
    const target = citizen || window.selectedCitizen || null;
    if(!target){
      showToast('⚠️ Aucun citoyen sélectionné', null, true);
      return false;
    }
    window.__mdtComplaintOrigin = 'citizens';
    window.__mdtComplaintOpenRegistryOnSuccess = true;
    window.openPlainteModal(null, { citizen: target, lockCitizen: true, fromCitizens: true });
    return false;
  };

  function fillComplaintFormFromRow(row){
    if(!row) return;

    const dt = document.getElementById('complaint-datetime');
    const reason = document.getElementById('complaint-reason');
    const status = document.getElementById('complaint-status');
    const citizenInput = document.getElementById('complaint-citizen-search');

    if(dt) dt.value = String(row.plainte_datetime || '').replace(' ', 'T').slice(0, 16);
    if(reason) reason.value = String(row.motif || '');
    if(status) status.value = String(row.status || 'En cours');

    const foundCitizen = findBySid(COMPLAINT_ACTIVE_CIVILIANS, row.citizen_sid64)
      || {
        steamid64: String(row.citizen_sid64 || ''),
        firstname: '',
        lastname: '',
        name: String(row.citizen_name || ''),
        phone: String(row.citizen_phone || '—')
      };

    COMPLAINT_SELECTED_CITIZEN = foundCitizen;
    renderPicked('complaint-citizen-picked', COMPLAINT_SELECTED_CITIZEN, 'clearComplaintCitizen', false);
    if(citizenInput) citizenInput.value = shortPerson(foundCitizen) || String(row.citizen_name || '');

    const q = ensureComplaintQuill();
    if(q) q.root.innerHTML = String(row.declaration_html || '');
  }

  window.submitComplaint = function(){
    const q = ensureComplaintQuill();

    const payload = {
      plainte_datetime: String(document.getElementById('complaint-datetime')?.value || '').trim(),
      motif: String(document.getElementById('complaint-reason')?.value || '').trim(),
      citizen_sid64: COMPLAINT_SELECTED_CITIZEN ? String(COMPLAINT_SELECTED_CITIZEN.steamid64 || '') : '',
      citizen_name: COMPLAINT_SELECTED_CITIZEN ? String(COMPLAINT_SELECTED_CITIZEN.name || ((COMPLAINT_SELECTED_CITIZEN.firstname || '') + ' ' + (COMPLAINT_SELECTED_CITIZEN.lastname || '')).trim()) : '',
      citizen_phone: COMPLAINT_SELECTED_CITIZEN ? String(COMPLAINT_SELECTED_CITIZEN.phone || '—') : '—',
      status: String(document.getElementById('complaint-status')?.value || 'En cours').trim(),
      declaration_html: q ? String(q.root.innerHTML || '').trim() : ''
    };

    if(!payload.motif){
      showToast('⚠️ Motif obligatoire', null, true); return;
    }
    if(!payload.citizen_sid64){
      showToast('⚠️ Sélectionnez un citoyen plaignant dans la liste', null, true); return;
    }
    if(!payload.declaration_html || payload.declaration_html === '<p><br></p>'){
      showToast('⚠️ Déclaration obligatoire', null, true); return;
    }

    var now = Date.now();
    var sig = makeComplaintSubmitSignature(payload);
    if(COMPLAINT_SUBMIT_BUSY){
      showToast('⚠️ Envoi déjà en cours', 'Patientez une seconde.', true);
      return;
    }
    if(sig && COMPLAINT_LAST_SUBMIT_SIG === sig && (now - COMPLAINT_LAST_SUBMIT_AT) < 2500){
      showToast('⚠️ Double clic bloqué', 'La plainte est déjà en cours d’envoi.', true);
      return;
    }

    COMPLAINT_LAST_SUBMIT_SIG = sig;
    COMPLAINT_LAST_SUBMIT_AT = now;
    setComplaintSubmitBusy(true);

    if(COMPLAINT_EDIT_ID){
      payload.id = Number(COMPLAINT_EDIT_ID || 0);
      req('update_complaint', payload, 'req_complaint_update_');
    }else{
      req('create_complaint', payload, 'req_complaint_create_');
    }
  };

  window.viewComplaint = function(id){
    COMPLAINT_SELECTED_ID = Number(id || 0);
    closeComplaintMenus();
    renderComplaintsTable();
    renderComplaintsViewer(getComplaintById(COMPLAINT_SELECTED_ID));
  };

  window.togglePlainteDropdown = function(ev, id){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }

    // Fermer tous les autres dropdowns ouverts
    document.querySelectorAll('.plaints-dropdown').forEach(function(d){
      if(d.id !== 'plaints-dd-' + id) d.style.display = 'none';
    });

    // Basculer celui-ci
    var dd = document.getElementById('plaints-dd-' + id);
    if(!dd) return;
    dd.style.display = (dd.style.display === 'block') ? 'none' : 'block';
  };

  window.editComplaint = function(id){
    closeComplaintMenus();
    window.openPlainteModal(Number(id || 0));
  };

  window.editComplaintPlaceholder = window.editComplaint;

  window.deleteComplaint = function(id){
    closeComplaintMenus();

    var numId = Number(id || 0);
    if(!numId) return;

    console.log('[MDT] deleteComplaint request', { id: numId });
    req('delete_complaint', { id: numId }, 'req_complaint_delete_');
  };

  window.filterComplaintsTable = function(){
    renderComplaintsTable();
  };


  function bindComplaintActionButtons(){
    const openBtn = document.getElementById('complaints-open-create-btn');
    const closeBtn = document.getElementById('complaint-close-modal-btn');
    const submitBtn = document.getElementById('complaint-submit-btn');

    if(openBtn && !openBtn.__mdtBound){
      openBtn.__mdtBound = true;
      openBtn.addEventListener('click', function(ev){
        ev.preventDefault();
        window.openPlainteModal();
      });
    }

    if(closeBtn && !closeBtn.__mdtBound){
      closeBtn.__mdtBound = true;
      closeBtn.addEventListener('click', function(ev){
        ev.preventDefault();
        window.closePlainteModal();
      });
    }

    if(submitBtn && !submitBtn.__mdtBound){
      submitBtn.__mdtBound = true;
      submitBtn.addEventListener('click', function(ev){
        ev.preventDefault();
        window.submitComplaint();
      });
    }
  }

  function bindComplaintDelegatedActions(){
    if(document.__mdtComplaintDelegatedBound) return;
    document.__mdtComplaintDelegatedBound = true;

    document.addEventListener('click', function(ev){
      // Si le clic est dans .plaints-dropdown ou sur .plaints-more → les onclick inline gèrent
      if(ev.target && ev.target.closest && ev.target.closest('.plaints-dropdown')) return;
      if(ev.target && ev.target.closest && ev.target.closest('.plaints-more'))     return;

      // Sinon on gère le clic sur la ligne (flèche / ligne entière) → viewComplaint
      var actEl = ev.target && ev.target.closest
        ? ev.target.closest('[data-complaint-action]') : null;
      if(!actEl) return;

      var action = String(actEl.getAttribute('data-complaint-action') || '');
      var id     = Number(actEl.getAttribute('data-complaint-id') || 0);

      if(action === 'view' && id){
        ev.preventDefault();
        window.viewComplaint(id);
      }
    }, false);
  }

  document.addEventListener('click', function(ev){
    const citizenWrap = document.getElementById('complaint-citizen-wrap');
    const citizenBox = document.getElementById('complaint-citizen-suggest');
    if(citizenBox && citizenWrap && !citizenWrap.contains(ev.target)){
      citizenBox.style.display = 'none';
    }

    // Fermer les dropdowns si clic hors .plaints-actions
    if(!ev.target || !ev.target.closest || !ev.target.closest('.plaints-actions')){
      closeComplaintMenus();
    }
  }, false);

  if(typeof window.__mdt_addPageHook === 'function'){
    window.__mdt_addPageHook(function(name){
      if(name === 'complaints'){
        requestComplaintsList();
        requestComplaintFormData();
      }
    });
  }

  if(typeof window.__mdt_addResponseHook === 'function'){
    window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
      if(reqId && reqId.indexOf('req_complaint_form_') === 0){
        if(ok){
          COMPLAINT_ACTIVE_CIVILIANS = Array.isArray(data.civilians) ? data.civilians : [];
          COMPLAINT_ACTIVE_OFFICERS = Array.isArray(data.officers) ? data.officers : [];
          bindComplaintInputs();
        }else{
          showToast('⚠️ Impossible de charger les listes actives', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_complaint_list_') === 0){
        if(ok){
          COMPLAINTS = Array.isArray(data.complaints) ? data.complaints : [];

          if(COMPLAINT_SELECTED_ID && !getComplaintById(COMPLAINT_SELECTED_ID)){
            COMPLAINT_SELECTED_ID = null;
          }

          if(!COMPLAINT_SELECTED_ID && COMPLAINTS[0]){
            COMPLAINT_SELECTED_ID = Number(COMPLAINTS[0].id || 0);
          }

          renderComplaintsTable();

          if(COMPLAINT_SELECTED_ID){
            renderComplaintsViewer(getComplaintById(COMPLAINT_SELECTED_ID));
          }else{
            renderComplaintsViewer(null);
          }
        }else{
          showToast('⚠️ Impossible de charger les plaintes', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_complaint_create_') === 0){
        setComplaintSubmitBusy(false);
        if(ok && data.complaint){
          COMPLAINTS.unshift(data.complaint);
          COMPLAINT_SELECTED_ID = Number(data.complaint.id || 0);
          pushComplaintIntoCitizenHistory(data.complaint);
          renderComplaintsTable();
          renderComplaintsViewer(data.complaint);
          window.closePlainteModal();
          showToast('✓ Plainte créée', { plainte: data.complaint.plainte_number || ('#' + data.complaint.id) }, false);
          if(window.__mdtComplaintOpenRegistryOnSuccess){
            window.__mdtComplaintOpenRegistryOnSuccess = false;
            navigateToComplaintsRegistry(data.complaint);
          }
        }else{
          showToast('⚠️ Création impossible', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_complaint_update_') === 0){
        setComplaintSubmitBusy(false);
        if(ok && data.complaint){
          const updatedId = Number(data.complaint.id || 0);
          COMPLAINTS = COMPLAINTS.map(function(row){
            return Number(row.id || 0) === updatedId ? data.complaint : row;
          });
          COMPLAINT_SELECTED_ID = updatedId;
          renderComplaintsTable();
          renderComplaintsViewer(data.complaint);
          window.closePlainteModal();
          showToast('✓ Plainte modifiée', { plainte: data.complaint.plainte_number || ('#' + data.complaint.id) }, false);
        }else{
          showToast('⚠️ Modification impossible', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_complaint_delete_') === 0){
        if(ok){
          const deletedId = Number((data && data.id) || 0);
          COMPLAINTS = COMPLAINTS.filter(function(row){
            return Number(row.id || 0) !== deletedId;
          });

          if(Number(COMPLAINT_SELECTED_ID || 0) === deletedId){
            COMPLAINT_SELECTED_ID = COMPLAINTS[0] ? Number(COMPLAINTS[0].id || 0) : null;
          }

          renderComplaintsTable();

          if(COMPLAINT_SELECTED_ID){
            renderComplaintsViewer(getComplaintById(COMPLAINT_SELECTED_ID));
          }else{
            renderComplaintsViewer(null);
          }

          showToast('✓ Dossier supprimé', null, false);
        }else{
          showToast('⚠️ Suppression impossible', err || data.message || null, true);
        }
        return true;
      }

      return false;
    });
  }

  bindComplaintInputs();
  bindComplaintActionButtons();
  bindComplaintDelegatedActions();
  setDefaultComplaintDatetime();
})();
});
