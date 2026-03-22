/**
 * Genesis Phone - Banking App
 * Connected to Genesis Network
 */
window.phoneAppManager && window.phoneAppManager.register('bank', {
    wrapper: null, data: null, currentView: 'home', selectedCard: null,

    getHTML() {
        return '<div class="bank-app" style="display:flex;flex-direction:column;height:100%;background:var(--phone-bg,#000);color:var(--phone-text,#fff);overflow:hidden;">' +
            '<div id="bank-content" style="flex:1;overflow-y:auto;padding:16px;"></div></div>';
    },

    onOpen(wrapper) {
        this.wrapper = wrapper;
        this.data = null;
        this.currentView = 'home';
        this._bh = this._onSnapshot.bind(this);
        this._th = this._onTransfer.bind(this);
        WLCBridge.on('bankSnapshot', this._bh);
        WLCBridge.on('bankTransferResult', this._th);
        WLCBridge.send('bankGetSnapshot', {});
        this._loading();
    },

    onClose() {
        if (this._bh) WLCBridge.off('bankSnapshot', this._bh);
        if (this._th) WLCBridge.off('bankTransferResult', this._th);
        this.wrapper = null;
    },

    _el() { return this.wrapper && this.wrapper.querySelector('#bank-content'); },

    _loading() {
        var el = this._el();
        if (el) el.innerHTML = '<div style="text-align:center;padding:80px 0;"><div style="width:30px;height:30px;border:3px solid rgba(255,255,255,0.1);border-top-color:#FF3B30;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;"></div><div style="margin-top:12px;font-size:12px;color:#8e8e93;">Connexion au r\u00e9seau...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style></div>';
    },

    _onSnapshot(msg) {
        var d = msg && msg.data;
        if (d && d.error) { this._showError(d.error); return; }
        this.data = d;
        if (!this.selectedCard && d && d.cards && d.cards.length > 0) {
            this.selectedCard = d.cards[0];
        }
        this._render();
    },

    _onTransfer(msg) {
        var d = msg && msg.data;
        if (d && d.success) {
            this.currentView = 'home';
            WLCBridge.send('bankGetSnapshot', {});
            this._loading();
            if (window.phoneNotifications) window.phoneNotifications.show('Banque', 'Virement effectu\u00e9', 'apps/bank/icon.png');
        } else {
            var errors = {
                insufficient_funds: 'Fonds insuffisants',
                invalid_iban: 'IBAN invalide',
                target_iban_not_found: 'IBAN destinataire introuvable',
                invalid_amount: 'Montant invalide',
                account_frozen: 'Compte gel\u00e9',
                self_transfer_forbidden: 'Virement vers soi-m\u00eame interdit',
            };
            var errMsg = (d && d.error && errors[d.error]) || (d && d.error) || 'Erreur';
            if (window.phoneNotifications) window.phoneNotifications.show('Banque', errMsg, 'apps/bank/icon.png');
        }
    },

    _showError(err) {
        var el = this._el(); if (!el) return;
        var msgs = { genesis_not_loaded: 'Genesis Network non disponible', no_account: 'Aucun compte bancaire' };
        el.innerHTML = '<div style="text-align:center;padding:80px 20px;"><div style="font-size:36px;margin-bottom:12px;">🏦</div><div style="font-size:14px;color:#8e8e93;">' + (msgs[err] || err) + '</div></div>';
    },

    _render() {
        if (this.currentView === 'transfer') return this._renderTransfer();
        if (this.currentView === 'transactions') return this._renderTransactions();
        this._renderHome();
    },

    _renderHome() {
        var el = this._el(); if (!el || !this.data) return;
        var self = this, d = this.data, acc = d.account || {}, card = this.selectedCard;
        var bal = this._fmt(card ? card.balance : acc.balance);
        var iban = card ? card.iban : '---';
        var tier = card ? (card.tier || 'visa').toUpperCase() : 'VISA';
        var cardNum = card ? card.cardNumber : '';
        var frozen = acc.frozen;

        // Card visual
        var cardColors = { visa: ['#1a1a2e','#16213e'], mastercard: ['#2d1b69','#11998e'], amex: ['#1c1c1c','#434343'] };
        var cc = cardColors[(card && card.tier) || 'visa'] || cardColors.visa;

        el.innerHTML =
            '<div style="margin-bottom:20px;">' +
                '<div style="font-size:20px;font-weight:800;">Genesis Bank</div>' +
                '<div style="font-size:11px;color:#8e8e93;margin-top:2px;">' + self._esc(acc.owner || '') + '</div>' +
            '</div>' +

            // Card
            '<div style="background:linear-gradient(135deg,' + cc[0] + ',' + cc[1] + ');border-radius:16px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden;">' +
                '<div style="position:absolute;right:-20px;top:-20px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.03);"></div>' +
                '<div style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:16px;">' + tier + '</div>' +
                '<div style="font-size:28px;font-weight:800;color:#fff;margin-bottom:4px;">' + bal + ' $</div>' +
                '<div style="font-size:11px;color:rgba(255,255,255,0.6);font-family:monospace;letter-spacing:1px;">' + self._esc(iban) + '</div>' +
                (cardNum ? '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:8px;font-family:monospace;">**** ' + self._esc(cardNum.slice(-4)) + '</div>' : '') +
                (frozen ? '<div style="position:absolute;top:12px;right:12px;background:rgba(255,59,48,0.3);color:#FF3B30;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:600;">GEL\u00c9</div>' : '') +
            '</div>' +

            // Card selector if multiple
            (d.cards && d.cards.length > 1 ?
                '<div style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;">' +
                d.cards.map(function(c, i) {
                    var active = self.selectedCard && self.selectedCard.id === c.id;
                    return '<div class="bank-card-tab" data-idx="' + i + '" style="padding:6px 12px;border-radius:8px;font-size:10px;cursor:pointer;white-space:nowrap;' +
                        (active ? 'background:rgba(255,59,48,0.2);color:#FF3B30;font-weight:600;' : 'background:rgba(255,255,255,0.06);color:#8e8e93;') +
                        '">' + self._esc(c.label || c.iban || 'Carte') + '</div>';
                }).join('') + '</div>' : '') +

            // Actions
            '<div style="display:flex;gap:10px;margin-bottom:20px;">' +
                '<div id="bank-btn-transfer" style="flex:1;background:rgba(255,59,48,0.15);color:#FF3B30;border-radius:12px;padding:14px;text-align:center;cursor:pointer;">' +
                    '<div style="font-size:18px;margin-bottom:4px;">💸</div><div style="font-size:11px;font-weight:600;">Virement</div></div>' +
                '<div id="bank-btn-history" style="flex:1;background:rgba(0,122,255,0.15);color:#007AFF;border-radius:12px;padding:14px;text-align:center;cursor:pointer;">' +
                    '<div style="font-size:18px;margin-bottom:4px;">📋</div><div style="font-size:11px;font-weight:600;">Historique</div></div>' +
                '<div id="bank-btn-refresh" style="flex:1;background:rgba(52,199,89,0.15);color:#34C759;border-radius:12px;padding:14px;text-align:center;cursor:pointer;">' +
                    '<div style="font-size:18px;margin-bottom:4px;">🔄</div><div style="font-size:11px;font-weight:600;">Actualiser</div></div>' +
            '</div>' +

            // Recent transactions
            '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Transactions r\u00e9centes</div>' +
            this._txList((d.transactions || []).slice(0, 5)) +

            (d.debt && d.debt.active ? '<div style="background:rgba(255,59,48,0.1);border:1px solid rgba(255,59,48,0.2);border-radius:10px;padding:10px;margin-top:12px;font-size:11px;color:#FF3B30;">⚠\ufe0f Dette active : ' + self._fmt(d.debt.amount) + ' $</div>' : '');

        // Events
        el.querySelector('#bank-btn-transfer').addEventListener('click', function() { self.currentView = 'transfer'; self._render(); });
        el.querySelector('#bank-btn-history').addEventListener('click', function() { self.currentView = 'transactions'; self._render(); });
        el.querySelector('#bank-btn-refresh').addEventListener('click', function() { WLCBridge.send('bankGetSnapshot', {}); self._loading(); });
        el.querySelectorAll('.bank-card-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                var idx = parseInt(tab.dataset.idx);
                if (d.cards[idx]) { self.selectedCard = d.cards[idx]; self._renderHome(); }
            });
        });
    },

    _renderTransfer() {
        var el = this._el(); if (!el) return;
        var self = this, card = this.selectedCard;
        el.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">' +
                '<div id="bank-back" style="cursor:pointer;font-size:14px;color:#007AFF;">\u2190</div>' +
                '<div style="font-size:18px;font-weight:700;">Virement</div></div>' +
            '<div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:16px;">' +
                '<div style="font-size:10px;color:#8e8e93;margin-bottom:4px;">DEPUIS</div>' +
                '<div style="font-size:13px;font-weight:600;">' + self._esc(card ? card.iban : '---') + '</div>' +
                '<div style="font-size:11px;color:#8e8e93;">' + self._fmt(card ? card.balance : 0) + ' $ disponible</div></div>' +
            '<input id="bank-iban" type="text" placeholder="IBAN destinataire" maxlength="10" style="width:100%;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;margin-bottom:10px;font-family:monospace;text-transform:uppercase;">' +
            '<input id="bank-amount" type="number" placeholder="Montant ($)" min="1" style="width:100%;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;margin-bottom:10px;">' +
            '<input id="bank-benef" type="text" placeholder="Nom du b\u00e9n\u00e9ficiaire (optionnel)" style="width:100%;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:13px;outline:none;margin-bottom:10px;">' +
            '<input id="bank-comment" type="text" placeholder="Motif (optionnel)" style="width:100%;padding:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:13px;outline:none;margin-bottom:16px;">' +
            '<div id="bank-send" style="background:linear-gradient(135deg,#FF3B30,#FF6B6B);color:#fff;border-radius:12px;padding:14px;text-align:center;cursor:pointer;font-size:14px;font-weight:700;">Envoyer le virement</div>';

        el.querySelector('#bank-back').addEventListener('click', function() { self.currentView = 'home'; self._render(); });
        el.querySelector('#bank-send').addEventListener('click', function() {
            var iban = el.querySelector('#bank-iban').value.trim().toUpperCase();
            var amount = parseInt(el.querySelector('#bank-amount').value) || 0;
            var benef = el.querySelector('#bank-benef').value.trim();
            var comment = el.querySelector('#bank-comment').value.trim();
            if (!iban || amount <= 0) return;
            WLCBridge.send('bankTransfer', { iban: iban, amount: amount, cardId: card ? card.id : 0, beneficiary: benef, comment: comment });
        });
    },

    _renderTransactions() {
        var el = this._el(); if (!el || !this.data) return;
        var self = this;
        el.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
                '<div id="bank-back2" style="cursor:pointer;font-size:14px;color:#007AFF;">\u2190</div>' +
                '<div style="font-size:18px;font-weight:700;">Historique</div></div>' +
            this._txList(this.data.transactions || []);
        el.querySelector('#bank-back2').addEventListener('click', function() { self.currentView = 'home'; self._render(); });
    },

    _txList(txs) {
        if (!txs || txs.length === 0) return '<div style="text-align:center;padding:20px;color:#636366;font-size:11px;">Aucune transaction</div>';
        var self = this;
        return '<div style="background:rgba(255,255,255,0.03);border-radius:10px;overflow:hidden;">' +
            txs.map(function(tx) {
                var isIn = tx.type === 'deposit' || tx.type === 'transfer_in' || tx.type === 'group_deposit';
                var icon = isIn ? '↓' : '↑';
                var color = isIn ? '#34C759' : '#FF3B30';
                var sign = isIn ? '+' : '-';
                var desc = tx.desc || tx.type || '?';
                var date = tx.date ? new Date(tx.date * 1000).toLocaleDateString('fr-FR', {day:'2-digit',month:'short'}) : '';
                return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.03);">' +
                    '<div style="width:32px;height:32px;border-radius:50%;background:' + color + '20;display:flex;align-items:center;justify-content:center;color:' + color + ';font-size:14px;font-weight:700;flex-shrink:0;">' + icon + '</div>' +
                    '<div style="flex:1;overflow:hidden;"><div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + self._esc(desc) + '</div>' +
                    (tx.iban ? '<div style="font-size:9px;color:#636366;font-family:monospace;">' + self._esc(tx.iban) + '</div>' : '') + '</div>' +
                    '<div style="text-align:right;flex-shrink:0;"><div style="font-size:12px;font-weight:600;color:' + color + ';">' + sign + self._fmt(tx.amount) + ' $</div>' +
                    '<div style="font-size:9px;color:#636366;">' + date + '</div></div></div>';
            }).join('') + '</div>';
    },

    _fmt(n) { n = parseInt(n) || 0; return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); },
    _esc(s) { if(!s) return ''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
});
