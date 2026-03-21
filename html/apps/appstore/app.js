/**
 * Genesis Phone - AppStore
 * Install/uninstall apps, refreshes home screen
 */
window.phoneAppManager && window.phoneAppManager.register('appstore', {
    wrapper: null,

    getHTML() {
        return '<div style="display:flex;flex-direction:column;height:100%;background:var(--phone-bg,#000);color:var(--phone-text,#fff);border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div style="padding:16px;"><div style="font-size:24px;font-weight:700;">Apps</div>' +
            '<input type="text" id="as-search" placeholder="Rechercher des apps" style="width:100%;padding:8px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-size:13px;outline:none;margin-top:10px;"></div>' +
            '<div id="as-list" style="flex:1;overflow-y:auto;padding:0 12px 20px;"></div></div>';
    },

    onOpen(wrapper) {
        this.wrapper = wrapper;
        this._render();
        var self = this;
        var search = wrapper.querySelector('#as-search');
        search.addEventListener('focus', function(){WLCBridge.send('inputFocus',{focused:true});});
        search.addEventListener('blur', function(){WLCBridge.send('inputFocus',{focused:false});});
        search.addEventListener('input', function() {
            var q = this.value.toLowerCase();
            wrapper.querySelectorAll('.as-item').forEach(function(el){
                el.style.display = el.dataset.name.toLowerCase().indexOf(q)>=0 ? 'flex' : 'none';
            });
        });
    },

    onClose() { this.wrapper = null; },

    _render() {
        var list = this.wrapper.querySelector('#as-list');
        var apps = (Phone.data && Phone.data.apps) || [];
        var installed = (Phone.data && Phone.data.installedApps) || [];
        var self = this;

        list.innerHTML = apps.map(function(app) {
            var isInst = installed.indexOf(app.id) >= 0;
            var name = app.name || app.id;

            return '<div class="as-item" data-id="'+app.id+'" data-name="'+name+'" style="display:flex;align-items:center;gap:12px;padding:14px 4px;border-bottom:1px solid rgba(255,255,255,0.04);">' +
                '<img src="'+app.icon+'" style="width:48px;height:48px;border-radius:12px;flex-shrink:0;" onerror="this.src=\'assets/img/icon.png\'">' +
                '<div style="flex:1;overflow:hidden;"><div style="font-size:14px;font-weight:600;">'+self._esc(name)+'</div>' +
                '<div style="font-size:11px;color:#8e8e93;margin-top:2px;">Application</div></div>' +
                (isInst
                    ? '<button class="as-open" data-id="'+app.id+'" style="background:rgba(255,255,255,0.08);color:#fff;border:none;border-radius:16px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;">OUVRIR</button>'
                    : '<button class="as-get" data-id="'+app.id+'" style="background:#007AFF;color:#fff;border:none;border-radius:16px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;">OBTENIR</button>'
                ) +
            '</div>';
        }).join('');

        list.querySelectorAll('.as-open').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var appId = btn.dataset.id;
                window.phoneAppManager.closeApp(false);
                setTimeout(function(){window.phoneAppManager.openApp(appId);}, 300);
            });
        });
        list.querySelectorAll('.as-get').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var appId = btn.dataset.id;
                WLCBridge.send('asInstall', {appId:appId});
                // Add to local installed list
                if (Phone.data && Phone.data.installedApps) {
                    Phone.data.installedApps.push(appId);
                }
                btn.textContent = 'OPEN';
                btn.className = 'as-open';
                btn.style.background = 'rgba(255,255,255,0.08)';
                // Refresh home screen
                if (window.phoneHome) window.phoneHome.init(Phone.data);
                window.phoneNotifications.show('AppStore', 'App installée!', 'apps/appstore/icon.png');
            });
        });
    },

    _esc(s) { if(!s)return''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
});
