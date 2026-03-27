/**
 * Genesis Escape Menu — script.js
 * Rework UI/UX : AAA Dark Glassmorphism, OPTIMISÉ POUR LES PERFORMANCES (60+ FPS GMOD)
 */

const { useReducer, useEffect, useCallback, useMemo } = React;

function call(name, payload = {}) {
  if (window.WLCBridge && typeof window.WLCBridge.callback === 'function') {
    window.WLCBridge.callback(name, JSON.stringify(payload));
  }
}

const INIT = {
  view:            'main',
  definitions:     [],
  binds:           {},
  currentCategory: null,
  listeningId:     null,
  status:          'SYSTÈME OPÉRATIONNEL',
};

function reducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE': return { ...state, view: action.view };
    case 'HYDRATE': {
      const defs = action.payload.definitions || [];
      const cats = [...new Set(defs.map(d => d.category))];
      return {
        ...state,
        definitions:     defs,
        binds:           action.payload.binds || {},
        currentCategory: cats.includes(state.currentCategory) ? state.currentCategory : (cats[0] ?? state.currentCategory),
        listeningId:     null,
        status:          'SYSTÈME OPÉRATIONNEL',
      };
    }
    case 'SET_CATEGORY': return { ...state, currentCategory: action.category, listeningId: null };
    case 'LISTENING': return { ...state, listeningId: action.id, status: `AFFECTATION EN COURS — ${action.label.toUpperCase()}` };
    case 'BIND_UPDATED': return { ...state, binds: action.binds || state.binds, listeningId: null, status: action.status || 'AFFECTATION SAUVEGARDÉE' };
    case 'VALUE_UPDATED': return { ...state, binds: action.binds || state.binds, listeningId: null, status: action.status || 'PARAMÈTRE MIS À JOUR' };
    case 'LISTEN_CANCELLED': return { ...state, listeningId: null, status: 'OPÉRATION ANNULÉE' };
    case 'SET_STATUS': return { ...state, status: action.status };
    default: return state;
  }
}

function getCategoryGroups(definitions) {
  const map = new Map();
  definitions.forEach(def => {
    if (!map.has(def.category)) map.set(def.category, []);
    map.get(def.category).push(def);
  });
  return [...map.entries()].map(([name, defs]) => ({ name, defs, count: defs.length }));
}

function getSubGroups(defs) {
  const map = new Map();
  defs.forEach(def => {
    const sub = def.subcategory || 'GÉNÉRAL';
    if (!map.has(sub)) map.set(sub, []);
    map.get(sub).push(def);
  });
  return [...map.entries()];
}

function Background() {
  return (
    <>
      <div className="bg-base" />
      <div className="bg-glow-accent" />
      <div className="bg-glow-dark" />
    </>
  );
}

function Watermark() {
  return <div className="watermark">by Walter</div>;
}

function HeroPanel() {
  return (
    <div className="hero-panel glass-panel hero-fade">
      <div className="hero-content">
        <div className="hero-brand">
          <div className="hero-subtitle">GENESIS NETWORK</div>
          <div className="watermark">by Walter</div>
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'resume', num: '01', label: 'RETOURNER EN JEU', desc: 'FERMER LE TERMINAL', action: () => call('close') },
  { id: 'binds', num: '02', label: 'CONFIGURATION', desc: 'TOUCHES & PARAMÈTRES', action: null },
];

function NavPanel({ onOpenBinds }) {
  return (
    <div className="nav-panel">
      <div className="nav-topbar">
        <span className="nav-link">DISCORD</span>
        <span className="nav-link">BOUTIQUE</span>
      </div>
      <div className="nav-items">
        {NAV_ITEMS.map(item => (
          <div key={item.id} className="nav-item glass-hover" onClick={() => item.action ? item.action() : onOpenBinds()}>
            <div className="nav-item-content">
              <span className="nav-num">{item.num}</span>
              <div className="nav-body">
                <div className="nav-title">{item.label}</div>
                <div className="nav-desc">{item.desc}</div>
              </div>
            </div>
            <div className="nav-indicator" />
          </div>
        ))}
      </div>
      <div className="nav-bottom">
        <button className="quit-btn glass-btn" onClick={() => call('close')}>
          DÉCONNEXION
        </button>
      </div>
    </div>
  );
}

const BindRow = React.memo(function BindRow({ def, bind, isListening, onListen }) {
  const keyLabel = isListening ? 'EN ATTENTE...' : (bind?.name || 'NON ASSIGNÉ');
  return (
    <div className={`bind-row glass-row ${isListening ? 'listening' : ''}`} onClick={onListen}>
      <div className="bind-info">
        <div className="bind-name">{def.label}</div>
        <div className="bind-kind">{def.kind === 'hold' ? 'MAINTIEN' : 'PRESSION'}</div>
      </div>
      <div className={`key-btn ${isListening ? 'listening' : ''} ${!bind?.name ? 'unassigned' : ''}`}>
        {keyLabel}
      </div>
    </div>
  );
});

const SelectRow = React.memo(function SelectRow({ def, bind, onSelect }) {
  const current = bind?.value || def.default || '';
  return (
    <div className="glass-row select-row">
      <div className="bind-info">
        <div className="bind-name">{def.label}</div>
        <div className="bind-kind">SÉLECTION</div>
      </div>
      <div className="select-options">
        {(def.options || []).map(option => (
          <button
            key={option}
            className={`select-pill ${current === option ? 'active' : ''}`}
            onClick={() => onSelect(def, option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
});

function ViewBinds({ state, dispatch, onBack }) {
  const categories = useMemo(() => getCategoryGroups(state.definitions), [state.definitions]);
  const currentDefs = useMemo(() => state.definitions.filter(d => d.category === state.currentCategory), [state.definitions, state.currentCategory]);
  const subGroups = useMemo(() => getSubGroups(currentDefs), [currentDefs]);

  const handleListen = useCallback((def) => {
    dispatch({ type: 'LISTENING', id: def.id, label: def.label });
    call('listen', { id: def.id });
  }, [dispatch]);

  const handleSelect = useCallback((def, option) => {
    const nextBinds = {
      ...state.binds,
      [def.id]: { value: option },
    };
    dispatch({ type: 'VALUE_UPDATED', binds: nextBinds, status: `PARAMÈTRE MIS À JOUR — ${def.label.toUpperCase()}` });
    call('setOption', { id: def.id, value: option });
  }, [dispatch, state.binds]);

  const handleSave = useCallback(() => {
    dispatch({ type: 'SET_STATUS', status: 'SYNCHRONISATION...' });
    call('saveAll');
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'SET_STATUS', status: 'RÉINITIALISATION...' });
    call('resetDefaults');
  }, [dispatch]);

  return (
    <>
      <div className="binds-header glass-panel">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            <span className="arrow">←</span> RETOUR
          </button>
          <div className="binds-title">CONFIGURATION SYSTÈME</div>
        </div>
        <div className="status-txt">{state.status}</div>
      </div>

      <div className="binds-workspace">
        <div className="cat-panel">
          <div className="cat-list">
            {categories.map(cat => (
              <div
                key={cat.name}
                className={`cat-item ${cat.name === state.currentCategory ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_CATEGORY', category: cat.name })}
              >
                <span>{cat.name}</span>
                <span className="cat-count">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="binds-panel">
          <div className="binds-list-wrapper">
            <div className="binds-list">
              {subGroups.length === 0 && <div className="empty-state">AUCUNE DONNÉE DISPONIBLE</div>}
              {subGroups.map(([subName, defs]) => (
                <React.Fragment key={subName}>
                  <div className="sub-hdr">{subName}</div>
                  {defs.map(def => def.ui === 'select' ? (
                    <SelectRow
                      key={def.id}
                      def={def}
                      bind={state.binds[def.id]}
                      onSelect={handleSelect}
                    />
                  ) : (
                    <BindRow
                      key={def.id}
                      def={def}
                      bind={state.binds[def.id]}
                      isListening={state.listeningId === def.id}
                      onListen={() => handleListen(def)}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="binds-footer">
            <button className="action-btn glass-btn secondary" onClick={handleReset}>RESTAURER DÉFAUT</button>
            <button className="action-btn glass-btn primary" onClick={handleSave}>APPLIQUER LES MODIFICATIONS</button>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  const [state, dispatch] = useReducer(reducer, INIT);

  useEffect(() => {
    window.WLCReceive = function(raw) {
      let payload;
      try { payload = JSON.parse(raw); } catch (e) { return; }
      const { action, ...data } = payload;
      switch (action) {
        case 'hydrate':         dispatch({ type: 'HYDRATE', payload: data }); break;
        case 'listening':       dispatch({ type: 'LISTENING', id: data.id, label: data.id || '' }); break;
        case 'bindUpdated':     dispatch({ type: 'BIND_UPDATED', binds: data.binds, status: data.status }); break;
        case 'valueUpdated':    dispatch({ type: 'VALUE_UPDATED', binds: data.binds }); break;
        case 'listenCancelled': dispatch({ type: 'LISTEN_CANCELLED' }); break;
        default: break;
      }
    };
    call('ready');
    return () => { window.WLCReceive = null; };
  }, []);

  const openBinds = useCallback(() => dispatch({ type: 'NAVIGATE', view: 'binds' }), []);
  const openMain  = useCallback(() => dispatch({ type: 'NAVIGATE', view: 'main'  }), []);

  return (
    <>
      <Background />
      <div className={`view main-view ${state.view === 'main' ? 'active' : ''}`}>
        <HeroPanel />
        <NavPanel onOpenBinds={openBinds} />
      </div>
      <div className={`view binds-view ${state.view === 'binds' ? 'active' : ''}`}>
        <ViewBinds state={state} dispatch={dispatch} onBack={openMain} />
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
