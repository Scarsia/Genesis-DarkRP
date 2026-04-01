/**
 * Genesis Phone - Bank App (iOS Design)
 */
window.phoneAppManager && window.phoneAppManager.register('bank', {
    w: null, data: null, view: 'home', card: null,

    getHTML() {
        return '<div class="bank-app"><div class="bank-header"><h1>Genesis Bank</h1><p></p></div><div class="bank-scroll" id="bank-c"></div></div>';
    },

    onOpen(wrapper) {
        this.w = wrapper; this.data = null; this.view = 'home';
        this._bh = this._snap.bind(this);
        this._th = this._xfer.bind(this);
        WLCBridge.on('bankSnapshot', this._bh);
        WLCBridge.on('bankTransferResult', this._th);
        WLCBridge.send('bankGetSnapshot', {});
        this._load();
    },

    onClose() {
        if (this._bh) WLCBridge.off('bankSnapshot', this._bh);
        if (this._th) WLCBridge.off('bankTransferResult', this._th);
        this.w = null;
    },

    _c() { return this.w && this.w.querySelector('#bank-c'); },

    _load() {
        var el = this._c(); if (!el) return;
        el.innerHTML = '<div class="bank-loading"><div class="bank-spinner"></div><div class="bank-loading-text">Connexion\u2026</div></div>';
    },

    _snap(msg) {
        var d = msg && msg.data;
        if (d && d.error) { this._err(d.error); return; }
        this.data = d;
        if (!this.card && d && d.cards && d.cards.length > 0) this.card = d.cards[0];
        var h = this.w && this.w.querySelector('.bank-header p');
        if (h && d && d.account) h.textContent = d.account.owner || '';
        this._draw();
    },

    _xfer(msg) {
        var d = msg && msg.data;
        if (d && d.success) {
            this.view = 'home';
            WLCBridge.send('bankGetSnapshot', {});
            this._load();
            if (window.phoneNotifications) window.phoneNotifications.show('Banque', 'Virement effectu\u00e9', 'apps/bank/icon.png');
        } else {
            var m = { insufficient_funds:'Fonds insuffisants', invalid_iban:'IBAN invalide', target_iban_not_found:'IBAN introuvable', invalid_amount:'Montant invalide', account_frozen:'Compte gel\u00e9', self_transfer_forbidden:'Virement vers soi interdit' };
            var e = (d && d.error && m[d.error]) || (d && d.error) || 'Erreur';
            if (window.phoneNotifications) window.phoneNotifications.show('Banque', e, 'apps/bank/icon.png');
        }
    },

    _err(e) {
        var el = this._c(); if (!el) return;
        var m = { genesis_not_loaded:'Genesis Network indisponible', no_account:'Aucun compte bancaire' };
        el.innerHTML = '<div class="bank-empty"><div class="bank-empty-icon">\u{1F3E6}</div><div class="bank-empty-text">' + (m[e] || e) + '</div></div>';
    },

    _draw() {
        if (this.view === 'transfer') return this._drawTransfer();
        if (this.view === 'transactions') return this._drawHistory();
        this._drawHome();
    },

    _drawHome() {
        var el = this._c(); if (!el || !this.data) return;
        var s = this, d = this.data, a = d.account || {}, c = this.card;
        var bal = s._f(c ? c.balance : a.balance);
        var iban = c ? c.iban : '---';
        var tier = c ? (c.tier || 'visa').toUpperCase() : 'VISA';
        var num = c ? c.cardNumber : '';

        var h = '';
        // Card
        h += '<div class="bank-card">' +
            '<div class="bank-card-tier">' + tier + '</div>' +
            '<div class="bank-card-balance">' + bal + '<span class="bank-card-currency">\u00a0$</span></div>' +
            '<div class="bank-card-iban">' + s._e(iban) + '</div>' +
            (num ? '<div class="bank-card-number">**** ' + s._e(num.slice(-4)) + '</div>' : '') +
            (a.frozen ? '<div class="bank-card-frozen">GEL\u00c9</div>' : '') +
        '</div>';

        // Card pills
        if (d.cards && d.cards.length > 1) {
            h += '<div class="bank-pills">';
            d.cards.forEach(function(cd, i) {
                var act = s.card && s.card.id === cd.id;
                h += '<div class="bank-pill' + (act ? ' active' : '') + '" data-idx="' + i + '">' + s._e(cd.label || cd.iban || 'Carte') + '</div>';
            });
            h += '</div>';
        }

        // Actions
        h += '<div class="bank-actions">' +
            '<div class="bank-action transfer" id="bk-xfer"><div class="bank-action-icon">\u{1F4B8}</div><div class="bank-action-label">Virement</div></div>' +
            '<div class="bank-action history" id="bk-hist"><div class="bank-action-icon">\u{1F4CB}</div><div class="bank-action-label">Historique</div></div>' +
            '<div class="bank-action refresh" id="bk-ref"><div class="bank-action-icon">\u{1F504}</div><div class="bank-action-label">Actualiser</div></div>' +
        '</div>';

        // Recent transactions
        h += '<div class="bank-section-title">Transactions r\u00e9centes</div>';
        h += this._txHTML((d.transactions || []).slice(0, 5));

        // Debt
        if (d.debt && d.debt.active) {
            h += '<div class="bank-debt">\u26a0\ufe0f Dette active\u00a0: ' + s._f(d.debt.amount) + '\u00a0$</div>';
        }

        el.innerHTML = h;

        // Events
        el.querySelector('#bk-xfer').addEventListener('click', function() { s.view = 'transfer'; s._draw(); });
        el.querySelector('#bk-hist').addEventListener('click', function() { s.view = 'transactions'; s._draw(); });
        el.querySelector('#bk-ref').addEventListener('click', function() { WLCBridge.send('bankGetSnapshot', {}); s._load(); });
        el.querySelectorAll('.bank-pill').forEach(function(p) {
            p.addEventListener('click', function() {
                var i = parseInt(p.dataset.idx);
                if (d.cards[i]) { s.card = d.cards[i]; s._drawHome(); }
            });
        });
    },

    _drawTransfer() {
        var el = this._c(); if (!el) return;
        var s = this, c = this.card;
        el.innerHTML =
            '<div class="bank-back" id="bk-back">\u2190 Retour</div>' +
            '<div class="bank-view-title">Virement</div>' +
            '<div class="bank-from-card"><div class="bank-from-label">Depuis</div>' +
            '<div class="bank-from-iban">' + s._e(c ? c.iban : '---') + '</div>' +
            '<div class="bank-from-bal">' + s._f(c ? c.balance : 0) + ' $ disponible</div></div>' +
            '<input id="bk-iban" class="bank-input mono" type="text" placeholder="IBAN destinataire" maxlength="10">' +
            '<input id="bk-amt" class="bank-input" type="number" placeholder="Montant ($)" min="1">' +
            '<input id="bk-ben" class="bank-input" type="text" placeholder="B\u00e9n\u00e9ficiaire (optionnel)">' +
            '<input id="bk-com" class="bank-input" type="text" placeholder="Motif (optionnel)">' +
            '<button id="bk-send" class="bank-send-btn">Envoyer le virement</button>';
        el.querySelector('#bk-back').addEventListener('click', function() { s.view = 'home'; s._draw(); });
        el.querySelector('#bk-send').addEventListener('click', function() {
            var ib = el.querySelector('#bk-iban').value.trim().toUpperCase();
            var am = parseInt(el.querySelector('#bk-amt').value) || 0;
            if (!ib || am <= 0) return;
            WLCBridge.send('bankTransfer', { iban: ib, amount: am, cardId: c ? c.id : 0, beneficiary: el.querySelector('#bk-ben').value.trim(), comment: el.querySelector('#bk-com').value.trim() });
        });
    },

    _drawHistory() {
        var el = this._c(); if (!el || !this.data) return;
        var s = this;
        el.innerHTML = '<div class="bank-back" id="bk-back2">\u2190 Retour</div><div class="bank-view-title">Historique</div>' + this._txHTML(this.data.transactions || []);
        el.querySelector('#bk-back2').addEventListener('click', function() { s.view = 'home'; s._draw(); });
    },

    _txHTML(txs) {
        if (!txs || txs.length === 0) return '<div class="bank-empty"><div class="bank-empty-text">Aucune transaction</div></div>';
        var s = this;
        return '<div class="bank-tx-list">' + txs.map(function(tx) {
            var isIn = tx.type === 'deposit' || tx.type === 'transfer_in' || tx.type === 'group_deposit';
            return '<div class="bank-tx">' +
                '<div class="bank-tx-icon ' + (isIn ? 'in' : 'out') + '">' + (isIn ? '\u2193' : '\u2191') + '</div>' +
                '<div class="bank-tx-info"><div class="bank-tx-desc">' + s._e(tx.desc || tx.type || '?') + '</div>' +
                (tx.iban ? '<div class="bank-tx-iban">' + s._e(tx.iban) + '</div>' : '') + '</div>' +
                '<div class="bank-tx-amount"><div class="bank-tx-amount-value" style="color:' + (isIn ? '#34C759' : '#FF3B30') + ';">' + (isIn ? '+' : '-') + s._f(tx.amount) + ' $</div>' +
                '<div class="bank-tx-amount-date">' + (tx.date ? new Date(tx.date * 1000).toLocaleDateString('fr-FR', {day:'2-digit',month:'short'}) : '') + '</div></div></div>';
        }).join('') + '</div>';
    },

    _f(n) { n = parseInt(n) || 0; return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); },
    _e(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
});
