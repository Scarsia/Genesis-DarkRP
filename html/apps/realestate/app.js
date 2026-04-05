window.phoneAppManager&&window.phoneAppManager.register('realestate',{
w:null,props:[],v:'list',sel:null,f:'all',_to:null,
getHTML(){return'<div class="re"><div class="re-h"><h1>Immobilier</h1><p>Genesis Homes</p></div><div id="re-sb"></div><div id="re-tb"></div><div class="re-s" id="re-c"></div></div>'},
onOpen(wr){var s=this;s.w=wr;s.props=[];s.v='list';s.sel=null;s.f='all';
s._h=function(m){s._onData(m)};WLCBridge.on('realestateData',s._h);
WLCBridge.send('realestateGetProperties',{});s._load();
s._to=setTimeout(function(){if(!s.props.length&&s.w)s._draw()},5000)},
onClose(){WLCBridge.off('realestateData',this._h);if(this._to)clearTimeout(this._to);this.w=null},
_c(){return this.w&&this.w.querySelector('#re-c')},
_load(){var e=this._c();if(e)e.innerHTML='<div class="re-load"><div class="re-spin"></div></div>'},
_onData(m){if(this._to){clearTimeout(this._to);this._to=null}
this.props=(m&&m.data&&m.data.properties)||(m&&m.data&&Array.isArray(m.data)?m.data:[])||[];
this._stats();this._tabs();this._draw()},
_stats(){var b=this.w&&this.w.querySelector('#re-sb');if(!b)return;
var o=this.props.filter(function(p){return p.owned}).length,r=this.props.filter(function(p){return p.rented}).length;
b.innerHTML='<div class="re-stats"><div class="re-st own"><div class="re-st-v">'+o+'</div><div class="re-st-l">Poss\u00e9d\u00e9s</div></div>'+
'<div class="re-st rnt"><div class="re-st-v">'+r+'</div><div class="re-st-l">Lou\u00e9s</div></div>'+
'<div class="re-st tot"><div class="re-st-v">'+this.props.length+'</div><div class="re-st-l">Total</div></div></div>'},
_tabs(){var b=this.w&&this.w.querySelector('#re-tb');if(!b)return;var s=this;
var ts=[{id:'all',l:'Tout'},{id:'owned',l:'Mes propri\u00e9t\u00e9s'},{id:'rented',l:'Locations'}];
b.innerHTML='<div class="re-tabs">'+ts.map(function(t){return'<div class="re-tab'+(s.f===t.id?' on':'')+'" data-f="'+t.id+'">'+t.l+'</div>'}).join('')+'</div>';
b.querySelectorAll('.re-tab').forEach(function(t){t.addEventListener('click',function(){s.f=t.dataset.f;s._tabs();s._draw()})})},
_fl(){var f=this.f;if(f==='owned')return this.props.filter(function(p){return p.owned});if(f==='rented')return this.props.filter(function(p){return p.rented});return this.props},
_draw(){if(this.v==='detail')return this._vDet();this._vList()},
_vList(){var el=this._c();if(!el)return;var s=this,items=this._fl();
if(!items.length){el.innerHTML='<div class="re-empty"><div class="re-empty-i">\u{1F3E0}</div><div class="re-empty-t">Aucune propri\u00e9t\u00e9</div><div class="re-empty-sub">Visitez un agent en ville</div></div>';return}
var h='<div class="re-list">';items.forEach(function(p,i){var st=p.owned?'own':(p.rented?'rnt':'avl');
var sl=p.owned?'Propri\u00e9taire':(p.rented?'Locataire':'Disponible');
h+='<div class="re-card" data-i="'+i+'"><div class="re-card-top"><div class="re-card-ico">\u{1F3E0}</div><div class="re-card-bdg '+st+'">'+sl+'</div></div>'+
'<div class="re-card-bd"><div class="re-card-nm">'+s._e(p.name||'Propri\u00e9t\u00e9 #'+(p.id||i+1))+'</div>'+
'<div class="re-card-ad">'+s._e(p.address||p.adress||'')+'</div>'+
(p.price?'<div class="re-card-pr">'+s._f(p.price)+' $</div>':'')+'</div></div>'});
h+='</div>';el.innerHTML=h;
el.querySelectorAll('.re-card').forEach(function(c){c.addEventListener('click',function(){var i=parseInt(c.dataset.i);var l=s._fl();if(l[i]){s.sel=l[i];s.v='detail';s._draw()}})})},
_vDet(){var el=this._c();if(!el||!this.sel)return;var s=this,p=this.sel;
var st=p.owned?'own':(p.rented?'rnt':'avl'),sl=p.owned?'Propri\u00e9taire':(p.rented?'Locataire':'Disponible');
var bc=p.owned?'background:rgba(52,199,89,.25);color:#34C759;':(p.rented?'background:rgba(0,122,255,.25);color:#007AFF;':'background:rgba(255,149,0,.25);color:#FF9500;');
el.innerHTML='<div class="re-back" id="re-bk">\u2190 Retour</div><div class="re-det">'+
'<div class="re-det-hero"><div class="re-det-hero-ic">\u{1F3E0}</div><div class="re-det-bdg" style="'+bc+'">'+sl+'</div></div>'+
'<div class="re-det-nm">'+s._e(p.name||'Propri\u00e9t\u00e9')+'</div><div class="re-det-ad">'+s._e(p.address||p.adress||'')+'</div>'+
'<div class="re-grid">'+
'<div class="re-gi"><div class="re-gi-l">Statut</div><div class="re-gi-v '+(p.owned?'g':'b')+'">'+sl+'</div></div>'+
'<div class="re-gi"><div class="re-gi-l">ID</div><div class="re-gi-v">#'+(p.id||'?')+'</div></div>'+
(p.price?'<div class="re-gi"><div class="re-gi-l">Prix</div><div class="re-gi-v g">'+s._f(p.price)+' $</div></div>':'')+
(p.owner_name?'<div class="re-gi"><div class="re-gi-l">Propri\u00e9taire</div><div class="re-gi-v">'+s._e(p.owner_name)+'</div></div>':'')+
'</div><div class="re-btns"><div class="re-btn gps" id="re-gps">\u{1F4CD} GPS</div>'+
(p.owned?'<div class="re-btn lck" id="re-lck">\u{1F512} Cl\u00e9s</div>':'')+'</div></div>';
el.querySelector('#re-bk').addEventListener('click',function(){s.v='list';s._draw()});
var g=el.querySelector('#re-gps');if(g)g.addEventListener('click',function(){WLCBridge.send('realestateSetGPS',{id:p.id,coords:p.coords});
if(window.phoneNotifications)window.phoneNotifications.show('Immobilier','GPS activ\u00e9','apps/realestate/icon.png')});
var l=el.querySelector('#re-lck');if(l)l.addEventListener('click',function(){WLCBridge.send('realestateToggleLock',{id:p.id});
if(window.phoneNotifications)window.phoneNotifications.show('Immobilier','Serrure bascul\u00e9e','apps/realestate/icon.png')})},
_f(n){n=parseInt(n)||0;return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')},
_e(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
});
