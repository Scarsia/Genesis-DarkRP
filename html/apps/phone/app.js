/**
 * Genesis Phone - Phone App
 * FULL: Keypad dialer, Contacts CRUD, SMS conversations with bubbles, Call history
 * All persistent via server SQLite
 */
window.phoneAppManager && window.phoneAppManager.register('phone', {
    wrapper: null, currentTab: 'keypad', contacts: [], conversations: [],
    messages: [], dialInput: '', activeChat: null,
    _handlers: {},

    getHTML() {
        return '<div class="phone-app" style="display:flex;flex-direction:column;height:100%;background:var(--phone-bg,#000);color:var(--phone-text,#fff);border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div id="pa-content" style="flex:1;overflow-y:auto;padding-top:8px;"></div>' +
            '<div id="pa-input" style="flex-shrink:0;"></div>' +
            '<div class="pa-tabs" style="display:flex;height:50px;background:rgba(20,20,20,0.95);border-top:1px solid rgba(255,255,255,0.08);flex-shrink:0;">' +
                '<div class="pa-tab active" data-tab="recents"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>Récents</span></div>' +
                '<div class="pa-tab" data-tab="contacts"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Contacts</span></div>' +
                '<div class="pa-tab" data-tab="keypad"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Clavier</span></div>' +
                '<div class="pa-tab" data-tab="sms"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span>SMS</span></div>' +
            '</div>' +
        '</div>' +
        '<style>' +
            '.pa-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#8e8e93;gap:2px;transition:color 0.2s;}' +
            '.pa-tab.active{color:#007AFF;}' +
            '.pa-tab span{font-size:9px;}' +
            '.pa-tab:active{opacity:0.6;}' +
            '.sms-bubble{max-width:78%;padding:9px 14px;border-radius:18px;font-size:13px;line-height:1.4;word-wrap:break-word;}' +
            '.sms-me{background:#007AFF;color:#fff;border-bottom-right-radius:4px;}' +
            '.sms-them{background:rgba(255,255,255,0.12);color:#fff;border-bottom-left-radius:4px;}' +
        '</style>';
    },

    onOpen(wrapper) {
        this.wrapper = wrapper;
        this.activeChat = null;
        this.dialInput = '';

        // Register handlers
        this._handlers = {
            contacts: this._onContacts.bind(this),
            convos: this._onConversations.bind(this),
            history: this._onSmsHistory.bind(this),
            callHist: this._onCallHistory.bind(this),
            smsRecv: this._onSmsReceived.bind(this),
            callUpdate: this._onCallUpdate.bind(this),
            incoming: this._onIncomingCall.bind(this),
        };
        WLCBridge.on('contactsList', this._handlers.contacts);
        WLCBridge.on('conversationsList', this._handlers.convos);
        WLCBridge.on('smsHistory', this._handlers.history);
        WLCBridge.on('callHistory', this._handlers.callHist);
        WLCBridge.on('smsReceived', this._handlers.smsRecv);
        WLCBridge.on('callUpdate', this._handlers.callUpdate);
        WLCBridge.on('incomingCall', this._handlers.incoming);

        // Tab clicks
        wrapper.querySelectorAll('.pa-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                wrapper.querySelectorAll('.pa-tab').forEach(function(t){t.classList.remove('active');});
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.activeChat = null;
                this._render();
            }.bind(this));
        }.bind(this));

        // Default tab
        this.currentTab = 'keypad';
        wrapper.querySelector('[data-tab="keypad"]').classList.add('active');
        WLCBridge.send('getContacts', {});
        this._render();
    },

    onClose() {
        for (var k in this._handlers) WLCBridge.off(k === 'contacts' ? 'contactsList' : k === 'convos' ? 'conversationsList' : k === 'history' ? 'smsHistory' : k === 'callHist' ? 'callHistory' : k === 'smsRecv' ? 'smsReceived' : k === 'callUpdate' ? 'callUpdate' : 'incomingCall', this._handlers[k]);
        this.wrapper = null;
    },

    _render() {
        var inp = this.wrapper.querySelector('#pa-input');
        inp.innerHTML = '';
        switch(this.currentTab) {
            case 'keypad': this._renderKeypad(); break;
            case 'contacts': this._renderContacts(); break;
            case 'recents': this._renderRecents(); WLCBridge.send('getCallHistory',{}); break;
            case 'sms': this._renderSMSList(); WLCBridge.send('getConversations',{}); break;
        }
    },

    // ====== DATA HANDLERS ======
    _onContacts(msg) { this.contacts = (msg && msg.data) || []; if(this.currentTab==='contacts'&&!this.activeChat) this._renderContacts(); },
    _onConversations(msg) { this.conversations = (msg && msg.data) || []; if(this.currentTab==='sms'&&!this.activeChat) this._renderSMSList(); },
    _onSmsHistory(msg) { this.messages = (msg && msg.data) || []; if(this.activeChat) this._renderChatMessages(); },
    _onCallHistory(msg) { if(this.currentTab==='recents') this._renderCallList((msg&&msg.data)||[]); },
    _onSmsReceived(msg) {
        var d = msg && msg.data;
        if (!d) return;
        // If we're in the chat with this sender, add the message
        if (this.activeChat && this.activeChat.contactId === d.fromId) {
            this.messages.push({id:0, isMe:false, message:d.message, type:d.messageType||'text', time:d.time});
            this._renderChatMessages();
            WLCBridge.send('markSMSRead', {contactId: d.fromId});
        }
        // Refresh conversation list
        if (this.currentTab === 'sms' && !this.activeChat) WLCBridge.send('getConversations',{});
    },
    _onCallUpdate(msg) { /* Handled by PhoneCallUI */ },
    _onIncomingCall(msg) { /* Handled by PhoneCallUI */ },

    // ====== KEYPAD ======
    _renderKeypad() {
        var c = this.wrapper.querySelector('#pa-content');
        var self = this;
        var keys = [[1,''],[2,'ABC'],[3,'DEF'],[4,'GHI'],[5,'JKL'],[6,'MNO'],[7,'PQRS'],[8,'TUV'],[9,'WXYZ'],['*',''],[0,'+'],['\#','']];

        c.innerHTML = '<div style="text-align:center;padding:30px 0 16px;">' +
            '<div id="dial-num" style="font-size:32px;font-weight:300;min-height:42px;color:#fff;letter-spacing:2px;">' + this._esc(this.dialInput) + '</div></div>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:0 30px;">' +
            keys.map(function(k) {
                return '<button class="kp-btn" data-d="'+k[0]+'" style="width:68px;height:68px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:#fff;font-size:24px;font-weight:300;cursor:pointer;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;">' +
                    k[0] + (k[1] ? '<span style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.5);margin-top:-2px;">'+k[1]+'</span>' : '') + '</button>';
            }).join('') + '</div>' +
            '<div style="display:flex;justify-content:center;gap:30px;padding:16px 0;">' +
                '<button id="kp-call" style="width:60px;height:60px;border-radius:50%;border:none;background:#34C759;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                    '<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>' +
                '</button>' +
                '<button id="kp-sms" style="width:60px;height:60px;border-radius:50%;border:none;background:#007AFF;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Envoyer SMS">' +
                    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
                '</button>' +
                '<button id="kp-del" style="width:60px;height:60px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>' +
                '</button>' +
            '</div>';

        c.querySelectorAll('.kp-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                self.dialInput += String(btn.dataset.d);
                c.querySelector('#dial-num').textContent = self.dialInput;
            });
        });
        c.querySelector('#kp-del').addEventListener('click', function() {
            self.dialInput = self.dialInput.slice(0,-1);
            c.querySelector('#dial-num').textContent = self.dialInput || '';
        });
        c.querySelector('#kp-call').addEventListener('click', function() {
            if (self.dialInput.length >= 3) WLCBridge.send('startCall', {number: self.dialInput});
        });
        c.querySelector('#kp-sms').addEventListener('click', function() {
            if (self.dialInput.length >= 3) {
                // Open SMS conversation with this number
                var contactId = WLCPhone_resolveContactId(self.contacts, self.dialInput);
                self._openConversation(contactId || self.dialInput, self.dialInput);
            }
        });
    },

    // ====== CONTACTS ======
    _renderContacts() {
        var c = this.wrapper.querySelector('#pa-content');
        var self = this;
        var sorted = this.contacts.slice().sort(function(a,b){return (a.name||'').localeCompare(b.name||'');});

        c.innerHTML = '<div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">' +
            '<span style="font-size:22px;font-weight:700;">Contacts</span>' +
            '<button id="ct-add" style="background:#007AFF;color:#fff;border:none;border-radius:50%;width:30px;height:30px;font-size:18px;cursor:pointer;">+</button></div>' +
            '<div style="padding:0 12px 8px;"><input type="text" id="ct-search" placeholder="Search" style="width:100%;padding:8px 14px;background:rgba(255,255,255,0.08);border:none;border-radius:10px;color:#fff;font-size:13px;outline:none;"></div>' +
            '<div id="ct-list">' +
            (sorted.length === 0 ? '<div style="text-align:center;padding:40px;color:#8e8e93;font-size:13px;">Aucun contact<br><span style="font-size:11px;">Appuyez sur + pour ajouter</span></div>' :
            sorted.map(function(ct) {
                return '<div class="ct-item" data-id="'+ct.id+'" data-phone="'+ct.phone+'" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;">' +
                    '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#5856D6);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0;">' + (self._esc(ct.name)||'?')[0].toUpperCase() + '</div>' +
                    '<div style="flex:1;overflow:hidden;"><div style="font-size:14px;font-weight:500;">' + self._esc(ct.name||'Inconnu') + '</div>' +
                    '<div style="font-size:11px;color:#8e8e93;font-family:monospace;">' + self._esc(ct.phone) + (ct.online?' · <span style="color:#34C759;"> En ligne</span>':'') + '</div></div>' +
                    '<div style="display:flex;gap:6px;">' +
                        '<button class="ct-call" data-phone="'+ct.phone+'" style="background:rgba(52,199,89,0.15);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="#34C759"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>' +
                        '</button>' +
                        '<button class="ct-sms" data-id="'+ct.id+'" data-phone="'+ct.phone+'" style="background:rgba(0,122,255,0.15);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
                        '</button>' +
                    '</div></div>';
            }).join('')) + '</div>';

        c.querySelector('#ct-add').addEventListener('click', function() { self._renderAddContact(); });
        var search = c.querySelector('#ct-search');
        search.addEventListener('focus', function(){WLCBridge.send('inputFocus',{focused:true});});
        search.addEventListener('blur', function(){WLCBridge.send('inputFocus',{focused:false});});
        search.addEventListener('input', function() {
            var q = this.value.toLowerCase();
            c.querySelectorAll('.ct-item').forEach(function(el) { el.style.display = el.textContent.toLowerCase().indexOf(q)>=0 ? 'flex' : 'none'; });
        });
        c.querySelectorAll('.ct-call').forEach(function(btn) { btn.addEventListener('click', function(e) { e.stopPropagation(); WLCBridge.send('startCall',{number:btn.dataset.phone}); }); });
        c.querySelectorAll('.ct-sms').forEach(function(btn) { btn.addEventListener('click', function(e) { e.stopPropagation(); self._openConversation(btn.dataset.id, btn.dataset.phone); }); });
    },

    _renderAddContact() {
        var c = this.wrapper.querySelector('#pa-content');
        var self = this;
        c.innerHTML = '<div style="padding:16px;">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">' +
                '<button id="ct-back" style="background:none;border:none;color:#007AFF;font-size:14px;cursor:pointer;">\u2190 Retour</button>' +
                '<span style="font-size:18px;font-weight:600;">Nouveau contact</span></div>' +
            '<div style="margin-bottom:14px;"><label style="font-size:11px;color:#8e8e93;font-weight:600;letter-spacing:0.5px;">NUMÉRO DE TÉLÉPHONE</label>' +
                '<input type="text" id="ac-phone" placeholder="Numéro à 6 chiffres" maxlength="6" value="'+this._esc(this.dialInput)+'" style="width:100%;margin-top:6px;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-size:16px;outline:none;font-family:monospace;letter-spacing:2px;"></div>' +
            '<div style="margin-bottom:20px;"><label style="font-size:11px;color:#8e8e93;font-weight:600;letter-spacing:0.5px;">NAME</label>' +
                '<input type="text" id="ac-name" placeholder="Nom du contact" style="width:100%;margin-top:6px;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-size:15px;outline:none;"></div>' +
            '<button id="ac-save" style="width:100%;padding:12px;background:#007AFF;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;">Sauvegarder</button></div>';

        ['ac-phone','ac-name'].forEach(function(id) {
            var el = c.querySelector('#'+id);
            el.addEventListener('focus', function(){WLCBridge.send('inputFocus',{focused:true});});
            el.addEventListener('blur', function(){WLCBridge.send('inputFocus',{focused:false});});
        });
        c.querySelector('#ct-back').addEventListener('click', function() { self._renderContacts(); });
        c.querySelector('#ac-save').addEventListener('click', function() {
            var phone = c.querySelector('#ac-phone').value.trim();
            var name = c.querySelector('#ac-name').value.trim();
            if (phone.length >= 3) {
                WLCBridge.send('saveContact', {phone:phone, name:name});
                window.phoneNotifications.show('Phone', 'Contact sauvegardé!', 'apps/phone/icon.png');
                setTimeout(function() { WLCBridge.send('getContacts',{}); self._renderContacts(); }, 500);
            }
        });
    },

    // ====== SMS CONVERSATIONS LIST ======
    _renderSMSList() {
        var c = this.wrapper.querySelector('#pa-content');
        var self = this;

        if (this.conversations.length === 0) {
            c.innerHTML = '<div style="padding:16px;font-size:22px;font-weight:700;">Messages</div>' +
                '<div style="text-align:center;padding:50px;color:#8e8e93;font-size:13px;">' +
                '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="1.5" style="margin-bottom:10px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
                '<div>Aucune conversation</div><div style="font-size:11px;margin-top:4px;">Envoyez un message depuis le clavier</div></div>';
            return;
        }

        c.innerHTML = '<div style="padding:16px;font-size:22px;font-weight:700;">Messages</div>' +
            this.conversations.map(function(cv) {
                var unreadBadge = cv.unread > 0 ? '<div style="background:#007AFF;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;min-width:18px;text-align:center;">'+cv.unread+'</div>' : '';
                return '<div class="cv-item" data-id="'+cv.contactId+'" data-phone="'+cv.phone+'" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;">' +
                    '<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#00C7BE);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0;">' + (self._esc(cv.name)||'?')[0].toUpperCase() + '</div>' +
                    '<div style="flex:1;overflow:hidden;">' +
                        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                            '<span style="font-size:14px;font-weight:600;">' + self._esc(cv.name) + '</span>' +
                            '<span style="font-size:10px;color:#636366;">' + self._timeAgo(cv.lastTime) + '</span>' +
                        '</div>' +
                        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">' +
                            '<span style="font-size:12px;color:#8e8e93;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">' + (cv.isMe ? 'Vous: ' : '') + self._esc(cv.lastMessage||'') + '</span>' +
                            unreadBadge +
                        '</div>' +
                    '</div></div>';
            }).join('');

        c.querySelectorAll('.cv-item').forEach(function(el) {
            el.addEventListener('click', function() {
                self._openConversation(el.dataset.id, el.dataset.phone);
            });
        });
    },

    // ====== SMS CONVERSATION VIEW ======
    _openConversation(contactId, phone) {
        this.activeChat = { contactId: contactId, phone: phone };
        this.messages = [];
        WLCBridge.send('getSMSHistory', { contactId: contactId });

        var ct = this.contacts.find(function(c){return c.id===contactId || c.phone===phone;});
        var name = (ct && ct.name) || phone;
        var c = this.wrapper.querySelector('#pa-content');
        var inp = this.wrapper.querySelector('#pa-input');
        var self = this;

        c.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">' +
            '<button id="sms-back" style="background:none;border:none;color:#007AFF;font-size:14px;cursor:pointer;">\u2190</button>' +
            '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#00C7BE);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">' + (self._esc(name)||'?')[0].toUpperCase() + '</div>' +
            '<div style="flex:1;"><div style="font-size:14px;font-weight:600;">' + self._esc(name) + '</div>' +
            '<div style="font-size:10px;color:#8e8e93;font-family:monospace;">' + self._esc(phone) + '</div></div></div>' +
            '<div id="sms-msgs" style="flex:1;overflow-y:auto;padding:10px 12px;"></div>';

        inp.innerHTML = '<div style="display:flex;gap:8px;padding:8px 12px 16px;background:rgba(20,20,20,0.95);border-top:1px solid rgba(255,255,255,0.06);">' +
            '<input type="text" id="sms-input" placeholder="Message..." style="flex:1;padding:10px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.08);border-radius:20px;color:#fff;font-size:13px;outline:none;">' +
            '<button id="sms-send" style="background:#007AFF;color:#fff;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div>';

        c.querySelector('#sms-back').addEventListener('click', function() {
            self.activeChat = null;
            inp.innerHTML = '';
            WLCBridge.send('getConversations', {});
            self.currentTab = 'sms';
            self._renderSMSList();
        });

        var msgInput = inp.querySelector('#sms-input');
        msgInput.addEventListener('focus', function(){WLCBridge.send('inputFocus',{focused:true});});
        msgInput.addEventListener('blur', function(){WLCBridge.send('inputFocus',{focused:false});});
        msgInput.addEventListener('keydown', function(e){ if(e.key==='Enter') self._sendSMS(); });
        inp.querySelector('#sms-send').addEventListener('click', function(){ self._sendSMS(); });

        // Mark as read
        WLCBridge.send('markSMSRead', { contactId: contactId });
    },

    _renderChatMessages() {
        var el = this.wrapper.querySelector('#sms-msgs');
        if (!el) return;
        if (this.messages.length === 0) {
            el.innerHTML = '<div style="text-align:center;padding:40px;color:#636366;font-size:12px;">Aucun message. Dites bonjour!</div>';
            return;
        }
        el.innerHTML = this.messages.map(function(m) {
            return '<div style="display:flex;justify-content:'+(m.isMe?'flex-end':'flex-start')+';margin-bottom:6px;">' +
                '<div class="sms-bubble '+(m.isMe?'sms-me':'sms-them')+'">' + this._esc(m.message) + '</div></div>' +
                '<div style="text-align:'+(m.isMe?'right':'left')+';font-size:9px;color:#636366;margin-bottom:8px;padding:0 4px;">' + this._timeAgo(m.time) + '</div>';
        }.bind(this)).join('');
        el.scrollTop = el.scrollHeight;
    },

    _sendSMS() {
        var inp = this.wrapper.querySelector('#sms-input');
        if (!inp || !this.activeChat) return;
        var text = inp.value.trim();
        if (!text) return;
        inp.value = '';
        WLCBridge.send('sendSMS', { to: this.activeChat.phone, message: text });
        this.messages.push({ id:0, isMe:true, message:text, time:'maint.' });
        this._renderChatMessages();
    },

    // ====== CALL HISTORY ======
    _renderRecents() {
        var c = this.wrapper.querySelector('#pa-content');
        c.innerHTML = '<div style="padding:16px;font-size:22px;font-weight:700;">Récents</div>' +
            '<div id="call-list"><div style="text-align:center;padding:40px;color:#8e8e93;font-size:12px;">Chargement...</div></div>';
    },

    _renderCallList(history) {
        var el = this.wrapper.querySelector('#call-list');
        if (!el) return;
        if (history.length === 0) {
            el.innerHTML = '<div style="text-align:center;padding:40px;color:#8e8e93;font-size:13px;">Aucun appel récent</div>';
            return;
        }
        el.innerHTML = history.map(function(h) {
            var missed = h.status==='missed'||h.status==='declined';
            var icon = h.direction==='outgoing'
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>'
                : missed
                    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="2"><path d="M17 7L7 17M7 17V7M7 17h10"/></svg>'
                    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2"><path d="M17 17L7 7M7 7v10M7 7h10"/></svg>';
            var dur = parseInt(h.duration_seconds||0);
            var durStr = dur > 0 ? Math.floor(dur/60)+':'+String(dur%60).padStart(2,'0') : '';
            return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.04);">' +
                icon +
                '<div style="flex:1;"><div style="font-size:14px;font-weight:500;'+(missed?'color:#FF3B30;':'')+'">'+ this._esc(h.other_name||h.other_phone||'Inconnu')+'</div>' +
                '<div style="font-size:11px;color:#8e8e93;">'+(h.other_phone||'')+' \u00B7 '+this._timeAgo(h.created_at)+'</div></div>' +
                (durStr ? '<span style="font-size:11px;color:#8e8e93;">'+durStr+'</span>' : '') +
            '</div>';
        }.bind(this)).join('');
    },

    // ====== UTILS ======
    _timeAgo(dateStr) {
        if (!dateStr || dateStr === 'maint.') return 'maint.';
        try {
            var d = new Date(dateStr.replace(' ','T')+'Z');
            var diff = Math.floor((Date.now()-d.getTime())/1000);
            if (diff < 60) return 'maint.';
            if (diff < 3600) return Math.floor(diff/60)+'m';
            if (diff < 86400) return Math.floor(diff/3600)+'h';
            return Math.floor(diff/86400)+'d';
        } catch(e) { return dateStr; }
    },
    _esc(s) { if(!s)return''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
});

// Helper to resolve contact ID from phone number
function WLCPhone_resolveContactId(contacts, phone) {
    for (var i=0; i<contacts.length; i++) {
        if (contacts[i].phone === phone) return contacts[i].id;
    }
    return null;
}
