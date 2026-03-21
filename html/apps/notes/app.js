/**
 * Genesis Phone - Notes App
 * Full CRUD, persistent via server SQLite
 */
window.phoneAppManager && window.phoneAppManager.register('notes', {
    wrapper: null, notes: [], editing: null, _boundOnNotes: null,

    getHTML() {
        return '<div class="notes-app" style="display:flex;flex-direction:column;height:100%;background:var(--phone-bg,#000);color:var(--phone-text,#fff);border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div id="notes-content" style="flex:1;overflow-y:auto;"></div></div>';
    },

    onOpen(wrapper) {
        this.wrapper = wrapper;
        this.editing = null;
        this.notes = [];
        this._boundOnNotes = this._onNotes.bind(this);
        WLCBridge.on('notesList', this._boundOnNotes);
        WLCBridge.send('getNotes', {});
        this._showLoading();
    },

    onClose() {
        if (this._boundOnNotes) WLCBridge.off('notesList', this._boundOnNotes);
        this._boundOnNotes = null;
        this.wrapper = null;
    },

    _showLoading() {
        var el = this.wrapper && this.wrapper.querySelector('#notes-content');
        if (el) el.innerHTML = '<div style="text-align:center;padding:60px;color:#8e8e93;">Chargement...</div>';
    },

    _onNotes(msg) {
        if (!this.wrapper) return;
        var d = msg && msg.data;
        if (Array.isArray(d)) {
            this.notes = d;
        } else if (d && typeof d === 'object' && !Array.isArray(d)) {
            // Server might send object with numeric keys
            var arr = [];
            for (var k in d) { if (d.hasOwnProperty(k)) arr.push(d[k]); }
            this.notes = arr;
        }
        if (!this.editing) this._renderList();
    },

    _renderList() {
        var el = this.wrapper && this.wrapper.querySelector('#notes-content');
        if (!el) return;
        var self = this;

        var html = '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px;">' +
            '<span style="font-size:24px;font-weight:700;">Notes</span>' +
            '<button id="note-new" style="background:#007AFF;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">+ Nouveau</button></div>' +
            '<div style="padding:0 12px;">';

        if (this.notes.length === 0) {
            html += '<div style="text-align:center;padding:40px;color:#8e8e93;font-size:13px;">' +
                '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="1.5" style="margin-bottom:10px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
                '<div>Aucune note</div></div>';
        } else {
            this.notes.forEach(function(n) {
                html += '<div class="note-item" data-id="' + n.id + '" style="background:rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:8px;cursor:pointer;transition:background 0.15s;">' +
                    '<div style="font-size:15px;font-weight:600;margin-bottom:4px;">' + (self._esc(n.title) || 'Sans titre') + '</div>' +
                    '<div style="font-size:12px;color:#8e8e93;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (self._esc(n.content) || 'Note vide') + '</div>' +
                    '<div style="font-size:10px;color:#636366;margin-top:6px;">' + (n.updated_at || '') + '</div></div>';
            });
        }
        html += '</div>';
        el.innerHTML = html;

        el.querySelector('#note-new').addEventListener('click', function() { self._openEditor(null); });
        el.querySelectorAll('.note-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var note = self.notes.find(function(n) { return String(n.id) === item.dataset.id; });
                if (note) self._openEditor(note);
            });
        });
    },

    _openEditor(note) {
        this.editing = note || { id: 0, title: '', content: '' };
        var el = this.wrapper && this.wrapper.querySelector('#notes-content');
        if (!el) return;
        var self = this;
        var editId = this.editing.id;

        el.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;">' +
            '<button id="note-back" style="background:none;border:none;color:#007AFF;font-size:14px;cursor:pointer;">\u2190 Retour</button>' +
            '<div style="flex:1;"></div>' +
            (editId ? '<button id="note-delete" style="background:none;border:none;color:#FF3B30;font-size:13px;cursor:pointer;">Supprimer</button>' : '') +
            '<button id="note-save" style="background:#007AFF;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;">Sauvegarder</button></div>' +
            '<div style="padding:0 16px;">' +
            '<input id="note-title" type="text" placeholder="Titre" value="' + this._esc(this.editing.title) + '" style="width:100%;background:none;border:none;color:var(--phone-text,#fff);font-size:22px;font-weight:700;outline:none;padding:8px 0;">' +
            '<textarea id="note-content" placeholder="Commencez \u00e0 \u00e9crire..." style="width:100%;min-height:300px;background:none;border:none;color:var(--phone-text,#fff);font-size:15px;outline:none;resize:none;line-height:1.6;">' + this._esc(this.editing.content) + '</textarea></div>';

        ['note-title','note-content'].forEach(function(id) {
            var inp = el.querySelector('#'+id);
            if (inp) {
                inp.addEventListener('focus', function() { WLCBridge.send('inputFocus',{focused:true}); });
                inp.addEventListener('blur', function() { WLCBridge.send('inputFocus',{focused:false}); });
            }
        });

        el.querySelector('#note-back').addEventListener('click', function() {
            self.editing = null;
            WLCBridge.send('getNotes', {});
        });

        el.querySelector('#note-save').addEventListener('click', function() {
            var title = el.querySelector('#note-title').value;
            var content = el.querySelector('#note-content').value;
            WLCBridge.send('saveNote', { id: editId || 0, title: title, content: content });
            self.editing = null;
            window.phoneNotifications && window.phoneNotifications.show('Notes', 'Note sauvegard\u00e9e', 'apps/notes/icon.png');
        });

        var delBtn = el.querySelector('#note-delete');
        if (delBtn) {
            delBtn.addEventListener('click', function() {
                WLCBridge.send('deleteNote', { id: editId });
                self.editing = null;
            });
        }
    },

    _esc(s) { if(!s) return ''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
});
