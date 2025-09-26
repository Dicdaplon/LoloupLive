import React, { useRef } from "react";
import { sendMessage } from "./chatService";

export default function ChatInput() {
  const ref = useRef<HTMLInputElement | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = ref.current;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    if (text.startsWith("/")) {
      const parts = text.split(/\s+/);
      const cmd = parts[0];

      if (cmd === "/all") {
        // /all [DDMMYYYY hh hh]
        const [_, dateStr, sh, eh] = parts;
        (window as any).chatShowAll?.(dateStr, sh ? Number(sh) : undefined, eh ? Number(eh) : undefined);
      } else if (cmd === "/clear") {
        (window as any).chatClear?.();
      }
      input.value = "";
      return;
    }

    await sendMessage(text);
    input.value = "";
  };

  return (
    <form onSubmit={onSubmit} style={{
      position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)",
      zIndex: 20
    }}>
      <input
        ref={ref}
        type="text"
        placeholder="Message pour tous !"
        autoComplete="off"
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
