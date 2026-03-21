/**
 * Genesis Phone - DHTML Bridge
 * 
 * JS → Lua:  _nativeBridge(name, json)   (via AddFunction)
 * Lua → JS:  WLC_Receive(jsonString)      (via RunJavascript)
 */

// ---- Lua → JS global function (called by RunJavascript) ----
var _wlcHandlers = {};

function WLC_Receive(jsonString) {
    try {
        var data = JSON.parse(jsonString);
        var action = data.action;
        if (!action) return;
        
        
        var list = _wlcHandlers[action];
        if (list) {
            for (var i = 0; i < list.length; i++) {
                try { list[i](data); } catch(e) {
                    console.error('[GP Bridge] handler error for', action, e);
                }
            }
        }
    } catch(e) {
        console.error('[GP Bridge] parse error:', e);
    }
}

// ---- JS → Lua: save native callback from AddFunction ----
var _nativeBridge = null;
if (window.WLCBridge && typeof window.WLCBridge.callback === 'function') {
    _nativeBridge = window.WLCBridge.callback;
} else {
    //console.warn('[GP Bridge] No native callback found');
}

// ---- Public API (used by all app JS) ----
var WLCBridge = {
    send: function(name, data) {
        try {
            var json = JSON.stringify(data || {});
            if (_nativeBridge) {
                _nativeBridge(name, json);
            } else {
                //console.warn('[GP Bridge] No native bridge, dropping:', name);
            }
        } catch(e) {
            console.error('[GP Bridge] send error:', e);
        }
    },

    on: function(action, callback) {
        if (!_wlcHandlers[action]) _wlcHandlers[action] = [];
        _wlcHandlers[action].push(callback);
    },

    off: function(action, callback) {
        if (!_wlcHandlers[action]) return;
        if (callback) {
            _wlcHandlers[action] = _wlcHandlers[action].filter(function(fn) { return fn !== callback; });
        } else {
            delete _wlcHandlers[action];
        }
    },

    once: function(action, callback) {
        var wrapper = function(data) {
            WLCBridge.off(action, wrapper);
            callback(data);
        };
        WLCBridge.on(action, wrapper);
    }
};

// Override window.WLCBridge so other scripts can use WLCBridge.send/on/off
window.WLCBridge = WLCBridge;

// ---- FiveM compat shim ----
window.GetParentResourceName = function() { return 'wlc_phone'; };

// ---- fetch() interceptor for NUI-style calls ----
var _originalFetch = window.fetch;
window.fetch = function(url, options) {
    if (typeof url === 'string' && url.indexOf('https://') === 0) {
        var match = url.match(/^https:\/\/[^/]+\/(.+)$/);
        if (match) {
            var endpoint = match[1];
            var body = {};
            try { if (options && options.body) body = JSON.parse(options.body); } catch(e) {}
            WLCBridge.send(endpoint, body);
            return Promise.resolve(new Response(JSON.stringify({ok: true}), {
                status: 200, headers: {'Content-Type': 'application/json'}
            }));
        }
    }
    return _originalFetch.apply(this, arguments);
};

// ---- Signal ready to Lua after page is fully loaded ----
window.addEventListener('load', function() {
    setTimeout(function() {
        WLCBridge.send('jsReady', {});
    }, 100);
});


// Global: detect focus on any input/textarea and notify Lua
document.addEventListener('focusin', function(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        if (typeof WLCBridge !== 'undefined' && WLCBridge.send) {
            WLCBridge.send('inputFocus', { focused: true });
        }
    }
});
document.addEventListener('focusout', function(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        if (typeof WLCBridge !== 'undefined' && WLCBridge.send) {
            WLCBridge.send('inputFocus', { focused: false });
        }
    }
});
