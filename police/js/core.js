window.__mdtModule('core', function(){
// ÉTAT GLOBAL — partagé volontairement sur window pour les modules
window.currentPage = window.currentPage || 'citizens';
window.current_user_id = window.current_user_id || '';
window.selectedCitizen = window.selectedCitizen || null;
window.step1Data = window.step1Data || null;
window.selectedIds = window.selectedIds || new Set();
window.activeFilter = window.activeFilter || 'Tous';
window.quill = window.quill || null;

function __mdtStripHtml(html){
  var tmp = document.createElement('div');
  tmp.innerHTML = String(html || '');
  return (tmp.textContent || tmp.innerText || '').trim();
}

function __mdtTextToHtml(text){
  var safe = String(text || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
  if(!safe.trim()) return '';
  return '<p>' + safe.replace(/\n/g,'<br>') + '</p>';
}

window.__mdtCreateRichEditor = window.__mdtCreateRichEditor || function(selector, options){
  var host = document.querySelector(selector);
  if(!host) return null;

  if(window.Quill){
    return new Quill(selector, options || {});
  }

  if(host.__mdtFallbackEditor) return host.__mdtFallbackEditor;

  host.innerHTML = '';
  host.classList.add('mdt-richtext-fallback');
  var ta = document.createElement('textarea');
  ta.placeholder = (options && options.placeholder) || 'Rédigez ici…';
  host.appendChild(ta);

  var root = {};
  Object.defineProperty(root, 'innerHTML', {
    get: function(){ return __mdtTextToHtml(ta.value); },
    set: function(v){ ta.value = __mdtStripHtml(v); }
  });

  var editor = {
    root: root,
    getText: function(){ return ta.value || ''; },
    setContents: function(){ ta.value = ''; }
  };

  host.__mdtFallbackEditor = editor;
  return editor;
};

function ensureArrestQuill(){
  if(window.quill) return window.quill;
  window.quill = window.__mdtCreateRichEditor('#quill', {
    theme:'snow',
    placeholder:"Rédigez le rapport…",
    modules:{toolbar:[['bold','italic','underline','strike'],[{'list':'ordered'},{'list':'bullet'}],['clean']]}
  });
  return window.quill;
}

function setDefaultArrestDatetime(){
  var el = document.getElementById('f-dt');
  if(!el || el.value) return;
  var n = new Date(), p = function(x){ return String(x).padStart(2,'0'); };
  el.value = n.getFullYear()+'-'+p(n.getMonth()+1)+'-'+p(n.getDate())+'T'+p(n.getHours())+':'+p(n.getMinutes());
}

window.__mdt_hooks = window.__mdt_hooks || { page: [], response: [], afterInit: [], data: { citizens: [], officers: [], poles: [], dashboard: [], warrants: [], bracelets: [], alerts: [] } };
window.__mdt_hooks.data = window.__mdt_hooks.data || { citizens: [], officers: [], poles: [], dashboard: [], warrants: [], bracelets: [], alerts: [] };

window.__mdt_addPageHook = window.__mdt_addPageHook || function(fn){ if(typeof fn === 'function') window.__mdt_hooks.page.push(fn); };
window.__mdt_addResponseHook = window.__mdt_addResponseHook || function(fn){ if(typeof fn === 'function') window.__mdt_hooks.response.push(fn); };
window.__mdt_addAfterInitHook = window.__mdt_addAfterInitHook || function(fn){ if(typeof fn === 'function') window.__mdt_hooks.afterInit.push(fn); };
window.__mdt_addDataHook = window.__mdt_addDataHook || function(type, fn){
  if(typeof fn !== 'function') return;
  if(!window.__mdt_hooks.data[type]) window.__mdt_hooks.data[type] = [];
  window.__mdt_hooks.data[type].push(fn);
};

window.__mdt_runPageHooks = window.__mdt_runPageHooks || function(name){
  (window.__mdt_hooks.page || []).forEach(function(fn){ try{ fn(name); }catch(e){ console.warn('[MDT] page hook failed:', e); } });
};
window.__mdt_runResponseHooks = window.__mdt_runResponseHooks || function(reqId, ok, json, err, data){
  for(const fn of (window.__mdt_hooks.response || [])){
    try{ if(fn(reqId, ok, json, err, data) === true) return true; }catch(e){ console.warn('[MDT] response hook failed:', e); }
  }
  return false;
};
window.__mdt_runAfterInitHooks = window.__mdt_runAfterInitHooks || function(json){
  (window.__mdt_hooks.afterInit || []).forEach(function(fn){ try{ fn(json); }catch(e){ console.warn('[MDT] init hook failed:', e); } });
};
window.__mdt_runDataHooks = window.__mdt_runDataHooks || function(type, payload){
  var arr = (window.__mdt_hooks.data && window.__mdt_hooks.data[type]) || [];
  arr.forEach(function(fn){ try{ fn(payload, type); }catch(e){ console.warn('[MDT] data hook failed:', type, e); } });
};

function requestActiveCitizens(){
  try{
    if(window.mdtBridge&&window.mdtBridge.request){
      window.mdtBridge.request('get_active_citizens','{}','req_cit_'+Date.now());
      return;
    }
  }catch(e){}
  console.log('MDT>>'+JSON.stringify({action:'get_active_citizens',reqId:'req_cit_'+Date.now(),data:{}}));
}

window.__mdt_set_citizens = function(jsonStr){
  try{
    const parsed = JSON.parse(jsonStr);
    if(!Array.isArray(parsed)) throw new Error('not array');
    window.CITIZENS = parsed;
    if(typeof window.renderCitizenList === 'function') window.renderCitizenList();
    if(window.selectedCitizen){
      const latest = window.CITIZENS.find(function(c){ return c.id===window.selectedCitizen.id || c.steamid64===window.selectedCitizen.steamid64; });
      if(latest && typeof window.selectCitizen === 'function') window.selectCitizen(latest.steamid64 || latest.id);
      else {
        window.selectedCitizen = null;
        var p=document.getElementById('cit-profile'); if(p) p.style.display='none';
        var ph=document.getElementById('cit-placeholder'); if(ph) ph.style.display='flex';
      }
    }
    window.__mdt_runDataHooks('citizens', window.CITIZENS);
    console.log('[MDT] Citoyens chargés : '+window.CITIZENS.length+' entrées');
  }catch(e){
    console.warn('[MDT] __mdt_set_citizens parse error',e);
  }
};

function setPage(name){
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  var pg = document.getElementById('page-'+name); if(pg) pg.classList.add('active');
  var nav = document.getElementById('nav-'+name); if(nav) nav.classList.add('active');
  window.currentPage = name;

  const authReady = !!(window.__mdtAuthState && window.__mdtAuthState.unlockDone);
  if(!authReady){
    try{ if(window.__mdt_runPageHooks) window.__mdt_runPageHooks(name); }catch(e){}
    return;
  }

  if(name === 'citizens'){
    window.requestActiveCitizens();
  } else if(name === 'officers'){
    if(typeof window.requestOfficersList === 'function') window.requestOfficersList();
  } else if(name === 'arrest'){
    if(typeof window.updateArrestSuspectBanner === 'function') window.updateArrestSuspectBanner();
  } else if(name === 'dashboard'){
    if(typeof window.requestDashboardStats === 'function') window.requestDashboardStats();
  } else if(name === 'mandats'){
    if(typeof window.requestWarrantsList === 'function') window.requestWarrantsList();
  } else if(name === 'bracelets'){
    if(typeof window.requestBraceletsList === 'function') window.requestBraceletsList();
  } else if(name === 'alerts'){
    if(typeof window.requestAlertsList === 'function') window.requestAlertsList();
  } else {
    try{
      if(window.mdtBridge&&window.mdtBridge.request)
        window.mdtBridge.request('close_citizens_tab','{}','cct_'+Date.now());
    }catch(e){}
  }
  try{ if(window.__mdt_runPageHooks) window.__mdt_runPageHooks(name); }catch(e){}
}

function getSidebarMenuParts(menuId){
  var clean = String(menuId || '').trim();
  return {
    h: document.getElementById('sidebar-menu-' + clean + '-header'),
    b: document.getElementById('sidebar-menu-' + clean + '-body')
  };
}

function ensureSidebarMenuOpen(menuId, forceOpen){
  var parts = getSidebarMenuParts(menuId);
  if(!parts.h || !parts.b) return;
  var shouldOpen = (typeof forceOpen === 'boolean') ? forceOpen : true;
  parts.h.classList.toggle('open', shouldOpen);
  parts.b.classList.toggle('open', shouldOpen);
}

function toggleSidebarMenu(menuId, ev){
  if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){} }
  var parts = getSidebarMenuParts(menuId);
  if(!parts.h || !parts.b) return;
  var next = !parts.h.classList.contains('open');
  ensureSidebarMenuOpen(menuId, next);
}

function toggleAcc(ev){
  toggleSidebarMenu('registres', ev);
}
function setAccItem(el){
  document.querySelectorAll('.acc-item').forEach(function(i){ i.classList.remove('active'); });
  el.classList.add('active');
}
function closeMDT(){
  try{window.mdtBridge.close();}
  catch(e){console.log('MDT>>'+JSON.stringify({action:'close',reqId:'close',data:{}}));}
}

function showToast(title,data,isError){
  const t=document.getElementById('toast');
  document.getElementById('toast-title').textContent=title;
  document.getElementById('toast-json').textContent=data?JSON.stringify(data,null,2).slice(0,180):'';
  t.className=isError?'error':'';
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); },4200);
}

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s){ return esc(s).replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

window.requestActiveCitizens = requestActiveCitizens;
window.ensureArrestQuill = ensureArrestQuill;
window.setDefaultArrestDatetime = setDefaultArrestDatetime;
window.setPage = setPage;
window.toggleSidebarMenu = toggleSidebarMenu;
window.ensureSidebarMenuOpen = ensureSidebarMenuOpen;
window.toggleAcc = toggleAcc;
window.setAccItem = setAccItem;
window.closeMDT = closeMDT;
window.showToast = showToast;
window.esc = esc;
window.escAttr = escAttr;

window.__mdt_boot = function(){
  setDefaultArrestDatetime();
  ensureArrestQuill();
  ensureSidebarMenuOpen('registres', true);
  ensureSidebarMenuOpen('preuves', false);
  ensureSidebarMenuOpen('mes-dossiers', false);
  if(typeof renderCitizenList === 'function') renderCitizenList();
};

window.__mdt_addPageHook(function(name){
  if(name === 'dossier-photos'){
    ensureSidebarMenuOpen('preuves', true);
  }
  if(name === 'interrogatoires' || name === 'mes-rapports'){
    ensureSidebarMenuOpen('mes-dossiers', true);
  }
  if(name === 'vehicle-tickets'){
    ensureSidebarMenuOpen('registres', true);
  }
});

});
