window.__mdtModule('delits', function(){
(function(){
  if(window.__mdt_delits_loaded) return;
  window.__mdt_delits_loaded = true;

  const DELITS = [
    { label: 'Atteinte à la pudeur', type: 'Contravention', amende: 200, instruction: 'Inscription sur casier', prison: '00:00:00' },
    { label: 'Circulation sans plaques d\'immatriculation', type: 'Contravention', amende: 135, instruction: 'Amende uniquement', prison: '00:00:00' },
    { label: 'Conduite dangereuse majeure', type: 'Contravention', amende: 135, instruction: 'Ticket routier - 2 points', prison: '00:00:00' },
    { label: 'Conduite dangereuse mineure', type: 'Contravention', amende: 80, instruction: 'Ticket routier - 1 point', prison: '00:00:00' },
    { label: 'Conduite en contre-sens', type: 'Contravention', amende: 135, instruction: 'Ticket routier - 1 point', prison: '00:00:00' },
    { label: 'Conduite sans port de casque (motocross)', type: 'Contravention', amende: 500, instruction: 'Ticket routier', prison: '00:00:00' },
    { label: 'Diffusion de contenu offensant sur les réseaux sociaux', type: 'Contravention', amende: 125, instruction: 'x le nombre de post / x le nombre de plainte', prison: '00:00:00' },
    { label: 'Dimanche vert', type: 'Contravention', amende: 100, instruction: 'Ticket routier', prison: '00:00:00' },
    { label: 'Dissimulation du visage', type: 'Contravention', amende: 130, instruction: 'Rappel', prison: '00:00:00' },
    { label: 'Emploi non déclaré', type: 'Contravention', amende: 200, instruction: 'x par employé non déclaré', prison: '00:00:00' },
    { label: 'Refus d\'obtempérer', type: 'Délit', amende: 1500, instruction: 'Inscription sur casier', prison: '00:08:00' },
    { label: 'Port d\'arme blanche prohibé', type: 'Délit', amende: 1200, instruction: 'Saisie immédiate', prison: '00:06:00' },
    { label: 'Détention d\'arme sans enregistrement', type: 'Délit', amende: 2500, instruction: 'Saisie + casier', prison: '00:10:00' },
    { label: 'Agression simple', type: 'Délit', amende: 1800, instruction: 'Présentation au parquet', prison: '00:12:00' },
    { label: 'Entrave à enquête', type: 'Délit', amende: 2200, instruction: 'Casier + convocation', prison: '00:10:00' },
    { label: 'Vol avec violence', type: 'Crime', amende: 5000, instruction: 'Placement immédiat', prison: '00:25:00' },
    { label: 'Tentative d\'homicide', type: 'Crime', amende: 10000, instruction: 'Instruction criminelle', prison: '00:40:00' },
    { label: 'Homicide volontaire', type: 'Crime', amende: 15000, instruction: 'Instruction criminelle', prison: '01:00:00' },
    { label: 'Prise d\'otage', type: 'Crime', amende: 12000, instruction: 'Négociation + instruction criminelle', prison: '00:45:00' },
    { label: 'Trafic d\'armes organisé', type: 'Crime', amende: 18000, instruction: 'Saisie totale + casier', prison: '00:55:00' }
  ];

  function escSafe(v){
    if(typeof window.esc === 'function') return window.esc(v);
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function getFilteredDelits(){
    const categoryEl = document.getElementById('delits-category-filter');
    const searchEl = document.getElementById('delits-search');
    const category = categoryEl ? String(categoryEl.value || 'all').toLowerCase() : 'all';
    const search = searchEl ? String(searchEl.value || '').trim().toLowerCase() : '';

    return DELITS.filter(function(item){
      const matchCategory = category === 'all' || String(item.type || '').toLowerCase() === category;
      if(!matchCategory) return false;
      if(!search) return true;
      const haystack = [item.label, item.type, item.instruction, String(item.amende), item.prison].join(' ').toLowerCase();
      return haystack.indexOf(search) !== -1;
    });
  }

  function renderDelitsTable(){
    const tbody = document.getElementById('delits-table-body');
    if(!tbody) return;

    const rows = getFilteredDelits();
    if(!rows.length){
      tbody.innerHTML = '<tr><td colspan="5" class="armes-empty">Aucune charge trouvée.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function(item){
      return '' +
        '<tr class="arme-row">' +
          '<td>' + escSafe(item.label || '') + '</td>' +
          '<td>' + escSafe(item.type || '') + '</td>' +
          '<td>' + escSafe(item.amende || 0) + '</td>' +
          '<td>' + escSafe(item.instruction || '') + '</td>' +
          '<td>' + escSafe(item.prison || '00:00:00') + '</td>' +
        '</tr>';
    }).join('');
  }

  function populateDelitsCategories(){
    const select = document.getElementById('delits-category-filter');
    if(!select) return;

    const selected = String(select.value || 'all').toLowerCase();
    const types = [];
    DELITS.forEach(function(item){
      const type = String(item.type || '').trim();
      if(type && types.indexOf(type) === -1) types.push(type);
    });

    select.innerHTML = '<option value="all">Toutes categories</option>' + types.map(function(type){
      return '<option value="' + escSafe(type.toLowerCase()) + '">' + escSafe(type) + '</option>';
    }).join('');

    const validValues = ['all'].concat(types.map(function(type){ return type.toLowerCase(); }));
    select.value = validValues.indexOf(selected) !== -1 ? selected : 'all';
  }

  function bindDelitsEvents(){
    const search = document.getElementById('delits-search');
    const filter = document.getElementById('delits-category-filter');

    if(search && !search.__mdtBound){
      search.__mdtBound = true;
      search.addEventListener('input', renderDelitsTable);
    }

    if(filter && !filter.__mdtBound){
      filter.__mdtBound = true;
      filter.addEventListener('change', renderDelitsTable);
    }
  }

  function initDelitsPage(){
    populateDelitsCategories();
    bindDelitsEvents();
    renderDelitsTable();
  }

  window.MDT_DELITS = DELITS;
  window.renderDelitsTable = renderDelitsTable;
  window.initDelitsPage = initDelitsPage;

  if(typeof window.__mdt_addPageHook === 'function'){
    window.__mdt_addPageHook(function(name){
      if(name === 'delits') initDelitsPage();
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      if(document.getElementById('page-delits')) initDelitsPage();
    });
  }else if(document.getElementById('page-delits')){
    initDelitsPage();
  }
})();
});
