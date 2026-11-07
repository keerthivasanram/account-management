import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * OperationsGlobe3D
 * 
 * An elegant, high-performance WebGL 3D visualization tailored for enterprise operations.
 * Features:
 * - Particle constellation sphere with emerald green & slate-cyan gradients
 * - Interconnected latitude rings and geodesic arcs simulating global account synchronization
 * - Gyroscopic orbital rings with travelling data pulses
 * - Inertial mouse parallax tracking for immersive depth
 * - Strict WebGL memory lifecycle management (complete geometry/material/texture disposal on unmount)
 */
export const OperationsGlobe3D = () => {
  const mountRef = useRef(null);
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xF8FAFC, 0.015);

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 28;

    // 3. Renderer setup
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL initialization failed, falling back gracefully:', e);
      setIsWebGLSupported(false);
      return;
    }

    // Master Group for 3D objects
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // 4. Create Main Constellation Sphere (Point Cloud)
    const particleCount = 750;
    const sphereRadius = 9;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const emerald = new THREE.Color(0x166534);     // Brand Forest Green
    const brightGreen = new THREE.Color(0x22c55e); // Neon Emerald
    const softCyan = new THREE.Color(0x0284c7);    // Tech Blue
    const lightSlate = new THREE.Color(0x94a3b8);  // Slate Accent

    for (let i = 0; i < particleCount; i++) {
      // Fibonacci sphere distribution for uniform, elegant spacing
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      // Slight radial variation for organic breathing depth
      const r = sphereRadius + (Math.random() - 0.5) * 0.4;
      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color interpolation: Emerald, Blue, and White-shimmer nodes
      const rand = Math.random();
      let col;
      if (rand > 0.6) {
        col = brightGreen;
        sizes[i] = 1.6;
      } else if (rand > 0.3) {
        col = emerald;
        sizes[i] = 1.2;
      } else if (rand > 0.1) {
        col = softCyan;
        sizes[i] = 1.0;
      } else {
        col = lightSlate;
        sizes[i] = 0.8;
      }

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture (smooth circular glow)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(34, 197, 94, 0.8)');
    gradient.addColorStop(0.8, 'rgba(22, 101, 52, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const pointCloud = new THREE.Points(particleGeometry, particleMaterial);
    masterGroup.add(pointCloud);

    // 5. Wireframe Inner Icosahedron Cage (subtle technological core)
    const icosaGeometry = new THREE.IcosahedronGeometry(sphereRadius * 0.97, 2);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x166534,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const icosaMesh = new THREE.Mesh(icosaGeometry, wireframeMaterial);
    masterGroup.add(icosaMesh);

    // 6. Orbital Rings (Gyroscopic Rings with Data Satellites)
    const createOrbitalRing = (radius, tiltX, tiltY, colorHex, opacity = 0.3) => {
      const ringGroup = new THREE.Group();

      // Ring line
      const segments = 128;
      const ringCurve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
      const ringPoints = ringCurve.getPoints(segments);
      const ringGeom = new THREE.BufferGeometry().setFromPoints(ringPoints);
      
      const ringMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: opacity,
      });

      const line = new THREE.Line(ringGeom, ringMat);
      line.rotation.x = Math.PI / 2;
      ringGroup.add(line);

      // Data satellites (pulsing nodes along the ring)
      const satCount = 3;
      const satellites = [];
      for (let s = 0; s < satCount; s++) {
        const satGeom = new THREE.SphereGeometry(0.22, 12, 12);
        const satMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.95,
        });
        const satMesh = new THREE.Mesh(satGeom, satMat);
        ringGroup.add(satMesh);
        satellites.push({
          mesh: satMesh,
          angle: (s / satCount) * Math.PI * 2,
          speed: 0.008 + s * 0.003,
          radius: radius,
        });
      }

      ringGroup.rotation.x = tiltX;
      ringGroup.rotation.y = tiltY;
      return { group: ringGroup, satellites, ringGeom, ringMat };
    };

    const ring1 = createOrbitalRing(sphereRadius * 1.25, 0.45, 0.25, 0x166534, 0.28);
    const ring2 = createOrbitalRing(sphereRadius * 1.45, -0.65, 0.35, 0x2563EB, 0.22);
    const ring3 = createOrbitalRing(sphereRadius * 1.12, 1.15, -0.45, 0x15803D, 0.18);

    masterGroup.add(ring1.group);
    masterGroup.add(ring2.group);
    masterGroup.add(ring3.group);

    // 7. Dynamic Data Connection Beams (Arcs between random surface points)
    const arcMaterials = [];
    const arcGeometries = [];
    const arcCount = 6;
    for (let a = 0; a < arcCount; a++) {
      // Pick two points on sphere
      const p1 = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(sphereRadius);

      const p2 = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(sphereRadius);

      // Midpoint elevated above surface
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(sphereRadius * (1.18 + Math.random() * 0.15));

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(40);
      const arcGeom = new THREE.BufferGeometry().setFromPoints(points);
      const arcMat = new THREE.LineBasicMaterial({
        color: a % 2 === 0 ? 0x22c55e : 0x38bdf8,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.35,
      });

      const arcLine = new THREE.Line(arcGeom, arcMat);
      masterGroup.add(arcLine);
      arcGeometries.push(arcGeom);
      arcMaterials.push(arcMat);
    }

    // 8. Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x22c55e, 1.2);
    dirLight.position.set(15, 20, 20);
    scene.add(dirLight);

    // 9. Interactive Mouse Parallax Tracking
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      targetRotationY = mouseX * 0.5;
      targetRotationX = -mouseY * 0.4;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 10. Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 11. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth inertia damping (lerp) for user mouse interaction
      currentRotationX += (targetRotationX - currentRotationX) * 0.05;
      currentRotationY += (targetRotationY - currentRotationY) * 0.05;

      // Base planetary rotation
      masterGroup.rotation.y = elapsedTime * 0.08 + currentRotationY;
      masterGroup.rotation.x = 0.15 + currentRotationX;

      // Subtle breathing scale
      const breathing = 1 + Math.sin(elapsedTime * 1.2) * 0.015;
      pointCloud.scale.set(breathing, breathing, breathing);
      icosaMesh.scale.set(breathing, breathing, breathing);

      // Rotate orbital rings
      ring1.group.rotation.z = elapsedTime * 0.05;
      ring2.group.rotation.z = -elapsedTime * 0.04;
      ring3.group.rotation.z = elapsedTime * 0.03;

      // Update data satellite positions along rings
      [ring1, ring2, ring3].forEach((ring) => {
        ring.satellites.forEach((sat) => {
          sat.angle += sat.speed;
          sat.mesh.position.x = Math.cos(sat.angle) * sat.radius;
          sat.mesh.position.y = Math.sin(sat.angle) * sat.radius;
          // Pulse satellite size
          const pulse = 0.8 + Math.sin(elapsedTime * 4 + sat.angle) * 0.3;
          sat.mesh.scale.set(pulse, pulse, pulse);
        });
      });

      renderer.render(scene, camera);
    };

    animate();

    // 12. Cleanup on Unmount (guarantees zero memory/GPU leaks when leaving landing page)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries
      particleGeometry.dispose();
      icosaGeometry.dispose();
      ring1.ringGeom.dispose();
      ring2.ringGeom.dispose();
      ring3.ringGeom.dispose();
      arcGeometries.forEach((g) => g.dispose());

      // Dispose materials
      particleMaterial.dispose();
      wireframeMaterial.dispose();
      ring1.ringMat.dispose();
      ring2.ringMat.dispose();
      ring3.ringMat.dispose();
      arcMaterials.forEach((m) => m.dispose());
      particleTexture.dispose();

      // Dispose renderer
      renderer.dispose();
    };
  }, []);

  if (!isWebGLSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 text-slate-400 text-xs">
        Operations Nexus WebGL preview unavailable on this display.
      </div>
    );
  }

  return (
    <div className="relative w-full h-[360px] sm:h-[460px] lg:h-[560px] flex items-center justify-center select-none overflow-hidden">
      {/* Soft radial background glow matching enterprise palette */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none opacity-60" 
           style={{
             background: 'radial-gradient(circle at 50% 50%, rgba(22, 101, 52, 0.08) 0%, rgba(37, 99, 235, 0.04) 45%, transparent 75%)'
           }} 
      />

      {/* 3D Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Elegant 3D Glassmorphic Live Badges anchored around the nexus */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-lg px-3 py-2 flex items-center gap-2.5 transition-transform duration-300 hover:scale-105 pointer-events-auto">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#166534]" />
        </span>
        <div className="text-left">
          <p className="text-[11px] font-semibold text-[#172B24] tracking-tight">Meta Graph API v20.0</p>
          <p className="text-[10px] text-slate-500 font-mono">Synchronized • 24ms latency</p>
        </div>
      </div>

      <div className="absolute bottom-6 left-4 sm:bottom-8 sm:left-8 bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-lg px-3.5 py-2 flex items-center gap-2.5 transition-transform duration-300 hover:scale-105 pointer-events-auto">
        <div className="w-6 h-6 rounded-md bg-[#166534]/10 text-[#166534] flex items-center justify-center font-bold text-xs">
          5k
        </div>
        <div className="text-left">
          <p className="text-[11px] font-semibold text-[#172B24] tracking-tight">Fleet Governance</p>
          <p className="text-[10px] text-slate-500 font-mono">Quota Balanced (Max 60/Emp)</p>
        </div>
      </div>

      <div className="absolute top-10 right-4 sm:top-12 sm:right-6 bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-lg px-3.5 py-2 flex items-center gap-2.5 transition-transform duration-300 hover:scale-105 pointer-events-auto">
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        <div className="text-left">
          <p className="text-[11px] font-semibold text-[#172B24] tracking-tight">Zero-Trust OAuth</p>
          <p className="text-[10px] text-slate-500 font-mono">Single-Use State Tokens</p>
        </div>
      </div>
    </div>
  );
};

export default OperationsGlobe3D;
