import React, { useEffect, useRef, useState } from "react";
import { ChatMessage, subscribeRecent, subscribeLocal, fetchAllMessages, loadAllPictures } from "./chatService";

const DISPLAY_TIME = 15000;
const FADE_MS = 1000;
const STAGGER_MS = 100;

type Bubble = {
  id: string;
  text: string;      // texte ou "photo:<url>"
  x: number;         // % viewport
  y: number;         // % viewport
  color: string;
  fading?: boolean;
};

const COLORS = ["#00f0ff", "#ff00c8", "#39ff14", "#ffd700", "#ff4444"];

function randomBubble(text: string): Bubble {
  const x = Math.random() * 80 + 10;
  const y = Math.random() * 70 + 10;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { id: Math.random().toString(36).slice(2), text, x, y, color };
}

export default function ChatOverlay() {
  const [queue, setQueue] = useState<string[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const processingRef = useRef(false);

  // Process queue (staggered)
  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    let timer: number | null = null;
    const loop = () => {
      setQueue(q => {
        if (q.length === 0) {
          processingRef.current = false;
          return q;
        }
        const [head, ...rest] = q;
        setBubbles(b => [...b, randomBubble(head)]);
        timer = window.setTimeout(loop, STAGGER_MS);
        return rest;
      });
    };
    loop();
    return () => { if (timer) clearTimeout(timer); };
  }, [queue.length]);

  // Live subscription
  useEffect(() => {
    const offRecent = subscribeRecent(m => setQueue(q => [...q, m.text]));
    const offLocal = subscribeLocal(m => setQueue(q => [...q, m.text]));
    return () => { offRecent(); offLocal(); };
  }, []);

  // Auto-remove with fade
  useEffect(() => {
    const timers: number[] = [];
    for (const b of bubbles) {
      const t1 = window.setTimeout(() => {
        setBubbles(prev => prev.map(x => x.id === b.id ? { ...x, fading: true } : x));
        const t2 = window.setTimeout(() => {
          setBubbles(prev => prev.filter(x => x.id !== b.id));
        }, FADE_MS);
        timers.push(t2);
      }, DISPLAY_TIME);
      timers.push(t1);
    }
    return () => { timers.forEach(clearTimeout); };
  }, [bubbles.map(b => b.id).join(",")]);

  // Commands helpers (optional)
  (window as any).chatShowAll = async (dateStr?: string, startHour?: number, endHour?: number) => {
    const list = await fetchAllMessages({ dateStr, startHour, endHour });
    for (const m of list) setQueue(q => [...q, m.text]);
    await loadAllPictures((url) => setQueue(q => [...q, "photo:" + url]));
  };
  (window as any).chatClear = () => setBubbles([]);

  return (
    <>
      <style>{`
        .floating-message {
          position: fixed;
          transform: translate(-50%, -50%);
          max-width: 280px;
          white-space: pre-wrap;
          line-height: 1.15;
          z-index: 9999;
          padding: 10px 12px;
          border-radius: 12px;
          font-family: "Baloo 2", system-ui, sans-serif;
          font-size: 14px;
          background: rgba(255,255,255,0.92);
          box-shadow: 0 8px 30px rgba(0,0,0,0.25);
          backdrop-filter: blur(2px);
          transition: opacity ${FADE_MS}ms ease;
        }
        .floating-message.neon { text-shadow: 0 0 8px currentColor, 0 0 16px currentColor, 0 0 24px currentColor; }
        .floating-message.fade-out { opacity: 0; }
        .floating-message img {
          max-width: 30vw; max-height: 30vh; border-radius: 1rem;
          box-shadow: 0 0 20px currentColor; pointer-events: none;
          display: block;
        }
      `}</style>

      {bubbles.map(b => {
        const isPhoto = b.text.startsWith("photo:");
        const txt = isPhoto ? b.text.slice(6).trim() : b.text;
        return (
          <div
            key={b.id}
            className={`floating-message neon ${b.fading ? "fade-out" : ""}`}
            style={{ left: `${b.x}%`, top: `${b.y}%`, color: b.color }}
          >
            {isPhoto ? <img src={txt} alt="Jam Photo" /> : txt}
          </div>
        );
      })}
    </>
  );
}
