(() => {
  const pages = {
    dashboard: '../dashboard_operativo/code.html',
    deadhead: '../calculadora_de_movimientos_en_vac_o/code.html',
    routes: '../planificador_de_rutas/code.html',
    analytics: '../an_lisis_y_reportes/code.html',
  };

  const pageOptions = [
    { label: 'Dashboard', path: pages.dashboard, keywords: 'fleet overview kpi telemetry' },
    { label: 'Deadhead Calc', path: pages.deadhead, keywords: 'calculator movement operations optimization' },
    { label: 'Route Planner', path: pages.routes, keywords: 'schedule route new deployment network' },
    { label: 'Analytics', path: pages.analytics, keywords: 'report costs intelligence metrics' },
  ];

  const state = {
    toastTimer: 0,
    searchBox: null,
  };

  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const upper = (value) => normalize(value).toUpperCase();
  const money = (value) => `$${Math.round(value).toLocaleString('en-US')}`;

  const byText = (selector, text) =>
    Array.from(document.querySelectorAll(selector)).find((node) => upper(node.textContent).includes(text.toUpperCase()));

  const allByText = (selector, text) =>
    Array.from(document.querySelectorAll(selector)).filter((node) => upper(node.textContent).includes(text.toUpperCase()));

  const closestBlock = (node) =>
    node?.closest('.bg-surface-container-low, .bg-surface-container, .glass-panel, .rounded-xl, .rounded-2xl, section, article, div');

  function toast(message) {
    let box = document.querySelector('[data-static-toast]');
    if (!box) {
      box = document.createElement('div');
      box.dataset.staticToast = 'true';
      box.className = 'fixed bottom-5 right-5 z-[200] rounded-xl border border-primary/30 bg-surface-container-high px-4 py-3 text-xs font-bold text-on-surface shadow-2xl';
      document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.opacity = '1';
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      box.style.opacity = '0';
    }, 2600);
  }

  function openPanel(title, content, actions = '') {
    document.querySelector('[data-static-panel]')?.remove();

    const panel = document.createElement('section');
    panel.dataset.staticPanel = 'true';
    panel.className = 'fixed right-5 top-20 z-[190] w-[min(92vw,360px)] rounded-xl border border-outline-variant/25 bg-surface-container-high p-4 text-on-surface shadow-2xl';
    panel.innerHTML = `
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="font-headline text-sm font-bold uppercase tracking-widest">${title}</h2>
        <button class="material-symbols-outlined rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-highest" data-panel-close type="button">close</button>
      </div>
      <div class="space-y-3 text-xs leading-relaxed text-on-surface-variant">${content}</div>
      ${actions}
    `;
    panel.querySelector('[data-panel-close]')?.addEventListener('click', () => panel.remove());
    document.body.appendChild(panel);
    return panel;
  }

  function downloadFile(filename, content, mime = 'text/csv;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast(`Archivo generado: ${filename}`);
  }

  function tableToCsv(table) {
    if (!table) return 'item,value\nSin datos,0';
    return Array.from(table.querySelectorAll('tr'))
      .map((row) =>
        Array.from(row.children)
          .map((cell) => `"${normalize(cell.textContent).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n');
  }

  function safeCopy(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Codigo copiado al portapapeles')).catch(() => toast(text));
    } else {
      toast(text);
    }
  }

  function repairTextEncoding() {
    const replacements = [
      ['Â©', 'Copyright'],
      ['â€“', '-'],
      ['Ã¢â‚¬â€œ', '-'],
      ['AnalÃ­tica', 'Analitica'],
      ['TelemetrÃ­a', 'Telemetria'],
      ['OptimizaciÃ³n', 'Optimizacion'],
    ];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let value = node.nodeValue;
      replacements.forEach(([from, to]) => {
        value = value.replaceAll(from, to);
      });
      node.nodeValue = value;
    });
  }

  function navigate(path) {
    window.location.href = path;
  }

  function wireNavigation() {
    document.querySelectorAll('a[href="#"]').forEach((anchor) => {
      const text = upper(anchor.textContent);
      if (text.includes('SUPPORT')) {
        anchor.addEventListener('click', (event) => {
          event.preventDefault();
          showSupport();
        });
        return;
      }
      if (text.includes('LOG')) {
        anchor.addEventListener('click', (event) => {
          event.preventDefault();
          showLogs();
        });
        return;
      }
      if (text.includes('DASHBOARD') || text.includes('FLEET')) anchor.href = pages.dashboard;
      if (text.includes('DEADHEAD') || text.includes('OPERATIONS')) anchor.href = pages.deadhead;
      if (text.includes('ROUTE') || text.includes('SCHEDULING') || text.includes('NETWORK')) anchor.href = pages.routes;
      if (text.includes('ANALYTICS')) anchor.href = pages.analytics;
    });

    allByText('button', 'NEW ROUTE').forEach((button) => {
      button.type = 'button';
      button.addEventListener('click', () => {
        if (isRoutePage()) openRouteModal();
        else navigate(`${pages.routes}?newRoute=1`);
      });
    });
  }

  function showNotifications() {
    openPanel(
      'Notificaciones',
      `
        <article class="rounded-lg bg-surface-container p-3"><strong class="block text-primary">Backend central</strong> API compartida respondiendo en /api/vanguard-transit.</article>
        <article class="rounded-lg bg-surface-container p-3"><strong class="block text-tertiary">Planificador</strong> Hay 3 rutas con ajuste recomendado.</article>
        <article class="rounded-lg bg-surface-container p-3"><strong class="block text-error">Combustible</strong> Variacion sobre umbral en flota diesel.</article>
      `,
    );
  }

  function applyViewSettings() {
    const compact = localStorage.getItem('asint-compact') === '1';
    const reduceMotion = localStorage.getItem('asint-reduce-motion') === '1';
    document.body.style.fontSize = compact ? '14px' : '';

    let style = document.querySelector('#static-reduce-motion');
    if (reduceMotion && !style) {
      style = document.createElement('style');
      style.id = 'static-reduce-motion';
      style.textContent = '* { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }';
      document.head.appendChild(style);
    }
    if (!reduceMotion) style?.remove();
  }

  function showSettings() {
    const panel = openPanel(
      'Ajustes de vista',
      `
        <label class="flex items-center justify-between rounded-lg bg-surface-container p-3 text-on-surface">
          Modo compacto
          <input data-setting="compact" class="accent-primary" type="checkbox">
        </label>
        <label class="flex items-center justify-between rounded-lg bg-surface-container p-3 text-on-surface">
          Reducir animaciones
          <input data-setting="motion" class="accent-primary" type="checkbox">
        </label>
      `,
    );

    const compact = panel.querySelector('[data-setting="compact"]');
    const motion = panel.querySelector('[data-setting="motion"]');
    compact.checked = localStorage.getItem('asint-compact') === '1';
    motion.checked = localStorage.getItem('asint-reduce-motion') === '1';
    compact.addEventListener('change', () => {
      localStorage.setItem('asint-compact', compact.checked ? '1' : '0');
      applyViewSettings();
    });
    motion.addEventListener('change', () => {
      localStorage.setItem('asint-reduce-motion', motion.checked ? '1' : '0');
      applyViewSettings();
    });
  }

  function showSupport() {
    const code = `ASINT-${Date.now().toString(36).toUpperCase()}`;
    const panel = openPanel(
      'Soporte operativo',
      `<p>Comparte este codigo con soporte para revisar pagina, navegador y hora de sesion.</p><code class="block rounded-lg bg-surface-container p-3 font-mono text-primary">${code}</code>`,
      '<button data-copy-support class="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-on-primary" type="button">Copiar codigo</button>',
    );
    panel.querySelector('[data-copy-support]')?.addEventListener('click', () => safeCopy(code));
  }

  function showLogs() {
    openPanel(
      'Registros',
      `
        <p class="font-mono">[OK] Interacciones estaticas cargadas</p>
        <p class="font-mono">[OK] Navegacion HTML enlazada</p>
        <p class="font-mono">[INFO] Pagina: ${document.title || 'Kinetic Precision'}</p>
      `,
    );
  }

  function wireTopChrome() {
    document.querySelectorAll('button').forEach((button) => {
      const text = upper(button.textContent);
      if (text === 'NOTIFICATIONS' || text.includes('NOTIFICATIONS')) {
        button.type = 'button';
        button.addEventListener('click', showNotifications);
      }
      if (text === 'SETTINGS' || text.includes('SETTINGS')) {
        button.type = 'button';
        button.addEventListener('click', showSettings);
      }
    });
  }

  function wireSearch() {
    const inputs = Array.from(document.querySelectorAll('input')).filter((input) => {
      const placeholder = upper(input.getAttribute('placeholder'));
      return placeholder.includes('SEARCH') || placeholder.includes('BUSQUEDA');
    });

    inputs.forEach((input) => {
      input.addEventListener('input', () => {
        renderSearchResults(input);
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          const first = filteredPages(input.value)[0];
          if (first) navigate(first.path);
        }
        if (event.key === 'Escape') closeSearch();
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-static-search]') && !inputs.includes(event.target)) closeSearch();
    });
  }

  function filteredPages(query) {
    const normalized = normalize(query).toLowerCase();
    if (!normalized) return [];
    return pageOptions.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(normalized));
  }

  function closeSearch() {
    document.querySelector('[data-static-search]')?.remove();
  }

  function renderSearchResults(input) {
    closeSearch();
    const results = filteredPages(input.value);
    if (!results.length) return;

    const host = input.closest('div') || input.parentElement;
    host.style.position = 'relative';
    const menu = document.createElement('div');
    menu.dataset.staticSearch = 'true';
    menu.className = 'absolute left-0 top-full z-[180] mt-2 w-72 overflow-hidden rounded-xl border border-outline-variant/25 bg-surface-container-high shadow-2xl';
    menu.innerHTML = results
      .map((item) => `<button class="block w-full px-4 py-3 text-left text-xs font-bold text-on-surface hover:bg-surface-container-highest" data-search-path="${item.path}" type="button">${item.label}<span class="block text-[10px] font-normal uppercase tracking-widest text-on-surface-variant">${item.path.replace('../', '')}</span></button>`)
      .join('');
    menu.querySelectorAll('[data-search-path]').forEach((button) => {
      button.addEventListener('click', () => navigate(button.dataset.searchPath));
    });
    host.appendChild(menu);
  }

  function setMetric(label, value, subValue) {
    const labelNode = byText('p, span, div, h3', label);
    const card = closestBlock(labelNode);
    const valueNode = card?.querySelector('.metric-value, .font-headline.text-4xl, .font-headline.text-3xl, .text-4xl, .text-3xl');
    if (valueNode) valueNode.textContent = value;
    if (subValue) {
      const small = card?.querySelector('.mt-4 span:last-child, p.text-\\[10px\\], .text-\\[10px\\]');
      if (small) small.textContent = subValue;
    }
  }

  function ensureStaticLeafletStyles() {
    if (document.querySelector('#static-leaflet-map-style')) return;
    const style = document.createElement('style');
    style.id = 'static-leaflet-map-style';
    style.textContent = `
      .static-live-map,
      .static-live-map .leaflet-container { background:#070c13; color:#dee5ff; }
      .static-live-map .leaflet-control-zoom,
      .static-live-map .leaflet-control-attribution {
        border:1px solid rgba(64,72,93,.4);
        border-radius:8px;
        overflow:hidden;
        background:rgba(20,31,56,.88);
        color:#a3aac4;
      }
      .static-live-map .leaflet-control-zoom a {
        border-color:rgba(64,72,93,.4);
        background:rgba(20,31,56,.9);
        color:#dee5ff;
      }
      .static-live-map .leaflet-popup-content-wrapper,
      .static-live-map .leaflet-popup-tip {
        background:#141f38;
        color:#dee5ff;
        border:1px solid rgba(64,72,93,.4);
      }
      .static-fleet-marker {
        display:grid;
        width:34px;
        height:34px;
        place-items:center;
        border:2px solid #060e20;
        border-radius:999px;
        color:white;
        cursor:pointer;
        filter:drop-shadow(0 0 12px rgba(0,0,0,.55));
        transform:rotate(var(--heading));
      }
      .static-fleet-marker .material-symbols-outlined {
        font-size:20px;
        transform:rotate(var(--reverse-heading));
      }
      .static-fleet-marker--ok { background:#00f4fe; color:#004346; }
      .static-fleet-marker--delay { background:#ff716c; }
      .static-fleet-marker--charge { background:#9bddff; color:#003041; }
    `;
    document.head.appendChild(style);
  }

  function wireStaticDashboardMap() {
    if (!window.L) return;
    const title = byText('h3', 'LIVE FLEET TOPOLOGY');
    const section = title?.closest('.space-y-4');
    const mapBox = Array.from(section?.querySelectorAll('div') || []).find((node) => {
      const classes = String(node.className || '');
      return classes.includes('h-[500px]') && classes.includes('relative');
    });
    if (!mapBox || mapBox.dataset.leafletReady === 'true') return;

    ensureStaticLeafletStyles();
    mapBox.dataset.leafletReady = 'true';
    mapBox.classList.add('static-live-map');
    mapBox.innerHTML = `
      <div data-static-live-map class="h-full w-full"></div>
      <div class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/80 to-transparent"></div>
      <div class="absolute left-6 top-6 w-56 rounded-xl border border-outline-variant/20 bg-surface-container-high/90 p-4 backdrop-blur">
        <p class="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">Vehiculos en vivo</p>
        <div data-static-map-detail class="space-y-2 text-xs text-on-surface-variant"></div>
      </div>
      <div class="absolute bottom-6 right-6 rounded-xl border border-outline-variant/20 bg-surface-container-high/90 p-3 text-[10px] uppercase tracking-widest text-on-surface-variant backdrop-blur">
        Basemap nocturno CARTO
      </div>
    `;

    const vehicles = [
      { id: 'VEH-774', line: 'LINE 402-A', status: 'ok', lat: -33.4372, lng: -70.6506, load: 72, delay: '+00:20', heading: 45 },
      { id: 'VEH-218', line: 'LINE 110-C', status: 'delay', lat: -33.4569, lng: -70.6483, load: 91, delay: '+04:10', heading: 170 },
      { id: 'VEH-905', line: 'LINE 99-Z', status: 'ok', lat: -33.4277, lng: -70.6125, load: 54, delay: '-00:45', heading: 260 },
      { id: 'VEH-611', line: 'EXPRESS', status: 'charge', lat: -33.4694, lng: -70.7072, load: 18, delay: 'CHARGE', heading: 310 },
    ];

    const detail = mapBox.querySelector('[data-static-map-detail]');
    const updateDetail = (vehicle) => {
      detail.innerHTML = `
        <p class="font-headline text-lg font-bold text-primary">${vehicle.id}</p>
        <p>${vehicle.line}</p>
        <p>Carga: <span class="text-on-surface">${vehicle.load}%</span></p>
        <p>Estado: <span class="text-primary">${vehicle.delay}</span></p>
      `;
    };

    const map = L.map(mapBox.querySelector('[data-static-live-map]'), {
      attributionControl: false,
      zoomControl: false,
    }).setView([-33.4489, -70.6693], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ prefix: false }).addAttribution('&copy; OpenStreetMap contributors &copy; CARTO').addTo(map);

    const operationsLayer = L.layerGroup().addTo(map);
    const vehiclesLayer = L.layerGroup().addTo(map);
    const renderLayer = (layer) => {
      operationsLayer.clearLayers();
      if (layer === 'traffic') {
        [
          [[-33.4372, -70.6506], [-33.4569, -70.6483], [-33.489, -70.6358]],
          [[-33.4277, -70.6125], [-33.4372, -70.6506], [-33.4694, -70.7072]],
        ].forEach((line, index) => {
          L.polyline(line, { color: index ? '#9bddff' : '#ff716c', weight: 5, opacity: 0.9 }).addTo(operationsLayer);
        });
        return;
      }
      [
        { center: [-33.4569, -70.6483], radius: 850, color: '#ff716c' },
        { center: [-33.4372, -70.6506], radius: 620, color: '#00f4fe' },
        { center: [-33.4277, -70.6125], radius: 740, color: '#9bddff' },
      ].forEach((zone) => {
        L.circle(zone.center, { radius: zone.radius, color: zone.color, fillColor: zone.color, fillOpacity: 0.16, weight: 1 }).addTo(operationsLayer);
      });
    };

    vehicles.forEach((vehicle) => {
      L.marker([vehicle.lat, vehicle.lng], {
        icon: L.divIcon({
          className: '',
          html: `<button class="static-fleet-marker static-fleet-marker--${vehicle.status}" style="--heading:${vehicle.heading}deg; --reverse-heading:${vehicle.heading * -1}deg" type="button"><span class="material-symbols-outlined">directions_bus</span></button>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      })
        .bindPopup(`<strong>${vehicle.id}</strong><br>${vehicle.line}<br>Carga: ${vehicle.load}%`)
        .on('click', () => updateDetail(vehicle))
        .addTo(vehiclesLayer);
    });

    renderLayer('thermal');
    updateDetail(vehicles[0]);
    map.fitBounds(vehicles.map((vehicle) => [vehicle.lat, vehicle.lng]), { padding: [36, 36] });
    setTimeout(() => map.invalidateSize(), 0);

    byText('button', 'Layer: Thermal')?.addEventListener('click', () => renderLayer('thermal'));
    byText('button', 'Layer: Traffic')?.addEventListener('click', () => renderLayer('traffic'));
  }

  function isDashboardPage() {
    return !!byText('h1, h3', 'OPERATIONAL OVERVIEW') || !!byText('h3', 'LIVE FLEET TOPOLOGY');
  }

  function isDeadheadPage() {
    return !!byText('h1', 'Deadhead Movement Calculator');
  }

  function isRoutePage() {
    return !!byText('h1', 'Route & Schedule Planner');
  }

  function isAnalyticsPage() {
    return !!byText('h1', 'Operational Intelligence');
  }

  function wireDashboard() {
    if (!isDashboardPage()) return;
    wireStaticDashboardMap();

    const thermal = byText('button', 'Layer: Thermal');
    const traffic = byText('button', 'Layer: Traffic');
    const mapImage = document.querySelector('img[alt*="map" i], img[alt*="Digital" i]');
    const setLayer = (layer) => {
      thermal?.classList.toggle('text-primary', layer === 'thermal');
      traffic?.classList.toggle('text-primary', layer === 'traffic');
      traffic?.classList.toggle('text-on-surface-variant', layer !== 'traffic');
      if (mapImage) {
        mapImage.style.filter = layer === 'traffic' ? 'saturate(1.4) contrast(1.15)' : 'grayscale(1) contrast(1)';
        mapImage.style.opacity = layer === 'traffic' ? '0.58' : '0.4';
      }
      toast(layer === 'thermal' ? 'Capa termica activa' : 'Capa de trafico activa');
    };
    thermal?.addEventListener('click', () => setLayer('thermal'));
    traffic?.addEventListener('click', () => setLayer('traffic'));

    allByText('button', 'Shift Opt').forEach((button) => button.addEventListener('click', () => navigate(pages.routes)));
    allByText('button', 'Refuel Log').forEach((button) => button.addEventListener('click', () => {
      setMetric('FUEL CONSUMPTION', '37.9', '-3.4% optimization');
      toast('Registro de recarga actualizado');
    }));
    allByText('button', 'Recalc Path').forEach((button) => button.addEventListener('click', () => {
      setMetric('DEADHEAD DISTANCE', '398', 'Optimization complete');
      toast('Trayecto recalculado');
    }));
    allByText('button', 'Gen Report').forEach((button) => button.addEventListener('click', () => {
      downloadFile('dashboard-report.csv', 'metric,value\nActive Fleet,1248\nEfficiency Rate,94.2\nFuel Consumption,38.4\nDeadhead Distance,398');
    }));

    const viewAll = byText('button', 'VIEW ALL');
    viewAll?.addEventListener('click', () => {
      const log = byText('h3', 'ACTIVITY LOG')?.parentElement?.nextElementSibling;
      if (log && !log.dataset.expanded) {
        log.dataset.expanded = 'true';
        log.insertAdjacentHTML('beforeend', `
          <div class="p-4 flex gap-4 hover:bg-surface-container-high transition-colors">
            <div class="w-8 h-8 rounded bg-tertiary/10 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-tertiary text-lg">route</span>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-bold text-on-surface uppercase">Route Planner Sync</p>
              <p class="text-[10px] text-on-surface-variant">Weekly route profile prepared for review.</p>
              <p class="text-[9px] text-on-surface-variant/50 font-mono">NOW</p>
            </div>
          </div>
        `);
        viewAll.textContent = 'VIEW LESS';
      } else if (log) {
        log.dataset.expanded = '';
        log.lastElementChild?.remove();
        viewAll.textContent = 'VIEW ALL';
      }
    });

    const clock = Array.from(document.querySelectorAll('span')).find((node) => upper(node.textContent).startsWith('UTC:'));
    if (clock) {
      setInterval(() => {
        clock.textContent = `UTC: ${new Date().toISOString().slice(11, 19)}`;
      }, 1000);
    }
  }

  function wireDeadhead() {
    if (!isDeadheadPage()) return;

    const selects = Array.from(document.querySelectorAll('select'));
    const times = Array.from(document.querySelectorAll('input[type="time"]'));
    const fleetChecks = Array.from(document.querySelectorAll('input[type="checkbox"]'));

    const calculate = () => {
      const origin = selects[0]?.selectedIndex || 0;
      const destination = selects[1]?.selectedIndex || 0;
      const fleetCount = Math.max(1, fleetChecks.filter((input) => input.checked).length);
      const [startHour] = (times[0]?.value || '23:00').split(':').map(Number);
      const [endHour] = (times[1]?.value || '04:30').split(':').map(Number);
      const windowHours = ((endHour + 24 - startHour) % 24) || 5;
      const distance = 11.8 + Math.abs(destination - origin) * 2.4 + fleetCount * 0.9;
      const duration = Math.round(distance * 2.05 + windowHours);
      const cost = distance * 1.52 * fleetCount;
      const savings = Math.max(980, 5200 - cost * 34);
      const co2 = (distance * 0.08 * fleetCount).toFixed(1);
      const routes = Math.max(8, Math.round(24 - distance / 1.6));
      const efficiency = Math.min(98, Math.max(78, 84 + fleetCount * 3 + windowHours * 0.6 - distance * 0.14));

      setMetric('Est. Fuel Savings', money(savings));
      setMetric('CO2 Reduction', `${co2}t`);
      setMetric('Optimized Routes', String(routes));

      const efficiencyLabel = byText('span', 'Efficiency Index') || byText('span', 'EFFICIENCY INDEX');
      const efficiencyBlock = closestBlock(efficiencyLabel);
      const efficiencyValue = efficiencyBlock?.querySelector('.text-primary.font-headline, .font-headline.font-bold');
      if (efficiencyValue) efficiencyValue.textContent = `${efficiency.toFixed(1)}%`;
      const bar = efficiencyBlock?.querySelector('.h-full.bg-primary');
      if (bar) bar.style.width = `${efficiency.toFixed(1)}%`;

      const firstRow = document.querySelector('tbody tr');
      const cells = firstRow ? Array.from(firstRow.children) : [];
      if (cells.length >= 5) {
        cells[1].textContent = `${distance.toFixed(1)} km`;
        cells[2].textContent = `${duration}m`;
        cells[3].textContent = `$${cost.toFixed(2)}`;
        cells[4].textContent = `+$${Math.max(0.5, savings / 1000).toFixed(2)}`;
      }

      document.querySelectorAll('.h-48 .flex-1').forEach((barNode, index) => {
        const next = Math.max(34, Math.min(96, efficiency - index * 2 + (index % 3) * 8));
        barNode.style.height = `${next}%`;
      });
      toast('Calculo actualizado');
    };

    allByText('button', 'CALCULATE').forEach((button) => button.addEventListener('click', calculate));
    document.querySelectorAll('select, input').forEach((input) => input.addEventListener('change', calculate));

    allByText('button', 'EXPORT REPORT').forEach((button) => {
      button.addEventListener('click', () => {
        downloadFile('deadhead-report.csv', tableToCsv(document.querySelector('table')));
      });
    });

    allByText('button', 'APPLY OPTIMIZATION').forEach((button) => {
      button.addEventListener('click', () => {
        if (times[0]) {
          const [hour, minute] = times[0].value.split(':').map(Number);
          const date = new Date();
          date.setHours(hour, minute + 12, 0, 0);
          times[0].value = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        calculate();
        toast('Optimizacion aplicada');
      });
    });

    allByText('button', 'fullscreen').forEach((button) => {
      button.addEventListener('click', () => openPanel('Mapa operacional', '<p>Vista de overlay ampliada preparada para integracion cartografica.</p>'));
    });
  }

  function openRouteModal() {
    const modal = document.querySelector('#new-route-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeRouteModal() {
    const modal = document.querySelector('#new-route-modal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  }

  function wireRoutes() {
    if (!isRoutePage()) return;

    const daily = byText('button', 'DAILY');
    const weekly = byText('button', 'WEEKLY');
    const dateLabel = Array.from(document.querySelectorAll('span')).find((node) => upper(node.textContent).includes('MONDAY'));
    const modeButtons = [daily, weekly].filter(Boolean);
    const setMode = (mode) => {
      modeButtons.forEach((button) => {
        const active = upper(button.textContent).includes(mode);
        button.classList.toggle('bg-primary', active);
        button.classList.toggle('text-on-primary', active);
        button.classList.toggle('text-on-surface-variant', !active);
      });
      if (dateLabel) dateLabel.textContent = mode === 'WEEKLY' ? 'WEEK OF OCT 24' : 'MONDAY, OCT 24';
      toast(`${mode === 'WEEKLY' ? 'Vista semanal' : 'Vista diaria'} activa`);
    };
    daily?.addEventListener('click', () => setMode('DAILY'));
    weekly?.addEventListener('click', () => setMode('WEEKLY'));

    const dayButtons = Array.from(document.querySelectorAll('button')).filter((button) => ['M', 'T', 'W', 'F', 'S'].includes(normalize(button.textContent)));
    const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    dayButtons.slice(0, 7).forEach((button, index) => {
      button.addEventListener('click', () => {
        dayButtons.slice(0, 7).forEach((item) => {
          item.classList.remove('bg-primary', 'text-on-primary');
          item.classList.add('border', 'border-outline-variant/20');
        });
        button.classList.add('bg-primary', 'text-on-primary');
        if (dateLabel) dateLabel.textContent = `${dayNames[index]}, OCT 24`;
        updateDriverCounts(index);
      });
    });

    const capacity = document.querySelector('input[type="range"]');
    if (capacity) {
      capacity.min = '32';
      capacity.max = '84';
      capacity.value = capacity.value || '58';
      const label = byText('label', 'Vehicle Capacity');
      const updateCapacity = () => {
        if (label) label.textContent = `Vehicle Capacity (${capacity.value} seats)`;
        updateDriverCounts(Number(capacity.value) % 7);
      };
      capacity.addEventListener('input', updateCapacity);
      updateCapacity();
    }

    allByText('button', 'START CONFIGURATION').forEach((button) => button.addEventListener('click', openRouteModal));

    const modal = document.querySelector('#new-route-modal');
    modal?.querySelector('[href="#"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      closeRouteModal();
    });
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeRouteModal();
    });
    allByText('button', 'CONFIRM DEPLOYMENT').forEach((button) => {
      button.addEventListener('click', () => {
        const input = modal?.querySelector('input');
        const routeId = normalize(input?.value) || `LINE-${Math.floor(700 + Math.random() * 99)}`;
        const list = byText('h3', 'Active Route Status')?.parentElement?.querySelector('.space-y-3');
        list?.insertAdjacentHTML('afterbegin', `
          <div class="bg-surface-container p-4 rounded-xl border-l-4 border-primary flex justify-between items-center">
            <div>
              <div class="text-xs font-bold">${routeId}</div>
              <div class="text-[10px] text-on-surface-variant uppercase">New deployment</div>
            </div>
            <span class="material-symbols-outlined text-primary">check_circle</span>
          </div>
        `);
        closeRouteModal();
        toast('Nueva ruta agregada');
      });
    });

    modal?.querySelectorAll('.px-3.py-1').forEach((chip) => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('bg-primary/10');
        chip.classList.toggle('text-primary');
        chip.classList.toggle('bg-surface-container');
      });
    });

    if (new URLSearchParams(window.location.search).has('newRoute')) openRouteModal();
  }

  function updateDriverCounts(seed) {
    const active = byText('span', 'Active Duty')?.parentElement?.querySelector('span:last-child');
    const standby = byText('span', 'Standby')?.parentElement?.querySelector('span:last-child');
    const off = byText('span', 'Off Duty')?.parentElement?.querySelector('span:last-child');
    if (active) active.textContent = String(12 + (seed % 5)).padStart(2, '0');
    if (standby) standby.textContent = String(3 + (seed % 4)).padStart(2, '0');
    if (off) off.textContent = String(6 + (seed % 6)).padStart(2, '0');
  }

  function wireAnalytics() {
    if (!isAnalyticsPage()) return;

    const selects = Array.from(document.querySelectorAll('select'));
    const rangeSelect = selects[0];
    const lineSelect = selects[1];

    const apply = () => {
      const range = rangeSelect?.value || 'Last 30 Days';
      const line = lineSelect?.value || 'All Transit Lines';
      const lineFactor = line.includes('Rapid') ? 1.02 : line.includes('Urban') ? 0.97 : line.includes('Suburb') ? 1.06 : 1;
      const rangeFactor = range.includes('12') ? 0.94 : range.includes('Q3') ? 1.04 : 1;
      const reliability = (98.4 * lineFactor * rangeFactor).toFixed(1);
      const density = (42.8 * lineFactor).toFixed(1);
      const variance = (12.4 * (2 - lineFactor) * rangeFactor).toFixed(1);

      setMetric('Avg. Reliability', `${reliability}%`, '+ recalculated');
      setMetric('Op. Density', density);
      setMetric('Fuel Variance', `+${variance}%`);
      updateFilterSummary(`${range} / ${line}`);
      updateAnalyticsBars(line);
      toast('Filtro aplicado');
    };

    allByText('button', 'Apply Filter').forEach((button) => button.addEventListener('click', apply));
    allByText('button', 'Export CSV').forEach((button) => {
      button.addEventListener('click', () => downloadFile('analytics-costs.csv', tableToCsv(document.querySelector('table'))));
    });
    allByText('button', 'Download Map View').forEach((button) => {
      button.addEventListener('click', () => {
        downloadFile('predictive-heatmap-summary.txt', 'Predictive Congestion Heatmap\nRisk increase: 18%\nRecommended adjustment: +2.4 fleet density', 'text/plain;charset=utf-8');
      });
    });
    allByText('button', 'Dismiss Insight').forEach((button) => {
      button.addEventListener('click', () => {
        closestBlock(button)?.remove();
        toast('Insight descartado');
      });
    });

    const fab = document.querySelector('button.fixed.bottom-8.right-8');
    fab?.addEventListener('click', () => {
      downloadFile('analytics-report.txt', `Analytics Report\nGenerated: ${new Date().toISOString()}\nFilter: ${rangeSelect?.value || 'Last 30 Days'} / ${lineSelect?.value || 'All Transit Lines'}`, 'text/plain;charset=utf-8');
    });

    const rows = Array.from(document.querySelectorAll('.space-y-6 > .space-y-2'));
    rows.forEach((row) => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        const name = normalize(row.querySelector('span')?.textContent);
        if (lineSelect) {
          Array.from(lineSelect.options).forEach((option) => {
            if (name.includes(option.text.toUpperCase()) || option.text.toUpperCase().includes(name)) lineSelect.value = option.value;
          });
        }
        apply();
      });
    });

    apply();
  }

  function updateFilterSummary(text) {
    let summary = document.querySelector('[data-filter-summary]');
    if (!summary) {
      summary = document.createElement('p');
      summary.dataset.filterSummary = 'true';
      summary.className = 'mt-2 font-label text-[10px] uppercase tracking-widest text-primary';
      byText('h1', 'Operational Intelligence')?.parentElement?.appendChild(summary);
    }
    summary.textContent = `Applied filter: ${text}`;
  }

  function updateAnalyticsBars(selectedLine) {
    const normalized = upper(selectedLine || 'All');
    document.querySelectorAll('.space-y-6 > .space-y-2').forEach((row) => {
      const rowText = upper(row.textContent);
      const selected = normalized.includes('ALL') || rowText.includes(normalized.replace('ALL TRANSIT LINES', '').trim());
      row.style.opacity = selected ? '1' : '0.42';
    });
  }

  function boot() {
    repairTextEncoding();
    applyViewSettings();
    wireNavigation();
    wireTopChrome();
    wireSearch();
    wireDashboard();
    wireDeadhead();
    wireRoutes();
    wireAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
