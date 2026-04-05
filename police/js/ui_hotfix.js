window.__mdtModule('ui-hotfix', function(){
(function(){
  if(window.__mdt_ui_hotfix_loaded) return;
  window.__mdt_ui_hotfix_loaded = true;

  // Lie un listener click une seule fois sur un élément
  // SANS capture et SANS stopPropagation pour ne pas bloquer les onclick inline
  function bindClickOnce(el, fn){
    if(!el || el.__mdtHotfixBound) return;
    el.__mdtHotfixBound = true;
    el.addEventListener('click', function(ev){
      try{ fn(ev); }catch(err){ console.warn('[MDT][hotfix]', err); }
    }, false);
  }

  // ── Boutons principaux ─────────────────────────────────────────
  function bindPrimaryButtons(){
    // Les boutons opérations sont déjà gérés par operations.js.
    // Ne pas les rebinder ici sinon un seul clic peut déclencher plusieurs créations.
    // Les boutons plaintes sont déjà gérés par complaints.js.
    // Ne pas les rebinder ici pour éviter les doubles appels.
  }

  // ── Listener délégué operations (bulles normales, pas capture) ─
  if(!document.__mdtHotfixDelegated){
    document.__mdtHotfixDelegated = true;

    document.addEventListener('click', function(ev){
      // -- Actions opérations --
      var opsEl = ev.target && ev.target.closest
        ? ev.target.closest('[data-ops-action]') : null;
      if(opsEl){
        var act = String(opsEl.getAttribute('data-ops-action') || '');
        var id  = Number(opsEl.getAttribute('data-report-id') || 0);
        if(act === 'toggle-menu' && typeof window.toggleOperationRowMenu === 'function'){
          ev.preventDefault(); ev.stopPropagation();
          window.toggleOperationRowMenu(ev, id); return;
        }
        if(act === 'view' && typeof window.viewOperationReport === 'function'){
          ev.preventDefault(); ev.stopPropagation();
          window.viewOperationReport(id); return;
        }
        if(act === 'edit'){
          ev.preventDefault(); ev.stopPropagation();
          if(typeof window.editOperationReport === 'function') window.editOperationReport(id);
          else if(typeof window.openOperationModal === 'function') window.openOperationModal(id);
          return;
        }
        if(act === 'delete' && typeof window.deleteOperationReport === 'function'){
          ev.preventDefault(); ev.stopPropagation();
          window.deleteOperationReport(id); return;
        }
      }

      // -- Actions plaintes via data-complaint-action (vue, edit, delete seulement) --
      // toggle-menu n'est plus utilisé : le bouton ⋯ a son propre onclick inline
      var cEl = ev.target && ev.target.closest
        ? ev.target.closest('[data-complaint-action]') : null;
      if(cEl){
        var cAct = String(cEl.getAttribute('data-complaint-action') || '');
        var cId  = Number(cEl.getAttribute('data-complaint-id') || 0);
        if(cAct === 'view' && typeof window.viewComplaint === 'function'){
          ev.preventDefault(); ev.stopPropagation();
          window.viewComplaint(cId); return;
        }
        if(cAct === 'edit' && typeof window.editComplaintPlaceholder === 'function'){
          ev.preventDefault(); ev.stopPropagation();
          window.editComplaintPlaceholder(cId); return;
        }
        if(cAct === 'delete' && typeof window.deleteComplaint === 'function'){
          ev.preventDefault(); ev.stopPropagation();
          window.deleteComplaint(cId); return;
        }
      }
    }, false); // false = phase bulle, ne bloque pas les onclick inline
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindPrimaryButtons, { once:true });
  } else {
    bindPrimaryButtons();
  }
  setTimeout(bindPrimaryButtons, 300);
  setTimeout(bindPrimaryButtons, 1200);
})();
});
