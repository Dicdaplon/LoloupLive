// src/components/Modal.tsx
import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div
      aria-modal
      role="dialog"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(92vw, 440px)",
          background: "rgba(255,255,255,0.95)",
          borderRadius: 14,
          boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
          padding: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}