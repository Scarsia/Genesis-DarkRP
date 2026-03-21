/**
 * Genesis Phone - Map App
 * Static GTA map using tile images from assets
 */
window.phoneAppManager && window.phoneAppManager.register('map', {
    getHTML() {
        return '<div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;border-radius:35px 35px 0 0;overflow:hidden;">' +
            '<div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.5);z-index:2;">' +
                '<span style="font-size:18px;font-weight:700;color:#fff;">Maps</span>' +
                '<div style="display:flex;gap:8px;">' +
                    '<button id="map-friends-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px 12px;color:#fff;font-size:11px;cursor:pointer;">Friends</button>' +
                '</div>' +
            '</div>' +
            '<div id="map-container" style="flex:1;overflow:hidden;position:relative;cursor:grab;">' +
                '<div id="map-tiles" style="position:absolute;width:600px;height:600px;top:50%;left:50%;transform:translate(-50%,-50%);">' +
                    '<img src="apps/map/assets/0_0.png" style="position:absolute;left:0;top:0;width:200px;height:300px;" draggable="false">' +
                    '<img src="apps/map/assets/1_0.png" style="position:absolute;left:200px;top:0;width:200px;height:300px;" draggable="false">' +
                    '<img src="apps/map/assets/2_0.png" style="position:absolute;left:400px;top:0;width:200px;height:300px;" draggable="false">' +
                    '<img src="apps/map/assets/0_1.png" style="position:absolute;left:0;top:300px;width:200px;height:300px;" draggable="false">' +
                    '<img src="apps/map/assets/1_1.png" style="position:absolute;left:200px;top:300px;width:200px;height:300px;" draggable="false">' +
                    '<img src="apps/map/assets/2_1.png" style="position:absolute;left:400px;top:300px;width:200px;height:300px;" draggable="false">' +
                '</div>' +
                '<div id="map-player-marker" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10;">' +
                    '<div style="width:14px;height:14px;background:#007AFF;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(0,122,255,0.6);"></div>' +
                '</div>' +
            '</div>' +
        '</div>';
    },

    onOpen(wrapper) {
        // Simple drag-to-pan
        var container = wrapper.querySelector('#map-container');
        var tiles = wrapper.querySelector('#map-tiles');
        if (!container || !tiles) return;

        var dragging = false, startX = 0, startY = 0, tileX = 0, tileY = 0;

        container.addEventListener('mousedown', function(e) {
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            var style = window.getComputedStyle(tiles);
            var matrix = new DOMMatrix(style.transform);
            tileX = matrix.m41;
            tileY = matrix.m42;
            container.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            var dx = e.clientX - startX;
            var dy = e.clientY - startY;
            tiles.style.transform = 'translate(' + (tileX + dx) + 'px, ' + (tileY + dy) + 'px)';
        });

        document.addEventListener('mouseup', function() {
            dragging = false;
            container.style.cursor = 'grab';
        });
    },

    onClose() {}
});
