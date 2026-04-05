/**
 * Genesis Bank - Card block, settings, auto-refresh, group cards
 */
window.phoneAppManager&&window.phoneAppManager.register('bank',{
w:null,d:null,v:'home',card:null,
getHTML(){return'<div class="bk"><div class="bk-h"><h1>Genesis Bank</h1><p></p></div><div class="bk-s" id="bk-c"></div></div>'},
onOpen(wr){var s=this;s.w=wr;s.d=null;s.v='home';
s._bh=function(m){s._snap(m)};s._th=function(m){s._xfer(m)};s._blh=function(m){s._onBlock(m)};s._sh=function(m){s._onSettings(m)};
WLCBridge.on('bankSnapshot',s._bh);WLCBridge.on('bankTransferResult',s._th);
WLCBridge.on('bankCardBlockResult',s._blh);WLCBridge.on('bankSettingsResult',s._sh);
WLCBridge.send('bankGetSnapshot',{});s._load()},
onClose(){var s=this;WLCBridge.off('bankSnapshot',s._bh);WLCBridge.off('bankTransferResult',s._th);
WLCBridge.off('bankCardBlockResult',s._blh);WLCBridge.off('bankSettingsResult',s._sh);s.w=null},
_c(){return this.w&&this.w.querySelector('#bk-c')},
_load(){var e=this._c();if(e)e.innerHTML='<div class="bk-load"><div class="bk-spin"></div></div>'},
_snap(m){var d=m&&m.data;if(d&&d.error){this._err(d.error);return}this.d=d;
if(!this.card&&d&&d.cards&&d.cards.length>0)this.card=d.cards[0];
// Update selected card data from fresh snapshot
if(this.card&&d&&d.cards){var s=this;var fresh=d.cards.find(function(c){return c.id===s.card.id});if(fresh)s.card=fresh}
var h=this.w&&this.w.querySelector('.bk-h p');if(h&&d&&d.account)h.textContent=d.account.owner||'';
this._draw()},
_xfer(m){var d=m&&m.data;if(d&&d.success){this.v='home';WLCBridge.send('bankGetSnapshot',{});this._load();
if(window.phoneNotifications)window.phoneNotifications.show('Banque','Virement effectu\u00e9','apps/bank/icon.png')}
else{var mp={insufficient_funds:'Fonds insuffisants',invalid_iban:'IBAN invalide',target_iban_not_found:'IBAN introuvable',invalid_amount:'Montant invalide',account_frozen:'Compte gel\u00e9',self_transfer_forbidden:'Interdit'};
var e=(d&&d.error&&mp[d.error])||(d&&d.error)||'Erreur';if(window.phoneNotifications)window.phoneNotifications.show('Banque',e,'apps/bank/icon.png')}},
_onBlock(m){WLCBridge.send('bankGetSnapshot',{});var d=m&&m.data;
if(window.phoneNotifications)window.phoneNotifications.show('Banque',d&&d.blocked?'Carte bloqu\u00e9e':'Carte d\u00e9bloqu\u00e9e','apps/bank/icon.png')},
_onSettings(m){WLCBridge.send('bankGetSnapshot',{});this.v='home';this._load();
if(window.phoneNotifications)window.phoneNotifications.show('Banque','Param\u00e8tres mis \u00e0 jour','apps/bank/icon.png')},
_err(e){var el=this._c();if(!el)return;var mp={genesis_not_loaded:'Genesis Network indisponible',no_account:'Aucun compte bancaire'};
el.innerHTML='<div class="bk-empty"><div class="bk-empty-i">\u{1F3E6}</div><div class="bk-empty-t">'+(mp[e]||e)+'</div></div>'},
_draw(){if(this.v==='transfer')return this._vTransfer();if(this.v==='transactions')return this._vHistory();if(this.v==='settings')return this._vSettings();this._vHome()},

_vHome(){var el=this._c();if(!el||!this.d)return;var s=this,d=this.d,c=this.card;
var bal=s._f(c?c.balance:0),iban=c?c.iban:'---',tier=c?(c.tier||'visa').toUpperCase():'VISA';
var num=c?c.cardNumber:'',isGrp=c&&c.type==='group',isFrz=c&&c.blocked,h='';

h+='<div class="bk-card'+(isGrp?' grp':'')+(isFrz?' frozen':'')+'">';
if(isGrp)h+='<div class="bk-badge group">GROUPE</div>';
if(isFrz)h+='<div class="bk-badge frozen">BLOQU\u00c9E</div>';
h+='<div class="bk-tier">'+tier+'</div><div class="bk-bal">'+bal+'<span class="bk-cur">\u00a0$</span></div>';
h+='<div class="bk-iban">'+s._e(iban)+'</div>';
if(num)h+='<div class="bk-cnum">**** '+s._e(num.slice(-4))+'</div>';
h+='</div>';

if(d.cards&&d.cards.length>1){h+='<div class="bk-pills">';
d.cards.forEach(function(cd,i){var act=s.card&&s.card.id===cd.id;
h+='<div class="bk-pill'+(act?' on':'')+(cd.type==='group'?' grp':'')+'" data-i="'+i+'">'+s._e(cd.label||cd.iban||'Carte')+'</div>'});h+='</div>'}

h+='<div class="bk-acts">';
h+='<div class="bk-act xfer" id="b-xfer"><div class="bk-act-i">\u{1F4B8}</div><div class="bk-act-l">Virement</div></div>';
h+='<div class="bk-act hist" id="b-hist"><div class="bk-act-i">\u{1F4CB}</div><div class="bk-act-l">Historique</div></div>';
h+='<div class="bk-act lock'+(isFrz?' blocked':'')+'" id="b-lock"><div class="bk-act-i">'+(isFrz?'\u{1F513}':'\u{1F512}')+'</div><div class="bk-act-l">'+(isFrz?'D\u00e9bloquer':'Bloquer')+'</div></div>';
h+='<div class="bk-act cfg" id="b-cfg"><div class="bk-act-i">\u2699\ufe0f</div><div class="bk-act-l">R\u00e9glages</div></div>';
h+='</div>';

h+='<div class="bk-sec">Transactions r\u00e9centes</div>';
h+=this._txHTML((d.transactions||[]).slice(0,5));
if(d.debt&&d.debt.active)h+='<div class="bk-debt">\u26a0\ufe0f Dette active\u00a0: '+s._f(d.debt.amount)+'\u00a0$</div>';
el.innerHTML=h;

el.querySelector('#b-xfer').addEventListener('click',function(){s.v='transfer';s._draw()});
el.querySelector('#b-hist').addEventListener('click',function(){s.v='transactions';s._draw()});
el.querySelector('#b-lock').addEventListener('click',function(){if(!c)return;WLCBridge.send('bankToggleCardBlock',{cardId:c.id})});
el.querySelector('#b-cfg').addEventListener('click',function(){s.v='settings';s._draw()});
el.querySelectorAll('.bk-pill').forEach(function(p){p.addEventListener('click',function(){var i=parseInt(p.dataset.i);if(d.cards[i]){s.card=d.cards[i];s._vHome()}})})},

_vTransfer(){var el=this._c();if(!el)return;var s=this,c=this.card;
el.innerHTML='<div class="bk-back" id="b-bk">\u2190 Retour</div><div class="bk-vtit">Virement</div>'+
'<div class="bk-from"><div class="bk-from-lb">Depuis</div><div class="bk-from-ib">'+s._e(c?c.iban:'---')+'</div>'+
'<div class="bk-from-bl">'+s._f(c?c.balance:0)+' $ disponible</div></div>'+
'<input id="b-ib" class="bk-inp mono" placeholder="IBAN destinataire" maxlength="10">'+
'<input id="b-am" class="bk-inp" type="number" placeholder="Montant ($)" min="1">'+
'<input id="b-bn" class="bk-inp" placeholder="B\u00e9n\u00e9ficiaire (optionnel)">'+
'<input id="b-cm" class="bk-inp" placeholder="Motif (optionnel)">'+
'<button id="b-send" class="bk-btn">Envoyer le virement</button>';
el.querySelector('#b-bk').addEventListener('click',function(){s.v='home';s._draw()});
el.querySelector('#b-send').addEventListener('click',function(){
var ib=el.querySelector('#b-ib').value.trim().toUpperCase(),am=parseInt(el.querySelector('#b-am').value)||0;
if(!ib||am<=0)return;WLCBridge.send('bankTransfer',{iban:ib,amount:am,cardId:c?c.id:0,
beneficiary:el.querySelector('#b-bn').value.trim(),comment:el.querySelector('#b-cm').value.trim()})})},

_vHistory(){var el=this._c();if(!el||!this.d)return;var s=this;
el.innerHTML='<div class="bk-back" id="b-bk2">\u2190 Retour</div><div class="bk-vtit">Historique</div>'+this._txHTML(this.d.transactions||[]);
el.querySelector('#b-bk2').addEventListener('click',function(){s.v='home';s._draw()})},

_vSettings(){var el=this._c();if(!el)return;var s=this,c=this.card;if(!c){s.v='home';s._draw();return}
var h='<div class="bk-back" id="b-bk3">\u2190 Retour</div><div class="bk-vtit">R\u00e9glages</div>';
h+='<div class="bk-from" style="margin-bottom:20px"><div class="bk-from-lb">Carte</div><div class="bk-from-ib">'+s._e(c.label||c.iban)+'</div>'+
'<div class="bk-from-bl">'+s._e((c.tier||'visa').toUpperCase())+' \u2022 '+s._f(c.balance)+' $</div></div>';
h+='<div class="bk-sec">Renommer</div><input id="b-rn" class="bk-inp" placeholder="Nouveau nom" value="'+s._e(c.label||'')+'">';
h+='<button id="b-rn-ok" class="bk-btn" style="margin-bottom:20px">Renommer la carte</button>';
h+='<div class="bk-sec">S\u00e9curit\u00e9</div>';
h+='<div class="bk-row" id="b-blk"><div class="bk-row-l">'+(c.blocked?'\u{1F534} Carte bloqu\u00e9e':'\u{1F7E2} Carte active')+'</div>';
h+='<div class="bk-tog '+(c.blocked?'on':'off')+'"></div></div>';
h+='<div class="bk-sec" style="margin-top:16px">Niveau</div>';
['visa','mastercard','amex'].forEach(function(t){var act=((c.tier||'visa')===t);
h+='<div class="bk-row" data-tier="'+t+'" style="'+(act?'border:1px solid rgba(255,59,48,.3);':'cursor:pointer;')+'">';
h+='<div class="bk-row-l">'+t.toUpperCase()+'</div>';
h+=(act?'<div class="bk-row-v" style="color:#34C759">\u2713 Actuel</div>':'<div class="bk-row-a">\u203a</div>')+'</div>'});
el.innerHTML=h;
el.querySelector('#b-bk3').addEventListener('click',function(){s.v='home';s._draw()});
el.querySelector('#b-rn-ok').addEventListener('click',function(){var nm=el.querySelector('#b-rn').value.trim();if(!nm)return;WLCBridge.send('bankRenameCard',{cardId:c.id,name:nm})});
el.querySelector('#b-blk').addEventListener('click',function(){WLCBridge.send('bankToggleCardBlock',{cardId:c.id})});
el.querySelectorAll('[data-tier]').forEach(function(r){if((c.tier||'visa')===r.dataset.tier)return;
r.addEventListener('click',function(){WLCBridge.send('bankUpgradeCard',{cardId:c.id,tier:r.dataset.tier})})})},

_txHTML(txs){if(!txs||txs.length===0)return'<div class="bk-empty"><div class="bk-empty-t">Aucune transaction</div></div>';
var s=this;return'<div class="bk-txl">'+txs.map(function(tx){var isIn=tx.type==='deposit'||tx.type==='transfer_in'||tx.type==='group_deposit';
return'<div class="bk-tx"><div class="bk-tx-ic '+(isIn?'in':'out')+'">'+(isIn?'\u2193':'\u2191')+'</div>'+
'<div class="bk-tx-nf"><div class="bk-tx-ds">'+s._e(tx.desc||tx.type||'?')+'</div>'+
(tx.iban?'<div class="bk-tx-ib">'+s._e(tx.iban)+'</div>':'')+'</div>'+
'<div class="bk-tx-am"><div class="bk-tx-av" style="color:'+(isIn?'#34C759':'#FF3B30')+'">'+(isIn?'+':'-')+s._f(tx.amount)+' $</div>'+
'<div class="bk-tx-ad">'+(tx.date?new Date(tx.date*1000).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}):'')+'</div></div></div>'}).join('')+'</div>'},
_f(n){n=parseInt(n)||0;return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')},
_e(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
});
