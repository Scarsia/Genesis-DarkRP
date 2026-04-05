/**
 * Genesis Phone - Home Screen
 * App grid, dock, app icon management
 */

// Apps to hide completely
var _HIDDEN_APPS = ['camera', 'photos'];

// App name overrides
var _APP_NAMES = {
    'darkchat': 'Telegram',
};

// Force these apps into the dock (in addition to hasDock)
var _FORCE_DOCK = ['phone'];

window.phoneHome = {
    apps: [],
    installedApps: [],
    dockApps: [],

    init(data) {
        // Filter out hidden apps
        this.apps = (data.apps || []).filter(a => !_HIDDEN_APPS.includes(a.id));

        // Apply name overrides
        this.apps.forEach(a => { if (_APP_NAMES[a.id]) a.name = _APP_NAMES[a.id]; });

        // Remove hidden from installed too
        this.installedApps = (data.installedApps || []).filter(id => !_HIDDEN_APPS.includes(id));

        // Dock: original dock apps + forced dock apps
        this.dockApps = this.apps.filter(a => a.hasDock || _FORCE_DOCK.includes(a.id));

        this.renderGrid();
        this.renderDock();
    },

    renderGrid() {
        const grid = document.querySelector('.app-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const visibleApps = this.apps.filter(app => this.installedApps.includes(app.id));

        visibleApps.forEach(app => {
            const el = document.createElement('div');
            el.className = 'app-icon';
            el.setAttribute('data-app-id', app.id);

            const localeName = app.name || (window.localeLoader
                ? window.localeLoader.getText('apps.' + app.id, app.id)
                : app.id);

            el.innerHTML = `
                <div class="app-icon-circle">
                    <img class="app-icon-image" src="${app.icon}" alt="${app.name}" draggable="false"
                         onerror="this.src='assets/img/icon.png'">
                </div>
                <span class="app-icon-label">${localeName}</span>
            `;

            el.addEventListener('click', () => {
                if (window.phoneAppManager) {
                    window.phoneAppManager.openApp(app.id);
                }
            });

            grid.appendChild(el);
        });
    },

    renderDock() {
        const dock = document.querySelector('.dock-area');
        if (!dock) return;
        dock.innerHTML = '';

        const dockApps = this.dockApps.filter(app => this.installedApps.includes(app.id));

        dockApps.forEach(app => {
            const el = document.createElement('div');
            el.className = 'dock-app';
            el.setAttribute('data-app-id', app.id);
            el.innerHTML = `<img class="dock-app-image" src="${app.icon}" alt="${app.name}" draggable="false"
                                 onerror="this.src='assets/img/icon.png'">`;

            el.addEventListener('click', () => {
                if (window.phoneAppManager) {
                    window.phoneAppManager.openApp(app.id);
                }
            });

            dock.appendChild(el);
        });
    },

    refresh(installedApps) {
        this.installedApps = (installedApps || []).filter(id => !_HIDDEN_APPS.includes(id));
        this.renderGrid();
        this.renderDock();
    }
};
