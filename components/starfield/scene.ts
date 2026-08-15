// Faithful port of jevvii-portfolio's src/js/three-scene.js ("Resonant Stark"
// stardust). 2000 sage/clay points in a 2000³ cube, FogExp² black, perspective
// camera at z=1000, slow organic rotation. Works on a main-thread canvas or an
// OffscreenCanvas handed to a Web Worker.
import * as THREE from 'three';

export interface SceneController {
  resize: (width: number, height: number) => void;
  setVisibility: (visible: boolean) => void;
  setMotion: (reduced: boolean) => void;
  dispose: () => void;
}

export function createScene(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  width: number,
  height: number,
  pixelRatio: number,
  prefersReducedMotion: boolean,
): SceneController {
  let isVisible = true;
  let isReducedMotion = prefersReducedMotion;
  let animationId = 0;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: pixelRatio === 1,
    alpha: true,
    powerPreference: 'high-performance',
    precision: 'mediump',
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001); // deep-black space

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 1000;

  // Organic "stardust" — one draw call via BufferGeometry + Points.
  const particleCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const colorSage = new THREE.Color(0x8a9a86); // --accent
  const colorClay = new THREE.Color(0xa89f91); // accent-secondary
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2000;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    const mix = Math.random() > 0.5 ? colorSage : colorClay;
    colors[i * 3] = mix.r;
    colors[i * 3 + 1] = mix.g;
    colors[i * 3 + 2] = mix.b;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const animate = () => {
    if (!isVisible) return;
    animationId = requestAnimationFrame(animate);
    if (!isReducedMotion) {
      particles.rotation.y += 0.0005;
      particles.rotation.x += 0.0002;
    }
    renderer.render(scene, camera);
  };
  animate();

  return {
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    setVisibility: (visible) => {
      isVisible = visible;
      if (visible) animate();
      else cancelAnimationFrame(animationId);
    },
    setMotion: (reduced) => {
      isReducedMotion = reduced;
    },
    dispose: () => {
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}