window.__mdtModule('my_reports', function(){
(function(){
  if(window.__mdt_my_reports_loaded) return;
  window.__mdt_my_reports_loaded = true;

  const MY_PAGES = new Set(['interrogatoires', 'mes-rapports']);
  let MY_REPORTS = [];

  function req(action, data, prefix){
    const reqId = String(prefix || 'req_my_reports_') + Date.now();

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

  function formatShortDate(value){
    const raw = String(value || '').trim();
    if(!raw) return '—';
    const d = new Date(raw.replace(' ', 'T'));
    if(isNaN(d.getTime())) return raw;

    const p = function(v){ return String(v).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function renderMyReports(){
    const body = document.getElementById('mes-rapports-table-body');
    if(!body) return;

    if(!MY_REPORTS.length){
      body.innerHTML = '<tr><td colspan="4" class="armes-empty">Aucun rapport d\'incident rédigé par cet officier.</td></tr>';
      return;
    }

    body.innerHTML = MY_REPORTS.map(function(row){
      const id = Number(row.id || 0);
      return ''
        + '<tr class="arme-row">'
        +   '<td>' + esc(formatShortDate(row.operation_datetime || row.created_at || '')) + '</td>'
        +   '<td class="my-reports-cell-type" title="' + escAttr(row.incident_type || '—') + '">' + esc(row.incident_type || '—') + '</td>'
        +   '<td class="my-reports-cell-location" title="' + escAttr(row.location || '—') + '">' + esc(row.location || '—') + '</td>'
        +   '<td>'
        +     '<div class="my-reports-actions">'
        +       '<button class="my-reports-open-btn" type="button" onclick="window.openMyOperationReport(' + id + ')">Ouvrir</button>'
        +     '</div>'
        +   '</td>'
        + '</tr>';
    }).join('');
  }

  function requestMyReports(){
    const currentId = String(window.current_user_id || '').trim();
    req('get_mes_rapports', { mon_id: currentId }, 'req_my_reports_');
  }

  window.openMyOperationReport = function(id){
    const reportId = Number(id || 0);
    if(!reportId) return;

    window.__mdtPendingOperationReportId = reportId;

    if(typeof window.ensureSidebarMenuOpen === 'function') window.ensureSidebarMenuOpen('registres', true);
    if(typeof window.setPage === 'function') window.setPage('operations');

    const target = document.querySelector('.acc-item[data-page="operations"]');
    if(target && typeof window.setAccItem === 'function') window.setAccItem(target);
  };

  if(typeof window.__mdt_addPageHook === 'function'){
    window.__mdt_addPageHook(function(name){
      if(MY_PAGES.has(name)){
        const item = document.querySelector('.acc-item[data-page="' + name + '"]');
        if(item && typeof window.setAccItem === 'function') window.setAccItem(item);
        if(typeof window.ensureSidebarMenuOpen === 'function') window.ensureSidebarMenuOpen('mes-dossiers', true);
      }

      if(name === 'mes-rapports'){
        renderMyReports();
        requestMyReports();
      }
    });
  }

  if(typeof window.__mdt_addResponseHook === 'function'){
    window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
      if(!reqId || reqId.indexOf('req_my_reports_') !== 0) return false;

      if(ok){
        MY_REPORTS = Array.isArray(data.reports) ? data.reports : [];
        renderMyReports();
      }else{
        MY_REPORTS = [];
        renderMyReports();
        if(typeof window.showToast === 'function') window.showToast('⚠️ Impossible de charger mes rapports', err || (data && data.message) || null, true);
      }
      return true;
    });
  }

  window.requestMyReports = requestMyReports;
})();
});
