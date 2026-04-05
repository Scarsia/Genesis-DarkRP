(function(){
  if(window.__mdt_error_guard_loaded) return;
  window.__mdt_error_guard_loaded = true;

  function ensureOverlay(){
    var el = document.getElementById('mdt-fatal-overlay');
    if(el) return el;
    el = document.createElement('div');
    el.id = 'mdt-fatal-overlay';
    el.style.cssText = [
      'position:fixed','inset:0','z-index:999999','display:none',
      'background:rgba(8,10,16,.96)','color:#f3f6fb','padding:24px',
      'font-family:Segoe UI,system-ui,sans-serif','overflow:auto'
    ].join(';');
    el.innerHTML = ''
      + '<div style="max-width:860px;margin:28px auto;border:1px solid #3a4256;border-radius:12px;background:#111624;padding:18px 20px;box-shadow:0 18px 45px rgba(0,0,0,.35)">'
      +   '<div style="font-size:18px;font-weight:800;margin-bottom:8px">Le MDT a rencontré une erreur JavaScript</div>'
      +   '<div style="font-size:13px;color:#b7c3d9;margin-bottom:14px">L\'interface a été protégée pour éviter un écran blanc total. Corrige le fichier indiqué ci-dessous.</div>'
      +   '<div id="mdt-fatal-summary" style="font-size:14px;font-weight:700;color:#fff;margin-bottom:10px"></div>'
      +   '<pre id="mdt-fatal-details" style="white-space:pre-wrap;word-break:break-word;background:#0a0d16;border:1px solid #283247;border-radius:8px;padding:14px;font-size:12px;line-height:1.45;color:#dbe6f7"></pre>'
      + '</div>';
    document.addEventListener('DOMContentLoaded', function(){
      if(!document.body.contains(el)) document.body.appendChild(el);
    });
    if(document.body) document.body.appendChild(el);
    return el;
  }

  function showOverlay(title, details){
    var el = ensureOverlay();
    var s = document.getElementById('mdt-fatal-summary');
    var d = document.getElementById('mdt-fatal-details');
    if(s) s.textContent = title || 'Erreur JavaScript';
    if(d) d.textContent = details || 'Aucun détail disponible';
    el.style.display = 'block';
  }

  window.__mdtShowFatal = showOverlay;
  window.__mdtModule = function(name, fn){
    try{
      fn();
    }catch(err){
      console.error('[MDT][' + name + '] module failure:', err);
      showOverlay('Module en erreur : ' + name, (err && (err.stack || err.message)) || String(err));
    }
  };

  window.addEventListener('error', function(ev){
    var msg = ev && ev.message ? ev.message : 'Erreur inconnue';
    var src = ev && ev.filename ? ('\nFichier : ' + ev.filename) : '';
    var line = ev && ev.lineno ? ('\nLigne : ' + ev.lineno + ':' + (ev.colno || 0)) : '';
    showOverlay('Erreur JavaScript', msg + src + line);
  });

  window.addEventListener('unhandledrejection', function(ev){
    var reason = ev && ev.reason ? (ev.reason.stack || ev.reason.message || String(ev.reason)) : 'Promesse rejetée';
    showOverlay('Promesse rejetée', reason);
  });
})();
