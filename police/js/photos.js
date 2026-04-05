window.__mdtModule('photos', function(){
(function(){
  if(window.__mdt_photos_loaded) return;
  window.__mdt_photos_loaded = true;

  const S = {
    mode: 'list',
    prevPage: 'operations',
    folder: null,
    folders: [],
    photos: [],
    listLoaded: false,
    listLoading: false,
    createLoading: false,
    saveLoading: false,
    editingFolder: null,
    deletingPhotoId: 0,
    uploadBusy: false,
    lastUploadAt: 0,
    lastPasteSig: '',
    lastPasteAt: 0,
    lastAcceptedImageSig: '',  // legacy — no longer used as global cross-folder block
    lastAcceptedImageAt: 0
  };

  const PHOTO_PREVIEW_REQUESTS = {};
  const PHOTO_UPLOADS = {};
  const UPLOAD_COOLDOWN_MS = 600;
  const MAX_DATA_URL_LENGTH = 240000;
  const MAX_IMAGE_DIMENSION = 960;
  const MIN_IMAGE_DIMENSION = 420;
  // ── Custom confirm dialog (window.confirm always returns false in GMod DHTML) ──
  function mdtConfirm(title, body, onOk, okLabel, okDanger){
    const overlay = document.getElementById('mdt-confirm-overlay');
    const titleEl = document.getElementById('mdt-confirm-title');
    const bodyEl  = document.getElementById('mdt-confirm-body');
    const okBtn   = document.getElementById('mdt-confirm-ok');
    const cancelBtn = document.getElementById('mdt-confirm-cancel');
    if(!overlay) { if(onOk) onOk(); return; }
    if(titleEl) titleEl.textContent = title || 'Confirmer';
    if(bodyEl)  bodyEl.textContent  = body  || '';
    if(okBtn){
      okBtn.textContent = okLabel || 'Confirmer';
      okBtn.style.background = okDanger === false ? '#1b62b5' : '#ef4444';
    }
    overlay.style.display = 'flex';
    function cleanup(){ overlay.style.display = 'none'; okBtn.removeEventListener('click', yes); cancelBtn.removeEventListener('click', no); }
    function yes(){ cleanup(); if(onOk) onOk(); }
    function no(){ cleanup(); }
    okBtn.addEventListener('click', yes);
    cancelBtn.addEventListener('click', no);
  }


  function escSafe(v){
    if(typeof window.esc === 'function') return window.esc(v);
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function escAttrSafe(v){
    if(typeof window.escAttr === 'function') return window.escAttr(v);
    return escSafe(v).replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function parsePayload(json){
    try{ return typeof json === 'string' ? (JSON.parse(json) || {}) : (json || {}); }catch(e){ return {}; }
  }
  function sendRequest(action, data, reqId){
    const rid = String(reqId || ('req_photo_' + Date.now()));
    try{
      if(typeof window.loReq === 'function'){ window.loReq(action, data || {}, rid); return rid; }
    }catch(e){}
    try{
      if(window.mdtBridge && window.mdtBridge.request){ window.mdtBridge.request(action, JSON.stringify(data || {}), rid); return rid; }
    }catch(e){}
    console.log('MDT>>' + JSON.stringify({ action: action, reqId: rid, data: data || {} }));
    return rid;
  }
  function setDropzoneState(state){
    const drop = document.getElementById('photo-folder-dropzone');
    if(!drop) return;
    drop.classList.remove('ready','active','success','error');
    if(state) drop.classList.add(state);
  }
  function folderMeta(folder){
    if(!folder) return 'Sélectionnez un dossier pour voir ou ajouter des photos.';
    return (folder.created_at_human || folder.created_at || 'Date inconnue') + ' - Créé par ' + (folder.createur_display || folder.createur_name || folder.createur_sid || 'Inconnu');
  }
  function getFolderLabel(folder){
    return folder ? String(folder.nom || folder.label || folder.ref || 'Dossier photo') : 'Dossier photo';
  }
  function getFolderRef(folder){
    return String(folder && (folder.ref || folder.folder_ref) || '');
  }
  function getFolderId(folder){
    return Number(folder && folder.id || 0) || 0;
  }

  function hidePhotoFolderDropdowns(){
    document.querySelectorAll('[id^="photo-folder-dd-"]').forEach(function(dd){ dd.style.display = 'none'; });
  }
  function syncPhotoFolderCreateButton(){
    const btn = document.getElementById('photo-folder-create-btn');
    const modal = document.getElementById('photo-folder-modal');
    if(!btn) return;
    const modalOpen = !!(modal && modal.style.display !== 'none' && modal.getAttribute('aria-hidden') !== 'true');
    btn.style.display = modalOpen ? 'none' : '';
  }
  function getUploadCount(){
    return Object.keys(PHOTO_UPLOADS).length;
  }
  function makeDataSig(dataUrl){
    const raw = String(dataUrl || '');
    if(!raw) return '';
    return String(raw.length) + ':' + raw.slice(0, 48) + ':' + raw.slice(-48);
  }
  function hasPhotoSig(sig){
    if(!sig) return false;
    return (S.photos || []).some(function(photo){ return String(photo && photo.__sig || '') === String(sig); });
  }
  function releaseUploadLock(){
    S.uploadBusy = false;
    if(getUploadCount() <= 0) setTimeout(function(){ setDropzoneState('ready'); }, 60);
  }
  function clearPendingUpload(reqId){
    const pending = PHOTO_UPLOADS[reqId];
    if(!pending) return null;
    if(pending.timeoutId) try{ clearTimeout(pending.timeoutId); }catch(e){}
    delete PHOTO_UPLOADS[reqId];
    releaseUploadLock();
    return pending;
  }
  function registerPendingUpload(reqId, pending){
    const entry = Object.assign({}, pending || {});
    entry.timeoutId = setTimeout(function(){
      const stale = clearPendingUpload(reqId);
      if(!stale) return;
      markUploadCard(stale.tempId, 'error');
      if(typeof window.showToast === 'function') window.showToast('⚠️ Upload photo interrompu', 'L’envoi a expiré. Réessayez.', true);
    }, 20000);
    PHOTO_UPLOADS[reqId] = entry;
    return entry;
  }
  function buildPasteSignature(files){
    const list = Array.isArray(files) ? files : [];
    return list.map(function(file){
      return [file && file.name || 'clipboard', file && file.type || '', file && file.size || 0].join(':');
    }).join('|');
  }
  function isDuplicatePaste(sig){
    const now = Date.now();
    if(!sig) return false;
    if(S.lastPasteSig === sig && (now - S.lastPasteAt) < 800) return true;
    S.lastPasteSig = sig;
    S.lastPasteAt = now;
    return false;
  }

  function showListView(){
    S.mode = 'list';
    const list = document.getElementById('photo-folders-view');
    const detail = document.getElementById('photo-folder-detail-view');
    const title = document.getElementById('photo-folder-title');
    const meta = document.getElementById('photo-folder-meta');
    const back = document.getElementById('photo-folder-back-btn');
    if(list) list.style.display = '';
    if(detail) detail.style.display = 'none';
    if(title) title.textContent = 'Dossiers photos';
    if(meta) meta.textContent = 'Tous les dossiers photos centralisés. Ouvrez un dossier pour consulter ou ajouter des photos.';
    if(back) back.style.display = (S.prevPage && S.prevPage !== 'dossier-photos') ? '' : 'none';
    syncPhotoFolderCreateButton();
  }

  function showDetailView(){
    S.mode = 'detail';
    const list = document.getElementById('photo-folders-view');
    const detail = document.getElementById('photo-folder-detail-view');
    const title = document.getElementById('photo-folder-title');
    const meta = document.getElementById('photo-folder-meta');
    const detailTitle = document.getElementById('photo-folder-detail-title');
    const detailSub = document.getElementById('photo-folder-detail-sub');
    const back = document.getElementById('photo-folder-back-btn');
    if(list) list.style.display = 'none';
    if(detail) detail.style.display = '';
    if(title) title.textContent = getFolderLabel(S.folder);
    if(meta) meta.textContent = folderMeta(S.folder);
    if(detailTitle) detailTitle.textContent = getFolderLabel(S.folder);
    if(detailSub) detailSub.textContent = folderMeta(S.folder);
    if(back) back.style.display = (S.prevPage && S.prevPage !== 'dossier-photos') ? '' : 'none';
    syncPhotoFolderCreateButton();
    setDropzoneState('ready');
    setTimeout(function(){ const drop = document.getElementById('photo-folder-dropzone'); if(drop) try{ drop.focus(); }catch(e){} }, 30);
  }

  function renderFolderCards(){
    const host = document.getElementById('photo-folder-grid');
    if(!host) return;
    if(!S.folders.length){
      host.innerHTML = '<div class="photo-folder-empty">Aucun dossier photo pour le moment. Cliquez sur <strong>Créer un dossier photo</strong>.</div>';
      return;
    }
    host.innerHTML = S.folders.map(function(folder){
      const id = getFolderId(folder);
      const ref = getFolderRef(folder);
      return ''
        + '<div class="photo-folder-card" data-folder-id="' + id + '" data-folder-ref="' + escAttrSafe(ref) + '" data-folder-nom="' + escAttrSafe(getFolderLabel(folder)) + '" style="cursor:pointer">'
        +   '<div class="photo-folder-card-head">'
        +     '<div class="photo-folder-card-title">' + escSafe(getFolderLabel(folder)) + '</div>'
        +     '<div class="photo-folder-card-actions">'
        +       '<button class="plaints-more" type="button" data-toggle-dd="' + id + '" onclick="window.togglePhotoFolderDropdown(event,' + id + ')">⋯</button>'
        +       '<div class="plaints-dropdown" id="photo-folder-dd-' + id + '" style="display:none">'
        +         '<button class="plaints-dd-item" type="button" data-folder-action="edit" data-folder-id="' + id + '" onclick="return window.handlePhotoFolderAction(event,\'edit\',' + id + ')"><span>✏️</span><span>Modifier</span></button>'
        +         '<button class="plaints-dd-item danger" type="button" data-folder-action="delete" data-folder-id="' + id + '" onclick="return window.handlePhotoFolderAction(event,\'delete\',' + id + ')"><span>🗑️</span><span>Supprimer</span></button>'
        +       '</div>'
        +     '</div>'
        +   '</div>'
        +   '<div class="photo-folder-card-meta">' + escSafe(folderMeta(folder)) + '</div>'
        +   '<div class="photo-folder-card-visual">'
        +     '<div class="photo-folder-card-icon">📁</div>'
        +     '<div class="photo-folder-card-visual-text">Cliquez pour ouvrir le dossier et voir les photos</div>'
        +   '</div>'
        +   '<div class="photo-folder-card-count">' + escSafe(String(folder.photo_count || 0)) + ' photo(s)</div>'
        + '</div>';
    }).join('');
  }

  function renderDetailPhotos(){
    const host = document.getElementById('photo-folder-gallery');
    if(!host) return;
    if(!S.folder){
      host.innerHTML = '<div class="photo-folder-empty">Aucun dossier ouvert.</div>';
      return;
    }
    if(!S.photos.length){
      host.innerHTML = '<div class="photo-folder-empty">Aucune photo enregistrée dans ce dossier. Collez une image avec CTRL + V dans la zone grisée ci-dessus.</div>';
      return;
    }
    host.innerHTML = S.photos.map(function(photo){
      const photoId = Number(photo && photo.id || 0) || 0;
      const cardKey = photo.__temp_id || photo.id || '';
      const deleteBtn = photoId > 0
        ? '<button class="photo-thumb-delete" type="button" title="Supprimer cette photo" data-photo-delete="' + photoId + '">×</button>'
        : '';
      return ''
        + '<div class="photo-thumb" data-photo-card="' + escAttrSafe(cardKey) + '">'
        +   '<img src="' + escAttrSafe(photo.image_data || '') + '" alt="Photo preuve" />'
        +   deleteBtn
        + '</div>';
    }).join('');
  }

  function refreshPage(){
    if(S.mode === 'detail') showDetailView(); else showListView();
    renderFolderCards();
    renderDetailPhotos();
    bindFolderCardDelegation(); // ensure delegation is active after any page rebuild
  }

  function requestFolderList(force){
    if(S.listLoading) return;
    if(S.listLoaded && !force) return;
    S.listLoading = true;
    sendRequest('get_dossiers_photos_list', {}, 'req_photo_folder_list_' + Date.now());
  }

  function updateFolderList(list){
    S.listLoading = false;
    S.listLoaded = true;
    S.folders = Array.isArray(list) ? list.slice() : [];
    if(S.folder){
      const current = S.folders.find(function(row){ return String(row.id || 0) === String(getFolderId(S.folder)) || getFolderRef(row) === getFolderRef(S.folder); });
      if(current) S.folder = current;
    }
    refreshPage();
  }

  function requestFolderPayload(opts){
    const options = opts || {};
    const ref = String(options.dossier_ref || options.ref || (options.folder && getFolderRef(options.folder)) || '').trim();
    const dossierId = Number(options.dossier_id || (options.folder && getFolderId(options.folder)) || 0) || 0;
    if(!ref && dossierId <= 0){
      S.folder = null;
      S.photos = [];
      showListView();
      renderDetailPhotos();
      return;
    }
    S.folder = options.folder || {
      id: dossierId,
      ref: ref,
      nom: String(options.nom || options.label || ref || 'Dossier photo'),
      created_at_human: 'Chargement du dossier…',
      createur_display: '—'
    };
    S.photos = [];
    showDetailView();
    renderDetailPhotos();
    const createIfMissing = options.create_if_missing === false ? false : true;

    if(window.mdtBridge && typeof window.mdtBridge.requestPhotoFolder === 'function'){
      window.mdtBridge.requestPhotoFolder('page', dossierId, ref, createIfMissing, 0);
      return;
    }
    sendRequest('get_dossier_photos', {
      dossier_id: dossierId,
      dossier_ref: ref,
      dossier_nom: String(options.nom || options.label || ref || '').trim(),
      create_if_missing: createIfMissing
    }, 'req_photo_page_' + Date.now());
  }

  function addOptimisticPhoto(dataUrl){
    const tempId = 'tmp_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    S.photos.unshift({ __temp_id: tempId, image_data: dataUrl, pending: true });
    renderDetailPhotos();
    const card = document.querySelector('[data-photo-card="' + tempId + '"]');
    if(card) card.classList.add('pending');
    return tempId;
  }

  function markUploadCard(tempId, state, realPhoto){
    const idx = S.photos.findIndex(function(row){ return String(row.__temp_id || '') === String(tempId || ''); });
    if(idx === -1) return;
    if(state === 'error'){
      S.photos[idx].error = true;
      renderDetailPhotos();
      const card = document.querySelector('[data-photo-card="' + tempId + '"]');
      if(card) card.classList.add('error');
      return;
    }
    S.photos[idx] = Object.assign({}, realPhoto || {}, { image_data: (realPhoto && realPhoto.image_data) || S.photos[idx].image_data, __sig: (realPhoto && realPhoto.__sig) || S.photos[idx].__sig || makeDataSig((realPhoto && realPhoto.image_data) || S.photos[idx].image_data || '') });
    renderDetailPhotos();
  }

  function extractImageItems(ev){
    const clipboard = ev && ev.clipboardData ? ev.clipboardData : null;
    const out = [];
    if(clipboard && clipboard.items){
      Array.from(clipboard.items).forEach(function(item){
        if(item && item.type && item.type.indexOf('image/') === 0){
          const file = item.getAsFile ? item.getAsFile() : null;
          if(file) out.push(file);
        }
      });
    }
    if(!out.length && clipboard && clipboard.files){
      Array.from(clipboard.files).forEach(function(file){ if(file && file.type && file.type.indexOf('image/') === 0) out.push(file); });
    }
    return out;
  }
  function extractDroppedFiles(ev){
    const dt = ev && ev.dataTransfer ? ev.dataTransfer : null;
    if(!dt || !dt.files) return [];
    return Array.from(dt.files).filter(function(file){ return file && file.type && file.type.indexOf('image/') === 0; });
  }
  function readFileAsDataURL(file){
    return new Promise(function(resolve, reject){ const reader = new FileReader(); reader.onload = function(){ resolve(reader.result); }; reader.onerror = reject; reader.readAsDataURL(file); });
  }
  function optimizeImageDataUrl(dataUrl){
    return new Promise(function(resolve){
      try{
        const img = new Image();
        img.onload = function(){
          try{
            let baseW = img.width || 0;
            let baseH = img.height || 0;
            if(!baseW || !baseH){ resolve(dataUrl); return; }

            const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(baseW, baseH));
            baseW = Math.max(1, Math.round(baseW * ratio));
            baseH = Math.max(1, Math.round(baseH * ratio));

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if(!ctx){ resolve(dataUrl); return; }

            let currentW = baseW;
            let currentH = baseH;
            let quality = 0.62;
            let out = dataUrl;
            let attempts = 0;

            while(attempts < 14){
              attempts += 1;
              canvas.width = currentW;
              canvas.height = currentH;
              ctx.clearRect(0, 0, currentW, currentH);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, currentW, currentH);
              ctx.drawImage(img, 0, 0, currentW, currentH);
              out = canvas.toDataURL('image/jpeg', quality) || out;

              if(out.length <= MAX_DATA_URL_LENGTH) break;

              if(quality > 0.28){
                quality = Math.max(0.28, quality - 0.08);
                continue;
              }

              const biggestSide = Math.max(currentW, currentH);
              if(biggestSide <= MIN_IMAGE_DIMENSION) break;

              const shrink = biggestSide > 700 ? 0.80 : 0.88;
              currentW = Math.max(MIN_IMAGE_DIMENSION, Math.round(currentW * shrink));
              currentH = Math.max(MIN_IMAGE_DIMENSION, Math.round(currentH * shrink));
              quality = Math.min(quality, 0.34);
            }

            resolve(out);
          }catch(e){ resolve(dataUrl); }
        };
        img.onerror = function(){ resolve(dataUrl); };
        img.src = dataUrl;
      }catch(e){ resolve(dataUrl); }
    });
  }
  async function fileToOptimizedDataURL(file){ return optimizeImageDataUrl(await readFileAsDataURL(file)); }

  function uploadPhotoData(dataUrl){
    if(!S.folder){
      if(typeof window.showToast === 'function') window.showToast('⚠️ Aucun dossier sélectionné', 'Ouvrez d’abord un dossier photo.', true);
      setDropzoneState('error');
      setTimeout(function(){ setDropzoneState('ready'); }, 1200);
      return;
    }
    if(!dataUrl || dataUrl.length > MAX_DATA_URL_LENGTH){
      if(typeof window.showToast === 'function') window.showToast('⚠️ Image trop lourde', 'Réessayez avec une image plus légère.', true);
      setDropzoneState('error');
      setTimeout(function(){ setDropzoneState('ready'); }, 1400);
      return;
    }
    const sig = makeDataSig(dataUrl);
    // Only block if this image is already in the CURRENT open folder
    if(hasPhotoSig(sig)){
      if(typeof window.showToast === 'function') window.showToast('⚠️ Image déjà présente', 'Cette image est déjà dans ce dossier.', true);
      setDropzoneState('error');
      setTimeout(function(){ setDropzoneState('ready'); }, 1200);
      return;
    }
    const now = Date.now();
    if(S.uploadBusy || getUploadCount() > 0){
      if(typeof window.showToast === 'function') window.showToast('⚠️ Upload déjà en cours', 'Attendez la fin de l’envoi actuel avant d’ajouter l’image suivante.', true);
      return;
    }
    if((now - S.lastUploadAt) < UPLOAD_COOLDOWN_MS){
      const left = Math.max(1, Math.ceil((UPLOAD_COOLDOWN_MS - (now - S.lastUploadAt)) / 1000));
      if(typeof window.showToast === 'function') window.showToast('⚠️ Patientez un instant', 'Ajoutez la photo suivante dans ' + left + ' seconde(s).', true);
      return;
    }
    S.uploadBusy = true;
    S.lastUploadAt = now;
    const tempId = addOptimisticPhoto(dataUrl);
    const folder = S.folder;
    if(window.mdtBridge && typeof window.mdtBridge.uploadPhotoChunk === 'function' && dataUrl.length > 32000){
      const uploadId = 'upload_photo_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      registerPendingUpload(uploadId, { tempId: tempId, sig: sig });
      const chunkSize = 20000;
      const total = Math.max(1, Math.ceil(dataUrl.length / chunkSize));
      for(let index = 0; index < total; index += 1){
        const chunk = dataUrl.slice(index * chunkSize, (index + 1) * chunkSize);
        window.mdtBridge.uploadPhotoChunk(uploadId, getFolderId(folder), getFolderRef(folder), getFolderLabel(folder), index + 1, total, chunk);
      }
      return;
    }
    const reqId = 'req_photo_add_' + Date.now();
    registerPendingUpload(reqId, { tempId: tempId, sig: sig });
    sendRequest('ajouter_photo', {
      dossier_id: getFolderId(folder),
      dossier_ref: getFolderRef(folder),
      dossier_nom: getFolderLabel(folder),
      image: dataUrl
    }, reqId);
  }

  async function processIncomingFiles(files, source){
    if(!files || !files.length) return;
    if(!S.folder){
      if(typeof window.showToast === 'function') window.showToast('⚠️ Aucun dossier sélectionné', 'Ouvrez un dossier avant d’ajouter des photos.', true);
      return;
    }
    if(S.uploadBusy || getUploadCount() > 0){
      if(typeof window.showToast === 'function') window.showToast('⚠️ Upload déjà en cours', 'Laissez finir l’envoi actuel avant de coller la photo suivante.', true);
      return;
    }
    const file = files[0];
    if(!file) return;
    if(files.length > 1 && typeof window.showToast === 'function'){
      window.showToast('ℹ️ Une image à la fois', 'Le MDT n’accepte qu’une image par envoi pour éviter les doublons.', false);
    }
    setDropzoneState('active');
    try{
      const dataUrl = await fileToOptimizedDataURL(file);
      uploadPhotoData(dataUrl);
      setDropzoneState('success');
    }catch(e){
      setDropzoneState('error');
      if(typeof window.showToast === 'function') window.showToast('⚠️ Image refusée', 'Impossible de lire l’image.', true);
    }
    setTimeout(function(){ setDropzoneState('ready'); }, 1200);
  }

  async function handlePaste(ev){
    if(window.currentPage !== 'dossier-photos' || S.mode !== 'detail') return;
    const files = extractImageItems(ev);
    if(!files.length) return;
    const signature = buildPasteSignature(files);
    if(isDuplicatePaste(signature)){
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    await processIncomingFiles([files[0]], 'paste');
  }
  async function handleDrop(ev){
    if(window.currentPage !== 'dossier-photos' || S.mode !== 'detail') return;
    const files = extractDroppedFiles(ev);
    if(!files.length) return;
    ev.preventDefault();
    await processIncomingFiles([files[0]], 'drop');
  }

  function bindFolderCardDelegation(){
    const grid = document.getElementById('photo-folder-grid');
    if(!grid || grid.__mdtCardDelegated) return;
    grid.__mdtCardDelegated = true;

    grid.addEventListener('click', function(ev){
      if(!ev.target || !ev.target.closest) return;
      if(ev.target.closest('[data-toggle-dd][onclick], [data-folder-action][onclick]')) return;

      // ── Toggle dropdown (⋯ button) ────────────────────────────
      const toggleBtn = ev.target.closest('[data-toggle-dd]');
      if(toggleBtn){
        ev.preventDefault();
        ev.stopPropagation();
        const ddId = toggleBtn.getAttribute('data-toggle-dd');
        document.querySelectorAll('[id^="photo-folder-dd-"]').forEach(function(dd){
          if(dd.id !== 'photo-folder-dd-' + ddId) dd.style.display = 'none';
        });
        const dd = document.getElementById('photo-folder-dd-' + ddId);
        if(dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
        return;
      }

      // ── Dropdown action buttons ────────────────────────────────
      const actionBtn = ev.target.closest('[data-folder-action]');
      if(actionBtn){
        ev.preventDefault();
        ev.stopPropagation();
        document.querySelectorAll('[id^="photo-folder-dd-"]').forEach(function(dd){ dd.style.display = 'none'; });
        const action   = actionBtn.getAttribute('data-folder-action');
        const folderId = Number(actionBtn.getAttribute('data-folder-id') || 0) || 0;
        const folder   = S.folders.find(function(row){ return Number(row.id || 0) === folderId; }) || null;
        if(!folder) return;
        if(action === 'open' || action === 'assign'){
          window.openPhotoFolderPage({ dossier_id: Number(folder.id||0), dossier_ref: String(folder.ref||folder.folder_ref||''), nom: String(folder.nom||folder.label||'Dossier photo'), create_if_missing: false, returnPage: 'dossier-photos' });
        }else if(action === 'edit'){
          window.openPhotoFolderForm(folderId);
        }else if(action === 'delete'){
          window.deletePhotoFolder(folderId);
        }
        return;
      }

      // ── Card body click → open folder ─────────────────────────
      // Ignore if click was inside the actions zone
      if(ev.target.closest('.photo-folder-card-actions')) return;
      const card = ev.target.closest('[data-folder-id]');
      if(!card) return;
      ev.preventDefault();
      ev.stopPropagation();
      const folderId  = Number(card.getAttribute('data-folder-id')  || 0) || 0;
      const folderRef = String(card.getAttribute('data-folder-ref') || '');
      const folderNom = String(card.getAttribute('data-folder-nom') || folderRef || 'Dossier photo');
      window.openPhotoFolderPage({
        dossier_id: folderId,
        dossier_ref: folderRef,
        nom: folderNom,
        create_if_missing: false,
        returnPage: 'dossier-photos'
      });
    }, true);
  }

  function bindUi(){
    bindFolderCardDelegation();
    const drop = document.getElementById('photo-folder-dropzone');
    const fileInput = document.getElementById('photo-folder-file-input');
    if(drop && !drop.__mdtBound){
      drop.__mdtBound = true;
      drop.addEventListener('click', function(){ try{ if(fileInput) fileInput.click(); }catch(e){} });
      drop.addEventListener('dragover', function(ev){ if(window.currentPage !== 'dossier-photos' || S.mode !== 'detail') return; ev.preventDefault(); setDropzoneState('active'); });
      drop.addEventListener('dragleave', function(){ if(window.currentPage !== 'dossier-photos' || S.mode !== 'detail') return; setDropzoneState('ready'); });
      drop.addEventListener('drop', handleDrop);
    }
    if(fileInput && !fileInput.__mdtBound){
      fileInput.__mdtBound = true;
      fileInput.addEventListener('change', async function(){ const files = Array.from(fileInput.files || []); if(files.length) await processIncomingFiles([files[0]], 'file'); fileInput.value = ''; });
    }
    const gallery = document.getElementById('photo-folder-gallery');
    if(gallery && !gallery.__mdtDeleteDelegated){
      gallery.__mdtDeleteDelegated = true;
      gallery.addEventListener('click', function(ev){
        if(!ev.target || !ev.target.closest) return;
        const deleteBtn = ev.target.closest('[data-photo-delete]');
        if(!deleteBtn) return;
        ev.preventDefault();
        ev.stopPropagation();
        const photoId = Number(deleteBtn.getAttribute('data-photo-delete') || 0) || 0;
        if(photoId > 0) window.deletePhotoInFolder(ev, photoId);
      }, true);
    }
  }

  function renderPreviewContainer(containerId, payload, folderRef, folderLabel){
    const host = document.getElementById(containerId);
    if(!host) return;
    if(String(host.getAttribute('data-folder-ref') || '') !== String(folderRef || '')) return;
    const photos = Array.isArray(payload.photos) ? payload.photos : [];
    if(!folderRef){ host.innerHTML = '<div class="report-photo-empty">Aucun dossier photo lié.</div>'; return; }
    if(!photos.length){ host.innerHTML = '<div class="report-photo-empty">Aucune preuve photographique dans le dossier ' + escSafe(folderLabel || folderRef || 'lié') + '.</div>'; return; }
    host.innerHTML = '<div class="report-photo-grid">' + photos.map(function(photo){ return '<div class="report-photo-thumb"><img src="' + escAttrSafe(photo.image_data || '') + '" alt="Preuve photo" /></div>'; }).join('') + '</div>';
  }
  function updatePreviewError(containerId, folderRef, err, folderLabel){
    const host = document.getElementById(containerId); if(!host) return;
    if(String(host.getAttribute('data-folder-ref') || '') !== String(folderRef || '')) return;
    host.innerHTML = '<div class="report-photo-empty">Impossible de charger les preuves photographiques' + (folderLabel || folderRef ? ' pour ' + escSafe(folderLabel || folderRef) : '') + (err ? ' (' + escSafe(err) + ')' : '') + '.</div>';
  }

  window.openPhotoFolderForm = function(folderId){
    const modal = document.getElementById('photo-folder-modal');
    const input = document.getElementById('photo-folder-name');
    const title = document.getElementById('photo-folder-modal-title');
    const sub = document.getElementById('photo-folder-modal-sub');
    const save = document.getElementById('photo-folder-save-btn');
    let folder = null;
    if(folderId){ folder = S.folders.find(function(row){ return Number(row.id || 0) === Number(folderId || 0); }) || null; }
    S.editingFolder = folder;
    if(title) title.textContent = folder ? 'Modifier le dossier photo' : 'Créer un dossier photo';
    if(sub) sub.textContent = folder ? 'Modifiez le nom du dossier.' : 'Donnez un nom clair au dossier pour pouvoir le retrouver ensuite.';
    if(save) save.textContent = folder ? 'Enregistrer les modifications' : 'Créer le dossier';
    if(input) input.value = folder ? getFolderLabel(folder) : '';
    if(modal){ modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); }
    syncPhotoFolderCreateButton();
    hidePhotoFolderDropdowns();
    setTimeout(function(){ if(input) try{ input.focus(); input.select(); }catch(e){} }, 30);
  };
  window.closePhotoFolderForm = function(){
    const modal = document.getElementById('photo-folder-modal');
    if(modal){ modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
    S.editingFolder = null;
    S.saveLoading = false;
    const save = document.getElementById('photo-folder-save-btn');
    if(save){ save.disabled = false; }
    syncPhotoFolderCreateButton();
  };
  window.submitPhotoFolderForm = function(){
    if(S.saveLoading) return;
    const input = document.getElementById('photo-folder-name');
    const name = String(input && input.value || '').trim();
    if(!name){
      if(typeof window.showToast === 'function') window.showToast('⚠️ Nom requis', 'Donnez un nom au dossier photo.', true);
      if(input) input.focus();
      return;
    }
    S.saveLoading = true;
    const save = document.getElementById('photo-folder-save-btn');
    if(save) save.disabled = true;
    if(S.editingFolder){
      sendRequest('update_dossier_photos', { dossier_id: getFolderId(S.editingFolder), nom: name }, 'req_photo_folder_update_' + Date.now());
    }else{
      sendRequest('creer_dossier_photos', { nom: name }, 'req_photo_folder_create_' + Date.now());
    }
  };
  window.editPhotoFolder = function(folderId){ window.openPhotoFolderForm(folderId); };
  window.deletePhotoFolder = function(folderId){
    const folder = S.folders.find(function(row){ return Number(row.id || 0) === Number(folderId || 0); }) || null;
    if(!folder) return false;
    hidePhotoFolderDropdowns();
    sendRequest('delete_dossier_photos', { dossier_id: getFolderId(folder) }, 'req_photo_folder_delete_' + Date.now());
    return false;
  };

  window.deletePhotoInFolder = function(ev, photoId){
    if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){} }
    const id = Number(photoId || 0) || 0;
    if(!S.folder || id <= 0) return false;
    if(S.deletingPhotoId === id) return false;
    S.deletingPhotoId = id;
    sendRequest('delete_photo_dossier', {
      dossier_id: getFolderId(S.folder),
      dossier_ref: getFolderRef(S.folder),
      photo_id: id
    }, 'req_photo_delete_' + Date.now());
    return false;
  };

  window.togglePhotoFolderDropdown = function(ev, id){
    // Now handled by delegated listener — keep as safety fallback
    if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){} }
    document.querySelectorAll('[id^="photo-folder-dd-"]').forEach(function(dd){ if(dd.id !== 'photo-folder-dd-' + id) dd.style.display = 'none'; });
    const dd = document.getElementById('photo-folder-dd-' + id);
    if(dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
  };
  window.handlePhotoFolderAction = function(ev, action, folderId){
    if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){} }
    hidePhotoFolderDropdowns();
    const folder = S.folders.find(function(row){ return Number(row.id || 0) === Number(folderId || 0); }) || null;
    if(!folder) return false;
    if(action === 'open' || action === 'assign'){
      window.openPhotoFolderPage({ dossier_id:getFolderId(folder), dossier_ref:getFolderRef(folder), nom:getFolderLabel(folder), create_if_missing:false, returnPage:'dossier-photos' });
      return false;
    }
    if(action === 'edit'){
      window.openPhotoFolderForm(folderId);
      return false;
    }
    if(action === 'delete'){
      window.deletePhotoFolder(folderId);
      return false;
    }
    return false;
  };

  window.openPhotoFolderPage = function(folderRefOrOptions, maybeOptions){
    let options = {};
    if(folderRefOrOptions && typeof folderRefOrOptions === 'object' && !Array.isArray(folderRefOrOptions)) options = Object.assign({}, folderRefOrOptions);
    else options = Object.assign({}, maybeOptions || {}, { dossier_ref: String(folderRefOrOptions || '') });
    const prev = options.returnPage || (window.currentPage === 'dossier-photos' ? (S.prevPage || 'operations') : (window.currentPage || 'operations'));
    S.prevPage = prev;
    if(typeof window.setPage === 'function') window.setPage('dossier-photos');
    bindUi();
    syncPhotoFolderCreateButton();
    requestFolderList(true);
    if(options.dossier_ref || options.ref || options.dossier_id || options.folder) requestFolderPayload(options);
    else { S.folder = null; S.photos = []; showListView(); renderDetailPhotos(); }
  };
  window.backToPhotoFolders = function(){ S.folder = null; S.photos = []; showListView(); renderDetailPhotos(); syncPhotoFolderCreateButton(); requestFolderList(true); };
  window.closePhotoFolderPage = function(){
    if(S.mode === 'detail' && S.prevPage === 'dossier-photos'){ window.backToPhotoFolders(); return; }
    if(typeof window.setPage === 'function') window.setPage(S.prevPage || 'operations');
    const prevItem = document.querySelector('.acc-item[data-page="' + String(S.prevPage || '') + '"]');
    if(prevItem && typeof window.setAccItem === 'function') window.setAccItem(prevItem);
  };
  window.openPhotoFolderFromButton = function(btn, returnPage){
    if(!btn) return;
    window.openPhotoFolderPage({ dossier_ref: btn.getAttribute('data-dossier-ref') || '', nom: btn.getAttribute('data-dossier-name') || '', returnPage: returnPage || 'operations' });
  };
  window.loadEvidencePreview = function(containerId, folderRef, folderLabel, options){
    const host = document.getElementById(containerId); if(!host) return;
    const ref = String(folderRef || folderLabel || '').trim();
    host.setAttribute('data-folder-ref', ref);
    if(!ref){ renderPreviewContainer(containerId, { photos: [] }, '', folderLabel || ''); return; }
    host.innerHTML = '<div class="report-photo-empty">Chargement des preuves photographiques…</div>';
    const reqId = 'req_photo_preview_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    PHOTO_PREVIEW_REQUESTS[reqId] = { containerId: containerId, folderRef: ref, folderLabel: folderLabel || ref };
    const limit = Number((options && options.limit) || 6) || 6;
    if(window.mdtBridge && typeof window.mdtBridge.requestPhotoFolder === 'function'){ window.mdtBridge.requestPhotoFolder(reqId, 0, ref, false, limit); return; }
    sendRequest('get_dossier_photos', { dossier_ref: ref, dossier_nom: String(folderLabel || ref || '').trim(), limit: limit, create_if_missing: false }, reqId);
  };

  window.__mdt_photo_folder = function(contextKey, ok, json, err){
    const data = parsePayload(json);
    if(contextKey === 'page'){
      if(ok){ S.folder = data.folder || S.folder; S.photos = Array.isArray(data.photos) ? data.photos : []; showDetailView(); renderDetailPhotos(); requestFolderList(true); }
      else {
        S.photos = [];
        renderDetailPhotos();
        if(typeof window.showToast === 'function') window.showToast('⚠️ Dossier photo indisponible', err || data.message || 'Chargement impossible', true);
      }
      return;
    }
    const preview = PHOTO_PREVIEW_REQUESTS[contextKey];
    if(preview){
      if(ok) renderPreviewContainer(preview.containerId, data || {}, preview.folderRef, preview.folderLabel);
      else updatePreviewError(preview.containerId, preview.folderRef, err || data.message || '', preview.folderLabel);
      delete PHOTO_PREVIEW_REQUESTS[contextKey];
    }
  };
  window.__mdt_photo_upload_ack = function(uploadId, ok, json, err){
    const data = parsePayload(json);
    const pending = clearPendingUpload(uploadId);
    if(!pending) return;
    if(ok){
      if(data.folder) S.folder = data.folder;
      if(data.photo) markUploadCard(pending.tempId, 'ok', data.photo); else markUploadCard(pending.tempId, 'ok');
      requestFolderList(true);
    }else{
      markUploadCard(pending.tempId, 'error');
      if(typeof window.showToast === 'function') window.showToast('⚠️ Upload photo impossible', err || data.message || 'Échec de l\'enregistrement.', true);
    }
  };

  if(typeof window.__mdt_addPageHook === 'function'){
    window.__mdt_addPageHook(function(name){
      if(name === 'dossier-photos'){
        bindUi();
        if(S.mode !== 'detail') showListView();
        requestFolderList(true);
        refreshPage();
      }
    });
  }
  if(typeof window.__mdt_addResponseHook === 'function'){
    window.__mdt_addResponseHook(function(reqId, ok, json, err, data){
      if(reqId && reqId.indexOf('req_photo_page_') === 0){
        if(ok){ S.folder = data.folder || S.folder; S.photos = Array.isArray(data.photos) ? data.photos : []; showDetailView(); renderDetailPhotos(); requestFolderList(true); }
        else if(typeof window.showToast === 'function') window.showToast('⚠️ Dossier photo indisponible', err || data.message || 'Chargement impossible', true);
        return true;
      }
      if(reqId && reqId.indexOf('req_photo_preview_') === 0){
        const preview = PHOTO_PREVIEW_REQUESTS[reqId];
        if(preview){ if(ok) renderPreviewContainer(preview.containerId, data || {}, preview.folderRef, preview.folderLabel); else updatePreviewError(preview.containerId, preview.folderRef, err || data.message || '', preview.folderLabel); delete PHOTO_PREVIEW_REQUESTS[reqId]; }
        return true;
      }
      if(reqId && reqId.indexOf('req_photo_add_') === 0){
        const pending = clearPendingUpload(reqId);
        if(pending){
          if(ok){ if(data.folder) S.folder = data.folder; if(data.photo) markUploadCard(pending.tempId, 'ok', data.photo); else markUploadCard(pending.tempId, 'ok'); requestFolderList(true); }
          else { markUploadCard(pending.tempId, 'error'); if(typeof window.showToast === 'function') window.showToast('⚠️ Upload photo impossible', err || data.message || 'Échec de l\'enregistrement.', true); }
        }
        return true;
      }
      if(reqId && reqId.indexOf('req_photo_folder_list_') === 0){ if(ok) updateFolderList((data && data.folders) || []); else { S.listLoading = false; if(typeof window.showToast === 'function') window.showToast('⚠️ Dossiers photo indisponibles', err || data.message || 'Chargement impossible', true); } return true; }
      if(reqId && reqId.indexOf('req_photo_folder_create_') === 0){ S.saveLoading = false; if(ok){ window.closePhotoFolderForm(); requestFolderList(true); const folder = data && data.folder ? data.folder : null; if(folder){ S.folder = folder; S.photos = Array.isArray(data.photos) ? data.photos : []; showDetailView(); renderDetailPhotos(); } if(typeof window.showToast === 'function') window.showToast('✅ Dossier photo créé', (data.folder && getFolderLabel(data.folder)) || 'Le dossier est prêt.', false); } else { const save = document.getElementById('photo-folder-save-btn'); if(save) save.disabled = false; if(typeof window.showToast === 'function') window.showToast('⚠️ Création impossible', err || data.message || 'Le dossier photo n\'a pas pu être créé.', true); } return true; }
      if(reqId && reqId.indexOf('req_photo_folder_update_') === 0){ S.saveLoading = false; const save = document.getElementById('photo-folder-save-btn'); if(save) save.disabled = false; if(ok){ window.closePhotoFolderForm(); if(data.folder){ S.folder = (S.folder && getFolderId(S.folder) === getFolderId(data.folder)) ? data.folder : S.folder; } requestFolderList(true); refreshPage(); if(typeof window.showToast === 'function') window.showToast('✅ Dossier photo modifié', getFolderLabel(data.folder), false); } else { syncPhotoFolderCreateButton(); if(typeof window.showToast === 'function') window.showToast('⚠️ Modification impossible', err || data.message || 'La modification a échoué.', true); } return true; }
      if(reqId && reqId.indexOf('req_photo_folder_delete_') === 0){ if(ok){ const deletedId = Number(data && data.deleted_id || 0) || 0; if(S.folder && getFolderId(S.folder) === deletedId){ S.folder = null; S.photos = []; showListView(); renderDetailPhotos(); } requestFolderList(true); syncPhotoFolderCreateButton(); if(typeof window.showToast === 'function') window.showToast('✅ Dossier photo supprimé', 'Le dossier a été retiré.', false); } else if(typeof window.showToast === 'function') window.showToast('⚠️ Suppression impossible', err || data.message || 'La suppression a échoué.', true); return true; }
      if(reqId && reqId.indexOf('req_photo_delete_') === 0){ const pendingId = S.deletingPhotoId; S.deletingPhotoId = 0; if(ok){ const deletedPhotoId = Number(data && data.deleted_photo_id || pendingId || 0) || 0; if(deletedPhotoId > 0){ S.photos = S.photos.filter(function(photo){ return Number(photo && photo.id || 0) !== deletedPhotoId; }); renderDetailPhotos(); } requestFolderList(true); if(typeof window.showToast === 'function') window.showToast('✅ Photo supprimée', 'La preuve photographique a été retirée.', false); } else if(typeof window.showToast === 'function') window.showToast('⚠️ Suppression photo impossible', err || data.message || 'La photo n\'a pas pu être supprimée.', true); return true; }
      return false;
    });
  }

  if(!document.__mdtPhotoPasteBound){
    document.__mdtPhotoPasteBound = true;
    document.addEventListener('paste', function(ev){ handlePaste(ev); }, true);
  }
  if(!window.__mdtPhotoClickBound){
    window.__mdtPhotoClickBound = true;
    window.addEventListener('click', function(ev){
      if(ev.target && ev.target.closest && (
        ev.target.closest('.plaints-more') ||
        ev.target.closest('.plaints-dropdown') ||
        ev.target.closest('[data-toggle-dd]') ||
        ev.target.closest('.photo-folder-card-actions')
      )) return;
      hidePhotoFolderDropdowns();
    });
  }

  bindUi();
  syncPhotoFolderCreateButton();
  refreshPage();
})();
});
