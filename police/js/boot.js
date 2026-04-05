window.__mdtModule('boot', function(){
function __runBoot(){
  try{ if(window.__mdt_boot) window.__mdt_boot(); }catch(e){ console.error('[MDT] boot failed', e); throw e; }
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', __runBoot, { once:true });
}else{
  __runBoot();
}

});
