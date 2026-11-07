import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * GlassRibbon3D
 * 
 * An authentic 3D translucent glass ribbon sculpture:
 * - Curved, tilted elliptical ribbon geometry with beveled edges and open hollow center
 * - Physically-based glass material with transmission (0.95), crystal clarity, and soft IOR refraction
 * - Cyan (#06DAB4), aqua (#38BDF8), and light emerald (#34D399) specular edge highlights
 * - Very slow floating and gentle 3D rotation
 * - Low opacity & transparent glass body ensuring the headline remains 100% readable
 * - Clean WebGL lifecycle with complete memory disposal on unmount
 * - Respects prefers-reduced-motion
 */
export const GlassRibbon3D = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 0, 34);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer with Alpha Transparency
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0); // 100% transparent background
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL initialization failed for glass ribbon:', e);
      return;
    }

    // 3. Construct 3D Closed Elliptical Ribbon Curve (Tilted from bottom-left to top-right)
    const curvePoints = [];
    const tiltAngle = -34 * (Math.PI / 180); // -34 deg diagonal tilt matching reference
    const stepsCount = 72;

    for (let i = 0; i < stepsCount; i++) {
      const t = (i / stepsCount) * Math.PI * 2;
      const xr = 13.8 * Math.cos(t);
      const yr = 7.6 * Math.sin(t);
      // Subtle 3D saddle height wave for natural depth
      const z = 3.6 * Math.sin(t * 2);

      // Rotate around Z axis by tiltAngle
      const x = xr * Math.cos(tiltAngle) - yr * Math.sin(tiltAngle);
      const y = xr * Math.sin(tiltAngle) + yr * Math.cos(tiltAngle);

      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    const closedCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal');

    // 4. Rectangular Cross-Section Shape for Ribbon Extrusion
    const ribbonWidth = 1.9;
    const ribbonThickness = 0.22;
    const ribbonShape = new THREE.Shape();
    ribbonShape.moveTo(-ribbonWidth / 2, -ribbonThickness / 2);
    ribbonShape.lineTo(ribbonWidth / 2, -ribbonThickness / 2);
    ribbonShape.lineTo(ribbonWidth / 2, ribbonThickness / 2);
    ribbonShape.lineTo(-ribbonWidth / 2, ribbonThickness / 2);
    ribbonShape.closePath();

    const ribbonGeometry = new THREE.ExtrudeGeometry(ribbonShape, {
      extrudePath: closedCurve,
      steps: 160,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 3,
    });

    // 5. Physically-Based Translucent Glass Material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95, // Transparent clear glass body
      opacity: 0.78,
      transparent: true,
      roughness: 0.06,
      ior: 1.48, // Authentic glass refraction
      reflectivity: 0.85,
      specularIntensity: 1.2,
      specularColor: new THREE.Color(0x06dab4), // Cyan specular highlight
      attenuationColor: new THREE.Color(0x34d399), // Subtle emerald refraction
      attenuationDistance: 8.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false, // Ensures foreground elements never clip
    });

    const ribbonMesh = new THREE.Mesh(ribbonGeometry, glassMaterial);
    scene.add(ribbonMesh);

    // 6. Realistic Glass Lighting Setup
    // Key Light: Soft white light from top-right
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(16, 22, 18);
    scene.add(keyLight);

    // Rim Light: Electric Cyan light catching outer glass edges from top-left
    const rimLight = new THREE.DirectionalLight(0x06dab4, 2.0);
    rimLight.position.set(-20, 14, 12);
    scene.add(rimLight);

    // Fill Light: Soft emerald-aqua glow from bottom
    const fillLight = new THREE.DirectionalLight(0x34d399, 0.9);
    fillLight.position.set(0, -18, 10);
    scene.add(fillLight);

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // 7. Check for Reduced Motion Preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 8. Animation Loop (Slow floating and gentle 3D rotation)
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!prefersReducedMotion) {
        const elapsed = clock.getElapsedTime();
        // Slow floating and gentle 3D rotation
        ribbonMesh.rotation.y = Math.sin(elapsed * 0.4) * 0.08;
        ribbonMesh.rotation.x = -0.42 + Math.cos(elapsed * 0.35) * 0.05;
        ribbonMesh.rotation.z = Math.sin(elapsed * 0.25) * 0.03;
        ribbonMesh.position.y = Math.sin(elapsed * 0.55) * 0.35;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Responsive Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 10. Complete Memory & WebGL Context Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      ribbonGeometry.dispose();
      glassMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] sm:w-[820px] lg:w-[940px] h-[380px] sm:h-[460px] pointer-events-none select-none z-0 flex items-center justify-center overflow-visible"
      aria-hidden="true"
    >
      {/* Soft ambient atmospheric glow behind the glass sculpture */}
      <div 
        className="absolute w-[460px] sm:w-[580px] h-[260px] sm:h-[320px] rounded-full blur-[90px] opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 62% 38%, rgba(6, 218, 180, 0.28) 0%, rgba(56, 189, 248, 0.14) 45%, rgba(16, 185, 129, 0.15) 70%, transparent 85%)',
        }}
      />

      {/* 3D Glass Ribbon Canvas Mount */}
      <div ref={mountRef} className="w-full h-full flex items-center justify-center" />
    </div>
  );
};

export default GlassRibbon3D;
