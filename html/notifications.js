/**
 * Genesis Phone - Notification System
 */

class PhoneNotifications {
    constructor() {
        this.queue = [];
        this.showing = false;
    }

    show(title, body, icon, duration = 3000) {
        this.queue.push({ title, body, icon, duration });
        if (!this.showing) this._processQueue();
    }

    _processQueue() {
        if (this.queue.length === 0) { this.showing = false; return; }
        this.showing = true;
        const notif = this.queue.shift();
        this._display(notif);
    }

    _display(notif) {
        // Create notification element inside phone frame
        let container = document.getElementById('phone-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'phone-notifications';
            container.style.cssText = 'position:absolute;top:55px;left:14px;right:14px;z-index:2900;pointer-events:none;';
            const frame = document.querySelector('.phone-frame');
            if (frame) frame.appendChild(container);
        }

        const el = document.createElement('div');
        el.style.cssText = `
            background: rgba(30,30,30,0.95); backdrop-filter: blur(20px);
            border-radius: 16px; padding: 12px 14px; margin-bottom: 8px;
            display: flex; align-items: center; gap: 10px;
            opacity: 0; transform: translateY(-20px);
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            pointer-events: all; cursor: pointer;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        el.innerHTML = `
            ${notif.icon ? `<img src="${notif.icon}" style="width:32px;height:32px;border-radius:8px;flex-shrink:0;">` : ''}
            <div style="flex:1;overflow:hidden;">
                <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:2px;">${notif.title}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${notif.body}</div>
            </div>
            <span style="font-size:10px;color:rgba(255,255,255,0.4);flex-shrink:0;">now</span>
        `;

        container.appendChild(el);

        // Animate in
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });

        // Auto dismiss
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                el.remove();
                // Remove container if empty
                let c = document.getElementById('phone-notifications');
                if (c && c.children.length === 0) c.remove();
                this._processQueue();
            }, 300);
        }, notif.duration);

        // Click to dismiss
        el.addEventListener('click', () => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                el.remove();
                let c = document.getElementById('phone-notifications');
                if (c && c.children.length === 0) c.remove();
            }, 300);
        });
    }
}

window.phoneNotifications = new PhoneNotifications();

// Listen for SMS notifications
WLCBridge.on('smsReceived', function(data) {
    var sms = data && data.data;
    if (!sms) return;
    console.log('[GP Notif] SMS received from:', sms.fromName || sms.from);
    window.phoneNotifications.show(
        sms.fromName || sms.from || 'SMS',
        sms.message || '',
        'apps/phone/icon.png'
    );
});

// Listen for incoming calls - handled by call-ui.js
// Notifications still show for SMS only
