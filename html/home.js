/**
 * Genesis Phone - Home Screen
 * App grid, dock, app icon management
 */

window.phoneHome = {
    apps: [],
    installedApps: [],
    dockApps: [],

    init(data) {
        this.apps = data.apps || [];
        this.installedApps = data.installedApps || [];
        this.dockApps = this.apps.filter(a => a.hasDock);
        this.renderGrid();
        this.renderDock();
    },

    renderGrid() {
        const grid = document.querySelector('.app-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Only show installed apps (excluding dock apps from grid optionally — but SBF shows all)
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

    // Refresh after app install/uninstall
    refresh(installedApps) {
        this.installedApps = installedApps;
        this.renderGrid();
        this.renderDock();
    }
};
