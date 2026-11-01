import * as THREE from 'three';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">⌁</span><div><span class="eyebrow">HOHE TAUERN · OSTTIROL</span><h1>Wanderkarte</h1></div></div>
      <div class="top-note"><span class="live-dot"></span> INTERAKTIVE 3D-KARTE</div>
    </header>
    <section class="layout">
      <div class="visual">
        <div id="stage"><div class="loading"><span class="spinner"></span><span>3D-Landschaft wird geladen …</span></div></div>
        <div class="map-hint"><span>↗</span> Ziehen zum Drehen <i>·</i> Scrollen zum Zoomen</div>
        <div class="map-label">TERRAIN MODEL <span>3D</span></div>
      </div>
      <aside class="sidebar">
        <div class="side-heading"><span class="eyebrow">ENTDECKE DIE REGION</span><h2>Wähle deine<br/>Wanderroute.</h2><p>Entdecke die Wege rund um die Winklerner Hütte. Wähle eine Tour, um ihren Verlauf auf dem 3D-Modell zu sehen.</p></div>
        <div class="route-list" id="route-list"></div>
        <div class="detail" id="detail" aria-live="polite"></div>
        <div class="side-foot">Mit der Maus oder per Touch kannst du das Gelände frei erkunden.</div>
      </aside>
    </section>
    <footer><span>3D WANDERERLEBNIS</span><span>ROUTE WÄHLEN · GELÄNDE ERKUNDEN</span></footer>
  </main>`;

const stage = document.querySelector('#stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dce4df');
scene.fog = new THREE.Fog('#dce4df', 30, 90);
const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 500);
camera.position.set(12, 13, 17);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
stage.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x738274, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-8, 18, 10);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xc7d8e5, 0.8);
fill.position.set(12, 5, -12);
scene.add(fill);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 1.2;
controls.maxDistance = 42;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0, 0);

const world = new THREE.Group();
scene.add(world);
let terrain = null;
let routeGroup = new THREE.Group();
world.add(routeGroup);
let routes = [];
let activeRoute = null;
let cameraTween = null;

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
new ResizeObserver(resize).observe(stage);

function animateCamera(position, target, duration = 1250) {
  cameraTween = {
    start: performance.now(), duration,
    fromPos: camera.position.clone(), toPos: position.clone(),
    fromTarget: controls.target.clone(), toTarget: target.clone()
  };
}
function ease(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

function renderLoop(now) {
  requestAnimationFrame(renderLoop);
  if (cameraTween) {
    const t = Math.min(1, (now - cameraTween.start) / cameraTween.duration);
    const e = ease(t);
    camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, e);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, e);
    if (t >= 1) cameraTween = null;
  }
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(renderLoop);

function clearRoutes() {
  routeGroup.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => m.dispose());
    }
  });
  routeGroup.clear();
}

function makeRouteLine(route, selected) {
  if (!route.points?.length) return;
  const points = route.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.max(120, points.length * 2)));
  const material = new THREE.LineBasicMaterial({
    color: selected ? 0xffc56a : 0x74877a,
    transparent: true, opacity: selected ? 1 : 0.18,
    depthTest: false
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 5;
  routeGroup.add(line);
  if (selected) {
    const end = points[points.length - 1];
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffd18a, depthTest: false })
    );
    marker.position.copy(end);
    marker.renderOrder = 6;
    routeGroup.add(marker);
  }
}

function renderRoutes() {
  clearRoutes();
  routes.forEach(r => makeRouteLine(r, r.name === activeRoute));
}

function formatDistance(value = '') {
  if (!value) return '–';
  if (value.endsWith('m')) {
    const n = Number(value.slice(0, -1));
    if (!Number.isFinite(n) || n === 0) return value === '0m' ? '–' : value;
    return n >= 1000 ? `${(n / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km` : value;
  }
  return value;
}
function cleanDescription(text = '') {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.body.textContent || '';
}

function selectRoute(name, animate = true) {
  const route = routes.find(r => r.name === name);
  if (!route) return;
  activeRoute = name;
  renderRoutes();
  document.querySelectorAll('.route-button').forEach(btn => {
    const selected = btn.dataset.route === name;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
  const info = route.info || {};
  document.querySelector('#detail').innerHTML = `
    <div class="detail-top"><span class="eyebrow">AUSGEWÄHLTE TOUR</span><span class="tour-number">${info.titleDe?.match(/Tour\\s+(\\d+)/)?.[1] || ''}</span></div>
    <h3>${escapeHtml(info.titleDe || route.name)}</h3>
    <p>${escapeHtml(cleanDescription(info.descriptionDe || ''))}</p>
    <div class="stats">
      <div><span>DAUER</span><strong>${escapeHtml(info.duration || '–')}</strong></div>
      <div><span>STRECKE</span><strong>${escapeHtml(formatDistance(info.distance))}</strong></div>
      <div><span>HÖHENMETER</span><strong>${escapeHtml(info.heightDifference || '–')}</strong></div>
    </div>`;
  if (animate && route.camera?.camPos && route.camera?.lookAt) {
    const p = route.camera.camPos, l = route.camera.lookAt;
    animateCamera(new THREE.Vector3(p.x, p.y, p.z), new THREE.Vector3(l.x, l.y, l.z));
  }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function init() {
  try {
    const [routeResponse] = await Promise.all([fetch('/data/routes.json')]);
    if (!routeResponse.ok) throw new Error('Routendaten konnten nicht geladen werden.');
    const data = await routeResponse.json();
    routes = data.curves || [];
    const list = document.querySelector('#route-list');
    list.innerHTML = routes.map((route, i) => `
      <button class="route-button" data-route="${escapeHtml(route.name)}" aria-pressed="false">
        <span class="route-index">${String(i + 1).padStart(2, '0')}</span>
        <span class="route-name">${escapeHtml((route.info?.titleDe || route.name).replace(/^Tour\\s+\\d+:\\s*/, ''))}</span>
        <span class="route-arrow">↗</span>
      </button>`).join('');
    list.addEventListener('click', e => {
      const btn = e.target.closest('.route-button');
      if (btn) selectRoute(btn.dataset.route);
    });

    const loader = new ColladaLoader();
    loader.load('/models/3d_map.dae', collada => {
      terrain = collada.scene;
      terrain.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          if (obj.material) {
            obj.material.side = THREE.DoubleSide;
            if ('roughness' in obj.material) obj.material.roughness = 0.92;
          }
        }
      });
      world.add(terrain);
      const box = new THREE.Box3().setFromObject(terrain);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      controls.target.copy(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.set(center.x + maxDim * 1.15, center.y + maxDim * .9, center.z + maxDim * 1.35);
      camera.near = Math.max(0.01, maxDim / 1000);
      camera.far = maxDim * 100;
      camera.updateProjectionMatrix();
      controls.minDistance = maxDim * .08;
      controls.maxDistance = maxDim * 5;
      document.querySelector('.loading')?.remove();
      selectRoute(routes[0]?.name, false);
      resize();
    }, undefined, error => {
      console.error(error);
      document.querySelector('.loading').innerHTML = '<span>Das 3D-Modell konnte nicht geladen werden. Bitte prüfe die Modelldatei.</span>';
    });
  } catch (error) {
    console.error(error);
    document.querySelector('.loading').textContent = error.message;
  }
}
init();