import * as THREE from 'three';
import { LAYERS } from './layers';

const ROOM_DEPTH = 14;
const ROOM_WIDTH = 10;
const ROOM_HEIGHT = 5;
const DOOR_WIDTH = 3;
const DOOR_HEIGHT = 3.8;
const ROOM_CENTERS = LAYERS.map((_, i) => i * ROOM_DEPTH + ROOM_DEPTH / 2);
const INTRO_FLY_DURATION = 3.5;  // fly from outside → last room
const INTRO_TURN_DURATION = 1.2; // 180° camera turn at the end
const INTRO_TOTAL_DURATION = INTRO_FLY_DURATION + INTRO_TURN_DURATION;

const GEOMETRY_FACTORIES = [
  () => [
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.BoxGeometry(0.65, 0.65, 0.65),
    new THREE.OctahedronGeometry(0.5),
  ],
  () => [
    new THREE.TorusGeometry(0.4, 0.16, 12, 24),
    new THREE.TetrahedronGeometry(0.55),
    new THREE.IcosahedronGeometry(0.45, 0),
  ],
  () => [
    new THREE.BoxGeometry(0.55, 0.55, 0.55),
    new THREE.OctahedronGeometry(0.45),
    new THREE.TorusGeometry(0.38, 0.14, 12, 24),
  ],
  () => [
    new THREE.TetrahedronGeometry(0.5),
    new THREE.IcosahedronGeometry(0.4, 1),
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
  ],
  () => [
    new THREE.OctahedronGeometry(0.5),
    new THREE.TorusGeometry(0.4, 0.16, 12, 24),
    new THREE.TetrahedronGeometry(0.5),
  ],
];

const OBJECT_OFFSETS = [
  [[-3, 2.5, -3], [0, 3.0, 2], [3.2, 2.3, -1]],
  [[-2.5, 2.8, 1], [0.5, 2.4, -3], [3, 2.6, 2.5]],
  [[-3.5, 2.5, -2], [0, 2.9, 3], [2.8, 2.3, -2.5]],
  [[-2, 2.7, 3], [1, 2.4, -2.5], [3.5, 2.6, 0.5]],
  [[-3, 2.5, -1], [0.5, 2.8, 2.5], [3, 2.4, -3]],
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
  sprite.scale.set(3, 0.4, 1);
  return sprite;
}

function buildRoom(layerGroup, layer, index) {
  const roomZ = index * ROOM_DEPTH;
  const centerZ = roomZ + ROOM_DEPTH / 2;
  const layerColor = new THREE.Color(layer.color);

  const wallColor = layerColor.clone().multiplyScalar(0.35);
  const floorColor = layerColor.clone().multiplyScalar(0.12);
  const ceilColor = layerColor.clone().multiplyScalar(0.2);

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.92,
    metalness: 0.05,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: floorColor,
    roughness: 0.85,
    metalness: 0.1,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: ceilColor,
    roughness: 0.95,
    metalness: 0.02,
  });

  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH, 0.12, ROOM_DEPTH),
    floorMat
  );
  floor.position.set(0, 0.06, centerZ);
  layerGroup.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH, 0.12, ROOM_DEPTH),
    ceilMat
  );
  ceil.position.set(0, ROOM_HEIGHT, centerZ);
  layerGroup.add(ceil);

  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, ROOM_HEIGHT, ROOM_DEPTH),
    wallMat
  );
  leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, centerZ);
  layerGroup.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, ROOM_HEIGHT, ROOM_DEPTH),
    wallMat.clone()
  );
  rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, centerZ);
  layerGroup.add(rightWall);

  // Back wall (first room only) — with entrance doorway
  if (index === 0) {
    const sideW = (ROOM_WIDTH - DOOR_WIDTH) / 2;
    // Left panel
    const blp = new THREE.Mesh(
      new THREE.BoxGeometry(sideW, ROOM_HEIGHT, 0.12),
      wallMat.clone()
    );
    blp.position.set(-ROOM_WIDTH / 2 + sideW / 2, ROOM_HEIGHT / 2, roomZ);
    layerGroup.add(blp);
    // Right panel
    const brp = new THREE.Mesh(
      new THREE.BoxGeometry(sideW, ROOM_HEIGHT, 0.12),
      wallMat.clone()
    );
    brp.position.set(ROOM_WIDTH / 2 - sideW / 2, ROOM_HEIGHT / 2, roomZ);
    layerGroup.add(brp);
    // Top beam above door
    const topH = ROOM_HEIGHT - DOOR_HEIGHT;
    const btb = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_WIDTH, topH, 0.12),
      wallMat.clone()
    );
    btb.position.set(0, DOOR_HEIGHT + topH / 2, roomZ);
    layerGroup.add(btb);
  }

  // Dividing wall with doorway (or solid end wall for last room)
  const wallZ = roomZ + ROOM_DEPTH;
  if (index < LAYERS.length - 1) {
    const sideW = (ROOM_WIDTH - DOOR_WIDTH) / 2;
    // Left panel
    const lp = new THREE.Mesh(
      new THREE.BoxGeometry(sideW, ROOM_HEIGHT, 0.12),
      wallMat.clone()
    );
    lp.position.set(-ROOM_WIDTH / 2 + sideW / 2, ROOM_HEIGHT / 2, wallZ);
    layerGroup.add(lp);
    // Right panel
    const rp = new THREE.Mesh(
      new THREE.BoxGeometry(sideW, ROOM_HEIGHT, 0.12),
      wallMat.clone()
    );
    rp.position.set(ROOM_WIDTH / 2 - sideW / 2, ROOM_HEIGHT / 2, wallZ);
    layerGroup.add(rp);
    // Top beam
    const topH = ROOM_HEIGHT - DOOR_HEIGHT;
    const tb = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_WIDTH, topH, 0.12),
      wallMat.clone()
    );
    tb.position.set(0, DOOR_HEIGHT + topH / 2, wallZ);
    layerGroup.add(tb);
  } else {
    const endWall = new THREE.Mesh(
      new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, 0.12),
      wallMat.clone()
    );
    endWall.position.set(0, ROOM_HEIGHT / 2, wallZ);
    layerGroup.add(endWall);
  }

  // Glow strip along floor-wall junction
  const stripMat = new THREE.MeshBasicMaterial({
    color: layerColor,
    transparent: true,
    opacity: 0.35,
  });
  const stripGeo = new THREE.BoxGeometry(ROOM_WIDTH - 0.3, 0.02, 0.04);
  const backStrip = new THREE.Mesh(stripGeo, stripMat);
  backStrip.position.set(0, 0.13, roomZ + 0.15);
  layerGroup.add(backStrip);
  const frontStrip = new THREE.Mesh(stripGeo, stripMat.clone());
  frontStrip.position.set(0, 0.13, wallZ - 0.15);
  layerGroup.add(frontStrip);

  // Point light
  const light = new THREE.PointLight(layerColor, 0.8, 16);
  light.position.set(0, ROOM_HEIGHT - 0.5, centerZ);
  layerGroup.add(light);
}

function buildExterior(layerGroup) {
  const totalDepth = LAYERS.length * ROOM_DEPTH;
  const extColor = new THREE.Color('#0e120e');

  // Ground plane extending outside the house
  const groundMat = new THREE.MeshStandardMaterial({
    color: extColor,
    roughness: 0.95,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    groundMat
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, totalDepth / 2 - 8);
  layerGroup.add(ground);

  // Roof — flat with slight overhang
  const roofMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#151a14'),
    roughness: 0.9,
    metalness: 0.12,
  });
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH + 1.5, 0.18, totalDepth + 1.5),
    roofMat
  );
  roof.position.set(0, ROOM_HEIGHT + 0.09, totalDepth / 2);
  layerGroup.add(roof);

  // Outer front wall — left side (extends to frame the entrance)
  const outerWallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#141914'),
    roughness: 0.92,
    metalness: 0.08,
  });

  const facadeDepth = 0.3;
  const facadeSideW = (ROOM_WIDTH + 1.5 - DOOR_WIDTH) / 2;

  // Left facade panel
  const leftFacade = new THREE.Mesh(
    new THREE.BoxGeometry(facadeSideW, ROOM_HEIGHT, facadeDepth),
    outerWallMat
  );
  leftFacade.position.set(
    -(ROOM_WIDTH + 1.5) / 2 + facadeSideW / 2,
    ROOM_HEIGHT / 2,
    -facadeDepth / 2
  );
  layerGroup.add(leftFacade);

  // Right facade panel
  const rightFacade = new THREE.Mesh(
    new THREE.BoxGeometry(facadeSideW, ROOM_HEIGHT, facadeDepth),
    outerWallMat.clone()
  );
  rightFacade.position.set(
    (ROOM_WIDTH + 1.5) / 2 - facadeSideW / 2,
    ROOM_HEIGHT / 2,
    -facadeDepth / 2
  );
  layerGroup.add(rightFacade);

  // Top beam above entrance door on facade
  const facadeTopH = ROOM_HEIGHT - DOOR_HEIGHT;
  const facadeTop = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_WIDTH, facadeTopH, facadeDepth),
    outerWallMat.clone()
  );
  facadeTop.position.set(0, DOOR_HEIGHT + facadeTopH / 2, -facadeDepth / 2);
  layerGroup.add(facadeTop);

  // Side exterior walls (visible from outside)
  const leftOuterWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, ROOM_HEIGHT, totalDepth + 1.5),
    outerWallMat.clone()
  );
  leftOuterWall.position.set(-(ROOM_WIDTH + 1.5) / 2, ROOM_HEIGHT / 2, totalDepth / 2);
  layerGroup.add(leftOuterWall);

  const rightOuterWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, ROOM_HEIGHT, totalDepth + 1.5),
    outerWallMat.clone()
  );
  rightOuterWall.position.set((ROOM_WIDTH + 1.5) / 2, ROOM_HEIGHT / 2, totalDepth / 2);
  layerGroup.add(rightOuterWall);

  // Subtle glow strip above the entrance
  const entranceGlow = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_WIDTH + 0.5, 0.03, 0.06),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(LAYERS[0].color),
      transparent: true,
      opacity: 0.45,
    })
  );
  entranceGlow.position.set(0, DOOR_HEIGHT + 0.1, -0.15);
  layerGroup.add(entranceGlow);

  // Ambient light for exterior area
  const extLight = new THREE.PointLight(0x2a3a28, 0.6, 20);
  extLight.position.set(0, 3, -5);
  layerGroup.add(extLight);
}

// Smoothstep easing: t * t * (3 - 2t)
function smoothstep(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

export function initHouseScene(container, onLayerChange, onObjectClick) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080C08');
  scene.fog = new THREE.FogExp2(0x080c08, 0.028);

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  scene.add(new THREE.AmbientLight(0x1a2418, 0.4));

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  // --- Reduced motion preference ---
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Intro animation state ---
  let introPhase = !prefersReducedMotion;
  const introStartPos = new THREE.Vector3(0, 2.8, -10);
  const introEndPos = new THREE.Vector3(0, 2.2, ROOM_CENTERS[LAYERS.length - 1]);

  const startRoom = LAYERS.length - 1;
  let cameraTargetZ = ROOM_CENTERS[startRoom];
  let cameraCurrentZ = ROOM_CENTERS[startRoom];
  let yawTarget = 0;
  let yawCurrent = 0;
  let currentActiveLayer = startRoom;
  // Notify React of starting layer immediately
  onLayerChange(startRoom);
  let isDragging = false;
  let lastMouseX = 0;
  let mouseDownPos = { x: 0, y: 0 };
  let lastTouchX = 0;
  let lastTouchY = 0;
  let lastPinchDist = 0;
  let fovTarget = 65;
  let fovCurrent = 65;
  const FOV_MIN = 40;
  const FOV_MAX = 90;
  const clock = new THREE.Clock();
  const floatingObjects = [];
  const hoverableMeshes = [];

  // --- Raycaster for hover glow ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredObj = null;

  // Build exterior
  buildExterior(layerGroup);

  // Build rooms
  LAYERS.forEach((layer, index) => {
    buildRoom(layerGroup, layer, index);

    const geos = GEOMETRY_FACTORIES[index]();
    const offsets = OBJECT_OFFSETS[index];
    const roomCenterZ = ROOM_CENTERS[index];

    layer.objects.forEach((name, j) => {
      const layerColor = new THREE.Color(layer.color);
      const mat = new THREE.MeshStandardMaterial({
        color: layerColor,
        metalness: 0.65,
        roughness: 0.35,
        emissive: layerColor,
        emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(geos[j], mat);
      const [ox, oy, oz] = offsets[j];
      const baseY = oy;
      mesh.position.set(ox, baseY, roomCenterZ + oz);
      layerGroup.add(mesh);
      hoverableMeshes.push(mesh);

      const sprite = createTextSprite(name, layer.color);
      sprite.position.set(ox, baseY + 0.9, roomCenterZ + oz);
      layerGroup.add(sprite);

      floatingObjects.push({
        mesh,
        sprite,
        baseY,
        glowTarget: 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.5,
        rotSpeedX: 0.001 + Math.random() * 0.004,
        rotSpeedY: 0.002 + Math.random() * 0.005,
      });
    });
  });

  // Particles
  const particleCount = 600;
  const pPositions = new Float32Array(particleCount * 3);
  const pVelocities = [];
  const totalDepth = LAYERS.length * ROOM_DEPTH;
  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * ROOM_WIDTH * 0.8;
    pPositions[i * 3 + 1] = Math.random() * ROOM_HEIGHT;
    pPositions[i * 3 + 2] = Math.random() * totalDepth;
    pVelocities.push({
      x: (Math.random() - 0.5) * 0.003,
      y: 0.001 + Math.random() * 0.002,
      z: (Math.random() - 0.5) * 0.003,
    });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.05,
    color: 0x4a6741,
    transparent: true,
    opacity: 0.25,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // --- Events ---
  const minZ = ROOM_CENTERS[0];
  const maxZ = ROOM_CENTERS[ROOM_CENTERS.length - 1];

  const onWheel = (e) => {
    e.preventDefault();
    if (introPhase) return;
    if (e.ctrlKey || e.metaKey) {
      fovTarget += e.deltaY * 0.05;
      fovTarget = Math.max(FOV_MIN, Math.min(FOV_MAX, fovTarget));
    } else {
      cameraTargetZ -= e.deltaY * 0.012;
      cameraTargetZ = Math.max(minZ, Math.min(maxZ, cameraTargetZ));
    }
  };
  container.addEventListener('wheel', onWheel, { passive: false });

  const onMouseDown = (e) => {
    if (introPhase) return;
    isDragging = true;
    lastMouseX = e.clientX;
    mouseDownPos = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e) => {
    // Always track mouse for raycasting
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    if (introPhase) return;
    if (!isDragging) return;
    yawTarget += (e.clientX - lastMouseX) * 0.003;
    lastMouseX = e.clientX;
  };
  const onMouseUp = (e) => {
    isDragging = false;
    if (introPhase) return;
    // Click detection: if mouse barely moved, check for object click
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    const moved = Math.sqrt(dx * dx + dy * dy);
    if (moved < 5 && onObjectClick) {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hoverableMeshes);
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const objIndex = hoverableMeshes.indexOf(hitMesh);
        if (objIndex !== -1) {
          const layerIndex = Math.floor(objIndex / 3);
          const objectIndex = objIndex % 3;
          onObjectClick(layerIndex, objectIndex);
        }
      }
    }
  };
  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  const onTouchStart = (e) => {
    if (introPhase) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist = Math.hypot(dx, dy);
    } else {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (introPhase) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDist > 0) {
        fovTarget += (lastPinchDist - dist) * 0.15;
        fovTarget = Math.max(FOV_MIN, Math.min(FOV_MAX, fovTarget));
      }
      lastPinchDist = dist;
    } else {
      const t = e.touches[0];
      const tdx = t.clientX - lastTouchX;
      const tdy = t.clientY - lastTouchY;
      cameraTargetZ -= tdy * 0.05;
      cameraTargetZ = Math.max(minZ, Math.min(maxZ, cameraTargetZ));
      yawTarget += tdx * 0.004;
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

  const onKeyDown = (e) => {
    if (introPhase) return;
    if (e.key === '=' || e.key === '+') {
      fovTarget = Math.max(FOV_MIN, fovTarget - 3);
    } else if (e.key === '-' || e.key === '_') {
      fovTarget = Math.min(FOV_MAX, fovTarget + 3);
    } else if (e.key === '0') {
      fovTarget = 65;
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

    // --- Intro: Phase 1 = fly-through, Phase 2 = 180° turn ---
    if (introPhase) {
      if (time < INTRO_FLY_DURATION) {
        // Phase 1: fly from outside → last room, looking forward
        const t = smoothstep(time / INTRO_FLY_DURATION);
        camera.position.lerpVectors(introStartPos, introEndPos, t);
        const lookZ = camera.position.z + 10;
        camera.lookAt(0, 2.2, lookZ);

        // Detect active layer during fly-through for UI updates
        let closest = 0;
        let closestDist = Infinity;
        for (let i = 0; i < ROOM_CENTERS.length; i++) {
          const dist = Math.abs(camera.position.z - ROOM_CENTERS[i]);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        }
        if (closest !== currentActiveLayer) {
          currentActiveLayer = closest;
          onLayerChange(closest);
        }
      } else if (time < INTRO_TOTAL_DURATION) {
        // Phase 2: 180° turn at the last room
        const turnT = smoothstep((time - INTRO_FLY_DURATION) / INTRO_TURN_DURATION);
        const turnYaw = turnT * Math.PI; // 0 → π
        camera.position.copy(introEndPos);
        camera.lookAt(
          Math.sin(turnYaw) * 10,
          2.2,
          introEndPos.z + Math.cos(turnYaw) * 10
        );
      } else {
        // Intro complete — hand off to normal controls facing backward
        introPhase = false;
        cameraCurrentZ = introEndPos.z;
        cameraTargetZ = introEndPos.z;
        fovCurrent = 65;
        fovTarget = 65;
        yawCurrent = Math.PI;
        yawTarget = Math.PI;
        camera.position.copy(introEndPos);
      }
    }

    if (!introPhase) {
      // Camera Z lerp
      cameraCurrentZ += (cameraTargetZ - cameraCurrentZ) * 0.055;
      // Yaw lerp
      yawCurrent += (yawTarget - yawCurrent) * 0.075;
      // FOV lerp
      fovCurrent += (fovTarget - fovCurrent) * 0.065;
      camera.fov = fovCurrent;
      camera.updateProjectionMatrix();

      camera.position.set(0, 2.2, cameraCurrentZ);
      camera.lookAt(
        Math.sin(yawCurrent) * 10,
        2.2,
        cameraCurrentZ + Math.cos(yawCurrent) * 10
      );

      // Active layer detection (normal mode)
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < ROOM_CENTERS.length; i++) {
        const dist = Math.abs(cameraCurrentZ - ROOM_CENTERS[i]);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      if (closest !== currentActiveLayer) {
        currentActiveLayer = closest;
        onLayerChange(closest);
      }
    }

    // Float objects
    for (let i = 0; i < floatingObjects.length; i++) {
      const obj = floatingObjects[i];
      const yOff = prefersReducedMotion ? 0 : Math.sin(time * obj.speed + obj.phase) * 0.2;
      obj.mesh.position.y = obj.baseY + yOff;
      if (!prefersReducedMotion) {
        obj.mesh.rotation.x += obj.rotSpeedX;
        obj.mesh.rotation.y += obj.rotSpeedY;
      }
      obj.sprite.position.y = obj.baseY + yOff + 0.9;
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
      container.style.cursor = newHovered ? 'pointer' : (introPhase ? 'default' : 'grab');
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
      if (posArr[i3 + 1] > ROOM_HEIGHT) posArr[i3 + 1] = 0.2;
      if (posArr[i3] > ROOM_WIDTH / 2 - 0.5 || posArr[i3] < -ROOM_WIDTH / 2 + 0.5)
        pVelocities[i].x *= -1;
      if (posArr[i3 + 2] > totalDepth || posArr[i3 + 2] < 0)
        pVelocities[i].z *= -1;
    }
    pGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();

  return {
    scrollToLayer(index) {
      if (introPhase) return;
      if (index >= 0 && index < ROOM_CENTERS.length) {
        cameraTargetZ = ROOM_CENTERS[index];
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
