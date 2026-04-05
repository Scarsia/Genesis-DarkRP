/**
 * Genesis Mailbox - PDF viewer, timeout fallback for loading
 */
window.phoneAppManager&&window.phoneAppManager.register('mailbox',{
w:null,mails:[],v:'list',sel:null,_to:null,
getHTML(){return'<div class="ml"><div class="ml-h"><h1>Boîte mail</h1><div class="ml-bdg" id="ml-cnt" style="display:none">0</div></div><div class="ml-s" id="ml-c"></div></div>'},
onOpen(wr){var s=this;s.w=wr;s.mails=[];s.v='list';s.sel=null;
s._h=function(m){s._onData(m)};s._dh=function(m){s._onDel(m)};
WLCBridge.on('mailboxData',s._h);WLCBridge.on('mailboxDeleteResult',s._dh);
WLCBridge.send('mailboxGetAll',{});s._load();
// Timeout: if no data in 5s, show empty
s._to=setTimeout(function(){if(s.mails.length===0&&s.w){s._draw()}},5000)},
onClose(){WLCBridge.off('mailboxData',this._h);WLCBridge.off('mailboxDeleteResult',this._dh);
if(this._to)clearTimeout(this._to);this.w=null},
_c(){return this.w&&this.w.querySelector('#ml-c')},
_load(){var e=this._c();if(e)e.innerHTML='<div class="ml-load"><div class="ml-spin"></div></div>'},
_onData(m){if(this._to){clearTimeout(this._to);this._to=null}
this.mails=(m&&m.data&&m.data.mails)||(m&&m.data&&Array.isArray(m.data)?m.data:[])||[];
var b=this.w&&this.w.querySelector('#ml-cnt'),u=this.mails.filter(function(x){return!x.read}).length;
if(b){b.textContent=u;b.style.display=u>0?'':'none'}this._draw()},
_onDel(m){if(m&&m.data&&m.data.success){this.v='list';WLCBridge.send('mailboxGetAll',{});
if(window.phoneNotifications)window.phoneNotifications.show('Mail','Supprim\u00e9','apps/mailbox/icon.png')}},
_draw(){if(this.v==='detail')return this._vDetail();this._vList()},
_vList(){var el=this._c();if(!el)return;var s=this;
if(!this.mails.length){el.innerHTML='<div class="ml-empty"><div class="ml-empty-i">\u{1F4ED}</div><div class="ml-empty-t">Aucun mail</div></div>';return}
var h='<div class="ml-list">';this.mails.forEach(function(m,i){var ur=!m.read,att=m.attachments&&m.attachments.length>0;
h+='<div class="ml-it'+(ur?' ur':'')+'" data-i="'+i+'"><div class="ml-dot'+(ur?'':' rd')+'"></div><div class="ml-it-bd">'+
'<div class="ml-it-sn">'+s._e(m.sender||'Inconnu')+'</div><div class="ml-it-su">'+s._e(m.subject||'(sans objet)')+'</div>'+
'<div class="ml-it-pv">'+s._e((m.message||'').substring(0,60))+'</div></div>'+
'<div class="ml-it-rt"><div class="ml-it-dt">'+s._fd(m.date)+'</div>'+(att?'<div class="ml-it-at">\u{1F4CE} PDF</div>':'')+'</div></div>'});
h+='</div>';el.innerHTML=h;
el.querySelectorAll('.ml-it').forEach(function(it){it.addEventListener('click',function(){var i=parseInt(it.dataset.i);
if(s.mails[i]){s.sel=s.mails[i];s.v='detail';if(!s.sel.read){s.sel.read=true;WLCBridge.send('mailboxMarkRead',{id:s.sel.id||s.sel.mailid})}s._draw()}})})},
_vDetail(){var el=this._c();if(!el||!this.sel)return;var s=this,m=this.sel;
var ini=(m.sender||'?').charAt(0).toUpperCase();
var h='<div class="ml-back" id="ml-bk">\u2190 Bo\u00eete mail</div><div class="ml-det">'+
'<div class="ml-det-su">'+s._e(m.subject||'(sans objet)')+'</div>'+
'<div class="ml-det-meta"><div class="ml-det-av">'+ini+'</div><div><div class="ml-det-nm">'+s._e(m.sender||'Inconnu')+'</div>'+
'<div class="ml-det-dt">'+s._fdf(m.date)+'</div></div></div>'+
'<div class="ml-det-msg">'+s._e(m.message||'')+'</div>';
// Attachments
if(m.attachments&&m.attachments.length>0){m.attachments.forEach(function(a,ai){
h+='<div class="ml-att"><div class="ml-att-bar" data-ai="'+ai+'"><div class="ml-att-ic">PDF</div>'+
'<div class="ml-att-nf"><div class="ml-att-nm">'+s._e(a.name||a.filename||'document.pdf')+'</div></div>'+
'<div class="ml-att-op">Ouvrir</div></div></div>'})}
if(m.button&&m.button.pdf){h+='<div class="ml-att"><div class="ml-att-bar" data-pdf="'+s._e(m.button.pdf)+'">'+
'<div class="ml-att-ic">PDF</div><div class="ml-att-nf"><div class="ml-att-nm">'+s._e(m.button.label||'Document.pdf')+'</div></div>'+
'<div class="ml-att-op">Ouvrir</div></div></div>'}
if(m.button&&m.button.buttonEvent){h+='<div style="margin-top:14px"><div class="ml-abtn" id="ml-act" style="background:rgba(0,122,255,.12);color:#007AFF;padding:12px;border-radius:12px;text-align:center;cursor:pointer">'+
s._e(m.button.label||'Action')+'</div></div>'}
h+='</div><div class="ml-acts"><div class="ml-abtn del" id="ml-del">\u{1F5D1} Supprimer</div></div>';
el.innerHTML=h;
el.querySelector('#ml-bk').addEventListener('click',function(){s.v='list';s._draw()});
el.querySelectorAll('.ml-att-bar').forEach(function(b){b.addEventListener('click',function(){
var ai=b.dataset.ai,url=b.dataset.pdf;
if(ai!==undefined&&m.attachments&&m.attachments[parseInt(ai)])url=m.attachments[parseInt(ai)].url||m.attachments[parseInt(ai)].path;
if(url)s._openPDF(url,b.querySelector('.ml-att-nm')?b.querySelector('.ml-att-nm').textContent:'Document')})});
var del=el.querySelector('#ml-del');if(del)del.addEventListener('click',function(){WLCBridge.send('mailboxDelete',{id:m.id||m.mailid})});
var act=el.querySelector('#ml-act');if(act&&m.button)act.addEventListener('click',function(){
WLCBridge.send('mailboxAction',{event:m.button.buttonEvent,data:m.button.buttonData,isServer:m.button.isServer})})},
_openPDF(url,title){if(!this.w)return;var v=document.createElement('div');v.className='ml-pdf';
v.innerHTML='<div class="ml-pdf-tb"><div class="ml-pdf-cl" id="pdf-cl">Fermer</div><div class="ml-pdf-ti">'+this._e(title||'Document')+'</div><div style="width:50px"></div></div>'+
'<iframe class="ml-pdf-fr" src="'+this._e(url)+'"></iframe>';this.w.appendChild(v);
v.querySelector('#pdf-cl').addEventListener('click',function(){v.remove()});
WLCBridge.send('mailboxOpenPDF',{url:url,title:title})},
_fd(d){if(!d)return'';var dt=typeof d==='number'?new Date(d>9999999999?d:d*1000):new Date(d);if(isNaN(dt.getTime()))return'';
var n=new Date();if(dt.toDateString()===n.toDateString())return dt.getHours().toString().padStart(2,'0')+':'+dt.getMinutes().toString().padStart(2,'0');
return dt.getDate()+'/'+(dt.getMonth()+1)},
_fdf(d){if(!d)return'';var dt=typeof d==='number'?new Date(d>9999999999?d:d*1000):new Date(d);if(isNaN(dt.getTime()))return'';
var mo=['jan.','f\u00e9v.','mars','avr.','mai','juin','juil.','ao\u00fbt','sept.','oct.','nov.','d\u00e9c.'];
return dt.getDate()+' '+mo[dt.getMonth()]+' '+dt.getFullYear()+' \u00e0 '+dt.getHours().toString().padStart(2,'0')+':'+dt.getMinutes().toString().padStart(2,'0')},
_e(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
});
