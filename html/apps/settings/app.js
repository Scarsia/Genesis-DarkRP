/**
 * Genesis Phone - Settings App
 * Wallpaper, theme, language, volume, brightness, airplane mode, PIN management
 */
window.phoneAppManager && window.phoneAppManager.register('settings', {
    wrapper: null,

    getHTML() {
        return '<div style="display:flex;flex-direction:column;height:100%;background:var(--phone-bg,#000);color:var(--phone-text,#fff);border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div style="padding:16px 16px 8px;font-size:24px;font-weight:700;">Réglages</div>' +
            '<div id="set-content" style="flex:1;overflow-y:auto;padding:0 12px 40px;"></div></div>';
    },

    onOpen(wrapper) { this.wrapper = wrapper; this._render(); },
    onClose() { this.wrapper = null; },

    _render() {
        var el = this.wrapper.querySelector('#set-content');
        if (!el) return;
        var self = this;
        var bgs = ['purple','dark','blue','sunny'];
        var curBg = Phone.background || 'purple';
        var curTheme = Phone.theme || 'dark';

        el.innerHTML = '' +
        // Profile card
        '<div style="background:linear-gradient(145deg,rgba(28,28,30,0.9),rgba(20,20,22,0.95));border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:18px;margin-bottom:16px;">' +
            '<div style="display:flex;align-items:center;gap:14px;">' +
                '<div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#5856D6);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;">' + (Phone.playerName||'?')[0].toUpperCase() + '</div>' +
                '<div><div style="font-size:16px;font-weight:600;">'+this._esc(Phone.playerName)+'</div>' +
                '<div style="font-size:13px;color:#8e8e93;font-family:monospace;letter-spacing:1px;">#'+this._esc(Phone.phoneNumber)+'</div></div>' +
            '</div></div>' +

        // Wallpaper
        '<div class="s-section"><div class="s-title">FOND D&#39;ÉCRAN</div>' +
            '<div style="display:flex;gap:10px;padding:8px 0;overflow-x:auto;">' +
            bgs.map(function(bg) {
                return '<div class="s-wp" data-bg="'+bg+'" style="width:56px;height:96px;border-radius:10px;background:url(\'assets/background/'+bg+'.png\') center/cover;cursor:pointer;flex-shrink:0;border:2px solid '+(bg===curBg?'#007AFF':'transparent')+';transition:border 0.2s;"></div>';
            }).join('') + '</div></div>' +

        // Theme
        '<div class="s-section"><div class="s-title">THÈME</div>' +
            '<div style="display:flex;gap:8px;padding:8px 0;">' +
                '<button class="s-btn '+(curTheme==='dark'?'s-btn-active':'')+'" data-theme="dark" style="flex:1;padding:12px;border-radius:12px;border:2px solid '+(curTheme==='dark'?'#007AFF':'rgba(255,255,255,0.08)')+';background:'+(curTheme==='dark'?'rgba(0,122,255,0.08)':'rgba(255,255,255,0.04)')+';color:#fff;font-size:13px;font-weight:600;cursor:pointer;">\u263E Sombre</button>' +
                '<button class="s-btn '+(curTheme==='light'?'s-btn-active':'')+'" data-theme="light" style="flex:1;padding:12px;border-radius:12px;border:2px solid '+(curTheme==='light'?'#007AFF':'rgba(255,255,255,0.08)')+';background:'+(curTheme==='light'?'rgba(0,122,255,0.08)':'rgba(255,255,255,0.04)')+';color:#fff;font-size:13px;font-weight:600;cursor:pointer;">\u2600 Clair</button>' +
            '</div></div>' +

        // Language
        '<div class="s-section"><div class="s-title">LANGUE</div>' +
            '<div style="display:flex;gap:8px;padding:8px 0;">' +
                '<button class="s-lang" data-lang="en" style="flex:1;padding:10px;border-radius:10px;border:2px solid '+(Phone.language==='en'?'#007AFF':'rgba(255,255,255,0.08)')+';background:rgba(255,255,255,0.04);color:#fff;font-size:13px;cursor:pointer;">English</button>' +
                '<button class="s-lang" data-lang="fr" style="flex:1;padding:10px;border-radius:10px;border:2px solid '+(Phone.language==='fr'?'#007AFF':'rgba(255,255,255,0.08)')+';background:rgba(255,255,255,0.04);color:#fff;font-size:13px;cursor:pointer;">Fran\u00e7ais</button>' +
            '</div></div>' +

        // Airplane mode
        '<div class="s-section" style="display:flex;align-items:center;justify-content:space-between;">' +
            '<div><div style="font-size:14px;font-weight:500;">Mode avion</div><div style="font-size:11px;color:#8e8e93;">Désactiver le sans-fil</div></div>' +
            '<label style="position:relative;display:inline-block;width:44px;height:26px;">' +
                '<input type="checkbox" id="s-airplane" '+(Phone.airplaneMode?'checked':'')+' style="opacity:0;width:0;height:0;">' +
                '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:'+(Phone.airplaneMode?'#FF9500':'#39393d')+';border-radius:26px;transition:0.3s;"></span>' +
                '<span style="position:absolute;height:22px;width:22px;left:'+(Phone.airplaneMode?'20px':'2px')+';bottom:2px;background:#fff;border-radius:50%;transition:0.3s;"></span>' +
            '</label></div>' +

        // PIN
        '<div class="s-section">' +
            '<div class="s-title">SÉCURITÉ</div>' +
            '<div style="display:flex;gap:8px;padding:8px 0;">' +
                '<button id="s-change-pin" style="flex:1;padding:12px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#fff;font-size:13px;cursor:pointer;">'+(Phone.hasPIN?'Changer le PIN':'Définir un PIN')+'</button>' +
                (Phone.hasPIN ? '<button id="s-remove-pin" style="flex:1;padding:12px;border-radius:12px;background:rgba(255,59,48,0.08);border:1px solid rgba(255,59,48,0.15);color:#FF3B30;font-size:13px;cursor:pointer;">Supprimer le PIN</button>' : '') +
            '</div></div>' +

        // About
        '<div class="s-section" style="text-align:center;padding:20px 0;color:#636366;font-size:11px;">' +
            'Genesis Phone v1.0<br>© Walter — Genesis Network</div>' +

        '<style>.s-section{padding:14px 4px;border-bottom:1px solid rgba(255,255,255,0.04);}.s-title{font-size:11px;color:#8e8e93;font-weight:600;letter-spacing:0.5px;margin-bottom:4px;}</style>';

        // Wallpaper
        el.querySelectorAll('.s-wp').forEach(function(wp) {
            wp.addEventListener('click', function() {
                el.querySelectorAll('.s-wp').forEach(function(w){w.style.border='2px solid transparent';});
                wp.style.border='2px solid #007AFF';
                applyBackground(wp.dataset.bg);
                WLCBridge.send('saveSettings',{background:wp.dataset.bg});
            });
        });

        // Theme
        el.querySelectorAll('.s-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                applyTheme(btn.dataset.theme);
                WLCBridge.send('saveSettings',{theme:btn.dataset.theme});
                self._render();
            });
        });

        // Language
        el.querySelectorAll('.s-lang').forEach(function(btn) {
            btn.addEventListener('click', function() {
                Phone.language = btn.dataset.lang;
                if(window.localeLoader) window.localeLoader.setLanguage(btn.dataset.lang).then(function(){window.localeLoader.updateDOM();});
                WLCBridge.send('saveSettings',{language:btn.dataset.lang});
                self._render();
            });
        });

        // Airplane
        el.querySelector('#s-airplane').addEventListener('change', function() {
            Phone.airplaneMode = this.checked;
            updateAirplaneIcon();
            WLCBridge.send('saveSettings',{airplaneMode:this.checked});
            self._render();
        });

        // PIN
        el.querySelector('#s-change-pin').addEventListener('click', function() {
            showPINSetup(); // uses global from script.js
            window.phoneAppManager.closeApp(false);
        });
        var rmPin = el.querySelector('#s-remove-pin');
        if (rmPin) rmPin.addEventListener('click', function() {
            WLCBridge.send('setPIN', {pin:''});
            Phone.hasPIN = false;
            window.phoneNotifications.show('Settings','PIN supprimé','apps/settings/icon.png');
            self._render();
        });
    },

    _esc(s) { if(!s)return''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
});
