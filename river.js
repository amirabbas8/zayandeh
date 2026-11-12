// Draws the river beside the text. Its width follows each stop's data-flow value,
// so the band visibly gains water at the tunnels and loses it at every diversion.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const journey = document.getElementById('journey');
  const svg = journey.querySelector('.river');
  const stations = [...journey.querySelectorAll('.station')];
  const hud = document.getElementById('hud');
  const hudName = document.getElementById('hud-name');
  const hudMeta = document.getElementById('hud-meta');
  const L = window.i18n;
  const rtl = () => document.documentElement.dir === 'rtl';
  // text-anchor for text that should extend rightward from x (start) or leftward (end)
  const anchor = a => rtl() && a !== 'middle' ? (a === 'start' ? 'end' : 'start') : a;
  const hudFill = document.getElementById('hud-fill');
  const START_FLOW = 0.62;

  let G = null; // geometry of the current drawing

  const el = (name, attrs = {}, parent = svg) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * (3 - 2 * t);

  function build() {
    const W = svg.getBoundingClientRect().width;
    const H = journey.offsetHeight;
    if (!W || !H) return;
    const wide = W > 300;
    const bedHalf = clamp(W * 0.13, 12, 62);
    const amp = wide ? W * 0.15 : Math.max(0, W / 2 - bedHalf - 6);
    const jTop = journey.getBoundingClientRect().top;

    const stops = stations.map(s => {
      const r = s.getBoundingClientRect();
      return { el: s, top: r.top - jTop, h: r.height, flow: +s.dataset.flow, elev: +s.dataset.elev, name: L.attr(s, 'name') };
    });
    const last = stops[stops.length - 1];
    const endY = last.top + last.h + 40;           // where the wetland sits
    const wetR = wide ? bedHalf * 2.4 : bedHalf * 1.5;

    // flow keyframes: each stop changes the flow across its own height
    const keys = [];
    let prev = START_FLOW;
    stops.forEach(s => {
      keys.push({ y0: s.top + 30, y1: s.top + Math.min(s.h, 380), a: prev, b: s.flow });
      prev = s.flow;
    });
    const flowAt = y => {
      let f = START_FLOW;
      for (const k of keys) {
        if (y >= k.y1) f = k.b;
        else if (y > k.y0) { f = k.a + (k.b - k.a) * smooth((y - k.y0) / (k.y1 - k.y0)); break; }
        else break;
      }
      return f;
    };
    const cx = y => {
      const settle = clamp((endY - y) / 400);       // straighten into the wetland
      return W / 2 + amp * settle * (0.68 * Math.sin(y / 250 + 0.6) + 0.32 * Math.sin(y / 91 + 1.9));
    };
    const waterHalf = y => bedHalf * clamp((flowAt(y) - 0.07) / 0.93) * (1 + 0.07 * Math.sin(y / 41));
    const bedHalfAt = y => bedHalf * (1 + 0.06 * Math.sin(y / 63 + 2));

    svg.replaceChildren();
    svg.style.direction = rtl() ? 'rtl' : 'ltr';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    const defs = el('defs');
    const bedGrad = el('linearGradient', { id: 'bedg', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: H }, defs);
    [['0', '#c9d3d6'], ['0.3', '#cfc9ae'], ['0.6', '#d3b98a'], ['0.85', '#c9a877'], ['1', '#e9e2d2']]
      .forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, bedGrad));
    const waterGrad = el('linearGradient', { id: 'waterg', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: H }, defs);
    [['0', '#3aa0c9'], ['0.45', '#2a86b3'], ['0.8', '#4f8f8c'], ['1', '#7d9a82']]
      .forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, waterGrad));
    const cracks = el('pattern', { id: 'cracks', width: 46, height: 46, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M0 12 9 16 15 8 26 13 31 3M15 8 13 0M9 16 12 28 3 35 0 33M12 28 24 31 29 22 26 13M29 22 40 24 46 18M24 31 27 42 21 46M27 42 38 39 46 44M38 39 40 24M3 35 6 46', fill: 'none', stroke: '#6e4a2b', 'stroke-opacity': '.38', 'stroke-width': '1' }, cracks);

    // outline polygons, sampled down the page
    const step = 8;
    const band = (halfFn, y0, y1) => {
      const L = [], R = [];
      for (let y = y0; y <= y1; y += step) {
        const c = cx(y), h = halfFn(y);
        L.push(`${(c - h).toFixed(1)} ${y}`);
        R.push(`${(c + h).toFixed(1)} ${y}`);
      }
      return 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z';
    };

    // dry bed, with cracks growing in as the water goes
    el('path', { d: band(bedHalfAt, 0, endY), fill: 'url(#bedg)' });
    const firstDry = stops.find(s => s.flow < 0.5) || last;
    const crackMask = el('linearGradient', { id: 'crackfade', gradientUnits: 'userSpaceOnUse', x1: 0, y1: firstDry.top, x2: 0, y2: firstDry.top + 900 }, defs);
    el('stop', { offset: 0, 'stop-color': '#000' }, crackMask);
    el('stop', { offset: 1, 'stop-color': '#fff' }, crackMask);
    const mask = el('mask', { id: 'crackmask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H + 400 }, defs);
    el('rect', { x: 0, y: 0, width: W, height: H + 400, fill: 'url(#crackfade)' }, mask);
    const dryG = el('g', { mask: 'url(#crackmask)' });
    el('path', { d: band(bedHalfAt, 0, endY), fill: 'url(#cracks)' }, dryG);

    // the wetland: a salt pan at the end of the bed
    if (last.el.dataset.wetland) {
      const wx = cx(endY), wy = endY + wetR * 0.7;
      el('ellipse', { cx: wx, cy: wy, rx: wetR, ry: wetR * 0.82, fill: '#f6f1e6', stroke: '#cdbb98', 'stroke-width': 1.5 }, dryG.parentNode);
      el('ellipse', { cx: wx, cy: wy, rx: wetR, ry: wetR * 0.82, fill: 'url(#cracks)' });
      el('ellipse', { cx: wx - wetR * .15, cy: wy + wetR * .1, rx: wetR * .55, ry: wetR * .4, fill: '#fff', 'fill-opacity': '.7' });
      if (wide) el('text', { x: wx, y: wy + wetR * 0.82 + 20, 'text-anchor': 'middle' }).textContent = L.t('river.wetland');
    }

    // diversions in and out
    stops.forEach((s, i) => {
      let side = s.el.dataset.divert;
      if (!side) return;
      if (rtl()) side = side === 'left' ? 'right' : 'left'; // mirror with the layout
      const before = i ? stops[i - 1].flow : START_FLOW;
      const delta = s.flow - before;
      const dir = side === 'left' ? -1 : 1;
      const edgeX = side === 'left' ? (wide ? 10 : -2) : (wide ? W - 10 : W + 2);
      const w = Math.max(wide ? 4 : 2.5, Math.abs(delta) * bedHalf * 2);
      const yR = s.top + 110;                         // where it meets the river
      const yE = delta > 0 ? yR - 110 : yR + 110;      // inflow arrives from above
      const xR = cx(yR) + dir * waterHalf(yR) * 0.6;
      const d = `M${xR.toFixed(1)} ${yR}C${(xR + dir * 40).toFixed(1)} ${yR},${(edgeX - dir * 50).toFixed(1)} ${yE},${edgeX} ${yE}`;
      el('path', { d, fill: 'none', stroke: delta > 0 ? '#3aa0c9' : '#2a86b3', 'stroke-width': w.toFixed(1), 'stroke-linecap': 'round' });
      const label = L.attr(s.el, 'divertLabel');
      if (wide && label) {
        const t = el('text', { x: edgeX, y: yE + (delta > 0 ? -w / 2 - 8 : w / 2 + 18), 'text-anchor': anchor(side === 'left' ? 'start' : 'end') });
        t.textContent = (delta > 0 ? '+ ' : '− ') + label;
      }
    });

    // water
    const waterD = band(waterHalf, 0, endY);
    el('path', { d: waterD, fill: 'url(#waterg)' });
    const clip = el('clipPath', { id: 'waterclip' }, defs);
    el('path', { d: waterD }, clip);
    let line = '';
    for (let y = 0; y <= endY; y += step) line += (y ? 'L' : 'M') + cx(y).toFixed(1) + ' ' + y;
    el('path', { d: line, class: 'flowline', 'clip-path': 'url(#waterclip)' });

    // last pools where the flow has all but gone
    for (let y = 0; y < endY; y += 120) {
      const f = flowAt(y);
      if (f > 0.004 && f < 0.1) {
        const k = clamp(f / 0.06);
        el('ellipse', { cx: cx(y) + Math.sin(y) * bedHalf * 0.3, cy: y, rx: bedHalf * (0.18 + 0.3 * k), ry: 9 + 16 * k, fill: '#5d928f', 'fill-opacity': '.8' });
      }
    }

    // dam wall and bridge
    stops.forEach(s => {
      const y = s.top + 60, c = cx(y), half = bedHalf + (wide ? 16 : 5);
      if (s.el.dataset.dam) {
        el('rect', { x: c - half, y: y - 5, width: half * 2, height: 10, fill: '#55606a' });
        if (wide) el('text', { x: c, y: y - 14, 'text-anchor': 'middle' }).textContent = L.attr(s.el, 'dam');
      }
      if (s.el.dataset.bridge) {
        el('rect', { x: c - half, y: y - 7, width: half * 2, height: 14, fill: '#b98556' });
        el('line', { x1: c - half + 3, x2: c + half - 3, y1: y + 1, y2: y + 1, stroke: '#5c3b20', 'stroke-width': 7, 'stroke-dasharray': '2.4 2.2' });
        if (wide) el('text', { x: c, y: y - 16, 'text-anchor': 'middle' }).textContent = L.attr(s.el, 'bridge');
      }
    });

    // traveller
    const marker = el('g', { class: 'marker' });
    el('circle', { r: 11, fill: '#fff', 'fill-opacity': '.35' }, marker);
    el('circle', { r: 6, fill: '#fff', stroke: '#12294d', 'stroke-width': 2.5 }, marker);

    G = { H, endY, cx, flowAt, stops, marker };
    update();
  }

  function update() {
    if (!G) return;
    const r = journey.getBoundingClientRect();
    const y = clamp(innerHeight * 0.5 - r.top, 0, G.endY);
    G.marker.setAttribute('transform', `translate(${G.cx(y).toFixed(1)} ${y.toFixed(1)})`);

    const f = G.flowAt(y);
    let name = G.stops[0].name, elev = G.stops[0].elev;
    for (let i = 0; i < G.stops.length; i++) {
      const s = G.stops[i], n = G.stops[i + 1];
      if (y >= s.top - 80) {
        name = s.name;
        elev = n ? s.elev + (n.elev - s.elev) * clamp((y - s.top) / (n.top - s.top)) : s.elev;
      }
    }
    hudName.textContent = name;
    hudMeta.textContent = L.hud(Math.round(elev / 10) * 10, Math.round(f * 100));
    hudFill.style.height = Math.round(f * 100) + '%';
    hudFill.style.background = f < 0.2 ? '#e2a72a' : '';
    hud.classList.toggle('on', r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.6);
  }

  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  addEventListener('scroll', onScroll, { passive: true });

  let t = 0;
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(build, 80); }).observe(journey);
  document.addEventListener('langchange', build);
  build();
})();
