/**
 * Genesis Phone - LifeInvader (Advertisements)
 * Beautiful card-based UI, full CRUD, persistent via server
 */
window.phoneAppManager && window.phoneAppManager.register('lifeinvader', {
    wrapper: null, categories: [], ads: [], selectedCategory: 'all', appName: 'LifeInvader',
    _h: {},

    getHTML() {
        return '<div class="li-app" style="display:flex;flex-direction:column;height:100%;background:#0c0c0e;color:#fff;border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div id="li-header" style="flex-shrink:0;"></div>' +
            '<div id="li-content" style="flex:1;overflow-y:auto;"></div></div>';
    },

    onOpen(wrapper) {
        this.wrapper = wrapper;
        this.categories = (Phone.data && Phone.data.categories) || [];
        var cfg = (Phone.data && Phone.data.apps || []).find(function(a){return a.id==='lifeinvader';});
        this.appName = (cfg && cfg.name) || 'LifeInvader';
        this._h.ads = this._onAds.bind(this);
        this._h.created = this._onCreated.bind(this);
        this._h.deleted = this._onDeleted.bind(this);
        WLCBridge.on('liAdsList', this._h.ads);
        WLCBridge.on('liAdCreated', this._h.created);
        WLCBridge.on('liAdDeleted', this._h.deleted);
        this._renderFeed();
        this._loadAds();
    },

    onClose() {
        WLCBridge.off('liAdsList', this._h.ads);
        WLCBridge.off('liAdCreated', this._h.created);
        WLCBridge.off('liAdDeleted', this._h.deleted);
        this.wrapper = null;
    },

    _loadAds() { WLCBridge.send('liGetAds', {category: this.selectedCategory}); },
    _onAds(msg) { this.ads = (msg && msg.data) || []; this._renderAdCards(); },
    _onCreated(msg) { if(msg&&msg.data&&msg.data.success){window.phoneNotifications.show(this.appName,'Annonce publiée!','apps/lifeinvader/icon.png'); this._renderFeed(); this._loadAds();} },
    _onDeleted(msg) { if(msg&&msg.data&&msg.data.success) this._loadAds(); },

    _renderFeed() {
        var h = this.wrapper.querySelector('#li-header');
        var self = this;

        h.innerHTML = '' +
        '<div style="padding:16px 16px 0;">' +
            // Logo + title bar
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
                '<div style="display:flex;align-items:center;gap:10px;">' +
                    '<div style="width:36px;height:36px;background:linear-gradient(135deg,#FF3B30,#FF6B6B);border-radius:10px;display:flex;align-items:center;justify-content:center;">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2z"/></svg>' +
                    '</div>' +
                    '<div><div style="font-size:18px;font-weight:800;">' + this._esc(this.appName) + '</div>' +
                    '<div style="font-size:10px;color:#8e8e93;letter-spacing:0.5px;">ANNONCES</div></div>' +
                '</div>' +
                '<button id="li-new" style="background:linear-gradient(135deg,#FF3B30,#FF6B6B);color:#fff;border:none;border-radius:12px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(255,59,48,0.3);">+ Post</button>' +
            '</div>' +
            // Category pills
            '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:12px;-webkit-overflow-scrolling:touch;" id="li-cats">' +
                '<button class="li-cat" data-cat="all" style="background:rgba(255,59,48,0.15);border:none;border-radius:20px;padding:7px 14px;color:#FF3B30;font-size:11px;font-weight:600;white-space:nowrap;cursor:pointer;">All</button>' +
                this.categories.map(function(c) {
                    return '<button class="li-cat" data-cat="' + c.id + '" style="background:rgba(255,255,255,0.06);border:none;border-radius:20px;padding:7px 14px;color:#8e8e93;font-size:11px;font-weight:500;white-space:nowrap;cursor:pointer;transition:all 0.2s;">' + c.name + '</button>';
                }).join('') +
            '</div>' +
        '</div>';

        h.querySelector('#li-new').addEventListener('click', function() { self._renderNewAd(); });
        h.querySelectorAll('.li-cat').forEach(function(btn) {
            btn.addEventListener('click', function() {
                h.querySelectorAll('.li-cat').forEach(function(b) { b.style.background='rgba(255,255,255,0.06)'; b.style.color='#8e8e93'; });
                btn.style.background='rgba(255,59,48,0.15)'; btn.style.color='#FF3B30';
                self.selectedCategory = btn.dataset.cat;
                self._loadAds();
            });
        });
    },

    _renderAdCards() {
        var c = this.wrapper.querySelector('#li-content');
        if (!c) return;
        var self = this;

        if (this.ads.length === 0) {
            c.innerHTML = '<div style="text-align:center;padding:60px 30px;">' +
                '<div style="width:64px;height:64px;background:rgba(255,59,48,0.1);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">' +
                '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="1.5"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2z"/></svg></div>' +
                '<div style="font-size:16px;font-weight:600;margin-bottom:4px;">Aucune annonce</div>' +
                '<div style="font-size:13px;color:#8e8e93;">Soyez le premier à publier!</div></div>';
            return;
        }

        c.innerHTML = '<div style="padding:0 14px 20px;">' + this.ads.map(function(ad) {
            var cat = self.categories.find(function(c){return c.id===ad.category;});
            var catColor = cat ? cat.color : '#8e8e93';
            var catName = cat ? cat.name : ad.category;
            var timeAgo = self._timeAgo(ad.createdAt);

            return '<div class="li-card" data-id="' + ad.id + '" style="background:linear-gradient(145deg,rgba(28,28,30,0.9),rgba(20,20,22,0.95));border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:16px;margin-bottom:12px;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;">' +
                // Header: category + time
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
                    '<div style="display:flex;align-items:center;gap:6px;">' +
                        '<div style="width:8px;height:8px;border-radius:50%;background:' + catColor + ';"></div>' +
                        '<span style="font-size:11px;font-weight:600;color:' + catColor + ';text-transform:uppercase;letter-spacing:0.5px;">' + catName + '</span>' +
                    '</div>' +
                    '<span style="font-size:10px;color:#636366;">' + timeAgo + '</span>' +
                '</div>' +
                // Title
                '<div style="font-size:16px;font-weight:700;margin-bottom:6px;line-height:1.3;">' + self._esc(ad.title) + '</div>' +
                // Description
                '<div style="font-size:13px;color:#a1a1a6;line-height:1.5;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">' + self._esc(ad.description) + '</div>' +
                // Footer: author + views
                '<div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04);">' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<div style="width:24px;height:24px;border-radius:50%;background:' + catColor + '33;display:flex;align-items:center;justify-content:center;">' +
                            '<span style="font-size:11px;font-weight:700;color:' + catColor + ';">' + (self._esc(ad.authorName)||'?')[0].toUpperCase() + '</span>' +
                        '</div>' +
                        '<div>' +
                            '<div style="font-size:12px;font-weight:500;">' + self._esc(ad.authorName) + '</div>' +
                            (ad.phoneNumber ? '<div style="font-size:10px;color:#636366;">' + ad.phoneNumber + '</div>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:4px;color:#636366;">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
                        '<span style="font-size:11px;">' + (ad.views||0) + '</span>' +
                    '</div>' +
                '</div>' +
                (ad.isOwner ? '<button class="li-del" data-id="'+ad.id+'" style="margin-top:10px;width:100%;background:rgba(255,59,48,0.08);color:#FF3B30;border:1px solid rgba(255,59,48,0.15);border-radius:10px;padding:8px;font-size:12px;font-weight:500;cursor:pointer;transition:background 0.15s;">Supprimer mon annonce</button>' : '') +
            '</div>';
        }).join('') + '</div>';

        c.querySelectorAll('.li-card').forEach(function(el) {
            el.addEventListener('click', function() { WLCBridge.send('liViewAd', {adId: parseInt(el.dataset.id)}); });
        });
        c.querySelectorAll('.li-del').forEach(function(btn) {
            btn.addEventListener('click', function(e) { e.stopPropagation(); WLCBridge.send('liDeleteAd', {adId: parseInt(btn.dataset.id)}); });
        });
    },

    _renderNewAd() {
        var h = this.wrapper.querySelector('#li-header');
        var c = this.wrapper.querySelector('#li-content');
        var self = this;
        var selectedCat = 'general';

        h.innerHTML = '<div style="padding:16px 16px 12px;display:flex;align-items:center;gap:10px;">' +
            '<button id="li-back" style="background:none;border:none;color:#007AFF;font-size:14px;cursor:pointer;">\u2190</button>' +
            '<span style="font-size:18px;font-weight:700;">Nouvelle annonce</span></div>';

        c.innerHTML = '<div style="padding:4px 16px 30px;">' +
            // Title
            '<div style="margin-bottom:16px;">' +
                '<label style="font-size:11px;color:#8e8e93;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:6px;">TITRE</label>' +
                '<input type="text" id="li-title" placeholder="Que souhaitez-vous annoncer?" maxlength="120" style="width:100%;padding:12px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#fff;font-size:15px;outline:none;transition:border 0.2s;" onfocus="this.style.borderColor=\'rgba(255,59,48,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.08)\'">' +
            '</div>' +
            // Description
            '<div style="margin-bottom:16px;">' +
                '<label style="font-size:11px;color:#8e8e93;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:6px;">DESCRIPTION</label>' +
                '<textarea id="li-desc" placeholder="Décrivez votre annonce..." rows="5" style="width:100%;padding:12px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#fff;font-size:14px;outline:none;resize:none;line-height:1.5;transition:border 0.2s;" onfocus="this.style.borderColor=\'rgba(255,59,48,0.4)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.08)\'"></textarea>' +
            '</div>' +
            // Category
            '<div style="margin-bottom:16px;">' +
                '<label style="font-size:11px;color:#8e8e93;font-weight:600;letter-spacing:0.5px;display:block;margin-bottom:8px;">CATÉGORIE</label>' +
                '<div id="li-catsel" style="display:flex;flex-wrap:wrap;gap:8px;">' +
                    self.categories.map(function(cat) {
                        return '<button class="li-sc" data-cat="'+cat.id+'" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 14px;color:#fff;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;">' +
                            '<div style="width:8px;height:8px;border-radius:50%;background:'+cat.color+';"></div>' + cat.name + '</button>';
                    }).join('') +
                '</div>' +
            '</div>' +
            // Anonymous toggle
            '<div style="margin-bottom:20px;display:flex;align-items:center;gap:10px;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;">' +
                '<label class="li-toggle" style="position:relative;display:inline-block;width:44px;height:26px;flex-shrink:0;">' +
                    '<input type="checkbox" id="li-anon" style="opacity:0;width:0;height:0;">' +
                    '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#39393d;border-radius:26px;transition:0.3s;"></span>' +
                    '<span class="li-knob" style="position:absolute;height:22px;width:22px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:0.3s;"></span>' +
                '</label>' +
                '<div><div style="font-size:13px;font-weight:500;">Anonyme</div><div style="font-size:11px;color:#8e8e93;">Votre nom et numéro seront masqués</div></div>' +
            '</div>' +
            // Submit
            '<button id="li-submit" style="width:100%;padding:14px;background:linear-gradient(135deg,#FF3B30,#FF6B6B);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(255,59,48,0.3);transition:transform 0.15s;">Publier l&#39;annonce</button>' +
        '</div>';

        // Anonymous toggle logic
        var anonCb = c.querySelector('#li-anon');
        var knob = c.querySelector('.li-knob');
        var track = anonCb.nextElementSibling;
        anonCb.addEventListener('change', function() {
            if (this.checked) { track.style.background='#FF3B30'; knob.style.transform='translateX(18px)'; }
            else { track.style.background='#39393d'; knob.style.transform='translateX(0)'; }
        });

        h.querySelector('#li-back').addEventListener('click', function() { self._renderFeed(); self._loadAds(); });

        ['li-title','li-desc'].forEach(function(id) {
            var el = c.querySelector('#'+id);
            el.addEventListener('focus', function(){WLCBridge.send('inputFocus',{focused:true});});
            el.addEventListener('blur', function(){WLCBridge.send('inputFocus',{focused:false});});
        });

        c.querySelectorAll('.li-sc').forEach(function(btn) {
            btn.addEventListener('click', function() {
                c.querySelectorAll('.li-sc').forEach(function(b){b.style.borderColor='rgba(255,255,255,0.08)';b.style.background='rgba(255,255,255,0.06)';});
                btn.style.borderColor='#FF3B30'; btn.style.background='rgba(255,59,48,0.1)';
                selectedCat = btn.dataset.cat;
            });
        });

        c.querySelector('#li-submit').addEventListener('click', function() {
            var title = c.querySelector('#li-title').value.trim();
            var desc = c.querySelector('#li-desc').value.trim();
            var anon = c.querySelector('#li-anon').checked;
            if (!title) { c.querySelector('#li-title').style.borderColor='#FF3B30'; return; }
            WLCBridge.send('liCreateAd', {title:title, description:desc, category:selectedCat, isAnonymous:anon});
        });
    },

    _timeAgo(dateStr) {
        if (!dateStr) return '';
        try {
            var d = new Date(dateStr.replace(' ','T')+'Z');
            var diff = Math.floor((Date.now()-d.getTime())/1000);
            if (diff < 60) return 'now';
            if (diff < 3600) return Math.floor(diff/60)+'m';
            if (diff < 86400) return Math.floor(diff/3600)+'h';
            return Math.floor(diff/86400)+'j';
        } catch(e) { return dateStr; }
    },

    _esc(s) { if(!s)return''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
});
