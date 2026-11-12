import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * BidKaro — Gemini Glow Particle & Aurora Background
 * High-performance HTML5 Canvas simulation inspired by Google Gemini 2.5 Canvas & Vercel Geist.
 * Features:
 * - Fluid organic floating particles with Gemini palette (Blue, Violet, Cyan, Emerald)
 * - Dynamic proximity filaments connecting nearby nodes
 * - Radial iridescent aurora spotlights with breathing cycles
 * - Smooth cursor interactivity (gentle repulsion/sway)
 * - Automatic retina DPI scaling and resize handling
 * - Full Alabaster Light Mode support
 */
export function GeminiGlowBackground({ interactive = true, particleCount = 42, intensity = 'normal' }) {
  const canvasRef = useRef(null);
  const themeCtx = useTheme();
  const isLight = themeCtx?.resolvedTheme === 'light';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // High DPI scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Mouse coordinates
    let mouse = {
      x: width / 2,
      y: height / 2,
      radius: 140,
      active: false,
    };

    // Color palette — adapts to theme
    const darkColors = [
      'rgba(59, 130, 246, ',   // Gemini Blue
      'rgba(139, 92, 246, ',   // Royal Violet
      'rgba(6, 182, 212, ',    // Neon Cyan
      'rgba(16, 185, 129, ',   // Emerald Green
      'rgba(99, 102, 241, ',   // Indigo
    ];

    const lightColors = [
      'rgba(37, 99, 235, ',    // Deep Blue
      'rgba(109, 40, 217, ',   // Deep Violet
      'rgba(8, 145, 178, ',    // Deep Cyan
      'rgba(5, 150, 105, ',    // Deep Emerald
      'rgba(67, 56, 202, ',    // Deep Indigo
    ];

    const colors = isLight ? lightColors : darkColors;

    // Generate particles
    const count = width < 768 ? Math.floor(particleCount * 0.6) : particleCount;
    const particles = [];

    for (let i = 0; i < count; i++) {
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2.2 + 0.8,
        colorBase: colorBase,
        alpha: isLight ? (Math.random() * 0.3 + 0.10) : (Math.random() * 0.5 + 0.25),
        pulseSpeed: Math.random() * 0.02 + 0.008,
        pulseVal: Math.random() * Math.PI,
      });
    }

    // Handle mouse move
    const handleMouseMove = (e) => {
      if (!interactive) return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let tick = 0;
    const render = () => {
      tick += 0.01;
      ctx.clearRect(0, 0, width, height);

      // ── 1. Draw Dual Breathing Gemini Aurora Glows ─────────────
      const auroraX1 = width * 0.5 + Math.sin(tick * 0.6) * 120;
      const auroraY1 = height * 0.2 + Math.cos(tick * 0.4) * 80;
      const rad1 = Math.max(width, height) * 0.65;
      const grad1 = ctx.createRadialGradient(auroraX1, auroraY1, 0, auroraX1, auroraY1, rad1);

      if (isLight) {
        grad1.addColorStop(0, 'rgba(37, 99, 235, 0.10)');
        grad1.addColorStop(0.35, 'rgba(109, 40, 217, 0.05)');
        grad1.addColorStop(0.7, 'rgba(8, 145, 178, 0.02)');
        grad1.addColorStop(1, 'transparent');
      } else {
        grad1.addColorStop(0, 'rgba(59, 130, 246, 0.16)');
        grad1.addColorStop(0.35, 'rgba(139, 92, 246, 0.08)');
        grad1.addColorStop(0.7, 'rgba(6, 182, 212, 0.03)');
        grad1.addColorStop(1, 'transparent');
      }

      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const auroraX2 = width * 0.65 + Math.cos(tick * 0.5) * 100;
      const auroraY2 = height * 0.85 + Math.sin(tick * 0.7) * 70;
      const rad2 = Math.max(width, height) * 0.55;
      const grad2 = ctx.createRadialGradient(auroraX2, auroraY2, 0, auroraX2, auroraY2, rad2);

      if (isLight) {
        grad2.addColorStop(0, 'rgba(5, 150, 105, 0.08)');
        grad2.addColorStop(0.4, 'rgba(37, 99, 235, 0.03)');
        grad2.addColorStop(1, 'transparent');
      } else {
        grad2.addColorStop(0, 'rgba(16, 185, 129, 0.10)');
        grad2.addColorStop(0.4, 'rgba(59, 130, 246, 0.05)');
        grad2.addColorStop(1, 'transparent');
      }

      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // ── 2. Update & Draw Particles ──────────────────────────────
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges smoothly
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Interactive mouse repulsion
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            p.x += (dx / dist) * force * 1.8;
            p.y += (dy / dist) * force * 1.8;
          }
        }

        // Pulse alpha
        p.pulseVal += p.pulseSpeed;
        const currentAlpha = p.alpha + Math.sin(p.pulseVal) * (isLight ? 0.08 : 0.18);

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.colorBase}${Math.max(0.05, currentAlpha)})`;
        ctx.shadowColor = `${p.colorBase}${isLight ? '0.4' : '0.8'})`;
        ctx.shadowBlur = isLight ? 4 : 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // ── 3. Draw Proximity Filaments between nodes ─────────────
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 120;
          if (dist < maxDist) {
            const filamentAlpha = (1 - dist / maxDist) * (isLight ? 0.08 : 0.16);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isLight
              ? `rgba(37, 99, 235, ${filamentAlpha})`
              : `rgba(147, 197, 253, ${filamentAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [interactive, particleCount, intensity, isLight]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        // Transparent canvas so CSS var(--outer-shell-bg) and theme variables shine through seamlessly
        background: 'transparent',
      }}
    />
  );
}

export default GeminiGlowBackground;
