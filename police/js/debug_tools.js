window.__mdtModule('debug-tools', function(){
(function(){
  if(window.__mdt_debug_tools_loaded) return;
  window.__mdt_debug_tools_loaded = true;

  var state = { logs: [], max: 250, panel: null, logEl: null };

  function byId(id){ return document.getElementById(id); }
  function now(){
    var d = new Date();
    var p = function(v){ return String(v).padStart(2,'0'); };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function safe(v){
    if(v === undefined) return 'undefined';
    if(v === null) return 'null';
    if(typeof v === 'string') return v;
    try{ return JSON.stringify(v); }catch(e){ return String(v); }
  }
  function esc(s){ return String(s||'').replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function line(type, text){
    var cls = type === 'ERR' ? 'mdt-debug-bad' : (type === 'WARN' ? 'mdt-debug-warn' : 'mdt-debug-good');
    return '<span class="' + cls + '">[' + esc(now()) + '][' + esc(type) + ']</span> ' + esc(text);
  }
  function log(type, text, extra){
    var msg = text + (extra !== undefined ? ' | ' + safe(extra) : '');
    state.logs.push({ type:type, text:msg });
    if(state.logs.length > state.max) state.logs.shift();
    if(state.logEl){
      state.logEl.innerHTML = state.logs.map(function(item){ return line(item.type, item.text); }).join('\n');
      state.logEl.scrollTop = state.logEl.scrollHeight;
    }
    try{ console.log('[MDT][DEBUG][' + type + '] ' + msg); }catch(e){}
  }

  function setStatus(id, value, ok){
    var el = byId(id);
    if(!el) return;
    el.textContent = value;
    el.className = 'mdt-debug-v ' + (ok ? 'mdt-debug-good' : 'mdt-debug-bad');
  }

  function refreshStatus(){
    setStatus('mdt-dbg-st-bridge', !!(window.mdtBridge && window.mdtBridge.request) ? 'Disponible' : 'Absent', !!(window.mdtBridge && window.mdtBridge.request));
    setStatus('mdt-dbg-st-loreq', typeof window.loReq === 'function' ? 'Disponible' : 'Absent', typeof window.loReq === 'function');
    setStatus('mdt-dbg-st-ops', typeof window.openOperationModal === 'function' ? 'OK' : 'Absent', typeof window.openOperationModal === 'function');
    setStatus('mdt-dbg-st-complaints', typeof window.openPlainteModal === 'function' ? 'OK' : 'Absent', typeof window.openPlainteModal === 'function');
    setStatus('mdt-dbg-st-page', window.currentPage || '—', true);
  }

  function send(action, data){
    var reqId = 'dbg_' + action + '_' + Date.now();
    log('OUT', action + ' -> ' + reqId, data || {});
    try{
      if(typeof window.loReq === 'function'){
        window.loReq(action, data || {}, reqId);
        return reqId;
      }
      if(window.mdtBridge && window.mdtBridge.request){
        window.mdtBridge.request(action, JSON.stringify(data || {}), reqId);
        return reqId;
      }
    }catch(e){
      log('ERR', 'send exception for ' + action, e && (e.stack || e.message || String(e)));
    }
    log('ERR', 'Aucun pont JS->Lua disponible');
    return null;
  }

  function buildPanel(){
    if(byId('mdt-debug-toggle') || byId('mdt-debug-panel')) return;

    var toggle = document.createElement('button');
    toggle.id = 'mdt-debug-toggle';
    toggle.type = 'button';
    toggle.textContent = 'Debug MDT';

    var panel = document.createElement('div');
    panel.id = 'mdt-debug-panel';
    panel.innerHTML = ''
      + '<div class="mdt-debug-head">'
      +   '<div class="mdt-debug-title">Panneau de debug MDT</div>'
      +   '<div style="display:flex;gap:8px">'
      +     '<button type="button" id="mdt-dbg-refresh">Actualiser</button>'
      +     '<button type="button" id="mdt-dbg-close">Fermer</button>'
      +   '</div>'
      + '</div>'
      + '<div class="mdt-debug-body">'
      +   '<div class="mdt-debug-grid">'
      +     '<div class="mdt-debug-card"><div class="mdt-debug-k">Bridge mdtBridge.request</div><div class="mdt-debug-v" id="mdt-dbg-st-bridge">—</div></div>'
      +     '<div class="mdt-debug-card"><div class="mdt-debug-k">Fonction loReq</div><div class="mdt-debug-v" id="mdt-dbg-st-loreq">—</div></div>'
      +     '<div class="mdt-debug-card"><div class="mdt-debug-k">openOperationModal</div><div class="mdt-debug-v" id="mdt-dbg-st-ops">—</div></div>'
      +     '<div class="mdt-debug-card"><div class="mdt-debug-k">openPlainteModal</div><div class="mdt-debug-v" id="mdt-dbg-st-complaints">—</div></div>'
      +     '<div class="mdt-debug-card" style="grid-column:1 / -1"><div class="mdt-debug-k">Page active</div><div class="mdt-debug-v" id="mdt-dbg-st-page">—</div></div>'
      +   '</div>'
      +   '<div class="mdt-debug-actions">'
      +     '<button type="button" id="mdt-dbg-open-ops">Ouvrir modale rapport</button>'
      +     '<button type="button" id="mdt-dbg-open-complaint">Ouvrir modale plainte</button>'
      +     '<button type="button" id="mdt-dbg-ping">Test bridge serveur</button>'
      +     '<button type="button" id="mdt-dbg-insert">Test INSERT SQLite</button>'
      +     '<button type="button" id="mdt-dbg-tail">Lire journal serveur</button>'
      +     '<button type="button" id="mdt-dbg-ops-list">Lister rapports</button>'
      +     '<button type="button" id="mdt-dbg-complaints-list">Lister plaintes</button>'
      +     '<button type="button" id="mdt-dbg-clear">Vider logs</button>'
      +   '</div>'
      +   '<div id="mdt-debug-log"></div>'
      + '</div>';

    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    state.panel = panel;
    state.logEl = byId('mdt-debug-log');

    toggle.addEventListener('click', function(){
      panel.classList.toggle('open');
      refreshStatus();
      log('INFO', 'Panneau debug ' + (panel.classList.contains('open') ? 'ouvert' : 'fermé'));
    });
    byId('mdt-dbg-close').addEventListener('click', function(){ panel.classList.remove('open'); });
    byId('mdt-dbg-refresh').addEventListener('click', function(){ refreshStatus(); log('INFO', 'Statuts rafraîchis'); });
    byId('mdt-dbg-open-ops').addEventListener('click', function(){
      refreshStatus();
      try{
        if(typeof window.openOperationModal === 'function'){
          window.openOperationModal();
          log('INFO', 'openOperationModal() exécutée');
        }else log('ERR', 'openOperationModal est absente');
      }catch(e){ log('ERR', 'openOperationModal exception', e && (e.stack || e.message || String(e))); }
    });
    byId('mdt-dbg-open-complaint').addEventListener('click', function(){
      refreshStatus();
      try{
        if(typeof window.openPlainteModal === 'function'){
          window.openPlainteModal();
          log('INFO', 'openPlainteModal() exécutée');
        }else log('ERR', 'openPlainteModal est absente');
      }catch(e){ log('ERR', 'openPlainteModal exception', e && (e.stack || e.message || String(e))); }
    });
    byId('mdt-dbg-ping').addEventListener('click', function(){ send('debug_ping', { page: window.currentPage || '', source: 'debug_panel' }); });
    byId('mdt-dbg-insert').addEventListener('click', function(){ send('debug_insert', { label: 'manual_debug_insert', page: window.currentPage || '' }); });
    byId('mdt-dbg-tail').addEventListener('click', function(){ send('debug_tail', { limit: 15 }); });
    byId('mdt-dbg-ops-list').addEventListener('click', function(){ send('get_operations_list', {}); });
    byId('mdt-dbg-complaints-list').addEventListener('click', function(){ send('get_complaints_list', {}); });
    byId('mdt-dbg-clear').addEventListener('click', function(){ state.logs = []; if(state.logEl) state.logEl.innerHTML = ''; log('INFO', 'Logs vidés'); });

    refreshStatus();
    log('INFO', 'Debug tools chargés');
  }

  function hookTraffic(){
    if(window.__mdt_debug_loreq_wrapped) return;
    window.__mdt_debug_loreq_wrapped = true;

    var originalLoReq = window.loReq;
    if(typeof originalLoReq === 'function'){
      window.loReq = function(action, data, reqId){
        log('OUT', 'loReq ' + String(action || '') + ' reqId=' + String(reqId || ''), data || {});
        return originalLoReq.apply(this, arguments);
      };
    }

    if(typeof window.__mdt_addResponseHook === 'function'){
      window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
        log(ok ? 'IN' : 'ERR', 'Réponse reqId=' + String(reqId || '') + ' ok=' + String(!!ok), ok ? (data || json || {}) : (err || data || json || {}));
        if(reqId && String(reqId).indexOf('dbg_debug_tail_') === 0 && data && Array.isArray(data.rows)){
          log('INFO', 'Journal serveur reçu (' + data.rows.length + ' ligne(s))');
          data.rows.forEach(function(row){
            log('INFO', 'SQL[' + row.id + '] ' + row.created_at + ' ' + row.action + ' ' + row.req_id + ' ' + row.note);
          });
        }
        if(reqId && String(reqId).indexOf('dbg_debug_ping_') === 0 && data){
          refreshStatus();
          log('INFO', 'Ping serveur: police=' + String(data.is_police) + ' tables=' + safe(data.tables || {}));
        }
        return false;
      });
    }

    window.addEventListener('error', function(ev){
      log('ERR', 'window.onerror', {
        message: ev && ev.message,
        file: ev && ev.filename,
        line: ev && ev.lineno,
        col: ev && ev.colno
      });
    });

    document.addEventListener('click', function(ev){
      var t = ev.target;
      if(!t) return;
      var text = (t.textContent || '').trim().replace(/\s+/g,' ').slice(0,80);
      var cls = typeof t.className === 'string' ? t.className : '';
      var id = t.id || '';
      if(id === 'mdt-debug-toggle' || id === 'mdt-dbg-close' || id === 'mdt-dbg-refresh' || (t.closest && t.closest('#mdt-debug-panel'))) return;
      log('CLICK', 'target id=' + id + ' class=' + cls + ' text=' + text);
    }, true);
  }

  function boot(){
    buildPanel();
    hookTraffic();
    refreshStatus();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();

  setTimeout(function(){ try{ refreshStatus(); }catch(e){} }, 1000);
})();
});
