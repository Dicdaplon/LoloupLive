// src/components/UserBadge.tsx
import React from "react";

type Props = {
  userName?: string | null;
  onClick?: () => void;
};

export default function UserBadge({ userName, onClick }: Props) {
  const label = userName ? `Connecté en tant que "${userName}"` : "Se connecter";
  return (
    <button
      onClick={onClick}
      title="Gérer l'identifiant local"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 30,
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.6)",
        background: "rgba(255,255,255,0.85)",
        boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
        fontSize: 13,
        cursor: "pointer",
        backdropFilter: "blur(4px)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}