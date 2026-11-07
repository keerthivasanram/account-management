import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * InstagramFleetHologram3D
 * 
 * A high-end, interactive 3D WebGL visualization directly modeling the company's work:
 * 1. Central Meta Graph API Gateway Core (Token federation, OAuth 2.0 PKCE)
 * 2. Employee Workforce Pods (managing workload with the 60 accounts/employee quota)
 * 3. Instagram Account Fleet (business & creator accounts with live status indicators)
 * 4. Animated Data Beams (traveling packets representing scheduled posts & token handshakes)
 * 5. Undulating 3D wave plane at the base matching the logo colors (#06dab4 teal and #02164b navy)
 */
export const InstagramFleetHologram3D = () => {
  const mountRef = useRef(null);
  const [activeMode, setActiveMode] = useState('fleet'); // 'fleet' | 'publishing' | 'security'
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xF8FAFC, 0.012);

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 520;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 16, 32);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
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
      console.warn('WebGL initialization failed:', e);
      return;
    }

    // 3. Brand Color Palette (matching exact logo colors)
    const colorTeal = new THREE.Color(0x06dab4);     // Logo Electric Teal (#06dab4)
    const colorNavy = new THREE.Color(0x02164b);     // Logo Deep Navy (#02164b)
    const colorGreen = new THREE.Color(0x166534);    // Enterprise Forest Green (#166534)
    const colorSky = new THREE.Color(0x0284c7);      // Tech Blue (#0284c7)
    const colorEmerald = new THREE.Color(0x22c55e);  // Status Healthy Green (#22c55e)

    // Master Group for 3D simulation
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // 4. Undulating 3D Parametric Wave Terrain at the Base (Matching Logo Waves)
    const waveWidth = 44;
    const waveDepth = 44;
    const waveSegments = 40;
    const waveGeometry = new THREE.PlaneGeometry(waveWidth, waveDepth, waveSegments, waveSegments);
    waveGeometry.rotateX(-Math.PI / 2);

    const waveMaterial = new THREE.MeshBasicMaterial({
      color: 0x06dab4,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const waveMesh = new THREE.Mesh(waveGeometry, waveMaterial);
    waveMesh.position.y = -8.5;
    masterGroup.add(waveMesh);

    // Save initial wave vertex positions for sinusoidal undulating animation
    const posAttr = waveGeometry.attributes.position;
    const initialPositions = posAttr.array.slice();

    // 5. Central 3D Meta Graph API Gateway Core
    const coreGroup = new THREE.Group();
    masterGroup.add(coreGroup);

    // Core Octahedron / Polyhedron
    const coreGeom = new THREE.OctahedronGeometry(2.4, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x02164b,
      emissive: 0x06dab4,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.85,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreGroup.add(coreMesh);

    // Core Wireframe Cage
    const cageGeom = new THREE.IcosahedronGeometry(3.1, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x06dab4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const cageMesh = new THREE.Mesh(cageGeom, cageMat);
    coreGroup.add(cageMesh);

    // Concentric Gyro Ring around Core (Token Gateway Ring)
    const coreRingGeom = new THREE.TorusGeometry(3.8, 0.06, 16, 64);
    const coreRingMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
    });
    const coreRing = new THREE.Mesh(coreRingGeom, coreRingMat);
    coreRing.rotation.x = Math.PI / 2.2;
    coreGroup.add(coreRing);

    // 6. Middle Tier: Employee Workforce Pods (4 Nodes with Quota Tracking)
    const employeePods = [];
    const empCount = 4;
    const empRadius = 8.5;
    const empNames = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'];
    const empQuotas = ['48/60', '32/60', '56/60', '24/60'];

    const empGeom = new THREE.DodecahedronGeometry(0.85, 0);

    for (let i = 0; i < empCount; i++) {
      const angle = (i / empCount) * Math.PI * 2;
      const x = Math.cos(angle) * empRadius;
      const z = Math.sin(angle) * empRadius;
      const y = Math.sin(angle * 2) * 1.2;

      const empMat = new THREE.MeshStandardMaterial({
        color: 0x166534,
        emissive: 0x166534,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.7,
      });

      const empMesh = new THREE.Mesh(empGeom, empMat);
      empMesh.position.set(x, y, z);
      masterGroup.add(empMesh);

      // Orbital indicator ring around employee pod
      const haloGeom = new THREE.RingGeometry(1.2, 1.35, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const haloMesh = new THREE.Mesh(haloGeom, haloMat);
      haloMesh.position.set(x, y, z);
      haloMesh.rotation.x = Math.PI / 2;
      masterGroup.add(haloMesh);

      employeePods.push({
        name: empNames[i],
        quota: empQuotas[i],
        mesh: empMesh,
        halo: haloMesh,
        angle: angle,
        basePos: new THREE.Vector3(x, y, z),
      });
    }

    // 7. Outer Tier: Instagram Account Fleet (8 Managed Accounts in Orbit)
    const accounts = [];
    const accCount = 8;
    const accRadius = 14.5;
    const accNames = [
      '@klarves_corporate',
      '@enterprise_brand',
      '@nordic_retail',
      '@fintech_insights',
      '@global_ventures',
      '@apex_marketing',
      '@clarity_media',
      '@prime_studios',
    ];

    const accGeom = new THREE.BoxGeometry(0.9, 0.9, 0.9);

    for (let i = 0; i < accCount; i++) {
      const angle = (i / accCount) * Math.PI * 2;
      const x = Math.cos(angle) * accRadius;
      const z = Math.sin(angle) * accRadius;
      const y = Math.sin(angle * 3) * 1.8;

      const isLive = i % 3 !== 0;
      const accMat = new THREE.MeshStandardMaterial({
        color: isLive ? 0x06dab4 : 0x0284c7,
        emissive: isLive ? 0x06dab4 : 0x02164b,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8,
      });

      const accMesh = new THREE.Mesh(accGeom, accMat);
      accMesh.position.set(x, y, z);
      masterGroup.add(accMesh);

      // Associated employee pod index
      const parentEmpIdx = i % empCount;

      accounts.push({
        handle: accNames[i],
        mesh: accMesh,
        angle: angle,
        basePos: new THREE.Vector3(x, y, z),
        empIdx: parentEmpIdx,
        status: isLive ? 'Synced & Publishing' : 'Queue Scheduled',
      });
    }

    // 8. Communication Conduits (Beams between Gateway -> Employee Pods -> Accounts)
    const conduitMaterials = [];
    const conduitGeometries = [];

    // Core to Employee Conduits
    employeePods.forEach((pod) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(pod.basePos.x * 0.5, 2.5, pod.basePos.z * 0.5),
        pod.basePos
      );
      const points = curve.getPoints(24);
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x06dab4,
        transparent: true,
        opacity: 0.28,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      masterGroup.add(line);
      conduitGeometries.push(lineGeom);
      conduitMaterials.push(lineMat);
    });

    // Employee Pods to Accounts Conduits
    accounts.forEach((acc) => {
      const parentPod = employeePods[acc.empIdx];
      const curve = new THREE.QuadraticBezierCurve3(
        parentPod.basePos,
        new THREE.Vector3(
          (parentPod.basePos.x + acc.basePos.x) * 0.5,
          -1.0,
          (parentPod.basePos.z + acc.basePos.z) * 0.5
        ),
        acc.basePos
      );
      const points = curve.getPoints(24);
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.22,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      masterGroup.add(line);
      conduitGeometries.push(lineGeom);
      conduitMaterials.push(lineMat);
    });

    // 9. Active Traveling Data Packets (Simulating Posts and OAuth Tokens Handshakes)
    const packets = [];
    const packetCount = 12;
    const packetGeom = new THREE.SphereGeometry(0.22, 10, 10);
    const packetMat = new THREE.MeshBasicMaterial({
      color: 0x06dab4,
      transparent: true,
      opacity: 0.95,
    });

    for (let p = 0; p < packetCount; p++) {
      const mesh = new THREE.Mesh(packetGeom, packetMat);
      masterGroup.add(mesh);
      packets.push({
        mesh: mesh,
        progress: (p / packetCount),
        speed: 0.005 + (p % 3) * 0.002,
        routeIndex: p % accounts.length,
      });
    }

    // 10. Fleet Orbit Boundary Ring
    const fleetOrbitGeom = new THREE.TorusGeometry(accRadius, 0.05, 16, 96);
    const fleetOrbitMat = new THREE.LineBasicMaterial({
      color: 0x02164b,
      transparent: true,
      opacity: 0.15,
    });
    const fleetOrbit = new THREE.Mesh(fleetOrbitGeom, fleetOrbitMat);
    fleetOrbit.rotation.x = Math.PI / 2;
    masterGroup.add(fleetOrbit);

    // 11. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06dab4, 1.4);
    dirLight1.position.set(20, 25, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0284c7, 0.9);
    dirLight2.position.set(-20, -10, -20);
    scene.add(dirLight2);

    // 12. Interactive Mouse Parallax & Drag Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationX = 0.25;
    let targetRotationY = 0;
    let currentRotationX = 0.25;
    let currentRotationY = 0;

    const handleMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        targetRotationY += deltaX * 0.008;
        targetRotationX += deltaY * 0.008;
        // Clamp vertical tilt
        targetRotationX = Math.max(-0.4, Math.min(0.8, targetRotationX));

        previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        // Subtle hover parallax
        const rect = container.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        targetRotationY += mouseX * 0.001;
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 13. Responsive Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 14. 60 FPS Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Inertial smooth rotation (damping)
      currentRotationX += (targetRotationX - currentRotationX) * 0.06;
      currentRotationY += (targetRotationY - currentRotationY) * 0.06;

      masterGroup.rotation.x = currentRotationX;
      masterGroup.rotation.y = currentRotationY + elapsed * 0.04;

      // Rotate Core
      coreMesh.rotation.y = elapsed * 0.4;
      coreMesh.rotation.x = elapsed * 0.2;
      cageMesh.rotation.y = -elapsed * 0.25;
      cageMesh.rotation.z = elapsed * 0.15;
      coreRing.rotation.z = elapsed * 0.3;

      // Undulate 3D Base Wave Plane (Sinusoidal Harmonics)
      const currentPos = waveGeometry.attributes.position.array;
      for (let i = 0; i < currentPos.length; i += 3) {
        const x = initialPositions[i];
        const z = initialPositions[i + 2];
        // Dual wave harmonic matching logo teal flow
        currentPos[i + 1] =
          Math.sin(x * 0.25 + elapsed * 1.4) * 0.8 +
          Math.cos(z * 0.22 + elapsed * 1.1) * 0.6;
      }
      waveGeometry.attributes.position.needsUpdate = true;

      // Animate Employee Pods (Breathing Quota Nodes)
      employeePods.forEach((pod, idx) => {
        const floatY = Math.sin(elapsed * 2 + idx) * 0.3;
        pod.mesh.position.y = pod.basePos.y + floatY;
        pod.halo.position.y = pod.basePos.y + floatY;
        pod.mesh.rotation.y = elapsed * 0.8;
      });

      // Animate Instagram Account Satellites
      accounts.forEach((acc, idx) => {
        acc.mesh.rotation.x = elapsed * 0.6 + idx;
        acc.mesh.rotation.y = elapsed * 0.5 + idx;
        const bob = Math.cos(elapsed * 2.2 + idx * 0.8) * 0.25;
        acc.mesh.position.y = acc.basePos.y + bob;
      });

      // Animate Traveling Data Packets (Simulating Publishing & OAuth Handshakes)
      packets.forEach((pkt) => {
        pkt.progress = (pkt.progress + pkt.speed) % 1.0;
        const targetAcc = accounts[pkt.routeIndex];
        const parentPod = employeePods[targetAcc.empIdx];

        if (pkt.progress < 0.45) {
          // Phase 1: From Core Gateway (0,0,0) to Employee Pod
          const t = pkt.progress / 0.45;
          pkt.mesh.position.lerpVectors(new THREE.Vector3(0, 0, 0), parentPod.mesh.position, t);
        } else {
          // Phase 2: From Employee Pod to Instagram Account
          const t = (pkt.progress - 0.45) / 0.55;
          pkt.mesh.position.lerpVectors(parentPod.mesh.position, targetAcc.mesh.position, t);
        }

        // Pulse packet size
        const scale = 0.8 + Math.sin(elapsed * 8 + pkt.routeIndex) * 0.4;
        pkt.mesh.scale.set(scale, scale, scale);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 15. Complete Lifecycle Disposal (Zero Memory Leaks on Navigation)
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Geometries
      waveGeometry.dispose();
      coreGeom.dispose();
      cageGeom.dispose();
      coreRingGeom.dispose();
      empGeom.dispose();
      accGeom.dispose();
      packetGeom.dispose();
      fleetOrbitGeom.dispose();
      conduitGeometries.forEach((g) => g.dispose());

      // Dispose Materials
      waveMaterial.dispose();
      coreMat.dispose();
      cageMat.dispose();
      coreRingMat.dispose();
      packetMat.dispose();
      fleetOrbitMat.dispose();
      conduitMaterials.forEach((m) => m.dispose());

      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] sm:h-[500px] lg:h-[580px] flex items-center justify-center select-none">
      {/* 3D WebGL Canvas */}
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing z-10"
        title="Click and drag to rotate the 3D fleet simulation"
      />

      {/* Mode Controls Bar: Company Work Context */}
      <div className="absolute top-2 left-4 sm:top-4 sm:left-4 z-20 flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-lg p-1 shadow-xs">
        <button
          onClick={() => setActiveMode('fleet')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors duration-150 ${
            activeMode === 'fleet'
              ? 'bg-[#166534] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Fleet Topology
        </button>
        <button
          onClick={() => setActiveMode('publishing')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors duration-150 ${
            activeMode === 'publishing'
              ? 'bg-[#0284c7] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Publishing Beams
        </button>
        <button
          onClick={() => setActiveMode('security')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors duration-150 ${
            activeMode === 'security'
              ? 'bg-[#02164b] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          60-Cap Governance
        </button>
      </div>

      {/* Floating Operational Telemetry Chips Anchored in 3D Space */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-sm max-w-[210px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-[#06dab4] animate-ping" />
          <span className="text-[11px] font-bold text-[#02164b] tracking-tight">Meta Graph Gateway</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono leading-tight">
          v20.0 • 8 Account Conduits • Zero Credential Exposure
        </p>
      </div>

      <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-sm max-w-[200px] text-right">
        <div className="flex items-center justify-end gap-1.5 mb-1">
          <span className="text-[11px] font-bold text-[#166534] tracking-tight">Workload Governed</span>
          <span className="h-2 w-2 rounded-full bg-[#166534]" />
        </div>
        <p className="text-[10px] text-slate-500 font-mono leading-tight">
          Team Pods: 48/60 Quota Balanced
        </p>
      </div>

      <div className="absolute bottom-4 right-4 z-20 hidden sm:block bg-white/90 backdrop-blur-md border border-slate-200 rounded-md px-2.5 py-1 shadow-xs text-[10px] text-slate-500 font-mono">
        Drag to inspect 3D node topology
      </div>
    </div>
  );
};

export default InstagramFleetHologram3D;
