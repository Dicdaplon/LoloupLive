import React, { useRef, useState, useCallback } from "react";
import { sendMessage } from "./chatService";

export default function ChatInput() {
  const ref = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);

  const handleCommand = useCallback((raw: string) => {
    const text = raw.trim();

    // /clear
    if (text === "/clear") {
      (window as any).chatClear?.();
      return true;
    }

    // /all [DDMMYYYY hh hh]
    const m = text.match(/^\/all(?:\s+(\d{8}))?(?:\s+(\d{1,2}))?(?:\s+(\d{1,2}))?$/);
    if (m) {
      const [, dateStr, sh, eh] = m;
      (window as any).chatShowAll?.(
        dateStr,
        sh !== undefined ? Number(sh) : undefined,
        eh !== undefined ? Number(eh) : undefined
      );
      return true;
    }

    return false; // pas une commande connue
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;

    const input = ref.current;
    if (!input) return;

    const raw = input.value;
    const text = raw.trim();
    if (!text) return;

    // commandes
    if (text.startsWith("/")) {
      const handled = handleCommand(text);
      input.value = "";
      if (handled) return;
      // commande inconnue : tu peux soit l'ignorer, soit l'envoyer comme texte
    }

    // envoi optimiste: efface tout de suite pour réactivité
    input.value = "";
    setPending(true);
    try {
      await sendMessage(text, {
        userId: localStorage.getItem("uid") ?? "local",
        userName: localStorage.getItem("name") ?? "Invité",
      });
    } catch (err) {
      // en cas d'erreur, on remet le texte pour ne rien perdre
      input.value = raw;
      console.error(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
      }}
    >
      <input
        ref={ref}
        type="text"
        placeholder={pending ? "Envoi..." : "Message pour tous !"}
        autoComplete="off"
        enterKeyHint="send"
        inputMode="text"
        disabled={pending}
        style={{
          width: "min(78vw, 560px)",
          background: "rgba(255,255,255,0.9)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.7)",
          padding: "10px 14px",
          fontSize: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      />
    </form>
  );
}
