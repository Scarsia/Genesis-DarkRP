window.__mdtModule('citizens', function(){
// PAGE CITOYENS — Liste
// ════════════════════════════════════════════════════════════════
function renderCitizenList(){
  const q=(document.getElementById('cit-search').value||'').toLowerCase();
  const list=document.getElementById('cit-list');
  if(CITIZENS.length===0&&!q){
    list.innerHTML=`
      <div class="cit-empty" style="text-align:center;padding:40px 20px;user-select:none">
        <div style="font-size:30px;margin-bottom:10px;opacity:.5">⏳</div>
        <div style="color:var(--text-muted);font-size:12px;font-weight:600">Chargement des citoyens…</div>
        <div style="color:var(--text-dim);font-size:10px;margin-top:4px">Connexion à la base de données</div>
      </div>`;
    return;
  }
  const filtered=CITIZENS.filter(c=>{
    if(!q)return true;
    return (c.firstname+' '+c.lastname).toLowerCase().includes(q)
        || (c.phone||'').includes(q)
        || (c.steamid64||'').includes(q);
  });
  if(filtered.length===0){list.innerHTML='<div class="cit-empty">Aucun résultat</div>';return;}
  list.innerHTML=filtered.map(c=>{
    const initials=(c.firstname[0]||'?')+(c.lastname[0]||'?');
    const badges=(c.wanted?'<div class="dot-wanted" title="Wanted"></div>':'')
                +(c.deceased?'<div class="dot-dead" title="Décédé"></div>':'');
    const _ckey=c.steamid64||String(c.id);
    const isActive=window.selectedCitizen&&(window.selectedCitizen.steamid64===c.steamid64||window.selectedCitizen.id===c.id)?' active':'';
    return `<div class="cit-row${isActive}" onclick="selectCitizen('${c.steamid64||String(c.id)}')">
      <div class="cit-avatar">${initials}</div>
      <div class="cit-row-info">
        <div class="cit-row-name">${c.firstname} ${c.lastname}</div>
        <div class="cit-row-meta">${c.dob} · ${c.phone||'—'}</div>
      </div>
      <div class="cit-badges">${badges}</div>
    </div>`;
  }).join('');
}

function filterCitizens(){renderCitizenList();}


function escHtml(v){
  if(typeof window.esc === 'function') return window.esc(v);
  return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function stripHtmlSafe(html){
  var tmp=document.createElement('div');
  tmp.innerHTML=String(html||'');
  return (tmp.textContent||tmp.innerText||'').replace(/\s+/g,' ').trim();
}
function formatCitizenHistoryDate(value){
  var raw=String(value||'').trim();
  if(!raw) return '—';
  var d=new Date(raw.replace(' ','T'));
  if(isNaN(d.getTime())) return raw;
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()+' · '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function activateCitizenTab(panelId){
  var map={
    'tab-arrests':'.tabs-bar .tab:nth-child(1)',
    'tab-plaintes':'.tabs-bar .tab:nth-child(2)',
    'tab-depositions':'.tabs-bar .tab:nth-child(3)',
    'tab-bracelets':'.tabs-bar .tab:nth-child(4)'
  };
  var el=document.querySelector(map[panelId]||'');
  setTab(el,panelId);
}
function upsertCitizenArrestHistory(list, entry){
  list=Array.isArray(list)?list:[];
  var key=String(entry.record_type||'report')+':' + String(entry.id||0);
  list=list.filter(function(row){ return (String(row.record_type||'report')+':' + String(row.id||0))!==key; });
  list.unshift(entry);
  return list;
}
function pushArrestIntoCitizenHistory(report){
  var sid=String((report&&report.citizen_sid64)||'');
  if(!sid||!Array.isArray(window.CITIZENS)) return;
  var charges=Array.isArray(report.charges)?report.charges:[];
  var chargeLabel=charges.map(function(c){ return c && (c.label||c.id||''); }).filter(Boolean).join(', ');
  var asHistory={
    id:Number(report.id||0),
    report_number:String(report.reference||((String(report.record_type||'report')==='dossier'?'DA-':'RA-')+String(report.id||''))),
    charges:chargeLabel||'—',
    date:formatCitizenHistoryDate(report.created_at||report.updated_at||''),
    precinct:String(report.precinct||'SouthSide'),
    description:stripHtmlSafe(report.body_html||report.body_text||'').slice(0,180),
    officer_name:String(report.officer_name||''),
    source_report:report,
    record_type:String(report.record_type||'report')
  };
  var citizen=window.CITIZENS.find(function(row){ return String(row.steamid64||row.id||'')===sid; });
  if(citizen){
    citizen.arrests=upsertCitizenArrestHistory(citizen.arrests, asHistory);
  }
  if(window.selectedCitizen && String(window.selectedCitizen.steamid64||window.selectedCitizen.id||'')===sid){
    if(window.selectedCitizen!==citizen){
      window.selectedCitizen.arrests=upsertCitizenArrestHistory(window.selectedCitizen.arrests, asHistory);
    }else{
      window.selectedCitizen.arrests=citizen?citizen.arrests:upsertCitizenArrestHistory(window.selectedCitizen.arrests, asHistory);
    }
    renderTabs(window.selectedCitizen);
    activateCitizenTab('tab-arrests');
  }
}



function closeCitizenHistoryMenus(){
  document.querySelectorAll('.cit-history-menu').forEach(function(menu){ menu.style.display='none'; });
}

window.openCitizenArrestRecord = function(id, recordType){
  closeCitizenHistoryMenus();
  if(!id){ if(typeof window.showToast==='function') window.showToast('⚠️ Dossier introuvable', null, true); return false; }
  if(typeof window.openArrestationRecordById === 'function'){
    window.openArrestationRecordById(Number(id||0), String(recordType||'report'));
    return false;
  }
  if(typeof window.showToast==='function') window.showToast("⚠️ Lecture indisponible", "Le module arrestation n'est pas chargé.", true);
  return false;
};

window.openCitizenComplaintRecord = function(id){
  closeCitizenHistoryMenus();
  var numId = Number(id||0);
  if(!numId){ if(typeof window.showToast==='function') window.showToast('⚠️ Plainte introuvable', null, true); return false; }
  if(typeof window.openComplaintRecord === 'function'){
    window.openComplaintRecord(numId);
    return false;
  }
  if(typeof window.setPage === 'function') window.setPage('complaints');
  if(typeof window.viewComplaint === 'function') window.viewComplaint(numId);
  return false;
};

window.openCitizenDepositionRecord = function(id){
  return window.openCitizenComplaintRecord(id);
};

window.toggleCitizenBraceletMenu = function(ev, braceletId){
  if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }catch(e){} }
  var menu = document.getElementById('cit-bracelet-menu-' + String(braceletId||''));
  if(!menu) return false;
  document.querySelectorAll('.cit-history-menu').forEach(function(node){ if(node !== menu) node.style.display='none'; });
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  return false;
};

function __citizenBraceletNow(){
  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes());
}

window.citizenBraceletCheckin = function(id){
  closeCitizenHistoryMenus();
  var braceletId = Number(id||0);
  var value = __citizenBraceletNow();
  if(typeof window.checkinBracelet === 'function'){
    window.checkinBracelet(braceletId, value);
    return false;
  }
  if(typeof window.loReq === 'function'){
    try{
      window.loReq('checkin_bracelet', { id: braceletId, checkin_at: value });
      if(typeof window.showToast==='function') window.showToast('✓ Pointage envoyé', { bracelet: String(braceletId), date: value }, false);
      return false;
    }catch(e){}
  }
  if(typeof window.showToast==='function') window.showToast("⚠️ Action indisponible", "Le module bracelet n'est pas chargé.", true);
  return false;
};

window.citizenBraceletDelete = function(id){
  closeCitizenHistoryMenus();
  var braceletId = Number(id||0);
  if(typeof window.deleteBraceletRecord === 'function'){
    window.deleteBraceletRecord(braceletId);
    return false;
  }
  if(typeof window.loReq === 'function'){
    try{
      window.loReq('delete_bracelet', { id: braceletId });
      if(typeof window.showToast==='function') window.showToast('✓ Suppression envoyée', { bracelet: String(braceletId) }, false);
      return false;
    }catch(e){}
  }
  if(typeof window.showToast==='function') window.showToast("⚠️ Action indisponible", "Le module bracelet n'est pas chargé.", true);
  return false;
};

// ════════════════════════════════════════════════════════════════
// PAGE CITOYENS — Profil
// ════════════════════════════════════════════════════════════════
function selectCitizen(key){
  // Chercher par steamid64 (clé principale) puis par id numérique (fallback)
  const c=CITIZENS.find(x=>x.steamid64===String(key)||String(x.id)===String(key));
  if(!c)return;
  window.selectedCitizen=c;
  renderCitizenList(); // refresh pour .active

  // En-tête
  const initials=(c.firstname[0]||'?')+(c.lastname[0]||'?');
  document.getElementById('prof-avatar').textContent=initials;
  document.getElementById('prof-name').textContent=c.firstname+' '+c.lastname;
  document.getElementById('prof-dob').textContent='Né(e) le '+c.dob;
  document.getElementById('prof-phone').textContent=c.phone||'—';
  document.getElementById('prof-sid').textContent=c.steamid64?'SID: '+c.steamid64:'';

  // Statuts
  const sb=document.getElementById('prof-status-badges');
  sb.innerHTML='';
  if(c.wanted) sb.innerHTML+=`<div class="status-pill status-wanted"><div class="status-dot" style="background:var(--danger)"></div>WANTED</div>`;
  if(c.deceased) sb.innerHTML+=`<div class="status-pill status-dead"><div class="status-dot" style="background:var(--text-dim)"></div>DÉCÉDÉ</div>`;
  if(!c.wanted&&!c.deceased) sb.innerHTML+=`<div class="status-pill status-clean"><div class="status-dot" style="background:var(--success)"></div>CASIER VIDE</div>`;

  // Attributs
  document.getElementById('pi-taille').textContent=c.height?c.height+' cm':'—';
  document.getElementById('pi-poids').textContent=c.weight?c.weight+' kg':'—';
  document.getElementById('pi-sexe').textContent=c.gender||'—';
  document.getElementById('pi-adresse').textContent=c.address||'—';
  document.getElementById('pi-cheveux').textContent=c.hair||'—';
  document.getElementById('pi-yeux').textContent=c.eyes||'—';
  document.getElementById('pi-ethnie').textContent=c.ethnicity||'—';
  document.getElementById('pi-emploi').textContent=c.job||'—';

  // Licences
  setLic('lic-permis',  c.license_drive);
  setLic('lic-ppa-civil', c.ppa_civil);
  setLic('lic-ppa-chasse',c.ppa_hunt);
  setLic('lic-wanted',   c.wanted);
  setLic('lic-deceased', c.deceased);

  // Onglets — reset sur Dossier d'Arrestation
  setTab(document.querySelector('.tabs-bar .tab'),'tab-arrests');
  renderTabs(c);

  // Afficher le profil
  document.getElementById('cit-placeholder').style.display='none';
  const prof=document.getElementById('cit-profile');
  prof.style.display='flex';
  prof.style.flexDirection='column';
  prof.style.flex='1';
  prof.style.overflow='hidden';
}

function setLic(id, valid){
  const el=document.getElementById(id);
  el.className='lic-dot '+(valid?'valid':'invalid');
}

// ════════════════════════════════════════════════════════════════
// ONGLETS HISTORIQUE
// ════════════════════════════════════════════════════════════════
function setTab(el,panelId){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  if(el)el.classList.add('active');
  const pan=document.getElementById(panelId);
  if(pan)pan.classList.add('active');
}

function renderTabs(c){
  // Arrestations
  const ta=document.getElementById('tab-arrests');
  const arrests=(Array.isArray(c.arrests)?c.arrests:[]).filter(function(row,index,arr){
    var key=String(row&&row.record_type||'report')+':' + String(row&&row.id||0);
    return arr.findIndex(function(item){ return (String(item&&item.record_type||'report')+':' + String(item&&item.id||0))===key; })===index;
  });
  if(!arrests.length){ta.innerHTML='<div class="tab-empty">Aucun dossier d\'arrestation</div>';}
  else ta.innerHTML=arrests.map(function(a){
    var rowId=Number(a.id||0);
    var recordType=String(a.record_type||'report');
    var isDossier=recordType==='dossier'||recordType==='justice';
    var ref=escHtml(a.report_number||a.reference||('#'+String(rowId||'')));
    var summary=escHtml(a.charges||a.description||'—');
    var meta=escHtml((a.date||'—') + ' · ' + (a.precinct||'SouthSide'));
    var badge='<span class="badge '+(isDossier?'badge-active':'badge-closed')+'">'+(isDossier?'Copie Justice':'Rapport Police')+'</span>';
    var officer=a.officer_name?'<div class="hist-meta">Rédigé par '+escHtml(a.officer_name)+'</div>':'';
    return '<div class="hist-row hist-row-clickable" onclick="window.openCitizenArrestRecord('+rowId+',\''+escHtml(recordType)+'\')">'
      + '<span class="hist-ico">'+(isDossier?'🗂️':'📋')+'</span>'
      + '<div class="hist-body">'
      +   '<div class="hist-title">'+ref+' — '+summary+'</div>'
      +   '<div class="hist-meta">'+meta+'</div>'
      +   officer
      + '</div>'
      + '<div class="hist-right">'+badge+'<button class="btn btn-sm btn-ghost" type="button" onclick="event.stopPropagation();window.openCitizenArrestRecord('+rowId+',\''+escHtml(recordType)+'\')">Ouvrir</button></div>'
      + '</div>';
  }).join('');

  // Plaintes
  const tp=document.getElementById('tab-plaintes');
  const complaints=Array.isArray(c.complaints)?c.complaints:[];
  if(!complaints.length){tp.innerHTML='<div class="tab-empty">Pas de plainte</div>';}
  else tp.innerHTML=complaints.map(function(p){
    var badgeClass=String(p.status||'').toLowerCase().indexOf('suite')!==-1 || String(p.status||'').toLowerCase().indexOf('clos')!==-1 ? 'badge-closed' : 'badge-active';
    var complaintId=Number(p.row_id||p.complaint_id||p.id||0);
    return '<div class="hist-row hist-row-clickable" onclick="window.openCitizenComplaintRecord('+complaintId+')">'
      + '<span class="hist-ico">📣</span>'
      + '<div class="hist-body">'
      +   '<div class="hist-title">'+escHtml(p.plainte_number||p.id||'Plainte')+' — '+escHtml(p.type||p.motif||'—')+'</div>'
      +   '<div class="hist-meta">'+escHtml(p.date||'—')+' · '+escHtml(p.description||'')+'</div>'
      + '</div>'
      + '<div class="hist-right"><span class="badge '+badgeClass+'">'+escHtml(p.status||'En cours')+'</span></div>'
      + '</div>';
  }).join('');

  // Dépositions
  const td=document.getElementById('tab-depositions');
  const depositions=Array.isArray(c.depositions)?c.depositions:[];
  if(!depositions.length){td.innerHTML='<div class="tab-empty">Pas de déposition</div>';}
  else td.innerHTML=depositions.map(function(d){
    var complaintId=Number(d.complaint_id||d.row_id||0);
    var openAttr=complaintId>0 ? ' onclick="window.openCitizenDepositionRecord('+complaintId+')"' : '';
    return '<div class="hist-row'+(complaintId>0?' hist-row-clickable':'')+'"'+openAttr+'>'
      + '<span class="hist-ico">💬</span>'
      + '<div class="hist-body">'
      +   '<div class="hist-title">'+escHtml(d.id||d.source||'Déposition')+'</div>'
      +   '<div class="hist-meta">'+escHtml(d.date||'—')+' — '+escHtml(d.description||'')+'</div>'
      + '</div>'
      + (complaintId>0 ? '<div class="hist-right"><button class="btn btn-sm btn-ghost" type="button" onclick="event.stopPropagation();window.openCitizenDepositionRecord('+complaintId+')">Ouvrir</button></div>' : '')
      + '</div>';
  }).join('');

  // Bracelets
  const tb=document.getElementById('tab-bracelets');
  if(!c.bracelets||c.bracelets.length===0){tb.innerHTML='<div class="tab-empty">Pas de bracelet</div>';}
  else tb.innerHTML=c.bracelets.map(function(b){
    var bid=Number(b.id||0);
    var checkinMeta='';
    if(b.last_checkin_at){ checkinMeta=' · Pointage : '+escHtml(b.last_checkin_at); }
    else if(Number(b.checkins_count||0)>0){ checkinMeta=' · '+escHtml(String(b.checkins_count))+' pointage(s)'; }
    return '<div class="hist-row">'
      + '<span class="hist-ico">📡</span>'
      + '<div class="hist-body">'
      +   '<div class="hist-title">'+escHtml(String(b.id||'—'))+' — '+escHtml(b.reason||'—')+'</div>'
      +   '<div class="hist-meta">Posé le '+escHtml(b.date||'—')+' · Expire le '+escHtml(b.expiry||'—')+checkinMeta+'</div>'
      + '</div>'
      + '<div class="hist-right">'
      +   '<span class="badge '+(b.status==='active'?'badge-active':'badge-closed')+'">'+escHtml(b.status||'—')+'</span>'
      +   '<div class="cit-history-actions">'
      +     '<button class="ops-more" type="button" onclick="window.toggleCitizenBraceletMenu(event,'+bid+')">⋯</button>'
      +     '<div class="ops-row-menu cit-history-menu" id="cit-bracelet-menu-'+bid+'" style="display:none">'
      +       '<button class="ops-row-menu-item" type="button" onclick="window.citizenBraceletCheckin('+bid+')"><span class="ops-row-menu-ico">📍</span><span>Pointer le citoyen</span></button>'
      +       '<button class="ops-row-menu-item danger" type="button" onclick="window.citizenBraceletDelete('+bid+')"><span class="ops-row-menu-ico">🗑️</span><span>Supprimer le bracelet</span></button>'
      +     '</div>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}


// ════════════════════════════════════════════════════════════════
// BOUTONS D'ACTION SUR UN CITOYEN
// ════════════════════════════════════════════════════════════════
function actionBtn(type){
  if(!window.selectedCitizen){showToast('⚠️ Aucun citoyen sélectionné',null,true);return;}
  if(type==='rapport_arrest'){
    if(typeof window.openModalRapportArrestation==='function'){
      window.openModalRapportArrestation(window.selectedCitizen);
      showToast("📄 Rapport d'arrestation",'Citoyen : '+(window.selectedCitizen.firstname+' '+window.selectedCitizen.lastname).trim());
      return;
    }
    showToast('⚠️ Modale rapport indisponible',null,true);
    return;
  }
  if(type==='dossier_arrest'){
    if(typeof window.openModalDossierArrestation==='function'){
      window.openModalDossierArrestation(window.selectedCitizen);
      showToast("🗂️ Dossier d'arrestation",'Citoyen : '+(window.selectedCitizen.firstname+' '+window.selectedCitizen.lastname).trim());
      return;
    }
    showToast('⚠️ Modale dossier indisponible',null,true);
    return;
  }
  if(type==='ticket'){
    if(typeof window.openRoadTicketFromCitizen==='function'){
      window.openRoadTicketFromCitizen(window.selectedCitizen);
      return;
    }
    showToast('⚠️ Modale ticket indisponible',null,true);
    return;
  }
  if(type==='plainte'){
    if(typeof window.openComplaintFromCitizen==='function'){
      window.__mdtComplaintOrigin='citizens';
      window.__mdtComplaintOpenRegistryOnSuccess=true;
      window.openComplaintFromCitizen(window.selectedCitizen);
      return;
    }
    if(typeof window.openPlainteModal==='function'){
      window.openPlainteModal(null,{citizen:window.selectedCitizen,lockCitizen:true,fromCitizens:true});
      return;
    }
    showToast('⚠️ Modale plainte indisponible',null,true);
    return;
  }
  if(type==='bracelet'){
    if(typeof window.openBraceletFromCitizen==='function'){
      window.openBraceletFromCitizen(window.selectedCitizen);
      return;
    }
    if(typeof window.openBraceletModal==='function'){
      window.openBraceletModal(window.selectedCitizen);
      return;
    }
    showToast('⚠️ Modale bracelet indisponible',null,true);
    return;
  }
  const payload={action:'citizen_action',reqId:'req_'+Date.now(),
    data:{type, citizen_id:window.selectedCitizen.id, citizen_name:window.selectedCitizen.firstname+' '+window.selectedCitizen.lastname, steamid64:window.selectedCitizen.steamid64}};
  console.log('MDT>>'+JSON.stringify(payload));
  try{if(window.mdtBridge&&window.mdtBridge.request)window.mdtBridge.request(payload.action,JSON.stringify(payload.data),payload.reqId);}catch(e){}
  showToast('📤 Action envoyée : '+type,{citizen:window.selectedCitizen.firstname+' '+window.selectedCitizen.lastname});
}

// ════════════════════════════════════════════════════════════════
document.addEventListener('click', function(ev){
  if(!ev.target || !ev.target.closest || !ev.target.closest('.cit-history-actions')) closeCitizenHistoryMenus();
}, false);

// ════════════════════════════════════════════════════════════════


window.renderCitizenList = renderCitizenList;
window.filterCitizens = filterCitizens;
window.selectCitizen = selectCitizen;
window.setLic = setLic;
window.setTab = setTab;
window.renderTabs = renderTabs;
window.actionBtn = actionBtn;
window.activateCitizenTab = activateCitizenTab;
window.pushArrestIntoCitizenHistory = pushArrestIntoCitizenHistory;


});
