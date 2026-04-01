/**
 * Genesis Phone - Mailbox App (iOS Design)
 * Supports PDF viewing via iframe
 */
window.phoneAppManager && window.phoneAppManager.register('mailbox', {
    w: null, mails: [], view: 'list', selected: null,

    getHTML() {
        return '<div class="mail-app">' +
            '<div class="mail-header"><h1>\u{1F4EC} Boîte mail</h1><div class="mail-badge" id="mail-count">0</div></div>' +
            '<div class="mail-scroll" id="mail-c"></div></div>';
    },

    onOpen(wrapper) {
        this.w = wrapper; this.mails = []; this.view = 'list'; this.selected = null;
        this._h = this._onData.bind(this);
        this._dh = this._onDelete.bind(this);
        WLCBridge.on('mailboxData', this._h);
        WLCBridge.on('mailboxDeleteResult', this._dh);
        WLCBridge.send('mailboxGetAll', {});
        this._load();
    },

    onClose() {
        if (this._h) WLCBridge.off('mailboxData', this._h);
        if (this._dh) WLCBridge.off('mailboxDeleteResult', this._dh);
        this.w = null;
    },

    _c() { return this.w && this.w.querySelector('#mail-c'); },

    _load() {
        var el = this._c(); if (!el) return;
        el.innerHTML = '<div class="mail-loading"><div class="mail-spinner"></div></div>';
    },

    _onData(msg) {
        this.mails = (msg && msg.data && msg.data.mails) || [];
        var badge = this.w && this.w.querySelector('#mail-count');
        var unread = this.mails.filter(function(m) { return !m.read; }).length;
        if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? '' : 'none'; }
        this._draw();
    },

    _onDelete(msg) {
        if (msg && msg.data && msg.data.success) {
            this.view = 'list';
            WLCBridge.send('mailboxGetAll', {});
            if (window.phoneNotifications) window.phoneNotifications.show('Mailbox', 'Mail supprim\u00e9', 'apps/mailbox/icon.png');
        }
    },

    _draw() {
        if (this.view === 'detail') return this._drawDetail();
        this._drawList();
    },

    _drawList() {
        var el = this._c(); if (!el) return;
        var s = this;
        if (this.mails.length === 0) {
            el.innerHTML = '<div class="mail-empty"><div class="mail-empty-icon">\u{1F4ED}</div><div class="mail-empty-text">Aucun mail</div></div>';
            return;
        }
        var h = '<div class="mail-list">';
        this.mails.forEach(function(m, i) {
            var unread = !m.read;
            var date = m.date ? s._fmtDate(m.date) : '';
            var hasAttach = m.attachments && m.attachments.length > 0;
            var preview = (m.message || '').substring(0, 60);
            h += '<div class="mail-item' + (unread ? ' unread' : '') + '" data-idx="' + i + '">' +
                '<div class="mail-dot' + (unread ? '' : ' read') + '"></div>' +
                '<div class="mail-item-body">' +
                    '<div class="mail-item-sender">' + s._e(m.sender || 'Inconnu') + '</div>' +
                    '<div class="mail-item-subject">' + s._e(m.subject || '(sans objet)') + '</div>' +
                    '<div class="mail-item-preview">' + s._e(preview) + '</div>' +
                '</div>' +
                '<div class="mail-item-right">' +
                    '<div class="mail-item-date">' + date + '</div>' +
                    (hasAttach ? '<div class="mail-item-attach">\u{1F4CE} PDF</div>' : '') +
                '</div></div>';
        });
        h += '</div>';
        el.innerHTML = h;

        el.querySelectorAll('.mail-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var idx = parseInt(item.dataset.idx);
                if (s.mails[idx]) {
                    s.selected = s.mails[idx];
                    s.view = 'detail';
                    if (!s.selected.read) {
                        s.selected.read = true;
                        WLCBridge.send('mailboxMarkRead', { id: s.selected.id || s.selected.mailid });
                    }
                    s._draw();
                }
            });
        });
    },

    _drawDetail() {
        var el = this._c(); if (!el || !this.selected) return;
        var s = this, m = this.selected;
        var initial = (m.sender || '?').charAt(0).toUpperCase();
        var date = m.date ? s._fmtDateFull(m.date) : '';

        var h = '<div class="mail-back" id="mail-back">\u2190 Bo\u00eete mail</div>' +
            '<div class="mail-detail">' +
            '<div class="mail-detail-header">' +
                '<div class="mail-detail-subject">' + s._e(m.subject || '(sans objet)') + '</div>' +
                '<div class="mail-detail-meta">' +
                    '<div class="mail-detail-avatar">' + initial + '</div>' +
                    '<div><div class="mail-detail-sender-name">' + s._e(m.sender || 'Inconnu') + '</div>' +
                    '<div class="mail-detail-date">' + date + '</div></div>' +
                '</div>' +
            '</div>' +
            '<div class="mail-detail-body">' + s._e(m.message || '') + '</div>';

        // Attachments (PDF support)
        if (m.attachments && m.attachments.length > 0) {
            m.attachments.forEach(function(att, ai) {
                var name = att.name || att.filename || 'document.pdf';
                var size = att.size || '';
                var url = att.url || att.path || '';
                h += '<div class="mail-attachment">' +
                    '<div class="mail-attachment-bar" data-att-idx="' + ai + '">' +
                    '<div class="mail-attachment-icon">PDF</div>' +
                    '<div class="mail-attachment-info">' +
                        '<div class="mail-attachment-name">' + s._e(name) + '</div>' +
                        (size ? '<div class="mail-attachment-size">' + size + '</div>' : '') +
                    '</div>' +
                    '<div class="mail-attachment-open">Ouvrir</div>' +
                    '</div></div>';
            });
        }

        // Also check for legacy button/pdf fields
        if (m.button && m.button.pdf) {
            h += '<div class="mail-attachment">' +
                '<div class="mail-attachment-bar" data-pdf-url="' + s._e(m.button.pdf) + '">' +
                '<div class="mail-attachment-icon">PDF</div>' +
                '<div class="mail-attachment-info"><div class="mail-attachment-name">' + s._e(m.button.label || 'Document.pdf') + '</div></div>' +
                '<div class="mail-attachment-open">Ouvrir</div></div></div>';
        }

        // Action buttons (mail action events)
        if (m.button && m.button.buttonEvent) {
            h += '<div style="margin-top:14px;">' +
                '<div class="mail-action-btn reply" id="mail-action-btn" style="padding:12px;border-radius:12px;text-align:center;cursor:pointer;">' +
                s._e(m.button.label || 'Action') + '</div></div>';
        }

        h += '</div>';

        // Delete button
        h += '<div class="mail-actions">' +
            '<div class="mail-action-btn delete" id="mail-del">\u{1F5D1} Supprimer</div>' +
        '</div>';

        el.innerHTML = h;

        // Events
        el.querySelector('#mail-back').addEventListener('click', function() { s.view = 'list'; s._draw(); });

        // Attachment click → open PDF viewer
        el.querySelectorAll('.mail-attachment-bar').forEach(function(bar) {
            bar.addEventListener('click', function() {
                var attIdx = bar.dataset.attIdx;
                var pdfUrl = bar.dataset.pdfUrl;
                if (attIdx !== undefined && m.attachments && m.attachments[parseInt(attIdx)]) {
                    pdfUrl = m.attachments[parseInt(attIdx)].url || m.attachments[parseInt(attIdx)].path;
                }
                if (pdfUrl) s._openPDF(pdfUrl, bar.querySelector('.mail-attachment-name') ? bar.querySelector('.mail-attachment-name').textContent : 'Document');
            });
        });

        // Delete
        var delBtn = el.querySelector('#mail-del');
        if (delBtn) delBtn.addEventListener('click', function() {
            WLCBridge.send('mailboxDelete', { id: m.id || m.mailid });
        });

        // Mail action button
        var actBtn = el.querySelector('#mail-action-btn');
        if (actBtn && m.button) {
            actBtn.addEventListener('click', function() {
                WLCBridge.send('mailboxAction', { event: m.button.buttonEvent, data: m.button.buttonData, isServer: m.button.isServer });
            });
        }
    },

    _openPDF(url, title) {
        if (!this.w) return;
        // Create PDF viewer overlay
        var viewer = document.createElement('div');
        viewer.className = 'mail-pdf-viewer';
        viewer.innerHTML =
            '<div class="mail-pdf-toolbar">' +
                '<div class="mail-pdf-close" id="pdf-close">Fermer</div>' +
                '<div class="mail-pdf-title">' + this._e(title || 'Document') + '</div>' +
                '<div style="width:50px;"></div>' +
            '</div>' +
            '<iframe class="mail-pdf-frame" src="' + this._e(url) + '"></iframe>';
        this.w.appendChild(viewer);

        viewer.querySelector('#pdf-close').addEventListener('click', function() {
            viewer.remove();
        });

        // Also notify Lua side for potential download
        WLCBridge.send('mailboxOpenPDF', { url: url, title: title });
    },

    _fmtDate(d) {
        if (!d) return '';
        var date = typeof d === 'number' ? new Date(d > 9999999999 ? d : d * 1000) : new Date(d);
        if (isNaN(date.getTime())) return '';
        var now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.getHours().toString().padStart(2,'0') + ':' + date.getMinutes().toString().padStart(2,'0');
        }
        return date.getDate() + '/' + (date.getMonth()+1);
    },

    _fmtDateFull(d) {
        if (!d) return '';
        var date = typeof d === 'number' ? new Date(d > 9999999999 ? d : d * 1000) : new Date(d);
        if (isNaN(date.getTime())) return '';
        var months = ['jan.','f\u00e9v.','mars','avr.','mai','juin','juil.','ao\u00fbt','sept.','oct.','nov.','d\u00e9c.'];
        return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear() + ' \u00e0 ' +
            date.getHours().toString().padStart(2,'0') + ':' + date.getMinutes().toString().padStart(2,'0');
    },

    _e(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
});
