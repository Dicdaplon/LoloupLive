import React, { useEffect, useRef, useState } from "react";
import {
  ChatMessage,
  subscribeRecent,
  // subscribeLocal, // ⟵ retiré pour éviter les doublons
  fetchAllMessages,
  loadAllPictures,
} from "./chatService";

const DISPLAY_TIME = 15000;
const FADE_MS = 1000;
const STAGGER_MS = 100;
const DEDUP_WINDOW_MS = 5000; // ignorer mêmes messages vus dans ce délai

type Bubble = {
  id: string;
  text: string; // "photo:<url>" ou texte
  x: number; // % viewport
  y: number; // % viewport
  color: string;
  fading?: boolean;
};

const COLORS = ["#00f0ff", "#ff00c8", "#39ff14", "#ffd700", "#ff4444"];

function normalizeText(t: string) {
  return t.trim().replace(/\s+/g, " ").toLowerCase();
}

function randomBubble(text: string): Bubble {
  const x = Math.random() * 80 + 10;
  const y = Math.random() * 70 + 10;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { id: Math.random().toString(36).slice(2), text, x, y, color };
}

export default function ChatOverlay() {
  // file d’attente de textes (déjà dédupliqués)
  const [queue, setQueue] = useState<string[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  // mémoire de dédup (clé → lastSeenAt)
  const lastSeenRef = useRef<Map<string, number>>(new Map());

  // guard StrictMode (évite double abonnement en dev)
  const subscribedRef = useRef(false);

  // --------- Ingestion protégée contre les doublons ---------
  const enqueueIfNew = (rawText: string) => {
    const isPhoto = rawText.startsWith("photo:");
    const key = isPhoto ? rawText.slice(6).trim() : normalizeText(rawText);
    const now = Date.now();
    const last = lastSeenRef.current.get(key) ?? 0;
    if (now - last < DEDUP_WINDOW_MS) return; // doublon proche → ignore
    lastSeenRef.current.set(key, now);
    setQueue((q) => [...q, rawText]);
  };

  // --------- Stagger: sort une entrée toutes les STAGGER_MS ----------
  useEffect(() => {
    if (queue.length === 0) return;
    const t = window.setTimeout(() => {
      setQueue((q) => {
        if (q.length === 0) return q;
        const [head, ...rest] = q;
        setBubbles((b) => [...b, randomBubble(head)]);
        return rest;
      });
    }, STAGGER_MS);
    return () => clearTimeout(t);
  }, [queue.length]);

  // --------- Subscription UNIQUE (recent) ----------
  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const offRecent = subscribeRecent((m: ChatMessage) => {
      enqueueIfNew(m.text);
    });

    return () => {
      offRecent();
      subscribedRef.current = false;
    };
  }, []);

  // --------- Auto-remove avec fade ----------
  useEffect(() => {
    const timers: number[] = [];
    for (const b of bubbles) {
      const t1 = window.setTimeout(() => {
        setBubbles((prev) =>
          prev.map((x) => (x.id === b.id ? { ...x, fading: true } : x))
        );
        const t2 = window.setTimeout(() => {
          setBubbles((prev) => prev.filter((x) => x.id !== b.id));
        }, FADE_MS);
        timers.push(t2);
      }, DISPLAY_TIME);
      timers.push(t1);
    }
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [bubbles.map((b) => b.id).join(",")]);

  // --------- Helpers debug ----------
  (window as any).chatShowAll = async (
    dateStr?: string,
    startHour?: number,
    endHour?: number
  ) => {
    const list = await fetchAllMessages({ dateStr, startHour, endHour });
    for (const m of list) enqueueIfNew(m.text);
    await loadAllPictures((url) => enqueueIfNew("photo:" + url));
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
          font-size: 25px;
          background: rgba(255, 255, 255, 0);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0);
          backdrop-filter: blur(2px);
          transition: opacity ${FADE_MS}ms ease;
        }
        .floating-message.neon {
          text-shadow: 0 0 8px currentColor, 0 0 16px currentColor, 0 0 24px currentColor;
        }
        .floating-message.fade-out { opacity: 0; }
        .floating-message img {
          max-width: 30vw; max-height: 30vh; border-radius: 1rem;
          box-shadow: 0 0 20px currentColor; pointer-events: none;
          display: block;
        }
      `}</style>

      {bubbles.map((b) => {
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
