/**
 * Genesis Phone - Camera App
 */
window.phoneAppManager && window.phoneAppManager.register('camera', {
    getHTML() {
        return '<div style="display:flex;flex-direction:column;height:100%;background:#000;border-radius:35px 35px 0 0;overflow:hidden;align-items:center;justify-content:center;">' +
            '<div style="width:200px;height:200px;border:2px solid rgba(255,255,255,0.3);border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">' +
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
            '</div>' +
            '<div style="color:rgba(255,255,255,0.5);font-size:13px;text-align:center;padding:0 30px;">La caméra nécessite GameView non disponible en mode DHTML</div>' +
            '<div style="margin-top:20px;display:flex;gap:12px;">' +
                '<button id="cam-selfie" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:10px 20px;color:#fff;font-size:13px;cursor:pointer;">Mode selfie</button>' +
                '<button id="cam-photo" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:10px 20px;color:#fff;font-size:13px;cursor:pointer;">Mode photo</button>' +
            '</div>' +
        '</div>';
    },
    onOpen(w) {
        // Camera needs native GameView - not possible in pure DHTML
    },
    onClose() {}
});
