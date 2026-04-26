"use client";

import type { WaveformProps } from "@/src/types";
import { useEffect, useRef } from "react";

export function Waveform({ isActive, intensity = 0.5, color = "blue", barCount = 80 }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barsRef = useRef(Array.from({ length: barCount }, () => Math.random() * 0.1));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const bars = barsRef.current;
      const barW = Math.max(2, (width / barCount) * 0.5);
      const gap = width / barCount;
      const cy = height / 2;

      for (let i = 0; i < barCount; i += 1) {
        const target = isActive
          ? (Math.sin(Date.now() * 0.004 + i * 0.4) * 0.3 + 0.5) *
            intensity *
            (0.4 + Math.random() * 0.6)
          : 0.03 + Math.sin(Date.now() * 0.001 + i * 0.3) * 0.02;
        bars[i] += (target - bars[i]) * (isActive ? 0.18 : 0.06);
        const barH = Math.max(2, bars[i] * height * 0.8);
        const x = i * gap + gap / 2 - barW / 2;
        const alpha = isActive ? 0.4 + bars[i] * 0.5 : 0.12;
        ctx.fillStyle =
          color === "green" ? `rgba(52,168,83,${alpha})` : `rgba(74,144,217,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, cy - barH / 2, barW, barH, barW / 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [barCount, color, intensity, isActive]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}
