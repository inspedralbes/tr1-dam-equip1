<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";

const canvasRef = ref(null);
let animId = null;

const COLORS = [
  "#14b8a6",
  "#f59e0b",
  "#38bdf8",
  "#f43f5e",
  "#a78bfa",
  "#facc15",
  "#34d399",
];

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  const particles = [];
  const spawnBurst = (originX, originY, angleBase, spread, count) => {
    for (let i = 0; i < count; i++) {
      const angle = angleBase + (Math.random() - 0.5) * spread;
      const speed = 7 + Math.random() * 11;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        tilt: Math.random() * Math.PI,
        vTilt: 0.08 + Math.random() * 0.12,
        alpha: 1,
      });
    }
  };

  spawnBurst(canvas.width * 0.12, canvas.height * 0.85, -Math.PI * 0.34, 0.7, 55);
  spawnBurst(canvas.width * 0.88, canvas.height * 0.85, -Math.PI * 0.66, 0.7, 55);
  for (let i = 0; i < 45; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 180,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 2 + Math.random() * 3.5,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.18,
      tilt: Math.random() * Math.PI,
      vTilt: 0.06 + Math.random() * 0.1,
      alpha: 1,
    });
  }

  const start = performance.now();

  const loop = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = 0;
    for (const p of particles) {
      p.vy += 0.22; // gravity
      p.vx *= 0.985; // drag
      p.x += p.vx + Math.sin(p.tilt) * 0.6;
      p.y += p.vy;
      p.rot += p.vRot;
      p.tilt += p.vTilt;

      if (elapsed > 3600) {
        p.alpha = Math.max(0, p.alpha - 0.018);
      }

      if (p.alpha > 0 && p.y < canvas.height + 40) {
        alive++;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.tilt));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (alive > 0 && elapsed < 6500) {
      animId = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  animId = requestAnimationFrame(loop);

  onBeforeUnmount(() => {
    window.removeEventListener("resize", resize);
    if (animId) cancelAnimationFrame(animId);
  });
});
</script>

<template>
  <canvas ref="canvasRef" class="confetti-canvas"></canvas>
</template>

<style scoped>
.confetti-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}
</style>
