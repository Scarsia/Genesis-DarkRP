/**
 * Genesis Motors - Vehicle catalog
 */
window.phoneAppManager&&window.phoneAppManager.register('dealer',{
w:null,d:{categories:[],vehicles:[]},cat:'all',sel:null,v:'list',_to:null,
getHTML(){return'<div class="gm"><div class="gm-h"><h1>Genesis Motors</h1><p>Catalogue v\u00e9hicules</p></div><div id="gm-cats"></div><div class="gm-s" id="gm-c"></div></div>'},
onOpen(wr){var s=this;s.w=wr;s.d={categories:[],vehicles:[]};s.cat='all';s.sel=null;s.v='list';
s._h=function(m){s._onData(m)};WLCBridge.on('vdCatalogList',s._h);
WLCBridge.send('vdListCatalog',{});s._load();
s._to=setTimeout(function(){if(!s.d.vehicles.length&&s.w)s._draw()},5000)},
onClose(){WLCBridge.off('vdCatalogList',this._h);if(this._to)clearTimeout(this._to);this.w=null},
_c(){return this.w&&this.w.querySelector('#gm-c')},
_load(){var e=this._c();if(e)e.innerHTML='<div class="gm-load"><div class="gm-spin"></div></div>'},
_onData(m){if(this._to){clearTimeout(this._to);this._to=null}
this.d=(m&&m.data)||{categories:[],vehicles:[]};this._renderCats();this._draw()},
_renderCats(){var b=this.w&&this.w.querySelector('#gm-cats');if(!b)return;var s=this;
var h='<div class="gm-cats"><div class="gm-cat'+(s.cat==='all'?' on':'')+'" data-c="all">Tout</div>';
(this.d.categories||[]).forEach(function(c){h+='<div class="gm-cat'+(s.cat===c.id?' on':'')+'" data-c="'+s._e(c.id)+'">'+s._e(c.name)+'</div>'});
h+='</div>';b.innerHTML=h;
b.querySelectorAll('.gm-cat').forEach(function(c){c.addEventListener('click',function(){s.cat=c.dataset.c;s.sel=null;s.v='list';s._renderCats();s._draw()})})},
_veh(){var v=(this.d.vehicles||[]).slice();if(this.cat!=='all')v=v.filter(function(x){return x.category===this.cat}.bind(this));return v},
_draw(){if(this.v==='detail')return this._vDet();this._vList()},
_vList(){var el=this._c();if(!el)return;var s=this,items=this._veh();
if(!items.length){el.innerHTML='<div class="gm-empty"><div class="gm-empty-i">\u{1F697}</div><div class="gm-empty-t">Aucun v\u00e9hicule</div></div>';return}
var h='<div class="gm-list">';items.forEach(function(v,i){
var ico=['\u{1F697}','\u{1F3CE}','\u{1F69A}','\u{1F3CD}'][i%4];
h+='<div class="gm-card" data-i="'+i+'"><div class="gm-card-top">'+
'<div class="gm-card-av">'+ico+'</div>'+
'<div class="gm-card-info"><div class="gm-card-nm">'+s._e(v.name)+'</div>'+
'<div class="gm-card-cat">'+s._e(v.category||'V\u00e9hicule')+'</div></div>'+
'<div class="gm-card-pr">'+s._f(v.priceTTC)+'</div></div>'+
(v.description?'<div class="gm-card-desc">'+s._e(v.description.substring(0,80))+(v.description.length>80?'...':'')+'</div>':'')+'</div>'});
h+='</div>';el.innerHTML=h;
el.querySelectorAll('.gm-card').forEach(function(c){c.addEventListener('click',function(){var i=parseInt(c.dataset.i);var l=s._veh();if(l[i]){s.sel=l[i];s.v='detail';s._draw()}})})},
_vDet(){var el=this._c();if(!el||!this.sel)return;var s=this,v=this.sel;
el.innerHTML='<div class="gm-back" id="gm-bk">\u2190 Catalogue</div><div class="gm-det">'+
'<div class="gm-det-hero"><div class="gm-det-hero-ic">\u{1F697}</div>'+
'<div class="gm-det-bdg">'+s._e(v.category||'V\u00e9hicule')+'</div></div>'+
'<div class="gm-det-nm">'+s._e(v.name)+'</div>'+
'<div class="gm-det-cls">'+s._e(v.class||'Classe inconnue')+'</div>'+
'<div class="gm-det-grid">'+
'<div class="gm-det-gi"><div class="gm-det-gi-l">Prix HT</div><div class="gm-det-gi-v">'+s._f(v.priceHT)+'</div></div>'+
'<div class="gm-det-gi"><div class="gm-det-gi-l">Taxe</div><div class="gm-det-gi-v o">'+s._f(v.priceTax)+'</div></div>'+
'<div class="gm-det-gi"><div class="gm-det-gi-l">Prix TTC</div><div class="gm-det-gi-v g">'+s._f(v.priceTTC)+'</div></div></div>'+
(v.description?'<div class="gm-det-desc">'+s._e(v.description)+'</div>':'')+
'<div class="gm-det-note">Consultation uniquement \u2022 Achat au concessionnaire en ville</div></div>';
el.querySelector('#gm-bk').addEventListener('click',function(){s.v='list';s._draw()})},
_f(n){n=parseInt(n)||0;return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')+' $'},
_e(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
});
