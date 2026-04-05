window.__mdtModule('poles-modal', function(){
// EXTENSIONS MODULAIRES — PÔLES / SPÉCIALITÉS
// Branchées sur le bus interne pour ne jamais écraser l'auto-login.
// ════════════════════════════════════════════════════════════════
(function(){
  if(window.__mdt_poles_hooks_registered) return;
  window.__mdt_poles_hooks_registered = true;

  if(typeof window.__mdt_addPageHook === 'function'){
    window.__mdt_addPageHook(function(name){
      if(name === 'poles' && typeof requestPolesList === 'function') requestPolesList();
    });
  }

  if(typeof window.__mdt_addResponseHook === 'function'){
    window.__mdt_addResponseHook(function(reqId, ok, json, err, d){
      if(reqId && reqId.indexOf('req_poles_save_') === 0){
        if(ok){
          showToast('✓ Pôle enregistré', d || null, false);
          if(typeof requestPolesList === 'function') requestPolesList();
        }else{
          showToast('⚠️ ' + (err || 'Impossible d\'enregistrer le pôle'), d || null, true);
        }
        return true;
      }

      if(reqId && reqId.indexOf('req_poles_delete_') === 0){
        if(ok){
          showToast('✓ Pôle supprimé', d || null, false);
          if(typeof requestPolesList === 'function') requestPolesList();
        }else{
          showToast('⚠️ ' + (err || 'Impossible de supprimer le pôle'), d || null, true);
        }
        return true;
      }

      return false;
    });
  }
})();


// ════════════════════════════════════════════════════════════════

});
