import React, { useEffect, useState } from "react";
import P5Background from '../components/P5Background';
import AccueilSketch from '../components/HomeButtons';
import Logo from "../components/Logo";
import ChatOverlay from "../components/chat/ChatOverlay";
import ChatInput from "../components/chat/ChatInput";
import LocalAuth from "../components/LocalAuth";
import UserBadge from "../components/UserBadge";
import Modal from "../components/Modal";

type User = { userId: string; userName: string };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Récupère l'état persistant au chargement
  useEffect(() => {
    const uid = localStorage.getItem("uid");
    const name = localStorage.getItem("name");
    if (uid && name) setUser({ userId: uid, userName: name });
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <P5Background />
      <AccueilSketch/>
      <Logo size={110} floating glow draggable to="/" />

      {/* Badge en haut à droite */}
      <UserBadge
        userName={user?.userName ?? null}
        onClick={() => setShowAuth(true)}
      />

      {/* Modale d'auth au clic sur le badge */}
      <Modal open={showAuth} onClose={() => setShowAuth(false)}>
  <LocalAuth
    autoNotifyExisting={false}   // ← empêche la fermeture immédiate
    initialMode="login"
    onAuth={(u) => {
      if (u.userId && u.userName) setUser(u);
      setShowAuth(false);
    }}
  />
</Modal>

      {/* Chat */}
      <ChatOverlay />
      <ChatInput />

      <main style={{ position: 'relative', zIndex: 2, display: 'grid', placeItems: 'center', height: '100dvh' }} />
    </div>
  );
}
