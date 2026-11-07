import React, { useEffect, useRef } from 'react';

/**
 * LandingWaveBackground
 * 
 * Renders a mild, silky flow of organic color waves in the background matching the logo colors:
 * - Electric Cyan / Turquoise (#06dab4)
 * - Deep Corporate Navy (#02164b)
 * - Enterprise Forest Green (#166534)
 * - Soft Sky/Ocean Blue (#0284c7)
 * 
 * High-performance 2D Canvas with zero dependencies, 60fps, low CPU footprint,
 * and automatic cleanup on unmount.
 */
export const LandingWaveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let animationFrameId;
    let width = 0;
    let height = 0;
    let time = 0;

    // Handle high DPI displays smoothly
    const handleResize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Wave parameters tailored to logo palette
    // Logo colors: #06dab4 (Teal/Cyan), #02164b (Navy), #166534 (Forest Green)
    const waves = [
      {
        amplitude: 45,
        wavelength: 0.0018,
        speed: 0.0008,
        phase: 0,
        yOffset: 0.52,
        colorStart: 'rgba(6, 218, 180, 0.08)',   // Logo Bright Teal
        colorMid: 'rgba(2, 132, 199, 0.06)',     // Tech Ocean Blue
        colorEnd: 'rgba(2, 22, 75, 0.02)',       // Logo Deep Navy
      },
      {
        amplitude: 38,
        wavelength: 0.0024,
        speed: -0.0006,
        phase: 1.8,
        yOffset: 0.65,
        colorStart: 'rgba(2, 22, 75, 0.05)',     // Logo Deep Navy
        colorMid: 'rgba(22, 101, 52, 0.05)',     // Enterprise Green
        colorEnd: 'rgba(6, 218, 180, 0.04)',    // Logo Teal
      },
      {
        amplitude: 52,
        wavelength: 0.0014,
        speed: 0.0005,
        phase: 3.2,
        yOffset: 0.40,
        colorStart: 'rgba(6, 218, 180, 0.06)',   // Logo Teal Accent
        colorMid: 'rgba(56, 189, 248, 0.05)',    // Sky Cyan
        colorEnd: 'rgba(2, 22, 75, 0.03)',       // Deep Navy
      },
      {
        amplitude: 30,
        wavelength: 0.0030,
        speed: -0.0010,
        phase: 4.5,
        yOffset: 0.78,
        colorStart: 'rgba(22, 101, 52, 0.04)',   // Enterprise Green
        colorMid: 'rgba(6, 218, 180, 0.05)',     // Logo Teal
        colorEnd: 'rgba(2, 132, 199, 0.03)',     // Ocean Blue
      },
    ];

    const render = (timestamp) => {
      animationFrameId = requestAnimationFrame(render);
      time = timestamp;

      ctx.clearRect(0, 0, width, height);

      // Render each gentle organic wave
      waves.forEach((w) => {
        ctx.beginPath();
        const baseHeight = height * w.yOffset;

        ctx.moveTo(0, height);
        ctx.lineTo(0, baseHeight);

        // Sinusoidal wave curve with harmonic interference
        for (let x = 0; x <= width; x += 8) {
          const y =
            baseHeight +
            Math.sin(x * w.wavelength + time * w.speed + w.phase) * w.amplitude +
            Math.cos(x * w.wavelength * 0.5 - time * w.speed * 0.7) * (w.amplitude * 0.35);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Gradient fill matching logo tones
        const grad = ctx.createLinearGradient(0, baseHeight - w.amplitude, width, height);
        grad.addColorStop(0, w.colorStart);
        grad.addColorStop(0.5, w.colorMid);
        grad.addColorStop(1, w.colorEnd);

        ctx.fillStyle = grad;
        ctx.fill();
      });
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Soft ambient radial glow in logo teal & navy */}
      <div 
        className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full blur-[140px] opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6, 218, 180, 0.18) 0%, rgba(2, 22, 75, 0.08) 50%, transparent 75%)',
        }}
      />
      <div 
        className="absolute bottom-10 left-10 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(2, 22, 75, 0.12) 0%, rgba(22, 101, 52, 0.08) 50%, transparent 75%)',
        }}
      />

      {/* Mild Wave Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-90 mix-blend-multiply"
      />
    </div>
  );
};

export default LandingWaveBackground;
