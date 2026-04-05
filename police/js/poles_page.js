window.__mdtModule('poles-page', function(){
// PARTIE 2B — PÔLES / SPÉCIALITÉS
// Ajout modulaire : n'écrase pas l'auto-login existant.
// ════════════════════════════════════════════════════════════════
let MDT_POLES = [];
let MDT_POLE_AGENTS = [];
let MDT_POLE_JOBS = [];

window.__mdt_set_poles = function(jsonStr){
  try{
    const parsed = JSON.parse(jsonStr);
    MDT_POLES = Array.isArray(parsed.poles) ? parsed.poles : [];
    MDT_POLE_AGENTS = Array.isArray(parsed.agents) ? parsed.agents : [];
    MDT_POLE_JOBS = Array.isArray(parsed.jobs) ? parsed.jobs : [];
    renderPolesGrid();
    renderManagePolesModal();
    window.__mdt_runDataHooks('poles', { poles: MDT_POLES, agents: MDT_POLE_AGENTS, jobs: MDT_POLE_JOBS });
  }catch(e){
    console.warn('[MDT] __mdt_set_poles parse error', e);
  }
};

function requestPolesList(){
  try{
    if(window.mdtBridge && window.mdtBridge.request){
      window.mdtBridge.request('get_poles_list', '{}', 'req_poles_refresh_'+Date.now());
      return;
    }
  }catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'get_poles_list', reqId:'req_poles_refresh_'+Date.now(), data:{}}));
}

function poleAgentDisplay(agent){
  const full = ((agent.firstname||'') + ' ' + (agent.lastname||'')).trim() || agent.name || agent.fullname || 'Agent inconnu';
  const phone = agent.phone || '—';
  const mat = agent.matricule || agent.badge_number || '—';
  return { full, phone, mat };
}

function getPoleById(id){
  const n = Number(id||0);
  return MDT_POLES.find(p=>Number(p.id)===n) || null;
}

function findAgentBySid(sid){
  return MDT_POLE_AGENTS.find(a=>String(a.steamid64||'')===String(sid||'')) || null;
}

function getPoleJobs(){
  const byId = new Map();

  (MDT_POLE_JOBS || []).forEach(function(job){
    const id = String(job.id || job.command || job.name || '').trim();
    const name = String(job.name || job.label || job.command || id || '').trim();
    if(id) byId.set(id, { id:id, name:name || id });
  });

  (MDT_POLE_AGENTS || []).forEach(function(agent){
    const currentJob = String(agent.current_job || '').trim();
    if(currentJob && !byId.has(currentJob)){
      byId.set(currentJob, { id: currentJob, name: currentJob });
    }
  });

  (MDT_POLES || []).forEach(function(pole){
    const linked = String(pole.linked_job || '').trim();
    if(linked && !byId.has(linked)){
      byId.set(linked, { id: linked, name: linked });
    }
  });

  return Array.from(byId.values()).sort(function(a,b){
    return String(a.name).localeCompare(String(b.name), 'fr');
  });
}

function buildManagePoleJobOptions(selectedValue){
  const current = String(selectedValue || '');
  const options = ['<option value="">— Aucun métier spécifique —</option>'];

  getPoleJobs().forEach(function(job){
    const id = String(job.id || '');
    const name = String(job.name || id || '');
    options.push('<option value="' + escAttr(id) + '"' + (id === current ? ' selected' : '') + '>' + esc(name) + '</option>');
  });

  return options.join('');
}

function buildManageAgentOptions(selectedSid){
  const current = String(selectedSid || '');
  const agents = (MDT_POLE_AGENTS || []).slice().sort(function(a,b){
    return poleAgentDisplay(a).full.localeCompare(poleAgentDisplay(b).full, 'fr');
  });

  const options = ['<option value="">Aucun</option>'];

  agents.forEach(function(agent){
    const sid = String(agent.steamid64 || '');
    const d = poleAgentDisplay(agent);
    const label = d.phone && d.phone !== '—' ? (d.full + ' (' + d.phone + ')') : d.full;
    options.push('<option value="' + escAttr(sid) + '"' + (sid === current ? ' selected' : '') + '>' + esc(label) + '</option>');
  });

  return options.join('');
}

function renderPolesGrid(){
  const grid = document.getElementById('poles-grid');
  const count = document.getElementById('poles-count');
  if(!grid) return;

  if(count) count.textContent = MDT_POLES.length + ' pôle' + (MDT_POLES.length > 1 ? 's' : '');

  if(!MDT_POLES.length){
    grid.innerHTML = '<div class="pole-empty">Aucun pôle enregistré pour le moment.</div>';
    return;
  }

  grid.innerHTML = MDT_POLES.map(function(pole){
    const members = Array.isArray(pole.members) ? pole.members : [];
    const countMembers = Number(pole.members_count || members.length || 0);
    const lead = esc(pole.lead_name || '—');
    const coLead = esc(pole.co_lead_name || '—');
    const supervisor = pole.supervisor_name ? '<div><span class="muted">Superviseur :</span> ' + esc(pole.supervisor_name) + '</div>' : '';
    const linkedJob = pole.linked_job ? '<div class="pole-current-link">job: ' + esc(pole.linked_job) + '</div>' : '';

    const memberHtml = members.length
      ? '<ul class="pole-member-list">' + members.map(function(member){
          const display = poleAgentDisplay(member);
          return '<li>' + esc(display.full) + ' (' + esc(display.phone) + ')</li>';
        }).join('') + '</ul>'
      : '<div class="pole-empty-members">Aucun membre dans ce pôle.</div>';

    return ''
      + '<div class="pole-card">'
      +   '<div class="pole-card-title">' + esc(pole.nom_pole || 'Pôle sans nom') + ' <span>(' + countMembers + ')</span></div>'
      +   '<div class="pole-divider"></div>'
      +   '<div class="pole-meta">'
      +     '<div><span class="muted">Lead :</span> ' + lead + '</div>'
      +     '<div><span class="muted">Co-Lead :</span> ' + coLead + '</div>'
      +      supervisor
      +      linkedJob
      +   '</div>'
      +   '<div class="pole-divider"></div>'
      +   '<div class="pole-section-title">Membres :</div>'
      +   memberHtml
      + '</div>';
  }).join('');
}

function renderManagePolesModal(){
  const jobSelect = document.getElementById('manage-pole-job');
  if(jobSelect){
    const keep = String(jobSelect.value || '');
    jobSelect.innerHTML = buildManagePoleJobOptions(keep);
  }

  const list = document.getElementById('manage-poles-list');
  if(!list) return;

  if(!MDT_POLES.length){
    list.innerHTML = '<div class="manage-poles-empty">Aucun pôle enregistré.</div>';
    return;
  }

  list.innerHTML = MDT_POLES.map(function(pole){
    const poleId = Number(pole.id || 0);

    return ''
      + '<div class="manage-poles-row" data-pole-id="' + poleId + '">'
      +   '<div class="manage-poles-row-name">' + esc(pole.nom_pole || 'Pôle sans nom') + '</div>'
      +   '<label class="manage-poles-inline-select">'
      +     '<span class="manage-poles-inline-prefix">Lead :</span>'
      +     '<select onchange="updateManagePoleLead(' + poleId + ', this.value)">'
      +        buildManageAgentOptions(pole.lead_sid)
      +     '</select>'
      +   '</label>'
      +   '<label class="manage-poles-inline-select">'
      +     '<span class="manage-poles-inline-prefix">Co-Lead :</span>'
      +     '<select onchange="updateManagePoleCoLead(' + poleId + ', this.value)">'
      +        buildManageAgentOptions(pole.co_lead_sid)
      +     '</select>'
      +   '</label>'
      +   '<button class="btn btn-danger btn-sm manage-poles-delete" type="button" title="Supprimer ce pôle" onclick="deleteManagePole(' + poleId + ')">🗑️</button>'
      + '</div>';
  }).join('');
}

function openPolesManager(){
  const modal = document.getElementById('poles-modal');
  if(!modal) return;
  modal.style.display = 'flex';
  renderManagePolesModal();
  requestPolesList();
  setTimeout(function(){
    const input = document.getElementById('manage-pole-name');
    if(input) input.focus();
  }, 0);
}

function closePolesManager(){
  const modal = document.getElementById('poles-modal');
  if(modal) modal.style.display = 'none';
}

function createManagePole(){
  const payload = {
    nom_pole: (document.getElementById('manage-pole-name')?.value || '').trim(),
    linked_job: (document.getElementById('manage-pole-job')?.value || '').trim(),
    lead_sid: '',
    co_lead_sid: '',
    supervisor_sid: ''
  };

  if(!payload.nom_pole){
    showToast('⚠️ Nom du pôle requis', null, true);
    return;
  }

  const reqId = 'req_poles_save_' + Date.now();
  try{
    if(window.mdtBridge && window.mdtBridge.request){
      window.mdtBridge.request('save_pole', JSON.stringify(payload), reqId);
      return;
    }
  }catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'save_pole', reqId:reqId, data:payload}));
}

function updateManagePoleLead(id, leadSid){
  const pole = getPoleById(id);
  if(!pole) return;

  const payload = {
    id: Number(id),
    nom_pole: String(pole.nom_pole || '').trim(),
    linked_job: String(pole.linked_job || '').trim(),
    lead_sid: String(leadSid || ''),
    co_lead_sid: String(pole.co_lead_sid || ''),
    supervisor_sid: String(pole.supervisor_sid || '')
  };

  const reqId = 'req_poles_save_' + Date.now();
  try{
    if(window.mdtBridge && window.mdtBridge.request){
      window.mdtBridge.request('save_pole', JSON.stringify(payload), reqId);
      return;
    }
  }catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'save_pole', reqId:reqId, data:payload}));
}

function updateManagePoleCoLead(id, coLeadSid){
  const pole = getPoleById(id);
  if(!pole) return;

  const payload = {
    id: Number(id),
    nom_pole: String(pole.nom_pole || '').trim(),
    linked_job: String(pole.linked_job || '').trim(),
    lead_sid: String(pole.lead_sid || ''),
    co_lead_sid: String(coLeadSid || ''),
    supervisor_sid: String(pole.supervisor_sid || '')
  };

  const reqId = 'req_poles_save_' + Date.now();
  try{
    if(window.mdtBridge && window.mdtBridge.request){
      window.mdtBridge.request('save_pole', JSON.stringify(payload), reqId);
      return;
    }
  }catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'save_pole', reqId:reqId, data:payload}));
}

function deleteManagePole(id){
  if(!confirm('Supprimer ce pôle ?')) return;
  const reqId = 'req_poles_delete_' + Date.now();
  const payload = { id: Number(id) };
  try{
    if(window.mdtBridge && window.mdtBridge.request){
      window.mdtBridge.request('delete_pole', JSON.stringify(payload), reqId);
      return;
    }
  }catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'delete_pole', reqId:reqId, data:payload}));
}

document.addEventListener('keydown', function(ev){
  if(ev.key !== 'Escape') return;
  const modal = document.getElementById('poles-modal');
  if(!modal) return;
  if(modal.style.display === 'none' || !modal.style.display) return;
  closePolesManager();
});

// Escape HTML helper (used in table rendering)


window.requestPolesList = requestPolesList;
window.renderPolesGrid = renderPolesGrid;
window.openPolesManager = openPolesManager;
window.closePolesManager = closePolesManager;
window.createManagePole = createManagePole;
window.updateManagePoleLead = updateManagePoleLead;
window.updateManagePoleCoLead = updateManagePoleCoLead;
window.deleteManagePole = deleteManagePole;


});
