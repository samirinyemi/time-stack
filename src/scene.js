import * as THREE from 'three';
import { LAYERS } from './layers';

const GEOMETRY_FACTORIES = [
  () => [
    new THREE.IcosahedronGeometry(0.6, 1),
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.OctahedronGeometry(0.6),
  ],
  () => [
    new THREE.TorusGeometry(0.5, 0.2, 12, 24),
    new THREE.TetrahedronGeometry(0.7),
    new THREE.IcosahedronGeometry(0.55, 0),
  ],
  () => [
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.OctahedronGeometry(0.55),
    new THREE.TorusGeometry(0.45, 0.18, 12, 24),
  ],
  () => [
    new THREE.TetrahedronGeometry(0.65),
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.BoxGeometry(0.75, 0.75, 0.75),
  ],
  () => [
    new THREE.OctahedronGeometry(0.6),
    new THREE.TorusGeometry(0.5, 0.2, 12, 24),
    new THREE.TetrahedronGeometry(0.6),
  ],
];

const OBJECT_OFFSETS = [
  [[-6, 2.2, -4], [0.5, 2.8, 5], [7, 2.0, -1]],
  [[-5, 2.5, 3], [1, 2.0, -5], [6.5, 2.6, 1]],
  [[-7, 2.3, -2], [-0.5, 2.7, 4], [5.5, 2.1, -3]],
  [[-4, 2.6, 5], [2, 2.2, -4], [7, 2.4, 2]],
  [[-6.5, 2.4, -1], [0, 2.5, 3], [6, 2.3, -4]],
];

function createTextSprite(text, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 64;
  ctx.font = "28px 'Courier Prime', 'Courier New', monospace";
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4, 0.5, 1);
  return sprite;
}

export function initScene(container, onLayerChange) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080C08');
  scene.fog = new THREE.FogExp2(0x080c08, 0.016);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 24, 22);

  scene.add(new THREE.AmbientLight(0x1a2418, 0.6));

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  let cameraTargetY = 24;
  let cameraCurrentY = 24;
  let cameraTargetZ = 22;
  let cameraCurrentZ = 22;
  const ZOOM_MIN = 10;
  const ZOOM_MAX = 40;
  let rotationTarget = 0;
  let rotationCurrent = 0;
  let currentActiveLayer = 4;
  let isDragging = false;
  let lastMouseX = 0;
  let lastTouchX = 0;
  let lastTouchY = 0;
  let lastPinchDist = 0;
  const clock = new THREE.Clock();
  const floatingObjects = [];
  const hoverableMeshes = [];

  // --- Raycaster for hover glow ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredObj = null;

  // Shared geometries
  const slabGeo = new THREE.BoxGeometry(22, 0.28, 22);
  const hStripGeo = new THREE.BoxGeometry(22, 0.025, 0.05);
  const vStripGeo = new THREE.BoxGeometry(0.05, 0.025, 22);
  const pillarH = 6 - 0.28;
  const pillarGeo = new THREE.CylinderGeometry(0.035, 0.035, pillarH, 6);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x151a14,
    metalness: 0.5,
    roughness: 0.6,
  });

  LAYERS.forEach((layer, index) => {
    const layerColor = new THREE.Color(layer.color);

    // Slab
    const slabMat = new THREE.MeshStandardMaterial({
      color: layerColor.clone().multiplyScalar(0.18),
      metalness: 0.4,
      roughness: 0.85,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.y = layer.y;
    layerGroup.add(slab);

    // Glow strips on top edges
    const stripMat = new THREE.MeshBasicMaterial({
      color: layerColor,
      transparent: true,
      opacity: 0.5,
    });
    const topY = layer.y + 0.153;
    [
      { geo: hStripGeo, pos: [0, topY, 10.975] },
      { geo: hStripGeo, pos: [0, topY, -10.975] },
      { geo: vStripGeo, pos: [-10.975, topY, 0] },
      { geo: vStripGeo, pos: [10.975, topY, 0] },
    ].forEach(({ geo, pos }) => {
      const strip = new THREE.Mesh(geo, stripMat);
      strip.position.set(pos[0], pos[1], pos[2]);
      layerGroup.add(strip);
    });

    // Point light
    const light = new THREE.PointLight(layerColor, 1.0, 18);
    light.position.set(0, layer.y + 3, 0);
    layerGroup.add(light);

    // Floating artifacts
    const geos = GEOMETRY_FACTORIES[index]();
    const offsets = OBJECT_OFFSETS[index];
    layer.objects.forEach((name, j) => {
      const mat = new THREE.MeshStandardMaterial({
        color: layerColor,
        metalness: 0.65,
        roughness: 0.35,
        emissive: layerColor,
        emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(geos[j], mat);
      const [ox, oy, oz] = offsets[j];
      const baseY = layer.y + oy;
      mesh.position.set(ox, baseY, oz);
      layerGroup.add(mesh);
      hoverableMeshes.push(mesh);

      const sprite = createTextSprite(name, layer.color);
      sprite.position.set(ox, baseY + 1.2, oz);
      layerGroup.add(sprite);

      floatingObjects.push({
        mesh,
        sprite,
        baseY,
        baseX: ox,
        baseZ: oz,
        glowTarget: 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.5,
        rotSpeedX: 0.001 + Math.random() * 0.004,
        rotSpeedY: 0.002 + Math.random() * 0.005,
      });
    });

    // Pillars to next layer
    if (index < LAYERS.length - 1) {
      const pillarCenterY = layer.y + 0.14 + pillarH / 2;
      [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(px, pillarCenterY, pz);
        layerGroup.add(pillar);
      });
    }
  });

  // Particles
  const particleCount = 600;
  const pPositions = new Float32Array(particleCount * 3);
  const pVelocities = [];
  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 50;
    pPositions[i * 3 + 1] = Math.random() * 32 - 4;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    pVelocities.push({
      x: (Math.random() - 0.5) * 0.004,
      y: 0.002 + Math.random() * 0.003,
      z: (Math.random() - 0.5) * 0.004,
    });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.07,
    color: 0x4a6741,
    transparent: true,
    opacity: 0.3,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // --- Events ---
  const onWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      cameraTargetZ += e.deltaY * 0.015;
      cameraTargetZ = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cameraTargetZ));
    } else {
      // Scroll through layers
      cameraTargetY -= e.deltaY * 0.008;
      cameraTargetY = Math.max(0, Math.min(24, cameraTargetY));
    }
  };
  container.addEventListener('wheel', onWheel, { passive: false });

  const onMouseDown = (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
  };
  const onMouseMove = (e) => {
    // Always track mouse for raycasting
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    if (!isDragging) return;
    rotationTarget += (e.clientX - lastMouseX) * 0.003;
    lastMouseX = e.clientX;
  };
  const onMouseUp = () => {
    isDragging = false;
  };
  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist = Math.hypot(dx, dy);
    } else {
      const t = e.touches[0];
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDist > 0) {
        const delta = lastPinchDist - dist;
        cameraTargetZ += delta * 0.08;
        cameraTargetZ = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cameraTargetZ));
      }
      lastPinchDist = dist;
    } else {
      const t = e.touches[0];
      const tdx = t.clientX - lastTouchX;
      const tdy = t.clientY - lastTouchY;
      cameraTargetY -= tdy * 0.035;
      cameraTargetY = Math.max(0, Math.min(24, cameraTargetY));
      rotationTarget += tdx * 0.004;
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
    }
  };
  const onTouchEnd = () => {
    lastPinchDist = 0;
  };
  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd, { passive: true });

  // Keyboard zoom
  const onKeyDown = (e) => {
    if (e.key === '=' || e.key === '+') {
      cameraTargetZ = Math.max(ZOOM_MIN, cameraTargetZ - 2);
    } else if (e.key === '-' || e.key === '_') {
      cameraTargetZ = Math.min(ZOOM_MAX, cameraTargetZ + 2);
    } else if (e.key === '0') {
      cameraTargetZ = 22; // reset zoom
    }
  };
  window.addEventListener('keydown', onKeyDown);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // --- Animation loop ---
  let animId;
  function animate() {
    animId = requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Camera lerp
    cameraCurrentY += (cameraTargetY - cameraCurrentY) * 0.055;
    cameraCurrentZ += (cameraTargetZ - cameraCurrentZ) * 0.065;
    camera.position.set(0, cameraCurrentY, cameraCurrentZ);
    camera.lookAt(0, cameraCurrentY - 2.5, 0);

    // Rotation lerp
    rotationCurrent += (rotationTarget - rotationCurrent) * 0.075;
    layerGroup.rotation.y = rotationCurrent;

    // Float objects
    for (let i = 0; i < floatingObjects.length; i++) {
      const obj = floatingObjects[i];
      const yOff = Math.sin(time * obj.speed + obj.phase) * 0.3;
      obj.mesh.position.y = obj.baseY + yOff;
      obj.mesh.rotation.x += obj.rotSpeedX;
      obj.mesh.rotation.y += obj.rotSpeedY;
      obj.sprite.position.y = obj.baseY + yOff + 1.2;
    }

    // --- Hover glow raycasting ---
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hoverableMeshes);
    let newHovered = null;
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      newHovered = floatingObjects.find((o) => o.mesh === hitMesh) || null;
    }
    if (newHovered !== hoveredObj) {
      if (hoveredObj) hoveredObj.glowTarget = 0.15;
      if (newHovered) newHovered.glowTarget = 0.6;
      hoveredObj = newHovered;
      container.style.cursor = newHovered ? 'pointer' : 'grab';
    }
    // Lerp emissiveIntensity
    for (let i = 0; i < floatingObjects.length; i++) {
      const obj = floatingObjects[i];
      const current = obj.mesh.material.emissiveIntensity;
      obj.mesh.material.emissiveIntensity += (obj.glowTarget - current) * 0.1;
    }

    // Drift particles
    const posArr = pGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      posArr[i3] += pVelocities[i].x;
      posArr[i3 + 1] += pVelocities[i].y;
      posArr[i3 + 2] += pVelocities[i].z;
      if (posArr[i3 + 1] > 30) posArr[i3 + 1] = -4;
      if (posArr[i3] > 25 || posArr[i3] < -25) pVelocities[i].x *= -1;
      if (posArr[i3 + 2] > 25 || posArr[i3 + 2] < -25) pVelocities[i].z *= -1;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Active layer detection
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < LAYERS.length; i++) {
      const dist = Math.abs(cameraCurrentY - LAYERS[i].y);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    if (closest !== currentActiveLayer) {
      currentActiveLayer = closest;
      onLayerChange(closest);
    }

    renderer.render(scene, camera);
  }
  animate();

  return {
    scrollToLayer(index) {
      if (index >= 0 && index < LAYERS.length) {
        cameraTargetY = LAYERS[index].y;
      }
    },
    cleanup() {
      cancelAnimationFrame(animId);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}
