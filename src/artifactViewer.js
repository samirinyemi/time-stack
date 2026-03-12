import * as THREE from 'three';
import { GEOMETRY_TYPES } from './layers';

/**
 * Creates a mini Three.js scene that renders a spinning artifact shape
 * inside the overlay card. Returns { cleanup } to tear down on close.
 */
export function createArtifactViewer(containerEl, layerIndex, objectIndex, color) {
  const width = containerEl.clientWidth || 200;
  const height = 200;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputEncoding = THREE.sRGBEncoding;
  containerEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
  camera.position.set(0, 0, 3.2);
  camera.lookAt(0, 0, 0);

  // Lighting
  scene.add(new THREE.AmbientLight(0x222222, 0.6));

  const layerColor = new THREE.Color(color);

  // Key light
  const keyLight = new THREE.PointLight(layerColor, 1.5, 20);
  keyLight.position.set(2, 3, 4);
  scene.add(keyLight);

  // Fill light (opposite side, dimmer)
  const fillLight = new THREE.PointLight(0xffffff, 0.3, 15);
  fillLight.position.set(-3, -1, 2);
  scene.add(fillLight);

  // Rim light (behind, for silhouette glow)
  const rimLight = new THREE.PointLight(layerColor, 0.8, 12);
  rimLight.position.set(0, -2, -3);
  scene.add(rimLight);

  // Create the geometry
  const geoDesc = GEOMETRY_TYPES[layerIndex][objectIndex];
  let geometry;
  switch (geoDesc.type) {
    case 'icosahedron':
      geometry = new THREE.IcosahedronGeometry(...geoDesc.args);
      break;
    case 'box':
      geometry = new THREE.BoxGeometry(...geoDesc.args);
      break;
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(...geoDesc.args);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(...geoDesc.args);
      break;
    case 'tetrahedron':
      geometry = new THREE.TetrahedronGeometry(...geoDesc.args);
      break;
    default:
      geometry = new THREE.SphereGeometry(0.6);
  }

  // Material with glow
  const material = new THREE.MeshStandardMaterial({
    color: layerColor,
    metalness: 0.7,
    roughness: 0.25,
    emissive: layerColor,
    emissiveIntensity: 0.25,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Wireframe overlay for extra visual interest
  const wireMat = new THREE.MeshBasicMaterial({
    color: layerColor,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  });
  const wireMesh = new THREE.Mesh(geometry.clone(), wireMat);
  wireMesh.scale.setScalar(1.15);
  scene.add(wireMesh);

  // Particle ring around the shape
  const ringCount = 40;
  const ringPositions = new Float32Array(ringCount * 3);
  for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI * 2;
    const r = 1.2 + Math.random() * 0.3;
    ringPositions[i * 3] = Math.cos(angle) * r;
    ringPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
    ringPositions[i * 3 + 2] = Math.sin(angle) * r;
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
  const ringMat = new THREE.PointsMaterial({
    size: 0.04,
    color: layerColor,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  });
  const ringParticles = new THREE.Points(ringGeo, ringMat);
  scene.add(ringParticles);

  // Animation
  let animId;
  let startTime = performance.now();

  function animate() {
    animId = requestAnimationFrame(animate);
    const elapsed = (performance.now() - startTime) / 1000;

    // Rotate the shape
    mesh.rotation.x = elapsed * 0.4;
    mesh.rotation.y = elapsed * 0.6;

    // Wireframe counter-rotates
    wireMesh.rotation.x = -elapsed * 0.2;
    wireMesh.rotation.y = -elapsed * 0.3;

    // Pulse emissive
    material.emissiveIntensity = 0.25 + Math.sin(elapsed * 2) * 0.1;

    // Rotate particle ring
    ringParticles.rotation.y = elapsed * 0.3;

    // Gentle camera bob
    camera.position.y = Math.sin(elapsed * 0.5) * 0.15;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  // Handle container resize
  const resizeObserver = new ResizeObserver(() => {
    const w = containerEl.clientWidth || 200;
    camera.aspect = w / height;
    camera.updateProjectionMatrix();
    renderer.setSize(w, height);
  });
  resizeObserver.observe(containerEl);

  return {
    cleanup() {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      wireMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}
