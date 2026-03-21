/**
 * Genesis Phone - Services (Dispatch police/ambulance/mechanic/taxi)
 * Real persistent chat with service workers
 */
window.phoneAppManager && window.phoneAppManager.register('services', {
    wrapper: null, services: [], chats: [], currentChat: null, messages: [],

    getHTML() {
        return '<div class="svc-app" style="display:flex;flex-direction:column;height:100%;background:var(--phone-bg,#000);color:var(--phone-text,#fff);border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div id="svc-header" style="padding:14px 16px;flex-shrink:0;"></div>' +
            '<div id="svc-content" style="flex:1;overflow-y:auto;padding:0 12px;"></div>' +
            '<div id="svc-input" style="flex-shrink:0;"></div></div>';
    },

    onOpen(wrapper) {
        this.wrapper = wrapper;
        this.services = (Phone.data && Phone.data.services) || [];
        this.currentChat = null;
        WLCBridge.on('svcChatsList', this._onChats.bind(this));
        WLCBridge.on('svcChatCreated', this._onChatCreated.bind(this));
        WLCBridge.on('svcMessages', this._onMessages.bind(this));
        WLCBridge.on('svcMessageSent', this._onMsgSent.bind(this));
        WLCBridge.on('svcNewMessage', this._onNewMsg.bind(this));
        this._renderServiceList();
    },

    onClose() {
        ['svcChatsList','svcChatCreated','svcMessages','svcMessageSent','svcNewMessage'].forEach(function(n){WLCBridge.off(n);});
        this.wrapper = null;
    },

    _renderServiceList() {
        var h = this.wrapper.querySelector('#svc-header');
        var c = this.wrapper.querySelector('#svc-content');
        this.wrapper.querySelector('#svc-input').innerHTML = '';
        var self = this;
        var colors = {police:'#007AFF', ambulance:'#FF3B30', mechanic:'#FF9500', taxi:'#FFCC00'};

        h.innerHTML = '<div style="font-size:24px;font-weight:700;">Services</div><div style="font-size:11px;color:#8e8e93;">Contactez les services municipaux</div>';
        c.innerHTML = this.services.map(function(svc) {
            var bg = colors[svc.id] || '#007AFF';
            return '<div class="svc-item" data-id="'+svc.id+'" style="display:flex;align-items:center;gap:14px;padding:14px;background:rgba(255,255,255,0.06);border-radius:14px;margin-bottom:8px;cursor:pointer;">' +
                '<div style="width:44px;height:44px;border-radius:12px;background:'+bg+';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>' +
                '</div><div style="flex:1;"><div style="font-size:15px;font-weight:600;">'+(svc.name||svc.id)+'</div>' +
                '<div style="font-size:12px;color:#8e8e93;">Appuyez pour contacter</div></div>' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>';
        }).join('');

        c.querySelectorAll('.svc-item').forEach(function(el) {
            el.addEventListener('click', function() { self._contactService(el.dataset.id); });
        });
    },

    _contactService(serviceId) {
        var svc = this.services.find(function(s){return s.id===serviceId;});
        if (!svc) return;
        this.currentChat = {serviceId: serviceId, name: svc.name || svc.id, chatId: null};
        // Check if we already have an active chat
        WLCBridge.send('svcGetChats', {});
    },

    _onChats(msg) {
        this.chats = (msg && msg.data) || [];
        if (this.currentChat && this.currentChat.serviceId) {
            var existing = this.chats.find(function(c) { return c.service_id === this.currentChat.serviceId; }.bind(this));
            if (existing) {
                this.currentChat.chatId = parseInt(existing.id);
                WLCBridge.send('svcGetMessages', {chatId: this.currentChat.chatId});
                this._renderChat();
            } else {
                this._renderChat();
            }
        }
    },

    _onChatCreated(msg) {
        var d = msg && msg.data;
        if (d && d.success && d.chatId) {
            this.currentChat.chatId = d.chatId;
        }
    },

    _onMessages(msg) {
        this.messages = (msg && msg.data) || [];
        this._renderChatMessages();
    },

    _onMsgSent() {},

    _onNewMsg(msg) {
        var d = msg && msg.data;
        if (d && this.currentChat) {
            this.messages.push({id:0, isMe:false, senderName:d.senderName, message:d.message, time:'now'});
            this._renderChatMessages();
        }
        window.phoneNotifications.show('Services', (d&&d.senderName||'') + ': ' + (d&&d.message||''), 'apps/services/icon.png');
    },

    _renderChat() {
        var h = this.wrapper.querySelector('#svc-header');
        var c = this.wrapper.querySelector('#svc-content');
        var inp = this.wrapper.querySelector('#svc-input');
        var self = this;

        h.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">' +
            '<button id="svc-back" style="background:none;border:none;color:#007AFF;font-size:14px;cursor:pointer;">← Retour</button>' +
            '<span style="font-size:16px;font-weight:600;">' + this._esc(this.currentChat.name) + '</span></div>';

        c.innerHTML = '<div id="svc-msgs" style="padding:8px 0;">' +
            (this.currentChat.chatId ? '' : '<div style="text-align:center;padding:20px;color:#8e8e93;font-size:12px;">Décrivez votre situation pour commencer</div>') + '</div>';

        inp.innerHTML = '<div style="display:flex;gap:8px;padding:10px 12px 20px;background:rgba(20,20,20,0.95);border-top:1px solid rgba(255,255,255,0.06);">' +
            '<input type="text" id="svc-msg-in" placeholder="Écrivez un message..." style="flex:1;padding:10px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:20px;color:#fff;font-size:13px;outline:none;">' +
            '<button id="svc-send" style="background:#007AFF;color:#fff;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div>';

        h.querySelector('#svc-back').addEventListener('click', function() { self.currentChat=null; self._renderServiceList(); });
        var msgIn = inp.querySelector('#svc-msg-in');
        msgIn.addEventListener('focus', function(){WLCBridge.send('inputFocus',{focused:true});});
        msgIn.addEventListener('blur', function(){WLCBridge.send('inputFocus',{focused:false});});
        msgIn.addEventListener('keydown', function(e){ if(e.key==='Enter') self._sendSvcMsg(); });
        inp.querySelector('#svc-send').addEventListener('click', function(){ self._sendSvcMsg(); });

        if (this.currentChat.chatId) this._renderChatMessages();
    },

    _renderChatMessages() {
        var el = this.wrapper.querySelector('#svc-msgs'); if(!el) return;
        el.innerHTML = this.messages.map(function(m) {
            return '<div style="display:flex;justify-content:'+(m.isMe?'flex-end':'flex-start')+';padding:3px 0;">' +
                '<div style="max-width:80%;">' +
                (!m.isMe ? '<div style="font-size:10px;color:#8e8e93;margin-bottom:2px;">'+(m.senderName||'Service')+'</div>' : '') +
                '<div style="padding:8px 12px;border-radius:16px;font-size:13px;line-height:1.4;background:'+(m.isMe?'#007AFF':'rgba(255,255,255,0.1)')+';color:#fff;">'+
                this._esc(m.message)+'</div>' +
                '<div style="font-size:9px;color:#636366;margin-top:2px;">'+(m.time||'')+'</div></div></div>';
        }.bind(this)).join('');
        el.scrollTop = el.scrollHeight;
    },

    _sendSvcMsg() {
        var inp = this.wrapper.querySelector('#svc-msg-in'); if(!inp) return;
        var text = inp.value.trim(); if(!text) return; inp.value = '';

        if (!this.currentChat.chatId) {
            // Create new chat with first message
            WLCBridge.send('svcCreateChat', {serviceId: this.currentChat.serviceId, message: text});
            this.messages.push({id:0, isMe:true, message:text, time:'now'});
            this._renderChatMessages();
        } else {
            WLCBridge.send('svcSendMessage', {chatId: this.currentChat.chatId, message: text});
            this.messages.push({id:0, isMe:true, message:text, time:'now'});
            this._renderChatMessages();
        }
    },

    _esc(s) { if(!s) return ''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
});
