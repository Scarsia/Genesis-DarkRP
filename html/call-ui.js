/**
 * Genesis Phone - Call UI Overlay
 * Full-screen overlay for incoming/outgoing calls
 * Ringing animation, answer/decline, active call timer
 */
var PhoneCallUI = {
    active: false,
    callId: null,
    direction: null, // 'outgoing' | 'incoming'
    status: null, // 'ringing' | 'answered' | 'ended'
    otherName: '',
    otherNumber: '',
    timerInterval: null,
    callStart: null,

    show(opts) {
        this.active = true;
        this.callId = opts.callId;
        this.direction = opts.direction;
        this.status = opts.status || 'ringing';
        this.otherName = opts.name || opts.number || 'Inconnu';
        this.otherNumber = opts.number || '';
        this.callStart = null;
        this._render();
    },

    update(data) {
        if (!this.active) return;
        if (data.callId && data.callId !== this.callId) return;

        this.status = data.status;
        if (data.status === 'answered') {
            this.callStart = Date.now();
            this._startTimer();
            this._render();
        } else if (['ended','missed','declined','cancelled','unavailable','busy','disconnected'].indexOf(data.status) >= 0) {
            this._stopTimer();
            this._renderEnded(data.status, data.duration);
            var self = this;
            setTimeout(function() { self.hide(); }, 2000);
        }
    },

    hide() {
        this.active = false;
        this._stopTimer();
        var el = document.getElementById('call-overlay');
        if (el) {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 300);
        }
    },

    _render() {
        var existing = document.getElementById('call-overlay');
        if (existing) existing.remove();

        var el = document.createElement('div');
        el.id = 'call-overlay';
        el.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:5000;background:linear-gradient(180deg,#1a1a2e 0%,#0a0a14 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s;';

        var isRinging = this.status === 'ringing';
        var isIncoming = this.direction === 'incoming';
        var statusText = isRinging
            ? (isIncoming ? 'Appel entrant...' : 'Appel en cours...')
            : 'Connecté';

        var initial = (this.otherName || '?')[0].toUpperCase();
        var self = this;

        el.innerHTML = '' +
            // Pulse ring animation for ringing
            '<div style="position:relative;margin-bottom:24px;">' +
                (isRinging ? '<div class="call-pulse" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100px;height:100px;border-radius:50%;background:rgba(52,199,89,0.15);animation:callPulse 1.5s ease-out infinite;"></div>' +
                '<div class="call-pulse" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100px;height:100px;border-radius:50%;background:rgba(52,199,89,0.1);animation:callPulse 1.5s ease-out infinite 0.5s;"></div>' : '') +
                '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#5856D6);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#fff;position:relative;z-index:1;">' + initial + '</div>' +
            '</div>' +
            '<div style="font-size:24px;font-weight:600;color:#fff;margin-bottom:4px;">' + this._esc(this.otherName) + '</div>' +
            '<div style="font-size:14px;color:#8e8e93;font-family:monospace;margin-bottom:6px;">' + this._esc(this.otherNumber) + '</div>' +
            '<div id="call-status" style="font-size:13px;color:#8e8e93;margin-bottom:40px;">' + statusText + '</div>' +
            '<div id="call-timer" style="font-size:20px;font-weight:300;color:#fff;margin-bottom:40px;display:' + (isRinging ? 'none' : 'block') + ';">00:00</div>' +
            // Buttons
            '<div style="display:flex;gap:40px;align-items:center;">' +
                (isIncoming && isRinging
                    ? '<button id="call-decline" style="width:64px;height:64px;border-radius:50%;border:none;background:#FF3B30;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                        '<svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" style="transform:rotate(135deg);"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>' +
                      '</button>' +
                      '<button id="call-accept" style="width:64px;height:64px;border-radius:50%;border:none;background:#34C759;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                        '<svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>' +
                      '</button>'
                    : '<button id="call-end" style="width:64px;height:64px;border-radius:50%;border:none;background:#FF3B30;cursor:pointer;display:flex;align-items:center;justify-content:center;">' +
                        '<svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" style="transform:rotate(135deg);"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>' +
                      '</button>'
                ) +
            '</div>' +
            '<style>@keyframes callPulse{0%{transform:translate(-50%,-50%) scale(1);opacity:0.6;}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0;}}</style>';

        var frame = document.querySelector('.phone-frame');
        if (frame) frame.appendChild(el);
        requestAnimationFrame(function() { el.style.opacity = '1'; });

        // Bind buttons
        var acceptBtn = el.querySelector('#call-accept');
        var declineBtn = el.querySelector('#call-decline');
        var endBtn = el.querySelector('#call-end');

        if (acceptBtn) acceptBtn.addEventListener('click', function() {
            WLCBridge.send('answerCall', { callId: self.callId });
        });
        if (declineBtn) declineBtn.addEventListener('click', function() {
            WLCBridge.send('endCall', { callId: self.callId });
        });
        if (endBtn) endBtn.addEventListener('click', function() {
            WLCBridge.send('endCall', { callId: self.callId });
        });
    },

    _renderEnded(reason, duration) {
        var statusEl = document.getElementById('call-status');
        var timerEl = document.getElementById('call-timer');
        if (statusEl) {
            var text = {ended:'Appel terminé',missed:'Appel manqué',declined:'Appel refusé',cancelled:'Appel annulé',unavailable:'Indisponible',busy:'Ligne occupée',disconnected:'Déconnecté'}[reason] || 'Appel terminé';
            statusEl.textContent = text;
            statusEl.style.color = '#FF3B30';
        }
        if (timerEl && duration && duration > 0) {
            timerEl.textContent = this._formatTime(duration);
        }
    },

    _startTimer() {
        this._stopTimer();
        var self = this;
        var timerEl = document.getElementById('call-timer');
        if (timerEl) timerEl.style.display = 'block';
        this.timerInterval = setInterval(function() {
            if (!self.callStart) return;
            var elapsed = Math.floor((Date.now() - self.callStart) / 1000);
            if (timerEl) timerEl.textContent = self._formatTime(elapsed);
        }, 1000);
    },

    _stopTimer() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    },

    _formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    },

    _esc(s) { if(!s)return''; var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
};

// Hook into bridge events
WLCBridge.on('callUpdate', function(msg) {
    var d = msg && msg.data;
    if (!d) return;
    if (d.status === 'ringing' && !PhoneCallUI.active) {
        // Outgoing call started
        PhoneCallUI.show({ callId: d.callId, direction: 'outgoing', status: 'ringing', name: d.otherName, number: d.otherNumber });
    } else if (PhoneCallUI.active) {
        PhoneCallUI.update(d);
    }
});

WLCBridge.on('incomingCall', function(msg) {
    var d = msg && msg.data;
    if (!d) return;
    PhoneCallUI.show({ callId: d.callId, direction: 'incoming', status: 'ringing', name: d.callerName, number: d.callerNumber });
});

window.PhoneCallUI = PhoneCallUI;
