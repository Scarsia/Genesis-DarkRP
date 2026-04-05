window.__mdtModule('warrants', function(){
// MANDATS D'ARRÊT
// ════════════════════════════════════════════════════════════════
window.WARRANTS = window.WARRANTS || [];
let _warrantFilter = 'all';

window.__mdt_set_warrants = function(jsonStr){
  try{
    const parsed = JSON.parse(jsonStr);
    if(!Array.isArray(parsed)) throw new Error('not array');
    window.WARRANTS = parsed;
    renderWarrantsTable();
    // Rafraîchir le KPI mandats si dashboard ouvert
    if(window._dashStats) window._dashStats.active_warrants = window.WARRANTS.filter(w=>w.status==='active').length;
    document.getElementById('kpi-warrants')?.textContent !== undefined &&
      (document.getElementById('kpi-warrants').textContent = window.WARRANTS.filter(w=>w.status==='active').length);
  }catch(e){ console.warn('[MDT] warrants parse error',e); }
};

function requestWarrantsList(){
  try{if(window.mdtBridge&&window.mdtBridge.request){window.mdtBridge.request('get_warrants','{}','req_wrn_'+Date.now());return;}}catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'get_warrants',reqId:'req_wrn_'+Date.now(),data:{}}));
}

const WS_LABELS = {active:'ws-active',executed:'ws-executed',expired:'ws-expired',voided:'ws-voided'};
const WT_LABELS = {arrest:'wt-arrest',search:'wt-search',eviction:'wt-eviction'};
const WT_FR     = {arrest:'Arrestation',search:'Perquisition',eviction:'Expulsion'};
const WS_FR     = {active:'Actif',executed:'Exécuté',expired:'Expiré',voided:'Annulé'};

function renderWarrantsTable(){
  const tbody = document.getElementById('warrants-tbody');
  if(!tbody) return;
  const src = _warrantFilter==='all' ? window.WARRANTS : window.WARRANTS.filter(w=>w.status===_warrantFilter);
  if(src.length===0){
    tbody.innerHTML='<tr><td colspan="7" class="dt-empty">Aucun mandat'+(window.WARRANTS.length===0?' — en attente du serveur…':' pour ce filtre')+'</td></tr>';
    return;
  }
  tbody.innerHTML = src.map(w=>`
    <tr>
      <td><span class="dt-mat" style="font-size:11px">${esc(w.warrant_number||'—')}</span></td>
      <td><span class="wt-type ${WT_LABELS[w.type]||''}">${WT_FR[w.type]||esc(w.type||'—')}</span></td>
      <td><strong>${esc(w.citizen_name||w.citizen_sid64||'—')}</strong></td>
      <td class="dt-phone">${esc(w.issued_by_name||'—')}</td>
      <td style="font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(w.reason||'—')}</td>
      <td><span class="warrant-status ${WS_LABELS[w.status]||'ws-expired'}">${WS_FR[w.status]||esc(w.status||'—')}</span></td>
      <td class="dt-phone">${esc(w.created_at?w.created_at.slice(0,10):'—')}</td>
    </tr>`).join('');
}

function filterWarrants(filter, btn){
  _warrantFilter = filter;
  document.querySelectorAll('#warrant-filter .sf-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderWarrantsTable();
}

// Modal création de mandat
function openWarrantModal(){
  // Pré-remplir le citoyen sélectionné si disponible
  if(window.selectedCitizen){
    document.getElementById('wf-citizen').value = (window.selectedCitizen.firstname+' '+window.selectedCitizen.lastname).trim();
  }
  document.getElementById('warrant-modal').style.display='flex';
}
function closeWarrantModal(){
  document.getElementById('warrant-modal').style.display='none';
  document.getElementById('warrant-msg').style.display='none';
  document.getElementById('wf-citizen').value='';
  document.getElementById('wf-reason').value='';
  document.getElementById('wf-charges').value='';
  document.getElementById('wf-type').value='arrest';
}
function submitWarrant(){
  const citizen = document.getElementById('wf-citizen').value.trim();
  const type    = document.getElementById('wf-type').value;
  const reason  = document.getElementById('wf-reason').value.trim();
  const msgEl   = document.getElementById('warrant-msg');
  if(!citizen){msgEl.className='lo-err';msgEl.textContent='Le nom du citoyen est requis.';msgEl.style.display='block';return;}
  if(!reason) {msgEl.className='lo-err';msgEl.textContent='Le motif est requis.';msgEl.style.display='block';return;}
  msgEl.style.display='none';
  document.getElementById('wf-submit').textContent='Émission…';
  document.getElementById('wf-submit').disabled=true;
  const payload={action:'create_warrant',reqId:'req_wrn_c_'+Date.now(),
    data:{
      citizen_name: citizen,
      citizen_sid64: window.selectedCitizen?.steamid64||'',
      type, reason,
      charges_json: JSON.stringify(document.getElementById('wf-charges').value.split(',').map(s=>s.trim()).filter(Boolean))
    }
  };
  console.log('MDT>>'+JSON.stringify(payload));
  try{if(window.mdtBridge&&window.mdtBridge.request)window.mdtBridge.request(payload.action,JSON.stringify(payload.data),payload.reqId);}catch(e){}
  // Feedback immédiat en attendant réponse serveur
  setTimeout(()=>{
    msgEl.className='lo-ok';msgEl.textContent='Mandat soumis au système.';msgEl.style.display='block';
    document.getElementById('wf-submit').textContent='⚖️ Émettre le mandat';
    document.getElementById('wf-submit').disabled=false;
    setTimeout(()=>closeWarrantModal(),1800);
  },600);
}


// ════════════════════════════════════════════════════════════════


window.requestWarrantsList = requestWarrantsList;
window.filterWarrants = filterWarrants;
window.openWarrantModal = openWarrantModal;
window.closeWarrantModal = closeWarrantModal;
window.submitWarrant = submitWarrant;


});
