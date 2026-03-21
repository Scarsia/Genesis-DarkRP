/**
 * Genesis Phone - Core Script
 * Phone state, open/close, time, theme, setup wizard, PIN lock
 */

var Phone = {
    isOpen: false,
    isLocked: false,
    data: null,
    language: 'fr',
    theme: 'dark',
    background: 'purple',
    brightness: 100,
    volume: 50,
    airplaneMode: false,
    phoneNumber: '',
    playerName: '',
    hasPIN: false,
    setupComplete: false,
};

// ============================================================
// OPEN PHONE
// ============================================================
function openPhone(data) {
    Phone.isOpen = true;
    Phone.data = data;
    Phone.language = data.language || 'fr';
    Phone.theme = data.theme || 'dark';
    Phone.background = data.background || 'purple';
    Phone.brightness = (data.brightness != null) ? data.brightness : 100;
    Phone.volume = (data.volume != null) ? data.volume : 50;
    Phone.airplaneMode = data.airplaneMode || false;
    Phone.phoneNumber = data.phoneNumber || '';
    Phone.playerName = data.playerName || '';
    Phone.hasPIN = data.hasPIN || false;
    Phone.setupComplete = data.setupComplete || false;

    applyTheme(Phone.theme);
    applyBackground(Phone.background);
    applyBrightness(Phone.brightness);

    if (window.localeLoader) {
        window.localeLoader.setLanguage(Phone.language).then(function() {
            window.localeLoader.updateDOM();
            updateClock();
        });
    }

    // Show phone container
    var container = document.getElementById('phone-container');
    container.classList.remove('phone-hidden');
    container.classList.add('phone-visible');
    var phoneEl = document.querySelector('.phone');
    if (phoneEl) { phoneEl.style.opacity='1'; phoneEl.style.transform='translateY(0)'; }

    updateAirplaneIcon();

    // Flow: setup → PIN create → PIN lock → home
    if (!Phone.setupComplete) {
        hideAll();
        showSetupScreen();
    } else if (Phone.hasPIN) {
        hideAll();
        showPINLock();
    } else {
        hideAll();
        showHomeScreen();
        if (window.phoneHome) window.phoneHome.init(data);
    }

    console.log('[Genesis Phone] Opened. Setup:', Phone.setupComplete, 'PIN:', Phone.hasPIN);
}

function closePhone() {
    Phone.isOpen = false;
    Phone.isLocked = false;
    var container = document.getElementById('phone-container');
    container.classList.remove('phone-visible');
    container.classList.add('phone-hidden');
    var phoneEl = document.querySelector('.phone');
    if (phoneEl) { phoneEl.style.opacity='0'; phoneEl.style.transform='translateY(20px)'; }
    if (window.phoneAppManager) window.phoneAppManager.closeAll();
}

function hideAll() {
    ['setup-screen','theme-screen','pin-setup-screen','pin-lock-screen'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.style.display='none'; el.classList.remove('active'); }
    });
    var home = document.querySelector('.home-screen');
    if (home) { home.style.display='none'; home.classList.remove('active','show'); }
}

// ============================================================
// THEME / BACKGROUND / BRIGHTNESS
// ============================================================
function applyTheme(theme) {
    Phone.theme = theme;
    var frame = document.querySelector('.phone-frame');
    if (!frame) return;
    frame.classList.remove('theme-dark','theme-light');
    frame.classList.add('theme-'+theme);
    var root = document.documentElement.style;
    if (theme==='light') {
        root.setProperty('--phone-bg','#f2f2f7'); root.setProperty('--phone-text','#000');
        root.setProperty('--phone-text-secondary','#6e6e73'); root.setProperty('--phone-card','rgba(255,255,255,0.8)');
    } else {
        root.setProperty('--phone-bg','#000'); root.setProperty('--phone-text','#fff');
        root.setProperty('--phone-text-secondary','#8e8e93'); root.setProperty('--phone-card','rgba(28,28,30,0.8)');
    }
}

function applyBackground(bg) {
    Phone.background = bg;
    var frame = document.querySelector('.phone-frame');
    if (frame) frame.style.backgroundImage = "url('assets/background/" + bg + ".png')";
}

function applyBrightness(value) {
    Phone.brightness = value;
    var overlay = document.getElementById('brightness-overlay');
    if (overlay) overlay.style.backgroundColor = 'rgba(0,0,0,' + (((100-value)/100)*0.8) + ')';
}

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
    var el = document.getElementById('current-time');
    if (!el) return;
    var now = new Date();
    el.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
}
setInterval(updateClock, 1000);
updateClock();

function updateAirplaneIcon() {
    var icon = document.getElementById('airplane-icon');
    var bars = document.querySelector('.signal-bars');
    if (icon) icon.style.display = Phone.airplaneMode ? 'block' : 'none';
    if (bars) bars.style.display = Phone.airplaneMode ? 'none' : 'flex';
}

// ============================================================
// SETUP WIZARD (first use)
// ============================================================
function showSetupScreen() {
    var el = document.getElementById('setup-screen');
    if (el) { el.style.display='flex'; el.classList.add('active'); }
}

function showThemeScreen() {
    document.getElementById('setup-screen').style.display='none';
    var el = document.getElementById('theme-screen');
    if (el) { el.style.display='flex'; el.classList.add('active'); }
}

function finishSetup(lang, theme) {
    document.getElementById('theme-screen').style.display='none';
    Phone.language = lang;
    Phone.theme = theme;
    Phone.setupComplete = true;
    applyTheme(theme);
    WLCBridge.send('setupComplete', { language: lang, theme: theme });

    // Now show PIN setup
    showPINSetup();
}

// ============================================================
// PIN SETUP (after first setup)
// ============================================================
function showPINSetup() {
    var el = document.getElementById('pin-setup-screen');
    if (el) { el.style.display='flex'; el.classList.add('active'); }
    _initPINPad('pin-setup-screen', function(pin) {
        if (pin.length === 4) {
            WLCBridge.send('setPIN', { pin: pin });
            Phone.hasPIN = true;
            el.style.display = 'none';
            hideAll();
            showHomeScreen();
            if (window.phoneHome) window.phoneHome.init(Phone.data);
        }
    }, 'Créez votre code PIN', true);
}

// ============================================================
// PIN LOCK (every open if PIN is set)
// ============================================================
function showPINLock() {
    Phone.isLocked = true;
    var el = document.getElementById('pin-lock-screen');
    if (el) { el.style.display='flex'; el.classList.add('active'); }
    console.log('[Genesis Phone] PIN lock shown');

    // Clean any existing handler first
    WLCBridge.off('pinVerified');

    var pinHandled = false;
    WLCBridge.on('pinVerified', function(msg) {
        if (pinHandled) return; // Prevent double-fire
        pinHandled = true;
        WLCBridge.off('pinVerified');

        var d = msg && msg.data;
        console.log('[Genesis Phone] PIN verified result:', JSON.stringify(d));

        if (d && d.success) {
            Phone.isLocked = false;
            el.style.display = 'none';
            el.classList.remove('active');

            // Show home screen
            var home = document.querySelector('.home-screen');
            if (home) {
                home.style.display = 'flex';
                home.classList.add('active', 'show');
                home.style.opacity = '1';
                console.log('[Genesis Phone] Home screen shown');
            } else {
                console.error('[Genesis Phone] .home-screen NOT FOUND');
            }

            if (window.phoneHome && Phone.data) {
                window.phoneHome.init(Phone.data);
                console.log('[Genesis Phone] phoneHome.init called with', (Phone.data.apps || []).length, 'apps');
            } else {
                console.error('[Genesis Phone] phoneHome or Phone.data missing:', !!window.phoneHome, !!Phone.data);
            }
        } else {
            console.log('[Genesis Phone] Wrong PIN');
            var display = el.querySelector('.pin-dots');
            if (display) {
                display.style.animation = 'none';
                void display.offsetWidth;
                display.style.animation = 'pinShake 0.4s ease';
            }
            setTimeout(function() {
                _clearPINPad('pin-lock-screen');
                pinHandled = false; // Allow retry
            }, 400);
        }
    });

    _initPINPad('pin-lock-screen', function(pin) {
        if (pin.length === 4) {
            console.log('[Genesis Phone] Sending PIN verify...');
            WLCBridge.send('verifyPIN', { pin: pin });
        }
    }, 'Entrez votre PIN', false);
}

// ============================================================
// PIN PAD (shared logic)
// ============================================================
function _initPINPad(screenId, onComplete, title, allowPasser) {
    var screen = document.getElementById(screenId);
    if (!screen) return;
    var currentPIN = '';

    screen.innerHTML = '' +
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:30px;">' +
        '<div style="margin-bottom:30px;text-align:center;">' +
            '<div style="font-size:18px;font-weight:600;margin-bottom:8px;">' + title + '</div>' +
            '<div class="pin-dots" style="display:flex;gap:14px;justify-content:center;margin-top:16px;">' +
                '<div class="pin-dot" style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);transition:all 0.15s;"></div>' +
                '<div class="pin-dot" style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);transition:all 0.15s;"></div>' +
                '<div class="pin-dot" style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);transition:all 0.15s;"></div>' +
                '<div class="pin-dot" style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);transition:all 0.15s;"></div>' +
            '</div>' +
        '</div>' +
        '<div class="pin-keypad" style="display:grid;grid-template-columns:repeat(3,72px);gap:12px;justify-content:center;">' +
            [1,2,3,4,5,6,7,8,9].map(function(n) {
                return '<button class="pin-key" data-val="'+n+'" style="width:72px;height:72px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:#fff;font-size:24px;font-weight:300;cursor:pointer;transition:background 0.1s;font-family:-apple-system,sans-serif;">'+n+'</button>';
            }).join('') +
            (allowPasser ? '<button class="pin-skip" style="width:72px;height:72px;border-radius:50%;border:none;background:transparent;color:#007AFF;font-size:12px;cursor:pointer;">Passer</button>'
                       : '<div style="width:72px;height:72px;"></div>') +
            '<button class="pin-key" data-val="0" style="width:72px;height:72px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:#fff;font-size:24px;font-weight:300;cursor:pointer;font-family:-apple-system,sans-serif;">0</button>' +
            '<button class="pin-del" style="width:72px;height:72px;border-radius:50%;border:none;background:transparent;color:#fff;font-size:16px;cursor:pointer;">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>' +
            '</button>' +
        '</div>' +
    '</div>';

    function updateDots() {
        var dots = screen.querySelectorAll('.pin-dot');
        dots.forEach(function(dot, i) {
            if (i < currentPIN.length) {
                dot.style.background = '#fff';
                dot.style.borderColor = '#fff';
            } else {
                dot.style.background = 'transparent';
                dot.style.borderColor = 'rgba(255,255,255,0.3)';
            }
        });
    }

    screen.querySelectorAll('.pin-key').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (currentPIN.length >= 4) return;
            currentPIN += btn.dataset.val;
            updateDots();
            if (currentPIN.length === 4) {
                setTimeout(function() { onComplete(currentPIN); }, 200);
            }
        });
    });

    var delBtn = screen.querySelector('.pin-del');
    if (delBtn) delBtn.addEventListener('click', function() {
        currentPIN = currentPIN.slice(0,-1);
        updateDots();
    });

    var skipBtn = screen.querySelector('.pin-skip');
    if (skipBtn) skipBtn.addEventListener('click', function() {
        screen.style.display = 'none';
        hideAll();
        showHomeScreen();
        if (window.phoneHome) window.phoneHome.init(Phone.data);
    });

    // Store reset function
    screen._clearPIN = function() { currentPIN = ''; updateDots(); };
}

function _clearPINPad(screenId) {
    var screen = document.getElementById(screenId);
    if (screen && screen._clearPIN) screen._clearPIN();
}

// ============================================================
// HOME SCREEN
// ============================================================
function showHomeScreen() {
    var home = document.querySelector('.home-screen');
    if (home) { home.classList.add('active','show'); home.style.display='flex'; }
}

// ============================================================
// VOLUME
// ============================================================
var volumeHideTimer = null;
function setVolume(val) {
    Phone.volume = Math.max(0, Math.min(100, val));
    window.currentVolume = Phone.volume;
    var indicator = document.getElementById('volume-indicator');
    var fill = indicator ? indicator.querySelector('.volume-fill') : null;
    if (fill) fill.style.height = Phone.volume + '%';
    if (indicator) {
        indicator.classList.add('show');
        clearTimeout(volumeHideTimer);
        volumeHideTimer = setTimeout(function(){indicator.classList.remove('show');}, 1200);
    }
    WLCBridge.send('saveSettings', {volume: Phone.volume});
}

// ============================================================
// EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Setup wizard language buttons
    document.querySelectorAll('.language-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.language-btn').forEach(function(b){b.classList.remove('selected');});
            btn.classList.add('selected');
            Phone.language = btn.getAttribute('data-lang');
            if (window.localeLoader) {
                window.localeLoader.setLanguage(Phone.language).then(function(){window.localeLoader.updateDOM();});
            }
            var cb = document.getElementById('continue-btn');
            if (cb) { cb.style.display='inline-flex'; setTimeout(function(){cb.classList.add('show');},30); }
        });
    });

    var continueBtn = document.getElementById('continue-btn');
    if (continueBtn) continueBtn.addEventListener('click', function(){ showThemeScreen(); });

    var selectedTheme = 'dark';
    document.querySelectorAll('.theme-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-btn').forEach(function(b){b.classList.remove('selected');});
            btn.classList.add('selected');
            selectedTheme = btn.getAttribute('data-theme');
            var fb = document.getElementById('finish-setup-btn');
            if (fb) { fb.style.display='inline-flex'; setTimeout(function(){fb.classList.add('show');},30); }
        });
    });

    var finishBtn = document.getElementById('finish-setup-btn');
    if (finishBtn) finishBtn.addEventListener('click', function(){ finishSetup(Phone.language, selectedTheme); });

    // Volume buttons
    var volUp = document.getElementById('phone-volume-up');
    var volDown = document.getElementById('phone-volume-down');
    if (volUp) volUp.addEventListener('click', function(){setVolume(Phone.volume+5);});
    if (volDown) volDown.addEventListener('click', function(){setVolume(Phone.volume-5);});

    // Brightness
    var brightBtn = document.getElementById('brightness-control-btn');
    if (brightBtn) brightBtn.addEventListener('click', function(){
        var menu = document.getElementById('brightness-menu');
        if (menu) menu.classList.toggle('show');
    });
    var brightSlider = document.getElementById('brightness-slider');
    if (brightSlider) brightSlider.addEventListener('input', function(){
        applyBrightness(parseInt(this.value));
        WLCBridge.send('saveSettings', {brightness:parseInt(this.value)});
    });

    // Home bar → close phone
    var homeBar = document.getElementById('home-screen-bar');
    if (homeBar) homeBar.addEventListener('click', function(){ WLCBridge.send('closePhone',{}); });

    // ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && Phone.isOpen) {
            e.preventDefault();
            if (Phone.isLocked) return; // Can't escape PIN
            if (window.phoneAppManager && window.phoneAppManager.currentApp) {
                window.phoneAppManager.closeApp();
            } else {
                WLCBridge.send('closePhone', {});
            }
        }
    });

    document.addEventListener('contextmenu', function(e){e.preventDefault();});
});

// ============================================================
// BRIDGE HANDLERS
// ============================================================
WLCBridge.on('open', function(data) { openPhone(data); });
WLCBridge.on('close', function() { closePhone(); });

console.log('[Genesis Phone] Core script loaded');
