window.__mdtModule('auth', function(){
// NYPD MDT — AUTH SYSTEM v3  (Partie 1 — Login Screen v3)
// Design : dark card · spaced placeholders · email nom@genesis.com
// ════════════════════════════════════════════════════════════════
let _loHasAccount = false;
let _loPending    = false;
let _loAutoLoginTimer = null;
const __mdtAuthState = window.__mdtAuthState || {
  initStarted: false,
  initFinished: false,
  unlockDone: false,
  authRequestSent: false,
  lastInitStamp: 0
};
window.__mdtAuthState = __mdtAuthState;

// ================================================================
// SESSION PERSISTANTE — stockée côté Lua via file.Write (garrysmod/data/)
// localStorage ne survit PAS à la fermeture du panel DHTML dans GMod.
// On passe par le bridge mdtBridge pour lire/écrire un fichier Lua.
// ================================================================

// Sauvegarde la session via le bridge Lua
function loSaveSession(matricule, password){
  try{
    window._mdtSavedSession = { matricule:String(matricule||''), password:String(password||'') };
    if(window.mdtBridge && window.mdtBridge.saveSession){
      window.mdtBridge.saveSession(matricule, password);
    }
  }catch(e){ console.warn('MDT saveSession failed:', e); }
}

// Efface la session via le bridge Lua
function loClearSession(){
  try{
    if(window.mdtBridge && window.mdtBridge.clearSession){
      window.mdtBridge.clearSession();
    }
    // Reset aussi la variable injectée au démarrage
    window._mdtSavedSession = null;
  }catch(e){}
}

// Lit la session injectée par cl_main.lua au moment du __mdt_init
// (window._mdtSavedSession est écrit par Lua juste avant l'appel __mdt_init)
function loReadSession(){
  try{
    var s = window._mdtSavedSession;
    if(!s || !s.matricule || !s.password) return null;
    return s;
  }catch(e){ return null; }
}

function loClearAutoLoginTimer(){
  try{ if(_loAutoLoginTimer){ clearTimeout(_loAutoLoginTimer); } }catch(e){}
  _loAutoLoginTimer = null;
}

function loArmAutoLoginFallback(){
  loClearAutoLoginTimer();
  _loAutoLoginTimer = setTimeout(function(){
    if(__mdtAuthState.unlockDone) return;
    if(!__mdtAuthState.initStarted) return;
    __mdtAuthState.authRequestSent = false;
    loMsg('lo-login-msg','Reconnexion expirée, vérification du compte…','info');
    if(!__mdtAuthState.authRequestSent){
      __mdtAuthState.authRequestSent = true;
      loReq('auth_check', {}, 'auth_chk_'+Date.now());
    }
  }, 4500);
}

// ── Génération email : nom@genesis.com ─────────────────────────
function loGenEmail(){
  const nom = (document.getElementById('lo-reg-nom')?.value||'').trim();
  const clean = function(s){
    return s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]/g,'');
  };
  const n = clean(nom);
  const el = document.getElementById('lo-reg-email');
  if(el) el.value = n ? n+'@genesis.com' : '';
}

// ── Navigation ─────────────────────────────────────────────────
function loShowRegister(){
  document.getElementById('lo-form-login').style.display = 'none';
  const r = document.getElementById('lo-form-register');
  r.style.display = 'block';
  r.style.animation = 'loCardIn .26s cubic-bezier(.16,1,.3,1)';
  document.getElementById('lo-mat-box').style.display = 'none';
  document.getElementById('lo-reg-fields').style.display = 'block';
  loMsgClear('lo-reg-msg');
  const btn = document.getElementById('lo-btn-register');
  if(btn){ btn.disabled=false; btn.textContent="Valider l\'inscription"; }
}
function loShowLogin(){
  document.getElementById('lo-form-register').style.display = 'none';
  const l = document.getElementById('lo-form-login');
  l.style.display = 'block';
  l.style.animation = 'loCardIn .26s cubic-bezier(.16,1,.3,1)';
  loMsgClear('lo-login-msg');
}

// ── Messages ────────────────────────────────────────────────────
function loMsgClear(id){ var e=document.getElementById(id); if(e){e.style.display='none';e.className='lo-msg';e.textContent='';} }
function loMsg(id,txt,type){ var e=document.getElementById(id); if(e){e.className='lo-msg '+type;e.textContent=txt;e.style.display='block';} }

// ── Pont Lua ────────────────────────────────────────────────────
function loReq(action,data,reqId){
  try{ if(window.mdtBridge&&window.mdtBridge.request){ window.mdtBridge.request(action,JSON.stringify(data),reqId); return; } }catch(e){}
  console.log('MDT>>'+JSON.stringify({action:action,reqId:reqId,data:data}));
}

// ── Masquer "Créer un compte" ───────────────────────────────────
function loHideCreate(){
  var b=document.getElementById('lo-create-btn'), s=document.getElementById('lo-or-sep');
  if(b) b.style.display='none';
  if(s) s.style.display='none';
}

// ── Connexion ───────────────────────────────────────────────────
function loSubmitLogin(){
  if(_loPending) return;
  loMsgClear('lo-login-msg');
  var mat = (document.getElementById('lo-mat').value||'').trim();
  var pw  = (document.getElementById('lo-pw').value||'');
  var rem = document.getElementById('lo-rem').checked;
  if(!mat||mat.length!==2||!/^\d{2}$/.test(mat)){
    loMsg('lo-login-msg','Matricule invalide — exactement 2 chiffres requis.','err'); return;
  }
  if(!pw){ loMsg('lo-login-msg','Mot de passe requis.','err'); return; }
  _loPending = true;
  // Mémoriser rem+mat+pw pour sauvegarder si succès
  window._loRemember = {rem:rem, mat:mat, pw:pw};
  var btn = document.getElementById('lo-btn-login');
  btn.disabled=true; btn.textContent='Vérification…';
  loReq('auth_login',{matricule:mat,password:pw,remember_me:rem},'auth_login_'+Date.now());
}

// ── Inscription ─────────────────────────────────────────────────
function loSubmitRegister(){
  if(_loPending) return;
  loMsgClear('lo-reg-msg');
  var mat   = (document.getElementById('lo-reg-mat').value||'').trim();
  var nom   = (document.getElementById('lo-reg-nom').value||'').trim();
  var email = (document.getElementById('lo-reg-email').value||'').trim().toLowerCase();
  var pw    = (document.getElementById('lo-reg-pw').value||'');
  if(!mat||mat.length!==2||!/^\d{2}$/.test(mat)){
    loMsg('lo-reg-msg','Matricule invalide — exactement 2 chiffres.','err'); return;
  }
  if(!nom){ loMsg('lo-reg-msg','Nom de famille requis.','err'); return; }
  if(!email||!email.endsWith('@genesis.com')){
    loMsg('lo-reg-msg','Email invalide — renseignez votre nom pour le générer.','err'); return;
  }
  if(!pw||pw.length<4){ loMsg('lo-reg-msg','Mot de passe trop court (min. 4 caractères).','err'); return; }
  _loPending = true;
  var btn = document.getElementById('lo-btn-register');
  btn.disabled=true; btn.textContent='Création en cours…';
  loReq('auth_register',{matricule:mat,nom:nom,email:email,password:pw},'auth_register_'+Date.now());
}

// ── Déverrouiller le MDT ────────────────────────────────────────
function loUnlock(playerData){
  loClearAutoLoginTimer();
  if(__mdtAuthState.unlockDone) return;
  __mdtAuthState.unlockDone = true;
  __mdtAuthState.initFinished = true;
  _loPending = false;

  var ov = document.getElementById('login-overlay');
  if(ov){ ov.style.opacity='0'; ov.style.pointerEvents='none'; setTimeout(function(){ if(ov) ov.style.display='none'; },450); }
  if(playerData){
    if(playerData.steamid64 || playerData.sid64 || playerData.officier_id) window.current_user_id = String(playerData.steamid64 || playerData.sid64 || playerData.officier_id || '');
    var mat = playerData.matricule||'';
    var nom = (playerData.lastname||playerData.nom||'').trim() ||
              ((playerData.firstname||'')+(playerData.lastname?' '+playerData.lastname:'')).trim() || 'Agent';
    var el = document.getElementById('hdr-agent-info');
    if(el) el.textContent = nom + (mat?' · Mat. '+mat:'');
  }
  if(window.currentPage !== 'dashboard' && typeof window.setPage === 'function') window.setPage('dashboard');
}

// ── Dispatcher réponses serveur ─────────────────────────────────
window.__mdt_real_response = function(reqId, ok, json, err){
  var d={}; try{ d=(typeof json==='string')?JSON.parse(json):json; }catch(e){}

  if(__mdtAuthState.unlockDone && reqId && (reqId.indexOf('auth_chk')===0 || reqId.indexOf('auth_login_')===0 || reqId.indexOf('auto_login_')===0)){
    return;
  }

  // ── auth_check ────────────────────────────────────────────────
  if(reqId&&reqId.indexOf('auth_chk')===0){
    loClearAutoLoginTimer();
    _loHasAccount = !!d.has_account;
    if(_loHasAccount){
      loHideCreate();
      if(d.matricule) document.getElementById('lo-mat').value = d.matricule;
    }
    if(d.auto_login&&d.matricule){
      __mdtAuthState.authRequestSent = false;
      loMsg('lo-login-msg','Connexion automatique… Bienvenue !','ok');
      setTimeout(function(){ loUnlock(d); },900);
    }
    return;
  }

  // ── auth_login ────────────────────────────────────────────────
  if(reqId&&reqId.indexOf('auth_login_')===0){
    loClearAutoLoginTimer();
    _loPending=false;
    var btn=document.getElementById('lo-btn-login');
    btn.disabled=false; btn.textContent='SE CONNECTER';
    if(ok){
      // Sauvegarder session si "rester connecté" était coché
      var rem = window._loRemember || {};
      if(rem.rem && rem.mat && rem.pw){
        loSaveSession(rem.mat, rem.pw);
      } else {
        // Case décochée → on efface une éventuelle session précédente
        loClearSession();
      }
      window._loRemember = null;
      __mdtAuthState.authRequestSent = false;
      loMsg('lo-login-msg',d.message||'Connexion réussie.','ok');
      setTimeout(function(){ loUnlock(d); },700);
    }else{
      loClearSession(); // Identifiants invalides → on efface
      window._loRemember = null;
      __mdtAuthState.authRequestSent = false;
      __mdtAuthState.initStarted = false;
      loMsg('lo-login-msg',err||'Identifiants incorrects.','err');
    }
    return;
  }

  // ── auto_login (depuis session persistante Lua) ────────────────
  if(reqId&&reqId.indexOf('auto_login_')===0){
    loClearAutoLoginTimer();
    if(ok){
      __mdtAuthState.authRequestSent = false;
      loMsg('lo-login-msg','Connexion automatique… Bienvenue !','ok');
      setTimeout(function(){ loUnlock(d); },700);
    }else{
      // Token invalide (mdp changé, compte supprimé…) → on efface
      loClearSession();
      __mdtAuthState.authRequestSent = false;
      __mdtAuthState.initStarted = false;
      loMsg('lo-login-msg','Session expirée, veuillez vous reconnecter.','info');
    }
    return;
  }

  // ── auth_register ─────────────────────────────────────────────
  if(reqId&&reqId.indexOf('auth_register_')===0){
    _loPending=false;
    var btn2=document.getElementById('lo-btn-register');
    btn2.disabled=false; btn2.textContent="VALIDER L'INSCRIPTION";
    if(ok){
      document.getElementById('lo-mat-box-val').textContent = d.matricule||'—';
      document.getElementById('lo-mat-box').style.display = 'block';
      document.getElementById('lo-reg-fields').style.display = 'none';
      loMsg('lo-reg-msg', d.message||'Compte créé avec succès !', 'ok');
      _loHasAccount = true;
      loHideCreate();
      if(d.matricule) document.getElementById('lo-mat').value = d.matricule;
      setTimeout(function(){ loShowLogin(); }, 3500);
    }else{
      // Affiche l'erreur Lua (multi-compte, matricule pris, etc.)
      loMsg('lo-reg-msg', err||d.message||"Échec de l\'inscription.", 'err');
    }
    return;
  }

  try{
    if(window.__mdt_runResponseHooks && window.__mdt_runResponseHooks(reqId, ok, json, err, d) === true) return;
  }catch(e){
    console.warn('[MDT] response hook dispatch failed:', e);
  }
};

// ── Init : vérifie d'abord la session Lua persistante, puis auth_check ──
window.__mdt_real_init = function(json){
  if(__mdtAuthState.initStarted){
    console.warn('[MDT] __mdt_init ignoré (déjà lancé).');
    return;
  }

  __mdtAuthState.initStarted = true;
  __mdtAuthState.lastInitStamp = Date.now();
  window.__mdtPlayerAccess = (json && json.access) || {};

  try{
    if(json && json.player && (json.player.sid64 || json.player.steamid64)){
      window.current_user_id = String(json.player.sid64 || json.player.steamid64 || '');
    }
  }catch(e){}

  if(json && json.access && json.access.can_open === false){
    loHideCreate();
    loMsg('lo-login-msg','Accès MDT refusé : réservé aux Cadets, Officiers, Policiers, Hauts Grades et superadmins.','err');
    ['lo-mat','lo-pw','lo-rem','lo-btn-login','lo-create-btn'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.disabled = true;
    });
    setTimeout(function(){
      try{ if(window.mdtBridge && window.mdtBridge.close) window.mdtBridge.close(); }catch(e){}
    }, 1200);
    return;
  }

  var session = loReadSession();
  if(session){
    var matInput = document.getElementById('lo-mat');
    if(matInput && !matInput.value) matInput.value = session.matricule || '';
    loMsg('lo-login-msg','Reconnexion en cours…','info');
    loArmAutoLoginFallback();
    if(!__mdtAuthState.authRequestSent){
      __mdtAuthState.authRequestSent = true;
      loReq('auth_login', {matricule:session.matricule, password:session.password, remember_me:true}, 'auto_login_'+Date.now());
    }
  } else {
    if(!__mdtAuthState.authRequestSent){
      __mdtAuthState.authRequestSent = true;
      loReq('auth_check', {}, 'auth_chk_'+Date.now());
    }
  }
  try{ if(window.__mdt_runAfterInitHooks) window.__mdt_runAfterInitHooks(json); }catch(e){}
};


// ════════════════════════════════════════════════════════════════



try{ if(window.__mdt_flushBootstrapQueue) window.__mdt_flushBootstrapQueue(); }catch(e){ console.warn('[MDT] bootstrap queue flush failed:', e); }

window.__mdt_notify = window.__mdt_notify || function(type, message){
  try{
    if(typeof window.showToast === 'function') window.showToast(message || type || 'Notification', null, type === 'error');
  }catch(e){}
};
window.__mdt_real_notify = window.__mdt_notify;
try{ if(window.__mdt_flushBootstrapQueue) window.__mdt_flushBootstrapQueue(); }catch(e){ console.warn('[MDT] bootstrap queue flush failed:', e); }

window.loReq = window.loReq || loReq;
window.loGenEmail = loGenEmail;
window.loShowRegister = loShowRegister;
window.loShowLogin = loShowLogin;
window.loSubmitLogin = loSubmitLogin;
window.loSubmitRegister = loSubmitRegister;


});
