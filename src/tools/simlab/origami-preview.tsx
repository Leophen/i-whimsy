'use client';

import * as React from 'react';
import * as THREE from 'three';

import { buildFoldMesh, type CreasePattern } from '@/lib/core/origami';

export interface OrigamiPreviewProps {
  pattern: CreasePattern;
  progress: number;
  className?: string;
}

export default function OrigamiPreview({ pattern, progress, className }: OrigamiPreviewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const cameraRef = React.useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = React.useRef<THREE.Mesh | null>(null);
  const frameRef = React.useRef(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(1, 2, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-2, -1, 1);
    scene.add(fill);

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: 0xfff8e7,
      side: THREE.DoubleSide,
      roughness: 0.75,
      metalness: 0.02,
    });
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    scene.add(mesh);

    const grid = new THREE.GridHelper(300, 20, 0xcccccc, 0xe4e4e7);
    grid.position.y = -pattern.paperHeight * 0.6;
    scene.add(grid);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const t = performance.now() * 0.0003;
      const maxDim = Math.max(pattern.paperWidth, pattern.paperHeight);
      const dist = maxDim * 2.2;
      camera.position.set(
        Math.cos(t) * dist,
        maxDim * 0.9 + Math.sin(t * 0.7) * maxDim * 0.15,
        Math.sin(t) * dist,
      );
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      meshRef.current = null;
    };
  }, [pattern.paperWidth, pattern.paperHeight]);

  React.useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const foldMesh = buildFoldMesh(pattern, progress / 100);
    const w = pattern.paperWidth;
    const h = pattern.paperHeight;

    const positions = new Float32Array(foldMesh.positions.length);
    for (let i = 0; i < foldMesh.positions.length / 3; i++) {
      positions[i * 3] = foldMesh.positions[i * 3] - w / 2;
      positions[i * 3 + 1] = foldMesh.positions[i * 3 + 2];
      positions[i * 3 + 2] = -(foldMesh.positions[i * 3 + 1] - h / 2);
    }

    const geometry = mesh.geometry as THREE.BufferGeometry;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(foldMesh.indices, 1));
    geometry.computeVertexNormals();
    geometry.attributes.position.needsUpdate = true;
  }, [pattern, progress]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 320 }}
    />
  );
}
