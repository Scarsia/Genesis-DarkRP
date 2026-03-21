/**
 * Genesis Phone - DarkChat (Anonymous Messenger)
 * Profile creation, friends, groups, real-time DM & group messages
 * All persistent via server SQLite
 */
window.phoneAppManager && window.phoneAppManager.register('darkchat', {
    wrapper: null, profile: null, friends: [], groups: [], currentView: 'list',
    chatTarget: null, chatType: null, messages: [],

    getHTML() {
        return '<div class="dc-app" style="display:flex;flex-direction:column;height:100%;background:#0a0a0e;color:#fff;border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div id="dc-header" style="padding:14px 16px;flex-shrink:0;"></div>' +
            '<div id="dc-content" style="flex:1;overflow-y:auto;padding:0 12px;"></div>' +
            '<div id="dc-input" style="flex-shrink:0;"></div></div>';
    },

    onOpen(wrapper) {
        this.wrapper = wrapper;
        WLCBridge.on('dcProfile', this._onProfile.bind(this));
        WLCBridge.on('dcFriends', this._onFriends.bind(this));
        WLCBridge.on('dcGroups', this._onGroups.bind(this));
        WLCBridge.on('dcMessages', this._onMessages.bind(this));
        WLCBridge.on('dcMessageReceived', this._onNewMessage.bind(this));
        WLCBridge.on('dcAddFriendResult', this._onAddFriend.bind(this));
        WLCBridge.on('dcCreateGroupResult', this._onGroupCreated.bind(this));
        WLCBridge.on('dcJoinGroupResult', this._onGroupJoined.bind(this));
        WLCBridge.send('dcGetProfile', {});
    },

    onClose() {
        ['dcProfile','dcFriends','dcGroups','dcMessages','dcMessageReceived','dcAddFriendResult','dcCreateGroupResult','dcJoinGroupResult'].forEach(function(n) { WLCBridge.off(n); });
        this.wrapper = null;
    },

    _onProfile(msg) {
        this.profile = msg && msg.data;
        if (!this.profile || this.profile.exists === false || !this.profile.display_name) {
            this._renderSetup();
        } else {
            this._loadList();
        }
    },

    _renderSetup() {
        var h = this.wrapper.querySelector('#dc-header');
        var c = this.wrapper.querySelector('#dc-content');
        this.wrapper.querySelector('#dc-input').innerHTML = '';
        h.innerHTML = '<div style="font-size:22px;font-weight:700;">DarkChat</div><div style="font-size:11px;color:#8e8e93;">Créez votre profil anonyme</div>';
        var colors = ['#007AFF','#FF3B30','#34C759','#FF9500','#AF52DE','#FF2D55','#5856D6','#00C7BE'];
        c.innerHTML = '<div style="padding:20px 8px;">' +
            '<div style="margin-bottom:16px;"><label style="font-size:12px;color:#8e8e93;">PSEUDO</label>' +
            '<input type="text" id="dc-name" placeholder="Choisissez un pseudo" maxlength="50" style="width:100%;margin-top:6px;padding:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;"></div>' +
            '<div style="margin-bottom:16px;"><label style="font-size:12px;color:#8e8e93;">COULEUR D&#39;AVATAR</label>' +
            '<div id="dc-colors" style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">' +
            colors.map(function(c,i) { return '<div class="dc-color" data-color="'+c+'" style="width:36px;height:36px;border-radius:50%;background:'+c+';cursor:pointer;border:3px solid '+(i===0?'#fff':'transparent')+';"></div>'; }).join('') +
            '</div></div>' +
            '<button id="dc-create" style="width:100%;padding:12px;background:#007AFF;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">Créer le profil</button></div>';
        var self = this, selectedColor = colors[0];
        c.querySelector('#dc-name').addEventListener('focus', function() { WLCBridge.send('inputFocus',{focused:true}); });
        c.querySelector('#dc-name').addEventListener('blur', function() { WLCBridge.send('inputFocus',{focused:false}); });
        c.querySelectorAll('.dc-color').forEach(function(el) {
            el.addEventListener('click', function() {
                c.querySelectorAll('.dc-color').forEach(function(e) { e.style.border='3px solid transparent'; });
                el.style.border='3px solid #fff'; selectedColor=el.dataset.color;
            });
        });
        c.querySelector('#dc-create').addEventListener('click', function() {
            var name = c.querySelector('#dc-name').value.trim();
            if (name) WLCBridge.send('dcCreateProfile', {name:name, color:selectedColor});
        });
    },

    _loadList() {
        WLCBridge.send('dcGetFriends', {});
        WLCBridge.send('dcGetGroups', {});
        this.currentView = 'list';
        this._renderList();
    },

    _onFriends(msg) { this.friends = (msg && msg.data) || []; if (this.currentView==='list') this._renderList(); },
    _onGroups(msg) { this.groups = (msg && msg.data) || []; if (this.currentView==='list') this._renderList(); },

    _renderList() {
        var h = this.wrapper.querySelector('#dc-header');
        var c = this.wrapper.querySelector('#dc-content');
        this.wrapper.querySelector('#dc-input').innerHTML = '';
        var self = this;
        h.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;">' +
            '<div><div style="font-size:22px;font-weight:700;">Messagerie</div><div style="font-size:11px;color:#8e8e93;">' + this._esc(this.profile.display_name) + '</div></div>' +
            '<button id="dc-add" style="background:#007AFF;color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer;">+</button></div>';

        var html = '';
        var accepted = this.friends.filter(function(f) { return f.status === 'accepted'; });
        var pending = this.friends.filter(function(f) { return f.status === 'pending' && f.direction === 'received'; });

        if (pending.length > 0) {
            html += '<div style="font-size:11px;color:#FF9500;font-weight:600;padding:8px 4px;">DEMANDES EN ATTENTE (' + pending.length + ')</div>';
            pending.forEach(function(f) {
                html += '<div class="dc-item" style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,0.06);">' +
                    '<div style="width:36px;height:36px;border-radius:50%;background:' + (f.avatar_color||'#007AFF') + ';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">' + (f.display_name||'?')[0].toUpperCase() + '</div>' +
                    '<div style="flex:1;font-size:14px;">' + self._esc(f.display_name||'Inconnu') + '</div>' +
                    '<button class="dc-accept" data-id="' + f.id + '" style="background:#34C759;color:#fff;border:none;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">Accepter</button></div>';
            });
        }

        if (this.groups.length > 0) {
            html += '<div style="font-size:11px;color:#8e8e93;font-weight:600;padding:8px 4px;margin-top:8px;">GROUPES</div>';
            this.groups.forEach(function(g) {
                html += '<div class="dc-chat-item" data-type="group" data-id="' + g.id + '" style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;">' +
                    '<div style="width:36px;height:36px;border-radius:50%;background:' + (g.group_avatar||'#34C759') + ';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">#</div>' +
                    '<div style="flex:1;"><div style="font-size:14px;font-weight:500;">' + self._esc(g.group_name) + '</div><div style="font-size:11px;color:#8e8e93;">' + (g.member_count||0) + ' membres</div></div></div>';
            });
        }

        if (accepted.length > 0) {
            html += '<div style="font-size:11px;color:#8e8e93;font-weight:600;padding:8px 4px;margin-top:8px;">AMIS</div>';
            accepted.forEach(function(f) {
                html += '<div class="dc-chat-item" data-type="dm" data-id="' + f.other_id + '" style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;">' +
                    '<div style="width:36px;height:36px;border-radius:50%;background:' + (f.avatar_color||'#007AFF') + ';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">' + (f.display_name||'?')[0].toUpperCase() + '</div>' +
                    '<div style="flex:1;font-size:14px;font-weight:500;">' + self._esc(f.display_name||'Inconnu') + '</div></div>';
            });
        }

        if (!html) html = '<div style="text-align:center;padding:50px;color:#8e8e93;font-size:13px;">Aucune conversation<br>Tap + to add a friend or join a group</div>';
        c.innerHTML = html;

        h.querySelector('#dc-add').addEventListener('click', function() { self._renderAddMenu(); });
        c.querySelectorAll('.dc-accept').forEach(function(btn) { btn.addEventListener('click', function() { WLCBridge.send('dcAcceptFriend', {friendshipId:parseInt(btn.dataset.id)}); setTimeout(function(){self._loadList();},500); }); });
        c.querySelectorAll('.dc-chat-item').forEach(function(el) { el.addEventListener('click', function() { self._openChat(el.dataset.type, el.dataset.id); }); });
    },

    _renderAddMenu() {
        var c = this.wrapper.querySelector('#dc-content');
        var self = this;
        c.innerHTML = '<div style="padding:10px 4px;">' +
            '<button id="dc-back" style="background:none;border:none;color:#007AFF;font-size:14px;cursor:pointer;margin-bottom:14px;">← Retour</button>' +
            '<div style="font-size:16px;font-weight:600;margin-bottom:14px;">Ajouter un ami</div>' +
            '<input type="text" id="dc-friend-name" placeholder="Pseudo de l&#39;ami" style="width:100%;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;margin-bottom:8px;">' +
            '<button id="dc-send-req" style="width:100%;padding:10px;background:#007AFF;color:#fff;border:none;border-radius:10px;font-size:14px;cursor:pointer;">Envoyer la demande</button>' +
            '<div style="border-top:1px solid rgba(255,255,255,0.06);margin:20px 0;"></div>' +
            '<div style="font-size:16px;font-weight:600;margin-bottom:14px;">Rejoindre le groupe</div>' +
            '<input type="text" id="dc-group-name" placeholder="Nom du groupe" style="width:100%;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;margin-bottom:8px;">' +
            '<input type="password" id="dc-group-pw" placeholder="Mot de passe (optionnel)" style="width:100%;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;margin-bottom:8px;">' +
            '<button id="dc-join" style="width:100%;padding:10px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:10px;font-size:14px;cursor:pointer;">Rejoindre le groupe</button>' +
            '<div style="border-top:1px solid rgba(255,255,255,0.06);margin:20px 0;"></div>' +
            '<div style="font-size:16px;font-weight:600;margin-bottom:14px;">Créer un groupe</div>' +
            '<input type="text" id="dc-new-group" placeholder="Nom du nouveau groupe" style="width:100%;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;margin-bottom:8px;">' +
            '<input type="password" id="dc-new-pw" placeholder="Mot de passe (optionnel)" style="width:100%;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;margin-bottom:8px;">' +
            '<button id="dc-create-grp" style="width:100%;padding:10px;background:#34C759;color:#fff;border:none;border-radius:10px;font-size:14px;cursor:pointer;">Créer un groupe</button></div>';

        ['dc-friend-name','dc-group-name','dc-group-pw','dc-new-group','dc-new-pw'].forEach(function(id) {
            var el = c.querySelector('#'+id); if(el) { el.addEventListener('focus',function(){WLCBridge.send('inputFocus',{focused:true});}); el.addEventListener('blur',function(){WLCBridge.send('inputFocus',{focused:false});}); }
        });
        c.querySelector('#dc-back').addEventListener('click', function() { self._loadList(); });
        c.querySelector('#dc-send-req').addEventListener('click', function() { var n=c.querySelector('#dc-friend-name').value.trim(); if(n) WLCBridge.send('dcAddFriend',{name:n}); });
        c.querySelector('#dc-join').addEventListener('click', function() { var n=c.querySelector('#dc-group-name').value.trim(),p=c.querySelector('#dc-group-pw').value; if(n) WLCBridge.send('dcJoinGroup',{name:n,password:p}); });
        c.querySelector('#dc-create-grp').addEventListener('click', function() { var n=c.querySelector('#dc-new-group').value.trim(),p=c.querySelector('#dc-new-pw').value; if(n) WLCBridge.send('dcCreateGroup',{name:n,password:p}); });
    },

    _onAddFriend(msg) {
        var d = msg && msg.data;
        if (d && d.success) { window.phoneNotifications.show('DarkChat','Demande d&#39;ami envoyée!','apps/darkchat/icon.png'); this._loadList(); }
        else window.phoneNotifications.show('DarkChat', d && d.error === 'not_found' ? 'Utilisateur introuvable' : 'Échec de la demande', 'apps/darkchat/icon.png');
    },
    _onGroupCreated(msg) { var d=msg&&msg.data; if(d&&d.success){window.phoneNotifications.show('DarkChat','Groupe créé!','apps/darkchat/icon.png');this._loadList();} },
    _onGroupJoined(msg) { var d=msg&&msg.data; if(d&&d.success){window.phoneNotifications.show('DarkChat','Groupe rejoint!','apps/darkchat/icon.png');this._loadList();}else window.phoneNotifications.show('DarkChat',d&&d.error==='wrong_password'?'Mauvais mot de passe':'Groupe introuvable','apps/darkchat/icon.png'); },

    _openChat(type, id) {
        this.currentView = 'chat'; this.chatType = type; this.chatTarget = id; this.messages = [];
        if (type === 'group') WLCBridge.send('dcGetMessages', {groupId: parseInt(id)});
        else WLCBridge.send('dcGetMessages', {friendId: id});
        this._renderChat();
    },

    _onMessages(msg) { this.messages = (msg && msg.data) || []; this._renderChatMessages(); },

    _onNewMessage(msg) {
        var d = msg && msg.data;
        if (!d) return;
        if (this.currentView === 'chat') {
            // Add to current chat if it matches
            this.messages.push({id:0, isMe:false, senderName:d.senderName, senderColor:d.senderColor, message:d.message, time:d.time});
            this._renderChatMessages();
        }
        window.phoneNotifications.show('DarkChat', (d.senderName||'?') + ': ' + (d.message||''), 'apps/darkchat/icon.png');
    },

    _renderChat() {
        var h = this.wrapper.querySelector('#dc-header');
        var c = this.wrapper.querySelector('#dc-content');
        var inp = this.wrapper.querySelector('#dc-input');
        var self = this;
        h.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">' +
            '<button id="dc-chat-back" style="background:none;border:none;color:#007AFF;font-size:14px;cursor:pointer;">←</button>' +
            '<span style="font-size:16px;font-weight:600;">' + (this.chatType==='group' ? 'Discussion de groupe' : 'Message privé') + '</span></div>';
        c.innerHTML = '<div id="dc-msgs" style="padding:8px 0;"></div>';
        inp.innerHTML = '<div style="display:flex;gap:8px;padding:10px 12px 20px;background:rgba(10,10,14,0.95);border-top:1px solid rgba(255,255,255,0.06);">' +
            '<input type="text" id="dc-msg-in" placeholder="Message..." style="flex:1;padding:10px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:20px;color:#fff;font-size:13px;outline:none;">' +
            '<button id="dc-send" style="background:#007AFF;color:#fff;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div>';

        h.querySelector('#dc-chat-back').addEventListener('click', function() { self.currentView='list'; self._loadList(); });
        var msgIn = inp.querySelector('#dc-msg-in');
        msgIn.addEventListener('focus', function(){WLCBridge.send('inputFocus',{focused:true});});
        msgIn.addEventListener('blur', function(){WLCBridge.send('inputFocus',{focused:false});});
        msgIn.addEventListener('keydown', function(e){ if(e.key==='Enter') self._sendMsg(); });
        inp.querySelector('#dc-send').addEventListener('click', function(){ self._sendMsg(); });
        this._renderChatMessages();
    },

    _renderChatMessages() {
        var el = this.wrapper.querySelector('#dc-msgs'); if(!el) return;
        el.innerHTML = this.messages.map(function(m) {
            return '<div style="display:flex;justify-content:'+(m.isMe?'flex-end':'flex-start')+';padding:3px 0;">' +
                '<div style="max-width:75%;">' +
                (!m.isMe ? '<div style="font-size:10px;color:'+(m.senderColor||'#8e8e93')+';margin-bottom:2px;">'+(m.senderName||'')+'</div>' : '') +
                '<div style="padding:8px 12px;border-radius:16px;font-size:13px;line-height:1.4;background:'+(m.isMe?'#007AFF':'rgba(255,255,255,0.1)')+';color:#fff;">'+
                this._esc(m.message)+'</div>' +
                '<div style="font-size:9px;color:#636366;margin-top:2px;text-align:'+(m.isMe?'right':'left')+';">'+(m.time||'')+'</div></div></div>';
        }.bind(this)).join('');
        el.scrollTop = el.scrollHeight;
    },

    _sendMsg() {
        var inp = this.wrapper.querySelector('#dc-msg-in'); if(!inp) return;
        var text = inp.value.trim(); if(!text) return; inp.value = '';
        var payload = {message: text};
        if (this.chatType === 'group') payload.groupId = parseInt(this.chatTarget);
        else payload.recipientId = this.chatTarget;
        WLCBridge.send('dcSendMessage', payload);
        this.messages.push({id:0, isMe:true, message:text, time:'now'});
        this._renderChatMessages();
    },

    _esc(s) { if(!s) return ''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
});
