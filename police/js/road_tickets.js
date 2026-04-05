window.__mdtModule('road_tickets', function(){
(function(){
  if(window.__mdt_road_tickets_loaded) return;
  window.__mdt_road_tickets_loaded = true;

  const PAGE_NAME = 'vehicle-tickets';
  let ROAD_TICKETS = [];
  let ROAD_TICKET_FORM = { citizen: null, officer: null, vehicles: [], infractions: [], proposed_number: '' };
  let ROAD_TICKET_SUBMIT_BUSY = false;
  let ROAD_TICKET_LAST_SIG = '';
  let ROAD_TICKET_LAST_AT = 0;

  function req(action, data, prefix){
    const reqId = String(prefix || 'req_road_ticket_') + Date.now();
    try{ if(typeof window.loReq === 'function'){ window.loReq(action, data || {}, reqId); return reqId; } }catch(e){}
    try{ if(window.mdtBridge && window.mdtBridge.request){ window.mdtBridge.request(action, JSON.stringify(data || {}), reqId); return reqId; } }catch(e){}
    console.log('MDT>>' + JSON.stringify({ action: action, reqId: reqId, data: data || {} }));
    return reqId;
  }

  function escSafe(v){
    if(typeof window.esc === 'function') return window.esc(v);
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escAttrSafe(v){
    if(typeof window.escAttr === 'function') return window.escAttr(v);
    return escSafe(v).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatDateTimeInput(value){
    const raw = String(value || '').trim();
    if(!raw) return '';
    const normalized = raw.replace(' ', 'T');
    const d = new Date(normalized);
    if(isNaN(d.getTime())) return normalized.slice(0, 16);
    const p = function(v){ return String(v).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function formatShortDate(value){
    const raw = String(value || '').trim();
    if(!raw) return '—';
    const d = new Date(raw.replace(' ', 'T'));
    if(isNaN(d.getTime())) return raw;
    const p = function(v){ return String(v).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function formatMoney(value){
    const n = Number(value || 0) || 0;
    try{ return n.toLocaleString('fr-FR') + ' $'; }
    catch(e){ return String(n) + ' $'; }
  }

  function setRoadTicketMsg(text, isError){
    const box = document.getElementById('road-ticket-msg');
    if(!box) return;
    if(!text){ box.style.display = 'none'; box.textContent = ''; box.className = 'lo-err lo-ok'; return; }
    box.style.display = 'block';
    box.textContent = String(text);
    box.className = isError ? 'lo-err' : 'lo-err lo-ok';
  }

  function setRoadTicketSubmitBusy(busy){
    ROAD_TICKET_SUBMIT_BUSY = !!busy;
    const btn = document.getElementById('road-ticket-submit-btn');
    if(!btn) return;
    btn.disabled = !!busy;
    btn.textContent = busy ? 'Création…' : 'Créer le ticket';
  }

  function getDefaultTrafficInfractions(){
    const source = Array.isArray(window.MDT_DELITS) ? window.MDT_DELITS : [];
    return source.filter(function(item){
      const label = String(item && item.label || '').toLowerCase();
      const instruction = String(item && item.instruction || '').toLowerCase();
      return instruction.indexOf('ticket routier') !== -1
        || label.indexOf('conduite') !== -1
        || label.indexOf('circulation sans plaques') !== -1
        || label.indexOf('dimanche vert') !== -1
        || label.indexOf('casque') !== -1;
    }).map(function(item){ return { label: String(item.label || ''), amende: Number(item.amende || 0) || 0 }; });
  }

  function ensureRoadTicketFormDefaults(){
    const dt = document.getElementById('road-ticket-datetime');
    if(dt && !dt.value) dt.value = formatDateTimeInput(new Date().toISOString());
  }

  function fillRoadTicketVehicles(){
    const select = document.getElementById('road-ticket-plate-select');
    if(!select) return;
    const vehicles = Array.isArray(ROAD_TICKET_FORM.vehicles) ? ROAD_TICKET_FORM.vehicles : [];
    const opts = ['<option value="">— Sélectionner un véhicule —</option>'];
    vehicles.forEach(function(vehicle){
      const plate = String(vehicle.plate || '').trim();
      const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim();
      const label = plate + (makeModel ? ' · ' + makeModel : '');
      opts.push('<option value="' + escAttrSafe(plate) + '">' + escSafe(label) + '</option>');
    });
    select.innerHTML = opts.join('');
    if(vehicles.length === 1 && !select.value) select.value = String(vehicles[0].plate || '').trim();
  }

  function syncRoadTicketFineFromSelect(){
    const select = document.getElementById('road-ticket-infraction');
    const fine = document.getElementById('road-ticket-fine');
    if(!select || !fine) return;
    const option = select.options[select.selectedIndex];
    const amount = option ? Number(option.getAttribute('data-fine') || 0) || 0 : 0;
    fine.value = formatMoney(amount);
  }

  function fillRoadTicketInfractions(){
    const select = document.getElementById('road-ticket-infraction');
    if(!select) return;
    const infractions = Array.isArray(ROAD_TICKET_FORM.infractions) && ROAD_TICKET_FORM.infractions.length
      ? ROAD_TICKET_FORM.infractions : getDefaultTrafficInfractions();
    ROAD_TICKET_FORM.infractions = infractions;
    const opts = ['<option value="">— Sélectionner une infraction —</option>'];
    infractions.forEach(function(item){
      const label = String(item.label || '').trim();
      const fine = Number(item.amende || 0) || 0;
      opts.push('<option value="' + escAttrSafe(label) + '" data-fine="' + fine + '">' + escSafe(label) + ' · ' + escSafe(formatMoney(fine)) + '</option>');
    });
    select.innerHTML = opts.join('');
    syncRoadTicketFineFromSelect();
  }

  function renderRoadTicketForm(){
    const citizenName = document.getElementById('road-ticket-citizen-name');
    const officerName = document.getElementById('road-ticket-officer-name');
    const number = document.getElementById('road-ticket-number');
    const sid = document.getElementById('road-ticket-citizen-sid64');
    const manualPlate = document.getElementById('road-ticket-plate-manual');
    const location = document.getElementById('road-ticket-location');
    const fine = document.getElementById('road-ticket-fine');
    if(citizenName) citizenName.textContent = (ROAD_TICKET_FORM.citizen && ROAD_TICKET_FORM.citizen.name) || '—';
    if(officerName){
      const officer = ROAD_TICKET_FORM.officer || {};
      const label = [officer.matricule, officer.name].filter(Boolean).join(' · ');
      officerName.textContent = label || '—';
    }
    if(number) number.textContent = ROAD_TICKET_FORM.proposed_number || '—';
    if(sid) sid.value = (ROAD_TICKET_FORM.citizen && ROAD_TICKET_FORM.citizen.sid64) || '';
    if(manualPlate) manualPlate.value = '';
    if(location) location.value = '';
    if(fine) fine.value = formatMoney(0);
    fillRoadTicketVehicles();
    fillRoadTicketInfractions();
    ensureRoadTicketFormDefaults();
  }

  function openRoadTicketModal(){
    const modal = document.getElementById('road-ticket-modal');
    if(!modal) return;
    modal.style.display = 'flex';
    setRoadTicketMsg('', false);
    setRoadTicketSubmitBusy(false);
    renderRoadTicketForm();
  }

  function closeRoadTicketModal(){
    const modal = document.getElementById('road-ticket-modal');
    if(modal) modal.style.display = 'none';
    setRoadTicketMsg('', false);
    setRoadTicketSubmitBusy(false);
  }

  function requestRoadTicketFormData(citizen){
    if(!citizen) return;
    ROAD_TICKET_FORM = {
      citizen: {
        sid64: String(citizen.steamid64 || citizen.sid64 || ''),
        name: [citizen.firstname, citizen.lastname].filter(Boolean).join(' ').trim() || citizen.name || 'Citoyen'
      },
      officer: null,
      vehicles: [],
      infractions: getDefaultTrafficInfractions(),
      proposed_number: ''
    };
    openRoadTicketModal();
    req('get_road_ticket_form_data', {
      citizen_sid64: String(citizen.steamid64 || citizen.sid64 || ''),
      citizen_name: [citizen.firstname, citizen.lastname].filter(Boolean).join(' ').trim() || citizen.name || ''
    }, 'req_road_ticket_form_');
  }

  function buildSubmitPayload(){
    const citizenSid = String(document.getElementById('road-ticket-citizen-sid64')?.value || '').trim();
    const dt = String(document.getElementById('road-ticket-datetime')?.value || '').trim();
    const location = String(document.getElementById('road-ticket-location')?.value || '').trim();
    const plateSelect = String(document.getElementById('road-ticket-plate-select')?.value || '').trim();
    const plateManual = String(document.getElementById('road-ticket-plate-manual')?.value || '').trim().toUpperCase();
    const infractionSelect = document.getElementById('road-ticket-infraction');
    const infraction = String(infractionSelect?.value || '').trim();
    const option = infractionSelect ? infractionSelect.options[infractionSelect.selectedIndex] : null;
    const fineAmount = option ? (Number(option.getAttribute('data-fine') || 0) || 0) : 0;
    const citizen = ROAD_TICKET_FORM.citizen || {};
    return {
      citizen_sid64: citizenSid,
      citizen_name: String(citizen.name || '').trim(),
      ticket_datetime: dt,
      location: location,
      vehicle_plate: plateManual || plateSelect,
      infraction_label: infraction,
      fine_amount: fineAmount
    };
  }

  function submitRoadTicket(){
    const payload = buildSubmitPayload();
    if(!payload.citizen_sid64){ setRoadTicketMsg('Le citoyen lié au ticket est introuvable.', true); return; }
    if(!payload.ticket_datetime){ setRoadTicketMsg('La date du ticket est requise.', true); return; }
    if(!payload.location){ setRoadTicketMsg('Le lieu du contrôle est requis.', true); return; }
    if(!payload.vehicle_plate){ setRoadTicketMsg('La plaque du véhicule est requise.', true); return; }
    if(!payload.infraction_label){ setRoadTicketMsg('Sélectionnez une infraction routière.', true); return; }
    const sig = JSON.stringify(payload);
    const now = Date.now();
    if(ROAD_TICKET_SUBMIT_BUSY){ setRoadTicketMsg('Le ticket est déjà en cours de création.', true); return; }
    if(sig === ROAD_TICKET_LAST_SIG && (now - ROAD_TICKET_LAST_AT) < 5000){ setRoadTicketMsg('Double clic bloqué.', true); return; }
    ROAD_TICKET_LAST_SIG = sig;
    ROAD_TICKET_LAST_AT = now;
    setRoadTicketSubmitBusy(true);
    setRoadTicketMsg('', false);
    req('create_road_ticket', payload, 'req_road_ticket_create_');
  }

  function renderRoadTicketsTable(){
    const body = document.getElementById('road-ticket-table-body');
    if(!body) return;
    if(!ROAD_TICKETS.length){ body.innerHTML = '<tr><td colspan="8" class="armes-empty">Aucun ticket routier enregistré.</td></tr>'; return; }
    body.innerHTML = ROAD_TICKETS.map(function(row){
      const id = Number(row.id || 0);
      return ''
        + '<tr class="arme-row">'
        +   '<td>' + escSafe(formatShortDate(row.ticket_datetime || row.created_at || '')) + '</td>'
        +   '<td>' + escSafe(row.ticket_number || ('#' + id)) + '</td>'
        +   '<td>' + escSafe(row.citizen_name || '—') + '</td>'
        +   '<td>' + escSafe(row.vehicle_plate || '—') + '</td>'
        +   '<td class="road-ticket-col-infraction" title="' + escAttrSafe(row.infraction_label || '—') + '">' + escSafe(row.infraction_label || '—') + '</td>'
        +   '<td>' + escSafe(formatMoney(row.fine_amount || 0)) + '</td>'
        +   '<td>' + escSafe([row.officer_matricule, row.officer_name].filter(Boolean).join(' · ') || '—') + '</td>'
        +   '<td><div class="road-ticket-actions"><button class="road-ticket-open-btn" type="button" onclick="window.viewRoadTicket(' + id + ')">Voir</button></div></td>'
        + '</tr>';
    }).join('');
  }

  function renderRoadTicketViewer(ticket){
    const viewer = document.getElementById('road-ticket-viewer');
    if(!viewer) return;
    if(!ticket){ viewer.innerHTML = '<div class="armes-empty">Ticket introuvable.</div>'; return; }
    viewer.innerHTML = ''
      + '<div class="rt-viewer-title">' + escSafe(ticket.ticket_number || ('Ticket #' + ticket.id)) + '</div>'
      + '<div class="rt-viewer-grid">'
      +   '<div class="rt-viewer-item"><span>Rédigé par</span><strong>' + escSafe([ticket.officer_matricule, ticket.officer_name].filter(Boolean).join(' · ') || '—') + '</strong></div>'
      +   '<div class="rt-viewer-item"><span>Date</span><strong>' + escSafe(formatShortDate(ticket.ticket_datetime || ticket.created_at || '')) + '</strong></div>'
      +   '<div class="rt-viewer-item"><span>Citoyen</span><strong>' + escSafe(ticket.citizen_name || '—') + '</strong></div>'
      +   '<div class="rt-viewer-item"><span>Plaque</span><strong>' + escSafe(ticket.vehicle_plate || '—') + '</strong></div>'
      +   '<div class="rt-viewer-item"><span>Lieu</span><strong>' + escSafe(ticket.location || '—') + '</strong></div>'
      +   '<div class="rt-viewer-item"><span>Amende</span><strong>' + escSafe(formatMoney(ticket.fine_amount || 0)) + '</strong></div>'
      +   '<div class="rt-viewer-item full"><span>Infraction</span><strong>' + escSafe(ticket.infraction_label || '—') + '</strong></div>'
      + '</div>';
  }

  function openRoadTicketViewModal(ticket){
    renderRoadTicketViewer(ticket);
    const modal = document.getElementById('road-ticket-view-modal');
    if(modal) modal.style.display = 'flex';
  }

  function closeRoadTicketViewModal(){
    const modal = document.getElementById('road-ticket-view-modal');
    if(modal) modal.style.display = 'none';
  }

  function requestRoadTicketsList(){ req('get_road_tickets_list', {}, 'req_road_tickets_list_'); }
  function requestRoadTicket(id){ req('get_road_ticket', { id: Number(id || 0) || 0 }, 'req_road_ticket_view_'); }
  function findTicketById(id){ return ROAD_TICKETS.find(function(row){ return Number(row.id || 0) === Number(id || 0); }) || null; }

  window.openRoadTicketFromCitizen = function(citizen){
    if(!citizen){ if(typeof window.showToast === 'function') window.showToast('⚠️ Aucun citoyen sélectionné', null, true); return; }
    requestRoadTicketFormData(citizen);
  };
  window.closeRoadTicketModal = closeRoadTicketModal;
  window.closeRoadTicketViewModal = closeRoadTicketViewModal;
  window.submitRoadTicket = submitRoadTicket;
  window.viewRoadTicket = function(id){
    const existing = findTicketById(id);
    if(existing){ openRoadTicketViewModal(existing); return; }
    requestRoadTicket(id);
  };

  if(typeof window.__mdt_addPageHook === 'function'){
    window.__mdt_addPageHook(function(name){
      if(name === PAGE_NAME){
        const item = document.querySelector('.acc-item[data-page="' + PAGE_NAME + '"]');
        if(item && typeof window.setAccItem === 'function') window.setAccItem(item);
        if(typeof window.ensureSidebarMenuOpen === 'function') window.ensureSidebarMenuOpen('registres', true);
        renderRoadTicketsTable();
        requestRoadTicketsList();
      }
    });
  }

  if(typeof window.__mdt_addResponseHook === 'function'){
    window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
      if(!reqId) return false;
      if(reqId.indexOf('req_road_ticket_form_') === 0){
        if(ok){
          ROAD_TICKET_FORM.officer = data.officer || null;
          ROAD_TICKET_FORM.vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
          ROAD_TICKET_FORM.infractions = Array.isArray(data.infractions) ? data.infractions : getDefaultTrafficInfractions();
          ROAD_TICKET_FORM.proposed_number = String(data.proposed_number || '');
          if(data.citizen){
            ROAD_TICKET_FORM.citizen = {
              sid64: String(data.citizen.sid64 || data.citizen.steamid64 || ((ROAD_TICKET_FORM.citizen || {}).sid64 || '')),
              name: String(data.citizen.name || ((ROAD_TICKET_FORM.citizen || {}).name || ''))
            };
          }
          renderRoadTicketForm();
        }else{
          closeRoadTicketModal();
          if(typeof window.showToast === 'function') window.showToast('⚠️ Impossible d’ouvrir le ticket routier', err || (data && data.message) || null, true);
        }
        return true;
      }
      if(reqId.indexOf('req_road_ticket_create_') === 0){
        setRoadTicketSubmitBusy(false);
        if(ok && data.ticket){
          closeRoadTicketModal();
          requestRoadTicketsList();
          if(typeof window.showToast === 'function') window.showToast('✓ Ticket routier créé', { ticket: data.ticket.ticket_number || ('#' + data.ticket.id) }, false);
          openRoadTicketViewModal(data.ticket);
        }else{
          setRoadTicketMsg(err || (data && data.message) || 'Impossible de créer le ticket.', true);
        }
        return true;
      }
      if(reqId.indexOf('req_road_tickets_list_') === 0){
        if(ok){ ROAD_TICKETS = Array.isArray(data.tickets) ? data.tickets : []; renderRoadTicketsTable(); }
        else{ ROAD_TICKETS = []; renderRoadTicketsTable(); if(typeof window.showToast === 'function') window.showToast('⚠️ Impossible de charger les tickets routiers', err || (data && data.message) || null, true); }
        return true;
      }
      if(reqId.indexOf('req_road_ticket_view_') === 0){
        if(ok && data.ticket) openRoadTicketViewModal(data.ticket);
        else if(typeof window.showToast === 'function') window.showToast('⚠️ Ticket introuvable', err || (data && data.message) || null, true);
        return true;
      }
      return false;
    });
  }

  document.addEventListener('change', function(ev){ if(ev.target && ev.target.id === 'road-ticket-infraction') syncRoadTicketFineFromSelect(); });
  document.addEventListener('input', function(ev){ if(ev.target && ev.target.id === 'road-ticket-plate-manual') ev.target.value = String(ev.target.value || '').toUpperCase(); });
})();
});
