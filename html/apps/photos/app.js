/**
 * Genesis Phone - Photos App
 */
window.phoneAppManager && window.phoneAppManager.register('photos', {
    getHTML() {
        return '<div style="display:flex;flex-direction:column;height:100%;background:var(--phone-bg,#000);color:var(--phone-text,#fff);border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div style="padding:16px;font-size:24px;font-weight:700;">Photos</div>' +
            '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;">' +
                '<div style="text-align:center;color:#8e8e93;">' +
                    '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="1.5" style="margin-bottom:12px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                    '<div style="font-size:15px;font-weight:500;">Aucune photo</div>' +
                    '<div style="font-size:12px;margin-top:4px;">Les photos prises apparaîtront ici</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    },
    onOpen() {},
    onClose() {}
});
