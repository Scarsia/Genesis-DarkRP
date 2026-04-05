window.__mdtModule('weapons', function(){
(function(){
  if(window.__mdt_weapons_loaded) return;
  window.__mdt_weapons_loaded = true;

  let ARMES = [];
  let ARMES_CITIZENS = [];
  let ARMES_REPORTS = [];
  let ARMES_SELECTED_DETAIL_ID = null;
  let ARMES_OPEN_MENU_ID = null;
  let ARMES_SELECTED_CITIZEN = null;
  let ARMES_EDIT_ID = null;
  let ARMES_SUBMIT_LOCK = false;
  let ARMES_FORM_LOADING = false;
  let ARMES_FORM_LOADED_ONCE = false;

  const ORIGIN_OPTIONS = [
    'Arme saisie',
    'Arme police',
    'Arme civile',
    'Preuve / scellés',
    'Arme abandonnée'
  ];

  const STATUS_OPTIONS = [
    'En règle',
    'Saisie',
    'Sous scellés',
    'Volée',
    'Détruite'
  ];

  const WEAPON_MODELS = [
    {
      label: 'Létal (Pistolet)',
      options: ['Glock 17', 'Glock 20', 'USP-S', 'Five-Seven', 'P228', 'Desert Eagle']
    },
    {
      label: 'Létal (Pistolet-mitrailleur)',
      options: ['MP5', 'UMP-45', 'MP7', 'MAC-10']
    },
    {
      label: 'Létal (Fusil d\'assaut)',
      options: ['M4A1', 'Colt M4', 'AK-47', 'FAMAS', 'SCAR-L']
    },
    {
      label: 'Létal (Fusil à pompe)',
      options: ['Remington 870', 'Benelli M4', 'Mossberg 590']
    },
    {
      label: 'Létal (Fusil de précision)',
      options: ['AWP', 'M24', 'Barrett M82']
    },
    {
      label: 'Non létal',
      options: ['Taser X26', 'Bean Bag Shotgun']
    }
  ];

  function req(action, data, prefix){
    const reqId = String(prefix || 'req_armes_') + Date.now();

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

    console.log('MDT>>' + JSON.stringify({ action: action, reqId: reqId, data: data || {} }));
    return reqId;
  }

  function parseDateValue(value){
    if(!value) return null;
    let raw = String(value).trim();
    if(!raw) return null;

    const french = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
    if(french){
      return new Date(
        Number(french[3]),
        Number(french[2]) - 1,
        Number(french[1]),
        Number(french[4] || 0),
        Number(french[5] || 0),
        0,
        0
      );
    }

    raw = raw.replace(' ', 'T');
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDateCell(value){
    const d = parseDateValue(value);
    if(!d) return String(value || '—');

    const months = [
      'janvier','février','mars','avril','mai','juin',
      'juillet','août','septembre','octobre','novembre','décembre'
    ];

    return 'Le ' + d.getDate() + ' ' + (months[d.getMonth()] || '') + ' ' + d.getFullYear();
  }

  function formatDateForInput(date){
    const d = date instanceof Date ? date : new Date();
    const p = function(v){ return String(v).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function serializeDateForPayload(value){
    const d = parseDateValue(value);
    if(!d) return String(value || '').trim();
    const p = function(v){ return String(v).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function weaponStatusClass(status){
    const s = String(status || '').toLowerCase();
    if(s === 'en règle' || s === 'en regle') return 'is-ok';
    if(s === 'volée' || s === 'volee' || s === 'détruite' || s === 'detruite') return 'is-alert';
    return 'is-held';
  }

  function weaponStatusIcon(status){
    const cls = weaponStatusClass(status);
    const icon = cls === 'is-ok' ? '✓' : (cls === 'is-alert' ? '!' : '•');
    return '<span class="armes-status-icon ' + cls + '" title="' + escAttr(status || '—') + '">' + icon + '</span>';
  }

  function citizenLabel(person){
    if(!person) return '—';
    const name = String(person.name || [person.firstname || '', person.lastname || ''].join(' ').trim() || 'Inconnu');
    const phone = String(person.phone || '').trim();
    return phone && phone !== '—' ? (name + ' (' + phone + ')') : name;
  }

  function shortCitizen(person){
    if(!person) return 'Inconnu';
    return String(person.name || [person.firstname || '', person.lastname || ''].join(' ').trim() || 'Inconnu');
  }

  function getArmeById(id){
    return ARMES.find(function(row){ return Number(row.id || 0) === Number(id || 0); }) || null;
  }

  function setDefaultArmeDate(){
    const el = document.getElementById('arme-registered-at');
    if(!el || String(el.value || '').trim()) return;
    el.value = formatDateForInput(new Date());
  }

  function populateStaticSelects(){
    const originFilter = document.getElementById('armes-origin-filter');
    const statusFilter = document.getElementById('armes-status-filter');
    const originSelect = document.getElementById('arme-origin');
    const statusSelect = document.getElementById('arme-status');
    const modelSelect = document.getElementById('arme-model');

    if(originFilter && !originFilter.__armesPopulated){
      originFilter.__armesPopulated = true;
      originFilter.innerHTML = '<option value="all">Toutes les origines</option>'
        + ORIGIN_OPTIONS.map(function(item){
          return '<option value="' + escAttr(item) + '">' + esc(item) + '</option>';
        }).join('');
    }

    if(statusFilter && !statusFilter.__armesPopulated){
      statusFilter.__armesPopulated = true;
      statusFilter.innerHTML = '<option value="all">Tous les états</option>'
        + STATUS_OPTIONS.map(function(item){
          return '<option value="' + escAttr(item) + '">' + esc(item) + '</option>';
        }).join('');
    }

    if(originSelect && !originSelect.__armesPopulated){
      originSelect.__armesPopulated = true;
      originSelect.innerHTML = ORIGIN_OPTIONS.map(function(item){
        return '<option value="' + escAttr(item) + '">' + esc(item) + '</option>';
      }).join('');
    }

    if(statusSelect && !statusSelect.__armesPopulated){
      statusSelect.__armesPopulated = true;
      statusSelect.innerHTML = STATUS_OPTIONS.map(function(item){
        return '<option value="' + escAttr(item) + '">' + esc(item) + '</option>';
      }).join('');
    }

    if(modelSelect && !modelSelect.__armesPopulated){
      modelSelect.__armesPopulated = true;
      modelSelect.innerHTML = '<option value="">Sélectionnez ou entrez un modèle</option>' + WEAPON_MODELS.map(function(group){
        return '<optgroup label="' + escAttr(group.label) + '">' + group.options.map(function(option){
          return '<option value="' + escAttr(option) + '">' + esc(option) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
    }
  }

  function populateReportsSelect(){
    const select = document.getElementById('arme-report-id');
    if(!select) return;

    const current = String(select.value || '');
    let html = '<option value="">— Aucun rapport lié —</option>';

    html += ARMES_REPORTS.map(function(report){
      const label = report.report_number + ' · ' + (report.incident_type || 'Rapport d\'opération') + (report.operation_datetime ? (' · ' + report.operation_datetime) : '');
      return '<option value="' + escAttr(String(report.id || '')) + '">' + esc(label) + '</option>';
    }).join('');

    select.innerHTML = html;
    if(current) select.value = current;
  }

  function setArmeFormLoading(isLoading){
    ARMES_FORM_LOADING = !!isLoading;

    const openBtn = document.getElementById('armes-open-modal-btn');
    const report = document.getElementById('arme-report-id');
    const citizen = document.getElementById('arme-citizen-search');

    if(openBtn) openBtn.disabled = !!isLoading;

    if(report){
      report.disabled = !!isLoading;
      if(isLoading && !ARMES_REPORTS.length){
        report.innerHTML = '<option value="">Chargement des rapports…</option>';
      }else if(!isLoading){
        populateReportsSelect();
      }
    }

    if(citizen){
      citizen.dataset.loading = isLoading ? '1' : '0';
      citizen.placeholder = isLoading ? 'Chargement des citoyens…' : 'Rechercher un citoyen...';
    }
  }

  function renderCitizenPicked(){
    const host = document.getElementById('arme-citizen-picked');
    if(!host) return;

    if(!ARMES_SELECTED_CITIZEN){
      host.innerHTML = '';
      return;
    }

    host.innerHTML = '<span class="armes-picked-pill">'
      + esc(citizenLabel(ARMES_SELECTED_CITIZEN))
      + '<button type="button" onclick="window.clearArmeCitizen()">✕</button>'
      + '</span>';
  }

  function filterCitizens(query){
    const q = String(query || '').trim().toLowerCase();
    if(q.length < 2) return [];

    return ARMES_CITIZENS.filter(function(person){
      const hay = (shortCitizen(person) + ' ' + (person.phone || '') + ' ' + (person.steamid64 || '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    }).slice(0, 10);
  }

  function renderCitizenSuggest(list){
    const box = document.getElementById('arme-citizen-suggest');
    if(!box) return;

    if(!list.length){
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }

    box.innerHTML = list.map(function(person){
      return '<div class="armes-citizen-item" onclick="window.pickArmeCitizen(\'' + escAttr(String(person.steamid64 || '')) + '\')">'
        + esc(shortCitizen(person))
        + '<span class="armes-citizen-meta">' + esc((person.phone || '—') + ' · ' + (person.current_job || 'Civil')) + '</span>'
        + '</div>';
    }).join('');
    box.style.display = 'block';
  }

  function refreshCitizenSuggest(){
    const input = document.getElementById('arme-citizen-search');
    renderCitizenSuggest(filterCitizens(input ? input.value : ''));
  }

  function bindCitizenInput(){
    const input = document.getElementById('arme-citizen-search');
    if(!input || input.__armesBound) return;
    input.__armesBound = true;

    input.addEventListener('input', function(){
      if(ARMES_FORM_LOADING) return;
      ARMES_SELECTED_CITIZEN = null;
      renderCitizenPicked();
      refreshCitizenSuggest();
    });

    input.addEventListener('focus', function(){
      if(ARMES_FORM_LOADING) return;
      refreshCitizenSuggest();
    });
  }

  function getFilteredArmes(){
    const origin = String(document.getElementById('armes-origin-filter')?.value || 'all');
    const status = String(document.getElementById('armes-status-filter')?.value || 'all');
    const q = String(document.getElementById('armes-search')?.value || '').trim().toLowerCase();

    return ARMES.filter(function(row){
      if(origin !== 'all' && String(row.origin || '') !== origin) return false;
      if(status !== 'all' && String(row.status || '') !== status) return false;
      if(!q) return true;

      const hay = [
        row.serial_number,
        row.weapon_model,
        row.citizen_name,
        row.origin,
        row.status,
        row.report_label,
        row.created_by_name
      ].join(' ').toLowerCase();

      return hay.indexOf(q) !== -1;
    });
  }

  function buildDetailHtml(row){
    return '<div class="armes-detail-box">'
      + '<div class="armes-detail-grid">'
      + detailItem('Citoyen concerné', row.citizen_name || 'Non renseigné')
      + detailItem('Rapport lié', row.report_label || 'Aucun rapport lié')
      + detailItem('Origine de l\'arme', row.origin || '—')
      + detailItem('Statut', row.status || '—')
      + detailItem('Numéro de série', row.serial_number || '—')
      + detailItem('Encodé par', row.created_by_name || '—')
      + '</div>'
      + '</div>';
  }

  function detailItem(label, value){
    return '<div class="armes-detail-item">'
      + '<div class="armes-detail-label">' + esc(label) + '</div>'
      + '<div class="armes-detail-value">' + esc(value || '—') + '</div>'
      + '</div>';
  }

  function renderArmesTable(){
    const body = document.getElementById('armes-table-body');
    if(!body) return;

    const rows = getFilteredArmes();
    if(ARMES_SELECTED_DETAIL_ID && !rows.some(function(row){ return Number(row.id || 0) === Number(ARMES_SELECTED_DETAIL_ID || 0); })){
      ARMES_SELECTED_DETAIL_ID = null;
    }

    if(!rows.length){
      body.innerHTML = '<tr><td colspan="6" class="armes-empty">Aucune arme enregistrée.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function(row){
      const id = Number(row.id || 0);
      const open = id === Number(ARMES_SELECTED_DETAIL_ID || 0);
      const menuOpen = id === Number(ARMES_OPEN_MENU_ID || 0);

      return '<tr class="arme-row' + (open ? ' is-open' : '') + '">'
        + '<td>'
        +   '<button class="armes-row-toggle" type="button" onclick="window.toggleArmeDetail(' + id + ')"><span class="armes-chevron">›</span></button>'
        + '</td>'
        + '<td class="armes-date-cell">' + esc(formatDateCell(row.registered_at || row.created_at || '')) + '</td>'
        + '<td class="armes-serial-cell">' + esc(row.serial_number || '—') + '</td>'
        + '<td class="armes-model-cell">' + esc(row.weapon_model || '—') + '</td>'
        + '<td class="armes-col-status">' + weaponStatusIcon(row.status || '—') + '</td>'
        + '<td class="armes-col-actions">'
        +   '<div class="armes-actions">'
        +     '<button class="plaints-more weapons-more" type="button" onclick="window.toggleArmeDropdown(event,' + id + ')">⋯</button>'
        +     '<div class="armes-dropdown" id="armes-dd-' + id + '" style="display:' + (menuOpen ? 'block' : 'none') + ';">'
        +       '<button class="armes-dd-item" type="button" onclick="window.viewArme(' + id + ')"><span>👁️</span><span>Afficher</span></button>'
        +       '<button class="armes-dd-item" type="button" onclick="window.editArme(' + id + ')"><span>✏️</span><span>Modifier</span></button>'
        +       '<button class="armes-dd-item danger" type="button" onclick="window.deleteArme(' + id + ')"><span>🗑️</span><span>Supprimer</span></button>'
        +     '</div>'
        +   '</div>'
        + '</td>'
      + '</tr>'
      + (open ? '<tr class="armes-detail-row"><td colspan="6">' + buildDetailHtml(row) + '</td></tr>' : '');
    }).join('');
  }

  function closeArmesMenus(){
    ARMES_OPEN_MENU_ID = null;
    document.querySelectorAll('.armes-dropdown').forEach(function(node){
      node.style.display = 'none';
    });
  }

  function resetArmeForm(preserveLoading){
    ARMES_EDIT_ID = null;
    ARMES_SUBMIT_LOCK = false;
    ARMES_SELECTED_CITIZEN = null;
    preserveLoading = !!preserveLoading;

    const citizenInput = document.getElementById('arme-citizen-search');
    const origin = document.getElementById('arme-origin');
    const model = document.getElementById('arme-model');
    const serial = document.getElementById('arme-serial');
    const registeredAt = document.getElementById('arme-registered-at');
    const status = document.getElementById('arme-status');
    const report = document.getElementById('arme-report-id');
    const submit = document.getElementById('arme-submit-btn');
    const title = document.getElementById('armes-modal-title');

    if(citizenInput) citizenInput.value = '';
    if(origin) origin.value = ORIGIN_OPTIONS[0] || '';
    if(model) model.value = '';
    if(serial) serial.value = '';
    if(registeredAt) registeredAt.value = '';
    if(status) status.value = 'En règle';
    if(report) report.value = '';
    if(submit){ submit.disabled = false; submit.textContent = 'Encoder l\'arme'; }
    if(title) title.textContent = "Encodage d'une arme";

    if(!preserveLoading){
      setArmeFormLoading(false);
    }else if(ARMES_FORM_LOADING){
      setArmeFormLoading(true);
    }else{
      populateReportsSelect();
    }
    renderCitizenPicked();
    renderCitizenSuggest([]);
    setDefaultArmeDate();
  }

  function ensureCitizenFromArme(row){
    if(!row || !row.citizen_sid64) return null;
    const existing = ARMES_CITIZENS.find(function(person){
      return String(person.steamid64 || '') === String(row.citizen_sid64 || '');
    });
    if(existing) return existing;
    return {
      steamid64: String(row.citizen_sid64 || ''),
      firstname: '',
      lastname: '',
      name: String(row.citizen_name || ''),
      phone: '—',
      current_job: 'Civil'
    };
  }

  function fillArmeForm(row){
    if(!row) return;

    ARMES_EDIT_ID = Number(row.id || 0);
    ARMES_SELECTED_CITIZEN = ensureCitizenFromArme(row);
    renderCitizenPicked();

    const citizenInput = document.getElementById('arme-citizen-search');
    const origin = document.getElementById('arme-origin');
    const model = document.getElementById('arme-model');
    const serial = document.getElementById('arme-serial');
    const registeredAt = document.getElementById('arme-registered-at');
    const status = document.getElementById('arme-status');
    const report = document.getElementById('arme-report-id');
    const submit = document.getElementById('arme-submit-btn');
    const title = document.getElementById('armes-modal-title');

    if(citizenInput) citizenInput.value = ARMES_SELECTED_CITIZEN ? shortCitizen(ARMES_SELECTED_CITIZEN) : '';
    if(origin) origin.value = row.origin || ORIGIN_OPTIONS[0] || '';
    if(model) model.value = row.weapon_model || '';
    if(serial) serial.value = row.serial_number || '';
    if(registeredAt) registeredAt.value = formatDateForInput(parseDateValue(row.registered_at || row.created_at || '') || new Date());
    if(status) status.value = row.status || 'En règle';
    if(report) report.value = String(row.report_id || '');
    if(submit){ submit.disabled = false; submit.textContent = 'Enregistrer les modifications'; }
    if(title) title.textContent = "Modification d'une arme";
  }

  function requestArmesFormData(force){
    if(ARMES_FORM_LOADING && !force) return;
    if(ARMES_FORM_LOADED_ONCE && !force && ARMES_CITIZENS.length && ARMES_REPORTS.length) return;

    setArmeFormLoading(true);
    req('get_armes_form_data', {}, 'req_armes_form_');
  }

  function requestArmesList(){
    req('get_armes', {}, 'req_armes_list_');
  }

  function bindWindowClicks(){
    if(window.__armesWindowBound) return;
    window.__armesWindowBound = true;

    window.addEventListener('click', function(ev){
      const citizenWrap = document.getElementById('arme-citizen-wrap');
      const citizenBox = document.getElementById('arme-citizen-suggest');
      if(citizenBox && citizenWrap && !citizenWrap.contains(ev.target)){
        citizenBox.style.display = 'none';
      }

      if(!ev.target || !ev.target.closest || !ev.target.closest('.armes-actions')){
        closeArmesMenus();
      }
    }, false);
  }

  window.filterArmesTable = function(){
    renderArmesTable();
  };

  window.toggleArmeDetail = function(id){
    const numId = Number(id || 0);
    ARMES_SELECTED_DETAIL_ID = (Number(ARMES_SELECTED_DETAIL_ID || 0) === numId) ? null : numId;
    closeArmesMenus();
    renderArmesTable();
  };

  window.viewArme = function(id){
    ARMES_SELECTED_DETAIL_ID = Number(id || 0);
    closeArmesMenus();
    renderArmesTable();
  };

  window.toggleArmeDropdown = function(ev, id){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }

    const numId = Number(id || 0);
    ARMES_OPEN_MENU_ID = (Number(ARMES_OPEN_MENU_ID || 0) === numId) ? null : numId;
    renderArmesTable();
  };

  window.pickArmeCitizen = function(sid){
    ARMES_SELECTED_CITIZEN = ARMES_CITIZENS.find(function(person){
      return String(person.steamid64 || '') === String(sid || '');
    }) || null;

    const input = document.getElementById('arme-citizen-search');
    const box = document.getElementById('arme-citizen-suggest');
    if(input && ARMES_SELECTED_CITIZEN) input.value = shortCitizen(ARMES_SELECTED_CITIZEN);
    if(box){ box.style.display = 'none'; box.innerHTML = ''; }
    renderCitizenPicked();
  };

  window.clearArmeCitizen = function(){
    ARMES_SELECTED_CITIZEN = null;
    const input = document.getElementById('arme-citizen-search');
    if(input) input.value = '';
    renderCitizenPicked();
  };

  window.generateArmeSerial = function(){
    function rndHex(len){
      const chars = '0123456789abcdef';
      let out = '';
      for(let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
      return out;
    }

    const serial = rndHex(8) + '-' + rndHex(4) + '-' + rndHex(4) + '-' + rndHex(4) + '-' + rndHex(12);
    const input = document.getElementById('arme-serial');
    if(input) input.value = serial;
    return serial;
  };

  window.openModalArmes = function(editId){
    populateStaticSelects();
    populateReportsSelect();
    bindCitizenInput();
    bindWindowClicks();

    const modal = document.getElementById('modal-armes');
    if(!modal) return;

    resetArmeForm(true);

    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0,0,0,.72)';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '20px';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
    modal.style.zIndex = '99999';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    if(!ARMES_FORM_LOADING && (!ARMES_CITIZENS.length || !ARMES_REPORTS.length)){
      requestArmesFormData(false);
    }

    if(editId){
      const row = getArmeById(editId);
      if(row) fillArmeForm(row);
    }

    setTimeout(function(){
      const input = document.getElementById('arme-citizen-search');
      if(input) input.focus();
    }, 30);
  };

  window.closeModalArmes = function(){
    const modal = document.getElementById('modal-armes');
    if(!modal) return;
    modal.style.display = 'none';
    modal.style.position = '';
    modal.style.top = '';
    modal.style.left = '';
    modal.style.right = '';
    modal.style.bottom = '';
    modal.style.background = '';
    modal.style.alignItems = '';
    modal.style.justifyContent = '';
    modal.style.padding = '';
    modal.style.opacity = '';
    modal.style.visibility = '';
    modal.style.pointerEvents = '';
    modal.style.zIndex = '';
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    resetArmeForm(true);
  };

  window.editArme = function(id){
    closeArmesMenus();
    window.openModalArmes(Number(id || 0));
  };

  window.submitArme = function(){
    if(ARMES_SUBMIT_LOCK) return;

    const submitBtn = document.getElementById('arme-submit-btn');
    const origin = String(document.getElementById('arme-origin')?.value || '').trim();
    const weaponModel = String(document.getElementById('arme-model')?.value || '').trim();
    const serialInput = document.getElementById('arme-serial');
    const dateInput = document.getElementById('arme-registered-at');
    let serialNumber = String(serialInput?.value || '').trim();
    let registeredAtRaw = String(dateInput?.value || '').trim();
    const status = String(document.getElementById('arme-status')?.value || '').trim();
    const reportId = String(document.getElementById('arme-report-id')?.value || '').trim();

    if(!origin){ showToast('⚠️ Origine requise', null, true); return; }
    if(!weaponModel){ showToast('⚠️ Modèle requis', { champ: 'weapon_model' }, true); return; }

    if(!serialNumber){
      serialNumber = window.generateArmeSerial();
      if(serialInput) serialInput.value = serialNumber;
    }

    if(!registeredAtRaw){
      setDefaultArmeDate();
      registeredAtRaw = String(dateInput?.value || '').trim();
    }

    const registeredAt = serializeDateForPayload(registeredAtRaw || '');

    if(!registeredAt){ showToast("⚠️ Date d'enregistrement requise", { champ: 'registered_at' }, true); return; }
    if(!status){ showToast('⚠️ Statut requis', { champ: 'status' }, true); return; }

    const payload = {
      citizen_sid64: ARMES_SELECTED_CITIZEN ? String(ARMES_SELECTED_CITIZEN.steamid64 || '') : '',
      origin: origin,
      weapon_model: weaponModel,
      serial_number: serialNumber,
      registered_at: registeredAt,
      status: status,
      report_id: reportId
    };

    ARMES_SUBMIT_LOCK = true;
    if(submitBtn){
      submitBtn.disabled = true;
      submitBtn.textContent = ARMES_EDIT_ID ? 'Enregistrement…' : 'Encodage…';
    }

    if(ARMES_EDIT_ID){
      payload.id = Number(ARMES_EDIT_ID || 0);
      req('update_arme', payload, 'req_armes_update_');
    }else{
      req('encoder_arme', payload, 'req_armes_create_');
    }
  };


  window.deleteArme = function(id){
    closeArmesMenus();

    const row = getArmeById(id);
    const label = row ? (row.serial_number || ('#' + id)) : ('#' + id);
    if(!confirm('Supprimer l\'arme ' + label + ' ?')) return;

    req('delete_arme', { id: Number(id || 0) }, 'req_armes_delete_');
  };

  if(typeof window.__mdt_addPageHook === 'function'){
    window.__mdt_addPageHook(function(name){
      if(name === 'weapons'){
        populateStaticSelects();
        requestArmesFormData();
        requestArmesList();
      }
    });
  }

  if(typeof window.__mdt_addResponseHook === 'function'){
    window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
      if(reqId && reqId.indexOf('req_armes_form_') === 0){
        ARMES_FORM_LOADING = false;
        setArmeFormLoading(false);

        if(ok){
          ARMES_FORM_LOADED_ONCE = true;
          ARMES_CITIZENS = Array.isArray(data.citizens) ? data.citizens : [];
          ARMES_REPORTS = Array.isArray(data.reports) ? data.reports : [];
          populateReportsSelect();
          bindCitizenInput();
        }else{
          showToast('⚠️ Impossible de charger les données armes', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_armes_list_') === 0){
        if(ok){
          ARMES = Array.isArray(data.armes) ? data.armes : [];
          renderArmesTable();
        }else{
          showToast('⚠️ Impossible de charger le registre des armes', err || data.message || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_armes_create_') === 0){
        ARMES_SUBMIT_LOCK = false;
        const submitBtn = document.getElementById('arme-submit-btn');
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = "Encoder l'arme"; }

        if(ok && data.arme){
          ARMES.unshift(data.arme);
          ARMES_SELECTED_DETAIL_ID = Number(data.arme.id || 0);
          renderArmesTable();
          window.closeModalArmes();
          showToast('✓ Arme encodée', { serie: data.arme.serial_number || 'ok' }, false);
        }else{
          showToast('⚠️ Encodage impossible', { erreur: err || data.message || 'Erreur inconnue' }, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_armes_update_') === 0){
        ARMES_SUBMIT_LOCK = false;
        const submitBtn = document.getElementById('arme-submit-btn');
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Enregistrer les modifications'; }

        if(ok && data.arme){
          const updatedId = Number(data.arme.id || 0);
          ARMES = ARMES.map(function(row){
            return Number(row.id || 0) === updatedId ? data.arme : row;
          });
          ARMES_SELECTED_DETAIL_ID = updatedId;
          renderArmesTable();
          window.closeModalArmes();
          showToast('✓ Arme modifiée', { serie: data.arme.serial_number || 'ok' }, false);
        }else{
          showToast('⚠️ Modification impossible', { erreur: err || data.message || 'Erreur inconnue' }, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_armes_delete_') === 0){
        if(ok){
          const deletedId = Number((data && data.id) || 0);
          ARMES = ARMES.filter(function(row){
            return Number(row.id || 0) !== deletedId;
          });
          if(Number(ARMES_SELECTED_DETAIL_ID || 0) === deletedId) ARMES_SELECTED_DETAIL_ID = null;
          renderArmesTable();
          showToast('✓ Arme supprimée', null, false);
        }else{
          showToast('⚠️ Suppression impossible', err || data.message || null, true);
        }
        return true;
      }

      return false;
    });
  }

  populateStaticSelects();
  populateReportsSelect();
  bindCitizenInput();
  bindWindowClicks();
  setDefaultArmeDate();
})();
});
