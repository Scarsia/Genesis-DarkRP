window.__mdtModule('arrestation', function(){
(function(){
  if(window.__mdt_arrestation_split_loaded) return;
  window.__mdt_arrestation_split_loaded = true;

  var PRECINCT_OPTIONS = [
    'San Andreas State Police | Vespucci',
    'Mission Row Police Department',
    'Vespucci Police Department',
    'Rockford Hills Police Department',
    'Sandy Shores Sheriff Office',
    'Paleto Bay Sheriff Office'
  ];
  var FINE_SCALE_OPTIONS = ['Minimal 1','Minimal 2','Minimal 3','Nominal','Major'];
  var MAX_PROOF_IMAGES = 6;
  var MAX_DATA_URL_LENGTH = 28000;
  var MAX_IMAGE_DIMENSION = 760;
  var MIN_IMAGE_DIMENSION = 360;
  var NYPD_BADGE_URL = window.__mdt_nypd_badge_url || 'assets/nypd_badge.png';

  var FORM_DATA = { reports: [], evidence_folders: [] };
  var FORM_LOADED = false;

  var reportEditor = null;
  var dossierEditor = null;

  var REPORT_STATE = {
    editingId: 0,
    editingRecord: null,
    pastedImages: [],
    pendingUploads: {},
    submitLock: false,
    submitTimeout: null,
    agents: []
  };

  var DOSSIER_STATE = {
    pastedImages: [],
    pendingUploads: {},
    submitLock: false,
    submitTimeout: null,
    agents: [],
    participants: [],
    charges: [],
    vehicles: [],
    weapons: []
  };

  function req(action, data, prefix){
    var reqId = String(prefix || 'req_arrestation_') + Date.now() + '_' + Math.floor(Math.random() * 1000);
    try{ if(typeof window.loReq === 'function'){ window.loReq(action, data || {}, reqId); return reqId; } }catch(e){}
    try{ if(window.mdtBridge && window.mdtBridge.request){ window.mdtBridge.request(action, JSON.stringify(data || {}), reqId); return reqId; } }catch(e){}
    console.log('MDT>>' + JSON.stringify({ action: action, reqId: reqId, data: data || {} }));
    return reqId;
  }

  function escSafe(v){
    if(typeof window.esc === 'function') return window.esc(v);
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function escAttrSafe(v){
    if(typeof window.escAttr === 'function') return window.escAttr(v);
    return escSafe(v).replace(/"/g,'&quot;').replace(/\'/g,'&#039;');
  }
  function byId(id){ return document.getElementById(id); }
  function toArray(v){ return Array.isArray(v) ? v : []; }
  function pad(v){ return String(v).padStart(2,'0'); }
  function setValue(id, value){ var el = byId(id); if(!el) return; if(el.type === 'checkbox') el.checked = !!value; else el.value = value == null ? '' : value; }
  function getValue(id){ var el = byId(id); return String((el && el.value) || '').trim(); }
  function getChecked(id){ var el = byId(id); return !!(el && el.checked); }
  function clearTimeoutSafe(timer){ try{ if(timer) clearTimeout(timer); }catch(e){} }

  function buildNowValue(){
    var now = new Date();
    return pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear() + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  function normalizeDateTimeValue(value){
    var raw = String(value || '').trim();
    if(!raw) return '';
    var m = raw.match(/^(\d\d)\/(\d\d)\/(\d{4})\s+(\d\d):(\d\d)$/);
    if(m) return m[3] + '-' + m[2] + '-' + m[1] + ' ' + m[4] + ':' + m[5];
    return raw.replace('T', ' ').slice(0, 16);
  }

  function formatHumanDate(value){
    var raw = normalizeDateTimeValue(value);
    if(!raw) return '—';
    var d = new Date(raw.replace(' ', 'T'));
    if(isNaN(d.getTime())) return String(value || raw);
    var months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return 'Le ' + d.getDate() + ' ' + (months[d.getMonth()] || '') + ' ' + d.getFullYear() + ' à ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function parseMaybeJsonArray(value){
    if(Array.isArray(value)) return value;
    if(typeof value === 'string'){
      try{
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      }catch(e){}
    }
    return [];
  }

  function buildCitizenName(citizen){
    return citizen ? ((((citizen.firstname || '') + ' ' + (citizen.lastname || '')).trim()) || citizen.name || '') : '';
  }

  function currentOfficerLabel(){
    var hdrAgent = byId('hdr-agent-info');
    return String((hdrAgent && hdrAgent.textContent) || window.current_user_name || window.current_user_label || '').trim() || 'Agent';
  }

  function currentOfficerMeta(){
    return {
      name: currentOfficerLabel(),
      role: 'Rédacteur',
      email: String(window.current_user_email || '').trim(),
      phone: String(window.current_user_phone || '').trim()
    };
  }

  function ensureFormData(){ if(FORM_LOADED) return; req('get_arrestation_form_data', {}, 'req_arrestation_form_'); }

  function populatePrecinctSelect(id, value){
    var select = byId(id);
    if(!select) return;
    select.innerHTML = PRECINCT_OPTIONS.map(function(label){ return '<option value="' + escAttrSafe(label) + '">' + escSafe(label) + '</option>'; }).join('');
    select.value = value || PRECINCT_OPTIONS[0] || '';
  }

  function populateFineScaleSelect(id, value){
    var select = byId(id);
    if(!select) return;
    select.innerHTML = FINE_SCALE_OPTIONS.map(function(label){ return '<option value="' + escAttrSafe(label) + '">' + escSafe(label) + '</option>'; }).join('');
    select.value = value || 'Nominal';
  }

  function allPeopleSuggestions(){
    var out = [];
    var seen = {};
    function push(person){
      var name = String(person && person.name || '').trim();
      if(!name) return;
      var key = name.toLowerCase();
      if(seen[key]) return;
      seen[key] = true;
      out.push({
        name: name,
        role: String(person.role || 'Participant').trim(),
        email: String(person.email || '').trim(),
        phone: String(person.phone || '').trim()
      });
    }
    push(currentOfficerMeta());
    toArray(window.CITIZENS).forEach(function(citizen){
      push({
        name: buildCitizenName(citizen),
        role: citizen.job || 'Participant',
        email: citizen.email || '',
        phone: citizen.phone || citizen.steamid64 || ''
      });
    });
    return out;
  }

  function policeSuggestions(){
    var seen = {};
    var out = [];
    function push(name){
      name = String(name || '').trim();
      if(!name) return;
      var key = name.toLowerCase();
      if(seen[key]) return;
      seen[key] = true;
      out.push(name);
    }
    push(currentOfficerLabel());
    toArray(window.OFFICERS).forEach(function(row){ push(row.name || row.officer_name || row.full_name || row.nom || row.label); });
    toArray(window.CITIZENS).forEach(function(row){
      var job = String(row.job || row.job_name || '').toLowerCase();
      if(job.indexOf('police') !== -1 || job.indexOf('sheriff') !== -1 || job.indexOf('state') !== -1) push(buildCitizenName(row));
    });
    return out;
  }

  function populateLawyerSelect(){
    var select = byId('rapport-arrestation-lawyer');
    if(!select) return;
    var options = ['<option value="">Ajoutez l\'avocat...</option>'];
    allPeopleSuggestions().forEach(function(person){
      options.push('<option value="' + escAttrSafe(person.name) + '">' + escSafe(person.name + (person.role ? ' · ' + person.role : '')) + '</option>');
    });
    select.innerHTML = options.join('');
  }

  function populateDatalists(){
    var reportAgents = byId('rapport-arrestation-agents-datalist');
    var dossierAgents = byId('dossier-arrestation-agents-datalist');
    var participantList = byId('dossier-arrestation-participant-datalist');
    var police = policeSuggestions();
    if(reportAgents) reportAgents.innerHTML = police.map(function(name){ return '<option value="' + escAttrSafe(name) + '"></option>'; }).join('');
    if(dossierAgents) dossierAgents.innerHTML = police.map(function(name){ return '<option value="' + escAttrSafe(name) + '"></option>'; }).join('');
    if(participantList){
      participantList.innerHTML = allPeopleSuggestions().map(function(person){
        var meta = [person.role || '', person.phone || ''].filter(Boolean).join(' · ');
        return '<option value="' + escAttrSafe(person.name) + '">' + escSafe(meta) + '</option>';
      }).join('');
    }
  }

  function populateChargeSelect(){
    var select = byId('dossier-arrestation-charge-select');
    if(!select) return;
    var options = ['<option value="">Sélectionnez les charges...</option>'];
    toArray(window.CHARGES).forEach(function(charge){
      if(!charge || !charge.id) return;
      options.push('<option value="' + escAttrSafe(charge.id) + '">' + escSafe(charge.label || charge.id) + '</option>');
    });
    select.innerHTML = options.join('');
  }

  function populateRemoteSelects(){
    var reports = toArray(FORM_DATA.reports);
    var folders = toArray(FORM_DATA.evidence_folders);

    var reportSelect = byId('dossier-arrestation-report-id');
    if(reportSelect){
      reportSelect.innerHTML = '<option value="">Rechercher un rapport d\'opération</option>' + reports.map(function(row){
        var label = [row.report_number || row.id, row.incident_type || 'Rapport d\'opération', row.operation_datetime || ''].filter(Boolean).join(' · ');
        return '<option value="' + escAttrSafe(row.id || '') + '">' + escSafe(label || ('Rapport #' + (row.id || ''))) + '</option>';
      }).join('');
    }

    ['rapport-arrestation-evidence-folder', 'dossier-arrestation-evidence-folder'].forEach(function(id){
      var select = byId(id);
      if(!select) return;
      select.innerHTML = '<option value="">Rechercher un dossier (min 2 caractères)...</option>' + folders.map(function(row){
        var ref = String(row.ref || row.folder_ref || '').trim();
        var label = String(row.label || ref || '').trim();
        if(!ref) return '';
        return '<option value="' + escAttrSafe(ref) + '">' + escSafe(label || ref) + '</option>';
      }).join('');
    });
  }

  function ensureReportEditor(){
    if(reportEditor) return reportEditor;
    reportEditor = window.__mdtCreateRichEditor('#rapport-arrestation-quill', {
      theme: 'snow',
      placeholder: 'Rédigez le rapport...',
      modules: { toolbar: [['bold','italic','underline','strike'], [{ list: 'ordered' }, { list: 'bullet' }], [{ header: [1,2,3,false] }], ['link','clean']] }
    });
    return reportEditor;
  }

  function ensureDossierEditor(){
    if(dossierEditor) return dossierEditor;
    dossierEditor = window.__mdtCreateRichEditor('#dossier-arrestation-quill', {
      theme: 'snow',
      placeholder: 'Rédigez le rapport...',
      modules: { toolbar: [['bold','italic','underline','strike'], [{ list: 'ordered' }, { list: 'bullet' }], [{ header: [1,2,3,false] }], [{ color: ['#ffffff','#ffd966','#93c5fd','#86efac','#fca5a5','#f9a8d4'] }, { background: [] }], ['link','clean']] }
    });
    return dossierEditor;
  }

  function setEditorInvalid(hostId, errorId, invalid){
    var host = byId(hostId);
    var msg = byId(errorId);
    if(host) host.classList.toggle('is-invalid', !!invalid);
    if(msg) msg.classList.toggle('show', !!invalid);
  }

  function selectedFolder(selectId){
    var select = byId(selectId);
    var ref = String((select && select.value) || '').trim();
    if(!ref) return { ref: '', label: '' };
    var option = select.options[select.selectedIndex];
    return { ref: ref, label: String(option && option.text || ref).trim() };
  }

  function ensureFolderIdentity(state, selectId, prefix, labelBase){
    var selected = selectedFolder(selectId);
    if(selected.ref) return selected;
    var citizen = window.selectedCitizen || null;
    var citizenName = buildCitizenName(citizen) || 'Citoyen';
    var stamp = new Date();
    var ref = prefix + '-' + stamp.getFullYear() + pad(stamp.getMonth() + 1) + pad(stamp.getDate()) + pad(stamp.getHours()) + pad(stamp.getMinutes()) + pad(stamp.getSeconds()) + '-' + Math.floor(Math.random() * 900 + 100);
    var label = labelBase + ' - ' + citizenName;
    var select = byId(selectId);
    if(select){
      var exists = Array.prototype.slice.call(select.options || []).some(function(opt){ return String(opt.value || '') === ref; });
      if(!exists){ var opt = document.createElement('option'); opt.value = ref; opt.textContent = label; select.appendChild(opt); }
      select.value = ref;
    }
    return { ref: ref, label: label };
  }

  function makeImageSig(dataUrl){ var raw = String(dataUrl || ''); return raw ? (String(raw.length) + ':' + raw.slice(0, 42) + ':' + raw.slice(-42)) : ''; }
  function readFileAsDataURL(file){ return new Promise(function(resolve, reject){ var reader = new FileReader(); reader.onload = function(){ resolve(reader.result); }; reader.onerror = reject; reader.readAsDataURL(file); }); }

  function optimizeImageDataUrl(dataUrl){
    return new Promise(function(resolve){
      try{
        var img = new Image();
        img.onload = function(){
          try{
            var baseW = img.width || 0;
            var baseH = img.height || 0;
            if(!baseW || !baseH){ resolve(dataUrl); return; }
            var ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(baseW, baseH));
            baseW = Math.max(1, Math.round(baseW * ratio));
            baseH = Math.max(1, Math.round(baseH * ratio));
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            if(!ctx){ resolve(dataUrl); return; }
            var currentW = baseW, currentH = baseH, quality = 0.5, out = dataUrl, attempts = 0;
            while(attempts < 16){
              attempts += 1;
              canvas.width = currentW; canvas.height = currentH;
              ctx.clearRect(0, 0, currentW, currentH);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, currentW, currentH);
              ctx.drawImage(img, 0, 0, currentW, currentH);
              out = canvas.toDataURL('image/jpeg', quality) || out;
              if(out.length <= MAX_DATA_URL_LENGTH) break;
              if(quality > 0.24){ quality = Math.max(0.24, quality - 0.08); continue; }
              if(Math.max(currentW, currentH) <= MIN_IMAGE_DIMENSION) break;
              var shrink = Math.max(currentW, currentH) > 520 ? 0.82 : 0.88;
              currentW = Math.max(MIN_IMAGE_DIMENSION, Math.round(currentW * shrink));
              currentH = Math.max(MIN_IMAGE_DIMENSION, Math.round(currentH * shrink));
              quality = Math.min(quality, 0.28);
            }
            resolve(out);
          }catch(e){ resolve(dataUrl); }
        };
        img.onerror = function(){ resolve(dataUrl); };
        img.src = dataUrl;
      }catch(e){ resolve(dataUrl); }
    });
  }
  async function fileToOptimizedDataURL(file){ return optimizeImageDataUrl(await readFileAsDataURL(file)); }

  function extractPastedFiles(ev){
    var clipboard = ev && ev.clipboardData ? ev.clipboardData : null;
    var out = [];
    if(clipboard && clipboard.items){
      Array.prototype.slice.call(clipboard.items).forEach(function(item){
        if(item && String(item.type || '').indexOf('image/') === 0){ var file = item.getAsFile ? item.getAsFile() : null; if(file) out.push(file); }
      });
    }
    if(!out.length && clipboard && clipboard.files){
      Array.prototype.slice.call(clipboard.files).forEach(function(file){ if(file && String(file.type || '').indexOf('image/') === 0) out.push(file); });
    }
    return out;
  }

  async function addPastedFiles(state, dropId, previewId, files){
    var list = Array.isArray(files) ? files : [];
    if(!list.length) return;
    for(var i = 0; i < list.length; i += 1){
      if(state.pastedImages.length >= MAX_PROOF_IMAGES){
        if(typeof window.showToast === 'function') window.showToast('⚠️ Limite atteinte', 'Maximum ' + MAX_PROOF_IMAGES + ' photos preuves.', true);
        break;
      }
      try{
        var optimized = await fileToOptimizedDataURL(list[i]);
        if(!optimized || optimized.length > MAX_DATA_URL_LENGTH) continue;
        var sig = makeImageSig(optimized);
        if(state.pastedImages.some(function(row){ return row.sig === sig; })) continue;
        state.pastedImages.push({ dataUrl: optimized, sig: sig });
      }catch(e){}
    }
    renderProofPreview(state, dropId, previewId, null);
  }

  function renderProofPreview(state, dropId, previewId, existingReport){
    var drop = byId(dropId);
    var host = byId(previewId);
    if(!drop || !host) return;
    if(state.pastedImages.length){
      drop.classList.add('is-pasted');
      drop.textContent = state.pastedImages.length + ' photo(s) prête(s) à être jointe(s)';
      host.innerHTML = '<div class="report-photo-grid">' + state.pastedImages.map(function(item, index){
        return '<div class="report-photo-thumb arrest-proof-thumb"><img src="' + escAttrSafe(item.dataUrl || '') + '" alt="Photo preuve ' + (index + 1) + '" /><button class="photo-thumb-delete" type="button" data-proof-remove="' + index + '">×</button></div>';
      }).join('') + '</div>';
      return;
    }
    if(existingReport && String(existingReport.evidence_folder_ref || '').trim()){
      drop.classList.add('is-pasted');
      drop.textContent = (Number(existingReport.pasted_images_count || 0) || 0) + ' photo(s) déjà enregistrée(s)';
      host.innerHTML = '<div class="report-photo-empty">Chargement des photos preuves déjà enregistrées…</div>';
      if(typeof window.loadEvidencePreview === 'function'){
        window.loadEvidencePreview(previewId, existingReport.evidence_folder_ref, existingReport.evidence_folder_label || existingReport.evidence_folder_ref, { limit: 12 });
      }
      return;
    }
    drop.classList.remove('is-pasted');
    drop.textContent = 'Coller une ou plusieurs images (CTRL + V)';
    host.innerHTML = '';
  }

  function bindProofArea(dropId, previewId, state){
    var drop = byId(dropId);
    var preview = byId(previewId);
    if(drop && !drop.__mdtBound){
      drop.__mdtBound = true;
      ['dragenter','dragover'].forEach(function(evtName){ drop.addEventListener(evtName, function(ev){ ev.preventDefault(); ev.stopPropagation(); }, false); });
      drop.addEventListener('paste', function(ev){ var images = extractPastedFiles(ev); if(!images.length) return; ev.preventDefault(); addPastedFiles(state, dropId, previewId, images); }, false);
    }
    if(preview && !preview.__mdtBound){
      preview.__mdtBound = true;
      preview.addEventListener('click', function(ev){
        var btn = ev.target && ev.target.closest ? ev.target.closest('[data-proof-remove]') : null;
        if(!btn) return;
        ev.preventDefault();
        var idx = Number(btn.getAttribute('data-proof-remove') || -1);
        if(idx >= 0){ state.pastedImages.splice(idx, 1); renderProofPreview(state, dropId, previewId, null); }
      }, false);
    }
  }

  function renderChipList(hostId, items, removeAttr){
    var host = byId(hostId);
    if(!host) return;
    if(!items.length){ host.innerHTML = ''; return; }
    host.innerHTML = items.map(function(item, index){
      return '<div class="arrest-ui-chip"><span>' + escSafe(item) + '</span><button type="button" ' + removeAttr + '="' + index + '">×</button></div>';
    }).join('');
  }

  function normalizePerson(person){
    if(!person) return null;
    if(typeof person === 'string') return { name: person, role: 'Participant', email: '', phone: '' };
    return {
      name: String(person.name || '').trim(),
      role: String(person.role || 'Participant').trim(),
      email: String(person.email || '').trim(),
      phone: String(person.phone || '').trim()
    };
  }

  function renderParticipants(){
    var host = byId('dossier-arrestation-participant-list');
    if(!host) return;
    if(!DOSSIER_STATE.participants.length){ host.innerHTML = '<div class="arrest-ui-participant-empty">Aucun participant ajouté pour le moment</div>'; return; }
    host.innerHTML = DOSSIER_STATE.participants.map(function(person, index){
      return ''
        + '<div class="arrest-ui-participant-card">'
        +   '<div>'
        +     '<div class="arrest-ui-participant-name">' + escSafe(person.name || 'Participant') + '</div>'
        +     '<span class="arrest-ui-participant-role">' + escSafe(person.role || 'Participant') + '</span>'
        +     '<div class="arrest-ui-participant-meta"><span>' + escSafe(person.email || '—') + '</span><span>' + escSafe(person.phone || '—') + '</span></div>'
        +   '</div>'
        +   '<button class="arrest-ui-remove-btn" type="button" data-dossier-participant-remove="' + index + '">×</button>'
        + '</div>';
    }).join('');
  }

  function renderVehicles(){
    var host = byId('dossier-arrestation-vehicle-list');
    if(!host) return;
    if(!DOSSIER_STATE.vehicles.length){ host.innerHTML = ''; return; }
    host.innerHTML = DOSSIER_STATE.vehicles.map(function(vehicle, index){
      return ''
        + '<div class="arrest-ui-simple-row">'
        +   '<div><strong>' + escSafe(vehicle.model || 'Véhicule') + '</strong><span class="arrest-ui-simple-meta">Plaque : ' + escSafe(vehicle.plate || '—') + (vehicle.stolen ? ' · Volé' : '') + '</span></div>'
        +   '<button class="arrest-ui-remove-btn arrest-ui-inline-remove" type="button" title="Supprimer ce véhicule" aria-label="Supprimer ce véhicule" data-dossier-vehicle-remove="' + index + '">✕</button>'
        + '</div>';
    }).join('');
  }

  function renderWeapons(){
    var host = byId('dossier-arrestation-weapon-list');
    if(!host) return;
    if(!DOSSIER_STATE.weapons.length){ host.innerHTML = ''; return; }
    host.innerHTML = DOSSIER_STATE.weapons.map(function(weapon, index){
      return ''
        + '<div class="arrest-ui-simple-row">'
        +   '<div><strong>' + escSafe(weapon.model || 'Arme') + '</strong><span class="arrest-ui-simple-meta">Série : ' + escSafe(weapon.serial || '—') + ' · Munitions : ' + escSafe(weapon.ammo || 0) + (weapon.used ? ' · Utilisée' : '') + '</span></div>'
        +   '<button class="arrest-ui-remove-btn arrest-ui-inline-remove" type="button" title="Supprimer cette arme" aria-label="Supprimer cette arme" data-dossier-weapon-remove="' + index + '">✕</button>'
        + '</div>';
    }).join('');
  }

  function toggleInlineDraftForm(prefix, open){
    var form = byId(prefix + '-form');
    var button = byId(prefix + '-add-btn');
    if(!form || !button) return;
    var visible = !!open;
    form.style.display = visible ? '' : 'none';
    form.setAttribute('aria-hidden', visible ? 'false' : 'true');
    button.textContent = visible
      ? (prefix.indexOf('weapon') !== -1 ? 'Valider l\'arme' : 'Valider le véhicule')
      : (prefix.indexOf('weapon') !== -1 ? '+ Ajouter une arme' : '+ Ajouter un véhicule');
  }

  function resetVehicleInlineForm(closeAfter){
    setValue('dossier-arrestation-vehicle-model', '');
    setValue('dossier-arrestation-vehicle-plate', '');
    setValue('dossier-arrestation-vehicle-stolen', false);
    if(closeAfter !== false) toggleInlineDraftForm('dossier-arrestation-vehicle', false);
  }

  function resetWeaponInlineForm(closeAfter){
    setValue('dossier-arrestation-weapon-model', '');
    setValue('dossier-arrestation-weapon-serial', '');
    setValue('dossier-arrestation-weapon-ammo', 0);
    setValue('dossier-arrestation-weapon-used', false);
    if(closeAfter !== false) toggleInlineDraftForm('dossier-arrestation-weapon', false);
  }

  function findChargeById(id){
    id = String(id || '').trim();
    return toArray(window.CHARGES).find(function(charge){ return String(charge.id || '') === id; }) || null;
  }
  function chargeLabel(item){
    if(!item) return 'Charge';
    if(typeof item === 'string'){ var found = findChargeById(item); return found ? String(found.label || item) : String(item); }
    return String(item.label || item.id || 'Charge');
  }
  function renderCharges(){
    var host = byId('dossier-arrestation-charge-list');
    if(!host) return;
    if(!DOSSIER_STATE.charges.length){ host.innerHTML = ''; return; }
    host.innerHTML = DOSSIER_STATE.charges.map(function(charge, index){
      return '<div class="arrest-ui-chip"><span>' + escSafe(chargeLabel(charge)) + '</span><button type="button" data-dossier-charge-remove="' + index + '">×</button></div>';
    }).join('');
  }

  function addUniqueName(list, value){
    value = String(value || '').trim();
    if(!value) return false;
    if(list.some(function(row){ return String(row || '').toLowerCase() === value.toLowerCase(); })) return false;
    list.push(value);
    return true;
  }

  function addReportAgentFromInput(){
    var input = byId('rapport-arrestation-agents-input');
    if(!input) return false;
    var ok = addUniqueName(REPORT_STATE.agents, input.value);
    input.value = '';
    renderChipList('rapport-arrestation-agents-list', REPORT_STATE.agents, 'data-report-agent-remove');
    return ok;
  }

  function addDossierAgentFromInput(){
    var input = byId('dossier-arrestation-agents-input');
    if(!input) return false;
    var ok = addUniqueName(DOSSIER_STATE.agents, input.value);
    input.value = '';
    renderChipList('dossier-arrestation-agents-list', DOSSIER_STATE.agents, 'data-dossier-agent-remove');
    return ok;
  }

  function addParticipantFromInput(){
    var input = byId('dossier-arrestation-participant-input');
    if(!input) return false;
    var value = String(input.value || '').trim();
    if(!value) return false;
    var match = allPeopleSuggestions().find(function(person){ return String(person.name || '').toLowerCase() === value.toLowerCase(); });
    var next = normalizePerson(match || { name: value, role: 'Participant' });
    if(!next || !next.name) return false;
    if(DOSSIER_STATE.participants.some(function(person){ return String(person.name || '').toLowerCase() === String(next.name || '').toLowerCase(); })){
      input.value = '';
      return false;
    }
    DOSSIER_STATE.participants.push(next);
    input.value = '';
    renderParticipants();
    return true;
  }

  function updateLinkedCitizenText(id){
    var text = 'Citoyen concerné : aucun citoyen sélectionné';
    if(window.selectedCitizen){
      var fullName = buildCitizenName(window.selectedCitizen) || 'Citoyen';
      text = 'Citoyen concerné : ' + fullName;
    }
    var el = byId(id);
    if(el) el.textContent = text;
  }

  function resetReportState(){
    REPORT_STATE.editingId = 0;
    REPORT_STATE.editingRecord = null;
    REPORT_STATE.pastedImages = [];
    REPORT_STATE.agents = [currentOfficerLabel()];
    REPORT_STATE.pendingUploads = {};
    REPORT_STATE.submitLock = false;
    clearTimeoutSafe(REPORT_STATE.submitTimeout); REPORT_STATE.submitTimeout = null;
    populatePrecinctSelect('rapport-arrestation-precinct', PRECINCT_OPTIONS[0]);
    populateLawyerSelect();
    populateRemoteSelects();
    setValue('rapport-arrestation-datetime', buildNowValue());
    setValue('rapport-arrestation-possession', '');
    setValue('rapport-arrestation-lawyer', '');
    renderChipList('rapport-arrestation-agents-list', REPORT_STATE.agents, 'data-report-agent-remove');
    setValue('rapport-arrestation-agents-input', '');
    var editor = ensureReportEditor();
    if(editor && typeof editor.setContents === 'function') editor.setContents([]);
    setEditorInvalid('rapport-arrestation-quill', 'rapport-arrestation-error', false);
    renderProofPreview(REPORT_STATE, 'rapport-arrestation-proof-drop', 'rapport-arrestation-proof-preview', null);
    updateLinkedCitizenText('rapport-arrestation-linked');
    var submitBtn = byId('rapport-arrestation-submit-btn');
    var title = byId('rapport-arrestation-title');
    if(submitBtn) submitBtn.textContent = 'Enregistrer le rapport d\'arrestation';
    if(title) title.textContent = 'Créer un rapport d\'arrestation';
  }

  function fillReportFromRecord(report){
    resetReportState();
    REPORT_STATE.editingId = Number(report.id || 0) || 0;
    REPORT_STATE.editingRecord = report || null;
    setValue('rapport-arrestation-datetime', String(report.created_at || buildNowValue()));
    setValue('rapport-arrestation-possession', String(report.possession || ''));
    populatePrecinctSelect('rapport-arrestation-precinct', String(report.precinct || PRECINCT_OPTIONS[0] || ''));
    populateLawyerSelect();
    setValue('rapport-arrestation-lawyer', String(report.lawyer_name || ''));
    REPORT_STATE.agents = parseMaybeJsonArray(report.agents_json || report.agents_involved_json || report.agents_involved || []).map(function(v){ return typeof v === 'string' ? v : (v && v.name) || ''; }).filter(Boolean);
    if(!REPORT_STATE.agents.length && String(report.agents_involved || '').trim()) REPORT_STATE.agents = String(report.agents_involved).split(',').map(function(v){ return String(v).trim(); }).filter(Boolean);
    if(!REPORT_STATE.agents.length) REPORT_STATE.agents = [String(report.officer_name || currentOfficerLabel())];
    renderChipList('rapport-arrestation-agents-list', REPORT_STATE.agents, 'data-report-agent-remove');
    var editor = ensureReportEditor();
    if(editor && editor.root) editor.root.innerHTML = String(report.body_html || '');
    populateRemoteSelects();
    if(String(report.evidence_folder_ref || '').trim()) setValue('rapport-arrestation-evidence-folder', String(report.evidence_folder_ref || ''));
    renderProofPreview(REPORT_STATE, 'rapport-arrestation-proof-drop', 'rapport-arrestation-proof-preview', report);
    var submitBtn = byId('rapport-arrestation-submit-btn');
    var title = byId('rapport-arrestation-title');
    if(submitBtn) submitBtn.textContent = 'Modifier le rapport d\'arrestation';
    if(title) title.textContent = 'Modifier un rapport d\'arrestation';
  }

  function resetDossierState(){
    DOSSIER_STATE.pastedImages = [];
    DOSSIER_STATE.pendingUploads = {};
    DOSSIER_STATE.submitLock = false;
    clearTimeoutSafe(DOSSIER_STATE.submitTimeout); DOSSIER_STATE.submitTimeout = null;
    DOSSIER_STATE.agents = [currentOfficerLabel()];
    DOSSIER_STATE.participants = [currentOfficerMeta()];
    DOSSIER_STATE.charges = [];
    DOSSIER_STATE.vehicles = [];
    DOSSIER_STATE.weapons = [];

    populatePrecinctSelect('dossier-arrestation-precinct', PRECINCT_OPTIONS[0]);
    populateFineScaleSelect('dossier-arrestation-fine-scale', 'Nominal');
    populateChargeSelect();
    populateRemoteSelects();

    setValue('dossier-arrestation-created-at', buildNowValue());
    setValue('dossier-arrestation-rights-read-at', '');
    setValue('dossier-arrestation-force-used', false);
    setValue('dossier-arrestation-agents-input', '');
    setValue('dossier-arrestation-participant-input', '');
    setValue('dossier-arrestation-report-id', '');
    setValue('dossier-arrestation-evidence-folder', '');
    setValue('dossier-arrestation-charge-select', '');
    resetVehicleInlineForm(true);
    resetWeaponInlineForm(true);

    renderChipList('dossier-arrestation-agents-list', DOSSIER_STATE.agents, 'data-dossier-agent-remove');
    renderParticipants();
    renderCharges();
    renderVehicles();
    renderWeapons();
    renderProofPreview(DOSSIER_STATE, 'dossier-arrestation-proof-drop', 'dossier-arrestation-proof-preview', null);
    var editor = ensureDossierEditor();
    if(editor && typeof editor.setContents === 'function') editor.setContents([]);
    setEditorInvalid('dossier-arrestation-quill', 'dossier-arrestation-error', false);
    updateLinkedCitizenText('dossier-arrestation-linked');
  }

  function openModal(modalId){
    var modal = byId(modalId);
    if(!modal) return false;
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.zIndex = '99999';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.setAttribute('aria-hidden', 'false');
    return false;
  }
  function closeModal(modalId){
    var modal = byId(modalId);
    if(!modal) return false;
    modal.style.display = 'none';
    modal.style.visibility = '';
    modal.style.opacity = '';
    modal.style.pointerEvents = '';
    modal.setAttribute('aria-hidden', 'true');
    return false;
  }

  function forceEnableReportInputs(){
    var modal = byId('modal-rapport-arrestation');
    if(!modal) return;
    Array.prototype.slice.call(modal.querySelectorAll('input, select, textarea, button')).forEach(function(node){
      try{
        if(node.id === 'rapport-arrestation-submit-btn') return;
        node.disabled = false;
        node.readOnly = false;
        node.removeAttribute('disabled');
        node.removeAttribute('readonly');
        node.style.pointerEvents = 'auto';
      }catch(e){}
    });
    try{
      var editor = ensureReportEditor();
      if(editor && typeof editor.enable === 'function') editor.enable(true);
      if(editor && editor.root){
        editor.root.setAttribute('contenteditable', 'true');
        editor.root.style.pointerEvents = 'auto';
      }
    }catch(e){}
  }

  function getSelectedCitizenSid64(){
    return String((window.selectedCitizen && (window.selectedCitizen.steamid64 || window.selectedCitizen.id)) || '').trim();
  }

  function getSelectedCitizenName(){
    return buildCitizenName(window.selectedCitizen || null);
  }

  function gatherReportDraft(){
    var editor = ensureReportEditor();
    var bodyText = editor && typeof editor.getText === 'function' ? String(editor.getText() || '').trim() : '';
    var folder = selectedFolder('rapport-arrestation-evidence-folder');
    return {
      id: REPORT_STATE.editingId,
      citizen_sid64: getSelectedCitizenSid64(),
      citizen_name: getSelectedCitizenName(),
      body_html: editor && editor.root ? String(editor.root.innerHTML || '') : '',
      body_text: bodyText,
      created_at: getValue('rapport-arrestation-datetime'),
      possession: getValue('rapport-arrestation-possession'),
      precinct: getValue('rapport-arrestation-precinct'),
      lawyer_name: getValue('rapport-arrestation-lawyer'),
      agents: REPORT_STATE.agents.slice(),
      agents_involved: REPORT_STATE.agents.join(', '),
      evidence_folder_ref: folder.ref,
      evidence_folder_label: folder.label,
      pasted_images_count: REPORT_STATE.pastedImages.length
    };
  }

  function gatherDossierDraft(){
    var editor = ensureDossierEditor();
    var bodyText = editor && typeof editor.getText === 'function' ? String(editor.getText() || '').trim() : '';
    var reportSelect = byId('dossier-arrestation-report-id');
    var folder = selectedFolder('dossier-arrestation-evidence-folder');
    var reportOption = reportSelect && reportSelect.options[reportSelect.selectedIndex];
    return {
      citizen_sid64: getSelectedCitizenSid64(),
      citizen_name: getSelectedCitizenName(),
      body_html: editor && editor.root ? String(editor.root.innerHTML || '') : '',
      body_text: bodyText,
      created_at: getValue('dossier-arrestation-created-at'),
      rights_read_at: getValue('dossier-arrestation-rights-read-at'),
      precinct: getValue('dossier-arrestation-precinct'),
      agents: DOSSIER_STATE.agents.slice(),
      agents_involved: DOSSIER_STATE.agents.join(', '),
      force_used: getChecked('dossier-arrestation-force-used') ? 1 : 0,
      participants: DOSSIER_STATE.participants.slice(),
      report_id: Number(getValue('dossier-arrestation-report-id') || 0) || 0,
      report_label: String(reportOption && reportOption.text || '').trim(),
      evidence_folder_ref: folder.ref,
      evidence_folder_label: folder.label,
      pasted_images_count: DOSSIER_STATE.pastedImages.length,
      charges: DOSSIER_STATE.charges.map(function(charge){ return typeof charge === 'string' ? { id: charge, label: chargeLabel(charge) } : charge; }),
      fine_scale: getValue('dossier-arrestation-fine-scale') || 'Nominal',
      vehicles: DOSSIER_STATE.vehicles.slice(),
      weapons: DOSSIER_STATE.weapons.slice()
    };
  }

  function validateReportDraft(draft){
    if(!draft.citizen_sid64){ if(typeof window.showToast === 'function') window.showToast('⚠️ Citoyen requis', 'Ouvre ce formulaire depuis le profil du citoyen concerné.', true); return false; }
    if(!draft.created_at){ if(typeof window.showToast === 'function') window.showToast('⚠️ Champ requis', { champ: 'date et heure' }, true); return false; }
    if(!draft.body_text){ setEditorInvalid('rapport-arrestation-quill', 'rapport-arrestation-error', true); if(typeof window.showToast === 'function') window.showToast('⚠️ Champ requis', { champ: 'rapport' }, true); return false; }
    setEditorInvalid('rapport-arrestation-quill', 'rapport-arrestation-error', false);
    if(!draft.agents.length) draft.agents = [currentOfficerLabel()];
    draft.agents_involved = draft.agents.join(', ');
    return true;
  }

  function validateDossierDraft(draft){
    if(!draft.citizen_sid64){ if(typeof window.showToast === 'function') window.showToast('⚠️ Citoyen requis', 'Ouvre ce formulaire depuis le profil du citoyen concerné.', true); return false; }
    if(!draft.created_at){ if(typeof window.showToast === 'function') window.showToast('⚠️ Champ requis', { champ: 'date et heure de l\'arrestation' }, true); return false; }
    if(!draft.rights_read_at){ if(typeof window.showToast === 'function') window.showToast('⚠️ Champ requis', { champ: 'lecture des droits' }, true); return false; }
    if(!draft.agents.length){ if(typeof window.showToast === 'function') window.showToast('⚠️ Champ requis', { champ: 'agents impliqués' }, true); return false; }
    if(!draft.body_text){ setEditorInvalid('dossier-arrestation-quill', 'dossier-arrestation-error', true); if(typeof window.showToast === 'function') window.showToast('⚠️ Champ requis', { champ: 'rapport' }, true); return false; }
    setEditorInvalid('dossier-arrestation-quill', 'dossier-arrestation-error', false);
    draft.agents_involved = draft.agents.join(', ');
    return true;
  }

  function uploadProofImage(state, reqPrefix, folderRef, folderLabel, dataUrl){
    return new Promise(function(resolve, reject){
      var reqId = req('ajouter_photo', { dossier_ref: folderRef, dossier_nom: folderLabel, image: dataUrl }, reqPrefix);
      state.pendingUploads[reqId] = { resolve: resolve, reject: reject };
    });
  }

  async function uploadPendingProofs(state, selectId, prefix, labelBase, reqPrefix){
    var selected = selectedFolder(selectId);
    if(!state.pastedImages.length) return { count: 0, folder_ref: selected.ref, folder_label: selected.label };
    var folder = ensureFolderIdentity(state, selectId, prefix, labelBase);
    var uploaded = 0;
    for(var i = 0; i < state.pastedImages.length; i += 1){
      await uploadProofImage(state, reqPrefix, folder.ref, folder.label, state.pastedImages[i].dataUrl);
      uploaded += 1;
    }
    return { count: uploaded, folder_ref: folder.ref, folder_label: folder.label };
  }

  function buildJusticeDossierHtml(report, options){
    options = options || {};
    var participants = parseMaybeJsonArray(report.participants || report.participants_json || []);
    var charges = parseMaybeJsonArray(report.charges || report.charges_json || []);
    var vehicles = parseMaybeJsonArray(report.vehicles || report.vehicles_json || []);
    var weapons = parseMaybeJsonArray(report.weapons || report.weapons_json || []);
    var photosCount = Number(options.photosCount != null ? options.photosCount : report.pasted_images_count || 0) || 0;
    var proofContainerId = options.proofContainerId || '';
    var docDate = formatHumanDate(report.created_at || report.updated_at || '');
    var reference = String(report.reference || ('DA-' + String(report.id || 'BROUILLON')));
    var title = 'Dossier d\'Arrestation - Copie Justice';

    var proofHtml = '';
    if(proofContainerId){
      proofHtml = '<div id="' + escAttrSafe(proofContainerId) + '" class="justice-doc-proof-grid"><div class="justice-doc-empty">Chargement des preuves photographiques…</div></div>';
    }else if(options.previewImages && options.previewImages.length){
      proofHtml = '<div class="justice-doc-proof-grid">' + options.previewImages.map(function(item, index){
        return '<div class="justice-doc-photo-card"><img src="' + escAttrSafe(item.dataUrl || '') + '" alt="Photo preuve ' + (index + 1) + '"></div>';
      }).join('') + '</div>';
    }else{
      proofHtml = '<div class="justice-doc-empty">Aucune photo preuve enregistrée.</div>';
    }

    var participantsHtml = '<div class="justice-doc-empty">Aucun participant ajouté.</div>';
    if(participants.length){
      participantsHtml = participants.map(function(person){
        return '<div class="justice-doc-participant">'
          + '<div><div class="justice-doc-participant-name">' + escSafe(person.name || 'Participant') + '</div><div class="justice-doc-participant-role">' + escSafe(person.role || 'Participant') + '</div></div>'
          + '<div class="justice-doc-participant-meta">' + escSafe([person.email || '', person.phone || ''].filter(Boolean).join(' · ') || 'Coordonnées non renseignées') + '</div>'
        + '</div>';
      }).join('');
    }

    var chargesHtml = '<div class="justice-doc-empty">Aucune charge enregistrée.</div>';
    if(charges.length){
      chargesHtml = '<div class="justice-doc-chipline">' + charges.map(function(charge){
        return '<span class="justice-doc-chip">' + escSafe(chargeLabel(charge)) + '</span>';
      }).join('') + '</div>';
    }

    function buildCatalog(items, emptyText, renderItem){
      if(!items.length) return '<div class="justice-doc-empty">' + escSafe(emptyText) + '</div>';
      return '<div class="justice-doc-catalog">' + items.map(renderItem).join('') + '</div>';
    }

    var vehiclesHtml = buildCatalog(vehicles, 'Aucun véhicule renseigné.', function(vehicle, index){
      return '<div class="justice-doc-catalog-card">'
        + '<div class="justice-doc-catalog-index">Véhicule ' + (index + 1) + '</div>'
        + '<div class="justice-doc-catalog-title">' + escSafe(vehicle.model || 'Véhicule non renseigné') + '</div>'
        + '<div class="justice-doc-catalog-meta">Plaque : ' + escSafe(vehicle.plate || '—') + '</div>'
        + '<div class="justice-doc-catalog-meta">Statut : ' + (vehicle.stolen ? 'Volé' : 'Déclaré') + '</div>'
      + '</div>';
    });

    var weaponsHtml = buildCatalog(weapons, 'Aucune arme renseignée.', function(weapon, index){
      return '<div class="justice-doc-catalog-card">'
        + '<div class="justice-doc-catalog-index">Arme ' + (index + 1) + '</div>'
        + '<div class="justice-doc-catalog-title">' + escSafe(weapon.model || 'Arme non renseignée') + '</div>'
        + '<div class="justice-doc-catalog-meta">Numéro de série : ' + escSafe(weapon.serial || '—') + '</div>'
        + '<div class="justice-doc-catalog-meta">Munitions : ' + escSafe(weapon.ammo || 0) + (weapon.used ? ' · Utilisée' : '') + '</div>'
      + '</div>';
    });

    return ''
      + '<div class="justice-doc-page">'
      +   '<div class="justice-doc-watermark">JUSTICE COPY</div>'
      +   '<div class="justice-doc-header">'
      +     '<div class="justice-doc-brand">'
      +       '<img class="justice-doc-badge" src="' + escAttrSafe(NYPD_BADGE_URL) + '" alt="Logo NYPD" onerror="this.style.display=\'none\'">'
      +       '<div>'
      +         '<div class="justice-doc-kicker">New York City Police Department</div>'
      +         '<div class="justice-doc-title">' + escSafe(title) + '</div>'
      +         '<div class="justice-doc-ref">Référence : ' + escSafe(reference) + '</div>'
      +       '</div>'
      +     '</div>'
      +     '<div class="justice-doc-stamp">'
      +       '<div class="justice-doc-stamp-label">Document officiel</div>'
      +       '<div class="justice-doc-stamp-value">' + escSafe(docDate) + '</div>'
      +       '<div class="justice-doc-stamp-small">Poste : ' + escSafe(report.precinct || 'Non renseigné') + '</div>'
      +       '<div class="justice-doc-stamp-small">Citoyen : ' + escSafe(report.citizen_name || 'Non renseigné') + '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="justice-doc-summary-grid">'
      +     '<div class="justice-doc-panel">'
      +       '<div class="justice-doc-panel-title">Informations générales</div>'
      +       '<div class="justice-doc-kv"><span>Date et heure de l&#39;arrestation</span><strong>' + escSafe(formatHumanDate(report.created_at)) + '</strong></div>'
      +       '<div class="justice-doc-kv"><span>Lecture des droits</span><strong>' + escSafe(formatHumanDate(report.rights_read_at)) + '</strong></div>'
      +       '<div class="justice-doc-kv"><span>Agents impliqués</span><strong>' + escSafe(report.agents_involved || '—') + '</strong></div>'
      +       '<div class="justice-doc-kv"><span>Force utilisée</span><strong>' + (Number(report.force_used || 0) ? 'Oui' : 'Non') + '</strong></div>'
      +     '</div>'
      +     '<div class="justice-doc-panel">'
      +       '<div class="justice-doc-panel-title">Liaisons et pièces</div>'
      +       '<div class="justice-doc-kv"><span>Rapport d&#39;opération</span><strong>' + escSafe(report.report_label || 'Aucun') + '</strong></div>'
      +       '<div class="justice-doc-kv"><span>Dossier photos</span><strong>' + escSafe(report.evidence_folder_label || report.evidence_folder_ref || 'Aucun') + '</strong></div>'
      +       '<div class="justice-doc-kv"><span>Barème de l&#39;amende</span><strong>' + escSafe(report.fine_scale || 'Nominal') + '</strong></div>'
      +       '<div class="justice-doc-kv"><span>Photos preuves</span><strong>' + escSafe(String(photosCount)) + '</strong></div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="justice-doc-panel">'
      +     '<div class="justice-doc-panel-title">Participants judiciaires</div>'
      +     participantsHtml
      +   + '</div>'
      +   '<div class="justice-doc-panel">'
      +     '<div class="justice-doc-panel-title">Charges retenues</div>'
      +     chargesHtml
      +   + '</div>'
      +   '<div class="justice-doc-catalog-grid">'
      +     '<div class="justice-doc-panel">'
      +       '<div class="justice-doc-panel-title">Véhicules utilisés</div>'
      +       vehiclesHtml
      +     '</div>'
      +     '<div class="justice-doc-panel">'
      +       '<div class="justice-doc-panel-title">Armes utilisées</div>'
      +       weaponsHtml
      +     '</div>'
      +   '</div>'
      +   '<div class="justice-doc-panel">'
      +     '<div class="justice-doc-panel-title">Rapport détaillé</div>'
      +     '<div class="justice-doc-report-box">' + (report.body_html || '<p>Aucun contenu.</p>') + '</div>'
      +   '</div>'
      +   '<div class="justice-doc-panel">'
      +     '<div class="justice-doc-proof-head"><span>Photos preuves</span><span>' + escSafe(String(photosCount)) + ' pièce(s)</span></div>'
      +     proofHtml
      +   + '</div>'
      + '</div>';
  }
  window.__buildJusticeDossierHtml = buildJusticeDossierHtml;

  function openArrestationRecordModal(record, recordType){
    var viewer = byId('arrestation-record-viewer');
    var title = byId('arrestation-record-title');
    var sub = byId('arrestation-record-sub');
    if(!viewer) return false;
    recordType = String(recordType || record && record.record_type || 'report').toLowerCase();
    var proofContainerId = 'arrestation-record-proof-' + String(recordType) + '-' + Number(record && record.id || 0);
    if(recordType === 'dossier' || recordType === 'justice'){
      if(title) title.textContent = 'Dossier d\'arrestation - Copie Justice';
      if(sub) sub.textContent = 'Lecture seule · ' + String(record && record.reference || 'Référence inconnue');
      viewer.innerHTML = buildJusticeDossierHtml(record || {}, { proofContainerId: proofContainerId, photosCount: Number(record && record.pasted_images_count || 0) || 0 });
    }else{
      if(title) title.textContent = 'Rapport d\'arrestation';
      if(sub) sub.textContent = 'Police · ' + String(record && record.reference || 'Référence inconnue');
      viewer.innerHTML = (typeof window.buildReportDocumentHtml === 'function' ? window.buildReportDocumentHtml(record || {}, { proofContainerId: proofContainerId, photosCount: Number(record && record.pasted_images_count || 0) || 0 }) : (record && record.body_html) || '<p>Aucun contenu.</p>');
    }
    if(typeof window.loadEvidencePreview === 'function' && record && String(record.evidence_folder_ref || '').trim()){
      window.loadEvidencePreview(proofContainerId, record.evidence_folder_ref || '', record.evidence_folder_label || record.evidence_folder_ref || '', { limit: 12 });
    }
    openModal('modal-arrestation-record');
    return false;
  }

  function closeArrestationRecordModal(){ return closeModal('modal-arrestation-record'); }

  function openArrestationRecordById(id, recordType){
    id = Number(id || 0) || 0;
    if(!id) return false;
    req('get_arrestation_record', { id: id, record_type: String(recordType || 'report') }, 'req_arrest_record_');
    return false;
  }

  function openModalRapportArrestation(arg){
    ensureFormData();
    try{ ensureReportEditor(); }catch(err){ console.warn('[MDT] report editor init failed:', err); }
    populateDatalists();
    if(arg && arg.id){
      if(arg.citizen_sid64 || arg.citizen_name){ window.selectedCitizen = { steamid64: String(arg.citizen_sid64 || ''), name: String(arg.citizen_name || 'Citoyen') }; }
      fillReportFromRecord(arg);
    }else{
      if(arg && !arg.id) window.selectedCitizen = arg;
      resetReportState();
    }
    openModal('modal-rapport-arrestation');
    forceEnableReportInputs();
    window.setTimeout(function(){
      forceEnableReportInputs();
      var firstInput = byId('rapport-arrestation-datetime') || byId('rapport-arrestation-possession');
      try{ if(firstInput && typeof firstInput.focus === 'function') firstInput.focus(); }catch(e){}
    }, 0);
    return false;
  }

  function openModalDossierArrestation(citizen){
    ensureFormData();
    try{ ensureDossierEditor(); }catch(err){ console.warn('[MDT] dossier editor init failed:', err); }
    if(citizen) window.selectedCitizen = citizen;
    populateDatalists();
    resetDossierState();
    openModal('modal-dossier-arrestation');
    return false;
  }

  function closeModalRapportArrestation(){ return closeModal('modal-rapport-arrestation'); }
  function closeModalDossierArrestation(){ return closeModal('modal-dossier-arrestation'); }

  async function submitRapportArrestation(){
    if(REPORT_STATE.submitLock) return false;
    var draft = gatherReportDraft();
    if(!validateReportDraft(draft)) return false;
    var submitBtn = byId('rapport-arrestation-submit-btn');
    REPORT_STATE.submitLock = true;
    clearTimeoutSafe(REPORT_STATE.submitTimeout);
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = REPORT_STATE.editingId ? 'Enregistrement…' : 'Création…'; }
    try{
      var uploaded = await uploadPendingProofs(REPORT_STATE, 'rapport-arrestation-evidence-folder', 'RAPPORT-ARREST', 'Preuves rapport arrestation', 'req_rapport_photo_add_');
      var existingCount = Number(REPORT_STATE.editingRecord && REPORT_STATE.editingRecord.pasted_images_count || 0) || 0;
      draft.pasted_images_count = existingCount + Number(uploaded.count || 0);
      draft.evidence_folder_ref = uploaded.folder_ref || draft.evidence_folder_ref;
      draft.evidence_folder_label = uploaded.folder_label || draft.evidence_folder_label;
      req(REPORT_STATE.editingId ? 'update_arrestation' : 'creer_rapport_arrestation', draft, REPORT_STATE.editingId ? 'req_arrestation_update_' : 'req_rapport_arrestation_create_');
      REPORT_STATE.submitTimeout = window.setTimeout(function(){
        if(!REPORT_STATE.submitLock) return;
        REPORT_STATE.submitLock = false;
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = REPORT_STATE.editingId ? 'Modifier le rapport d\'arrestation' : 'Enregistrer le rapport d\'arrestation'; }
        if(typeof window.showToast === 'function') window.showToast('⚠️ Le serveur ne répond pas', { action: 'rapport d\'arrestation' }, true);
      }, 15000);
    }catch(err){
      REPORT_STATE.submitLock = false;
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = REPORT_STATE.editingId ? 'Modifier le rapport d\'arrestation' : 'Enregistrer le rapport d\'arrestation'; }
      if(typeof window.showToast === 'function') window.showToast('⚠️ Upload photo impossible', String(err || 'Échec de l\'envoi des photos preuves.'), true);
    }
    return false;
  }

  async function submitDossierArrestation(){
    if(DOSSIER_STATE.submitLock) return false;
    var draft = gatherDossierDraft();
    if(!validateDossierDraft(draft)) return false;
    var submitBtn = byId('dossier-arrestation-submit-btn');
    DOSSIER_STATE.submitLock = true;
    clearTimeoutSafe(DOSSIER_STATE.submitTimeout);
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Création…'; }
    try{
      var uploaded = await uploadPendingProofs(DOSSIER_STATE, 'dossier-arrestation-evidence-folder', 'DOSSIER-JUSTICE', 'Preuves dossier justice', 'req_dossier_photo_add_');
      draft.pasted_images_count = Number(uploaded.count || 0);
      draft.evidence_folder_ref = uploaded.folder_ref || draft.evidence_folder_ref;
      draft.evidence_folder_label = uploaded.folder_label || draft.evidence_folder_label;
      req('creer_dossier_justice', draft, 'req_dossier_justice_');
      DOSSIER_STATE.submitTimeout = window.setTimeout(function(){
        if(!DOSSIER_STATE.submitLock) return;
        DOSSIER_STATE.submitLock = false;
        if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Ajouter le dossier d\'arrestation'; }
        if(typeof window.showToast === 'function') window.showToast('⚠️ Le serveur ne répond pas', { action: 'dossier d\'arrestation' }, true);
      }, 15000);
    }catch(err){
      DOSSIER_STATE.submitLock = false;
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Ajouter le dossier d\'arrestation'; }
      if(typeof window.showToast === 'function') window.showToast('⚠️ Upload photo impossible', String(err || 'Échec de l\'envoi des photos preuves.'), true);
    }
    return false;
  }

  function bindActions(){
    if(document.__mdtArrestationSplitBound) return;
    document.__mdtArrestationSplitBound = true;

    function bindClick(id, fn){ var el = byId(id); if(el && !el.__bound){ el.__bound = true; el.addEventListener('click', fn, false); } }
    function bindEnter(id, fn){ var el = byId(id); if(el && !el.__boundEnter){ el.__boundEnter = true; el.addEventListener('keydown', function(ev){ if(ev.key === 'Enter'){ ev.preventDefault(); fn(ev); } }, false); } }

    bindClick('arrest-open-create-btn', function(ev){ ev.preventDefault(); openModalRapportArrestation(); });
    bindClick('citizen-open-rapport-arrest-btn', function(ev){ ev.preventDefault(); if(window.selectedCitizen) openModalRapportArrestation(window.selectedCitizen); else openModalRapportArrestation(); });
    bindClick('citizen-open-dossier-arrest-btn', function(ev){ ev.preventDefault(); if(window.selectedCitizen) openModalDossierArrestation(window.selectedCitizen); else openModalDossierArrestation(); });
    bindClick('rapport-arrestation-agents-add-btn', function(ev){ ev.preventDefault(); addReportAgentFromInput(); });
    bindEnter('rapport-arrestation-agents-input', function(){ addReportAgentFromInput(); });
    bindClick('dossier-arrestation-agents-add-btn', function(ev){ ev.preventDefault(); addDossierAgentFromInput(); });
    bindEnter('dossier-arrestation-agents-input', function(){ addDossierAgentFromInput(); });
    bindClick('dossier-arrestation-participant-add-btn', function(ev){ ev.preventDefault(); addParticipantFromInput(); });
    bindEnter('dossier-arrestation-participant-input', function(){ addParticipantFromInput(); });
    bindClick('dossier-arrestation-charge-add-btn', function(ev){
      ev.preventDefault();
      var select = byId('dossier-arrestation-charge-select');
      var id = String((select && select.value) || '').trim();
      if(!id) return;
      if(DOSSIER_STATE.charges.some(function(charge){ return String(charge.id || charge).trim() === id; })) return;
      var found = findChargeById(id);
      DOSSIER_STATE.charges.push(found ? { id: found.id, label: found.label, fine: found.fine, time: found.time } : { id: id, label: id });
      renderCharges();
      if(select) select.value = '';
    });
    bindClick('dossier-arrestation-vehicle-add-btn', function(ev){
      ev.preventDefault();
      var form = byId('dossier-arrestation-vehicle-form');
      if(form && form.style.display === 'none'){
        toggleInlineDraftForm('dossier-arrestation-vehicle', true);
        var modelInput = byId('dossier-arrestation-vehicle-model');
        if(modelInput && typeof modelInput.focus === 'function') modelInput.focus();
        return;
      }
      var model = getValue('dossier-arrestation-vehicle-model');
      var plate = getValue('dossier-arrestation-vehicle-plate');
      if(!model || !plate){ if(typeof window.showToast === 'function') window.showToast('⚠️ Véhicule incomplet', 'Renseigne le modèle et la plaque.', true); return; }
      DOSSIER_STATE.vehicles.push({ model: model, plate: plate, stolen: getChecked('dossier-arrestation-vehicle-stolen') ? 1 : 0 });
      renderVehicles();
      resetVehicleInlineForm(true);
    });
    bindClick('dossier-arrestation-weapon-add-btn', function(ev){
      ev.preventDefault();
      var form = byId('dossier-arrestation-weapon-form');
      if(form && form.style.display === 'none'){
        toggleInlineDraftForm('dossier-arrestation-weapon', true);
        var modelInput = byId('dossier-arrestation-weapon-model');
        if(modelInput && typeof modelInput.focus === 'function') modelInput.focus();
        return;
      }
      var model = getValue('dossier-arrestation-weapon-model');
      var serial = getValue('dossier-arrestation-weapon-serial');
      if(!model || !serial){ if(typeof window.showToast === 'function') window.showToast('⚠️ Arme incomplète', 'Renseigne le modèle et le numéro de série.', true); return; }
      DOSSIER_STATE.weapons.push({ model: model, serial: serial, ammo: Number(getValue('dossier-arrestation-weapon-ammo') || 0) || 0, used: getChecked('dossier-arrestation-weapon-used') ? 1 : 0 });
      renderWeapons();
      resetWeaponInlineForm(true);
    });

    document.addEventListener('click', function(ev){
      var btn;
      btn = ev.target && ev.target.closest ? ev.target.closest('[data-report-agent-remove]') : null;
      if(btn){ ev.preventDefault(); var i = Number(btn.getAttribute('data-report-agent-remove') || -1); if(i >= 0){ REPORT_STATE.agents.splice(i, 1); renderChipList('rapport-arrestation-agents-list', REPORT_STATE.agents, 'data-report-agent-remove'); } return; }
      btn = ev.target && ev.target.closest ? ev.target.closest('[data-dossier-agent-remove]') : null;
      if(btn){ ev.preventDefault(); var i2 = Number(btn.getAttribute('data-dossier-agent-remove') || -1); if(i2 >= 0){ DOSSIER_STATE.agents.splice(i2, 1); renderChipList('dossier-arrestation-agents-list', DOSSIER_STATE.agents, 'data-dossier-agent-remove'); } return; }
      btn = ev.target && ev.target.closest ? ev.target.closest('[data-dossier-participant-remove]') : null;
      if(btn){ ev.preventDefault(); var p = Number(btn.getAttribute('data-dossier-participant-remove') || -1); if(p >= 0){ DOSSIER_STATE.participants.splice(p, 1); renderParticipants(); } return; }
      btn = ev.target && ev.target.closest ? ev.target.closest('[data-dossier-charge-remove]') : null;
      if(btn){ ev.preventDefault(); var c = Number(btn.getAttribute('data-dossier-charge-remove') || -1); if(c >= 0){ DOSSIER_STATE.charges.splice(c, 1); renderCharges(); } return; }
      btn = ev.target && ev.target.closest ? ev.target.closest('[data-dossier-vehicle-remove]') : null;
      if(btn){ ev.preventDefault(); var v = Number(btn.getAttribute('data-dossier-vehicle-remove') || -1); if(v >= 0){ DOSSIER_STATE.vehicles.splice(v, 1); renderVehicles(); } return; }
      btn = ev.target && ev.target.closest ? ev.target.closest('[data-dossier-weapon-remove]') : null;
      if(btn){ ev.preventDefault(); var w = Number(btn.getAttribute('data-dossier-weapon-remove') || -1); if(w >= 0){ DOSSIER_STATE.weapons.splice(w, 1); renderWeapons(); } return; }
    }, false);
  }

  function init(){
    try{ ensureReportEditor(); }catch(err){ console.warn('[MDT] report editor bootstrap failed:', err); }
    try{ ensureDossierEditor(); }catch(err){ console.warn('[MDT] dossier editor bootstrap failed:', err); }
    ensureFormData();
    populatePrecinctSelect('rapport-arrestation-precinct', PRECINCT_OPTIONS[0]);
    populatePrecinctSelect('dossier-arrestation-precinct', PRECINCT_OPTIONS[0]);
    populateFineScaleSelect('dossier-arrestation-fine-scale', 'Nominal');
    populateChargeSelect();
    populateLawyerSelect();
    populateDatalists();
    populateRemoteSelects();
    bindProofArea('rapport-arrestation-proof-drop', 'rapport-arrestation-proof-preview', REPORT_STATE);
    bindProofArea('dossier-arrestation-proof-drop', 'dossier-arrestation-proof-preview', DOSSIER_STATE);
    bindActions();
    resetReportState();
    resetDossierState();
  }

  function openModalArrestationLegacy(arg, options){
    var mode = String(options && options.record_type || '').toLowerCase();
    if(mode === 'dossier' || mode === 'justice') return openModalDossierArrestation(arg);
    return openModalRapportArrestation(arg);
  }

  window.openModalRapportArrestation = openModalRapportArrestation;
  window.closeModalRapportArrestation = closeModalRapportArrestation;
  window.submitRapportArrestation = submitRapportArrestation;
  window.openModalDossierArrestation = openModalDossierArrestation;
  window.closeModalDossierArrestation = closeModalDossierArrestation;
  window.submitDossierArrestation = submitDossierArrestation;
  window.openArrestationRecordById = openArrestationRecordById;
  window.closeArrestationRecordModal = closeArrestationRecordModal;
  window.openModalArrestation = openModalArrestationLegacy;

  if(typeof window.__mdt_addResponseHook === 'function') window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
    if(reqId && reqId.indexOf('req_arrestation_form_') === 0){
      if(ok){ FORM_DATA = { reports: toArray(data.reports), evidence_folders: toArray(data.evidence_folders) }; FORM_LOADED = true; populateRemoteSelects(); }
      return true;
    }
    if(reqId && reqId.indexOf('req_rapport_photo_add_') === 0){
      var pendingA = REPORT_STATE.pendingUploads[reqId]; delete REPORT_STATE.pendingUploads[reqId];
      if(pendingA){ if(ok) pendingA.resolve(data || {}); else pendingA.reject(err || (data && data.message) || 'upload_photo_echec'); }
      return true;
    }
    if(reqId && reqId.indexOf('req_dossier_photo_add_') === 0){
      var pendingB = DOSSIER_STATE.pendingUploads[reqId]; delete DOSSIER_STATE.pendingUploads[reqId];
      if(pendingB){ if(ok) pendingB.resolve(data || {}); else pendingB.reject(err || (data && data.message) || 'upload_photo_echec'); }
      return true;
    }
    if(reqId && (reqId.indexOf('req_arrestation_create_') === 0 || reqId.indexOf('req_rapport_arrestation_create_') === 0 || reqId.indexOf('req_arrestation_update_') === 0)){
      clearTimeoutSafe(REPORT_STATE.submitTimeout); REPORT_STATE.submitTimeout = null; REPORT_STATE.submitLock = false;
      var btnA = byId('rapport-arrestation-submit-btn');
      if(btnA){ btnA.disabled = false; btnA.textContent = REPORT_STATE.editingId ? 'Modifier le rapport d\'arrestation' : 'Enregistrer le rapport d\'arrestation'; }
      if(ok){
        var created = data && (data.report || data) ? (data.report || data) : null;
        if(created) created.record_type = 'report';
        if(created && typeof window.pushArrestIntoCitizenHistory === 'function') window.pushArrestIntoCitizenHistory(created);
        closeModalRapportArrestation();
        resetReportState();
        if(typeof window.showToast === 'function') window.showToast(reqId.indexOf('req_arrestation_update_') === 0 ? '✓ Rapport modifié' : '✓ Rapport ajouté', reqId.indexOf('req_arrestation_update_') === 0 ? 'Le rapport a été mis à jour.' : 'Le rapport a été enregistré.', false);
        if(typeof window.afterCreateArrestation === 'function') window.afterCreateArrestation(created || null);
      }else if(typeof window.showToast === 'function') window.showToast('⚠️ Création impossible', { erreur: err || (data && data.message) || 'Erreur inconnue' }, true);
      return true;
    }
    if(reqId && reqId.indexOf('req_dossier_justice_') === 0){
      clearTimeoutSafe(DOSSIER_STATE.submitTimeout); DOSSIER_STATE.submitTimeout = null; DOSSIER_STATE.submitLock = false;
      var btnB = byId('dossier-arrestation-submit-btn');
      if(btnB){ btnB.disabled = false; btnB.textContent = 'Ajouter le dossier d\'arrestation'; }
      if(ok){
        var createdDossier = data && (data.dossier || data.record || data) ? (data.dossier || data.record || data) : null;
        if(createdDossier){ createdDossier.record_type = 'dossier'; }
        if(createdDossier && typeof window.pushArrestIntoCitizenHistory === 'function') window.pushArrestIntoCitizenHistory(createdDossier);
        closeModalDossierArrestation();
        resetDossierState();
        if(typeof window.showToast === 'function') window.showToast('✓ Dossier justice ajouté', 'Le dossier a été enregistré dans la base Justice.', false);
      }else if(typeof window.showToast === 'function') window.showToast('⚠️ Création impossible', { erreur: err || (data && data.message) || 'Erreur inconnue' }, true);
      return true;
    }
    if(reqId && reqId.indexOf('req_arrest_record_') === 0){
      if(ok){
        var fetched = data && (data.record || data.dossier || data.report || data) ? (data.record || data.dossier || data.report || data) : null;
        if(fetched) openArrestationRecordModal(fetched, data && data.record_type || fetched && fetched.record_type || 'report');
      }else if(typeof window.showToast === 'function') window.showToast('⚠️ Lecture impossible', err || (data && data.message) || 'Erreur inconnue', true);
      return true;
    }
    return false;
  });

  if(typeof window.__mdt_addDataHook === 'function'){
    window.__mdt_addDataHook('citizens', function(){ populateLawyerSelect(); populateDatalists(); });
    window.__mdt_addDataHook('officers', function(){ populateDatalists(); });
  }

  if(typeof window.__mdt_addAfterInitHook === 'function') window.__mdt_addAfterInitHook(init);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
});
