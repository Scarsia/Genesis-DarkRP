/**
 * Genesis Phone - Realestate App (iOS Design)
 * Shows Genesis Homes properties
 */
window.phoneAppManager && window.phoneAppManager.register('realestate', {
    w: null, props: [], view: 'list', selected: null, filter: 'all',

    getHTML() {
        return '<div class="realestate-app">' +
            '<div class="re-header"><h1>Immobilier</h1><p>Genesis Homes</p></div>' +
            '<div id="re-stats-bar"></div>' +
            '<div id="re-tabs-bar"></div>' +
            '<div class="re-scroll" id="re-c"></div></div>';
    },

    onOpen(wrapper) {
        this.w = wrapper; this.props = []; this.view = 'list'; this.selected = null; this.filter = 'all';
        this._h = this._onData.bind(this);
        WLCBridge.on('realestateData', this._h);
        WLCBridge.send('realestateGetProperties', {});
        this._load();
    },

    onClose() {
        if (this._h) WLCBridge.off('realestateData', this._h);
        this.w = null;
    },

    _c() { return this.w && this.w.querySelector('#re-c'); },

    _load() {
        var el = this._c(); if (!el) return;
        el.innerHTML = '<div class="re-loading"><div class="re-spinner"></div></div>';
    },

    _onData(msg) {
        this.props = (msg && msg.data && msg.data.properties) || [];
        this._drawStats();
        this._drawTabs();
        this._draw();
    },

    _drawStats() {
        var bar = this.w && this.w.querySelector('#re-stats-bar');
        if (!bar) return;
        var owned = this.props.filter(function(p) { return p.owned; }).length;
        var rented = this.props.filter(function(p) { return p.rented; }).length;
        bar.innerHTML = '<div class="re-stats">' +
            '<div class="re-stat owned"><div class="re-stat-value">' + owned + '</div><div class="re-stat-label">Poss\u00e9d\u00e9s</div></div>' +
            '<div class="re-stat rented"><div class="re-stat-value">' + rented + '</div><div class="re-stat-label">Lou\u00e9s</div></div>' +
            '<div class="re-stat total"><div class="re-stat-value">' + this.props.length + '</div><div class="re-stat-label">Total</div></div>' +
        '</div>';
    },

    _drawTabs() {
        var bar = this.w && this.w.querySelector('#re-tabs-bar');
        if (!bar) return;
        var s = this;
        var tabs = [
            { id: 'all', label: 'Tout' },
            { id: 'owned', label: 'Mes propri\u00e9t\u00e9s' },
            { id: 'rented', label: 'Locations' },
        ];
        bar.innerHTML = '<div class="re-tabs">' + tabs.map(function(t) {
            return '<div class="re-tab' + (s.filter === t.id ? ' active' : '') + '" data-f="' + t.id + '">' + t.label + '</div>';
        }).join('') + '</div>';
        bar.querySelectorAll('.re-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                s.filter = tab.dataset.f;
                s._drawTabs();
                s._draw();
            });
        });
    },

    _filtered() {
        var f = this.filter;
        if (f === 'owned') return this.props.filter(function(p) { return p.owned; });
        if (f === 'rented') return this.props.filter(function(p) { return p.rented; });
        return this.props;
    },

    _draw() {
        if (this.view === 'detail') return this._drawDetail();
        this._drawList();
    },

    _drawList() {
        var el = this._c(); if (!el) return;
        var s = this, items = this._filtered();

        if (items.length === 0) {
            el.innerHTML = '<div class="re-empty"><div class="re-empty-icon">\u{1F3E0}</div>' +
                '<div class="re-empty-text">Aucune propri\u00e9t\u00e9</div>' +
                '<div class="re-empty-sub">Visitez un agent immobilier en ville</div></div>';
            return;
        }

        var h = '<div class="re-list">';
        items.forEach(function(p, i) {
            var status = p.owned ? 'owned' : (p.rented ? 'rented' : 'available');
            var statusLabel = p.owned ? 'Propri\u00e9taire' : (p.rented ? 'Locataire' : 'Disponible');
            h += '<div class="re-card" data-idx="' + i + '">' +
                '<div class="re-card-img"><div class="re-card-img-icon">\u{1F3E0}</div>' +
                '<div class="re-card-badge ' + status + '">' + statusLabel + '</div></div>' +
                '<div class="re-card-body">' +
                '<div class="re-card-name">' + s._e(p.name || 'Propri\u00e9t\u00e9 #' + (p.id || i+1)) + '</div>' +
                '<div class="re-card-addr">' + s._e(p.address || p.adress || 'Adresse inconnue') + '</div>' +
                '<div class="re-card-meta">' +
                    (p.rooms ? '<span>\u{1F6CF} ' + p.rooms + ' pi\u00e8ces</span>' : '') +
                    (p.garage ? '<span>\u{1F697} Garage</span>' : '') +
                    (p.pool ? '<span>\u{1F3CA} Piscine</span>' : '') +
                '</div>' +
                (p.price ? '<div class="re-card-price">' + s._f(p.price) + ' $</div>' : '') +
                '</div></div>';
        });
        h += '</div>';
        el.innerHTML = h;

        el.querySelectorAll('.re-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var idx = parseInt(card.dataset.idx);
                var list = s._filtered();
                if (list[idx]) { s.selected = list[idx]; s.view = 'detail'; s._draw(); }
            });
        });
    },

    _drawDetail() {
        var el = this._c(); if (!el || !this.selected) return;
        var s = this, p = this.selected;
        var status = p.owned ? 'owned' : (p.rented ? 'rented' : 'available');
        var statusLabel = p.owned ? 'Propri\u00e9taire' : (p.rented ? 'Locataire' : 'Disponible');
        var badgeClass = p.owned ? 'background:rgba(52,199,89,0.25);color:#34C759;' : (p.rented ? 'background:rgba(0,122,255,0.25);color:#007AFF;' : 'background:rgba(255,149,0,0.25);color:#FF9500;');

        el.innerHTML =
            '<div class="re-back" id="re-back">\u2190 Retour</div>' +
            '<div class="re-detail">' +
            '<div class="re-detail-hero"><div class="re-detail-hero-icon">\u{1F3E0}</div>' +
                '<div class="re-detail-badge-top" style="' + badgeClass + '">' + statusLabel + '</div></div>' +
            '<div class="re-detail-name">' + s._e(p.name || 'Propri\u00e9t\u00e9') + '</div>' +
            '<div class="re-detail-addr">' + s._e(p.address || p.adress || 'Adresse inconnue') + '</div>' +

            '<div class="re-info-grid">' +
                '<div class="re-info-item"><div class="re-info-label">Statut</div><div class="re-info-value ' + (p.owned ? 'green' : 'blue') + '">' + statusLabel + '</div></div>' +
                '<div class="re-info-item"><div class="re-info-label">ID</div><div class="re-info-value">#' + (p.id || '?') + '</div></div>' +
                (p.price ? '<div class="re-info-item"><div class="re-info-label">Prix</div><div class="re-info-value green">' + s._f(p.price) + ' $</div></div>' : '') +
                (p.rooms ? '<div class="re-info-item"><div class="re-info-label">Pi\u00e8ces</div><div class="re-info-value">' + p.rooms + '</div></div>' : '') +
                (p.owner_name ? '<div class="re-info-item"><div class="re-info-label">Propri\u00e9taire</div><div class="re-info-value">' + s._e(p.owner_name) + '</div></div>' : '') +
                (p.rent ? '<div class="re-info-item"><div class="re-info-label">Loyer</div><div class="re-info-value orange">' + s._f(p.rent) + ' $/j</div></div>' : '') +
            '</div>' +

            '<div class="re-detail-actions">' +
                '<div class="re-btn gps" id="re-gps">\u{1F4CD} GPS</div>' +
                (p.owned ? '<div class="re-btn lock" id="re-lock">\u{1F512} Cl\u00e9s</div>' : '') +
            '</div></div>';

        el.querySelector('#re-back').addEventListener('click', function() { s.view = 'list'; s._draw(); });

        var gpsBtn = el.querySelector('#re-gps');
        if (gpsBtn) gpsBtn.addEventListener('click', function() {
            WLCBridge.send('realestateSetGPS', { id: p.id, coords: p.coords });
            if (window.phoneNotifications) window.phoneNotifications.show('Immobilier', 'GPS activ\u00e9', 'apps/realestate/icon.png');
        });

        var lockBtn = el.querySelector('#re-lock');
        if (lockBtn) lockBtn.addEventListener('click', function() {
            WLCBridge.send('realestateToggleLock', { id: p.id });
            if (window.phoneNotifications) window.phoneNotifications.show('Immobilier', 'Serrure bascul\u00e9e', 'apps/realestate/icon.png');
        });
    },

    _f(n) { n = parseInt(n) || 0; return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); },
    _e(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
});
