/**
 * Genesis Phone - App Manager
 * Loads, opens, closes apps. Each app is an HTML+JS+CSS module.
 */

class PhoneAppManager {
    constructor() {
        this.apps = {};          // Registered app modules
        this.currentApp = null;  // Currently open app ID
        this.appContainer = null;
        this.appWrapper = null;
        this.loadedCSS = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Create app container (overlay that holds open apps)
        let container = document.querySelector('.app-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'app-container';
            container.style.display = 'none';
            const frame = document.querySelector('.phone-frame');
            if (frame) frame.appendChild(container);
        }
        this.appContainer = container;
    }

    // Register an app module
    register(id, module) {
        this.apps[id] = module;
    }

    // Open an app
    async openApp(id) {
        this.init();

        if (this.currentApp === id) return;

        // Close current app if open
        if (this.currentApp) {
            this.closeApp(false);
        }

        // Load CSS for this app
        this.loadAppCSS(id);

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'app-wrapper';
        wrapper.id = `app-wrapper-${id}`;

        // Status bar color
        const statusbar = this._getStatusBarColor(id);

        // Build app content
        const appModule = this.apps[id];
        if (appModule && appModule.getHTML) {
            wrapper.innerHTML = appModule.getHTML();
        } else {
            // Default empty app
            wrapper.innerHTML = this._defaultAppHTML(id);
        }

        // Add home bar
        const homeBar = document.createElement('div');
        homeBar.className = 'app-home-bar';
        homeBar.addEventListener('click', () => this.closeApp());
        wrapper.appendChild(homeBar);

        this.appContainer.innerHTML = '';
        this.appContainer.appendChild(wrapper);
        this.appContainer.style.display = 'flex';
        this.appWrapper = wrapper;
        this.currentApp = id;

        // Animate in
        requestAnimationFrame(() => {
            wrapper.classList.add('app-show');
        });

        // Initialize app JS
        if (appModule && appModule.onOpen) {
            try {
                await appModule.onOpen(wrapper);
            } catch(e) {
                console.error(`[AppManager] Error opening ${id}:`, e);
            }
        }

        // Hide home screen
        const home = document.querySelector('.home-screen');
        if (home) home.style.opacity = '0';

        // Update status bar for app
        this._setStatusBar(statusbar);
    }

    // Close current app
    closeApp(animate = true) {
        if (!this.currentApp) return;

        const appModule = this.apps[this.currentApp];
        if (appModule && appModule.onClose) {
            try { appModule.onClose(); } catch(e) {}
        }

        if (this.appWrapper) {
            if (animate) {
                this.appWrapper.classList.remove('app-show');
                setTimeout(() => {
                    if (this.appContainer) {
                        this.appContainer.innerHTML = '';
                        this.appContainer.style.display = 'none';
                    }
                }, 300);
            } else {
                this.appContainer.innerHTML = '';
                this.appContainer.style.display = 'none';
            }
        }

        this.currentApp = null;
        this.appWrapper = null;

        // Show home screen
        const home = document.querySelector('.home-screen');
        if (home) home.style.opacity = '1';

        // Reset status bar
        this._setStatusBar('white');
    }

    closeAll() {
        this.closeApp(false);
    }

    // Load app CSS dynamically
    loadAppCSS(id) {
        if (this.loadedCSS[id]) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `apps/${id}/app.css`;
        document.head.appendChild(link);
        this.loadedCSS[id] = true;
    }

    // Default app placeholder
    _defaultAppHTML(id) {
        const name = window.localeLoader
            ? window.localeLoader.getText('apps.' + id, id)
            : id;
        return `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                        height:100%;background:var(--phone-bg, #000);color:var(--phone-text, #fff);">
                <img src="apps/${id}/icon.png" style="width:64px;height:64px;border-radius:16px;margin-bottom:16px;"
                     onerror="this.style.display='none'">
                <span style="font-size:18px;font-weight:600;">${name}</span>
                <span style="font-size:12px;opacity:0.5;margin-top:8px;">Coming soon</span>
            </div>
        `;
    }

    _getStatusBarColor(id) {
        // Most apps use black statusbar (light text on dark app)
        const config = (Phone.data && Phone.data.apps || []).find(a => a.id === id);
        return 'black'; // SBF Phone defaults all to black
    }

    _setStatusBar(color) {
        const bar = document.querySelector('.status-bar');
        if (!bar) return;
        if (color === 'black') {
            bar.style.color = '#fff';
        } else {
            bar.style.color = '#000';
        }
    }
}

window.phoneAppManager = new PhoneAppManager();
