import React, { useEffect, useState } from 'react';
import P5Background from '../components/P5Background';
import HomeButtons from '../components/HomeButtons';
import Logo from '../components/Logo';
import ChatOverlay from '../components/chat/ChatOverlay';
import ChatInput from '../components/chat/ChatInput';
import LocalAuth from '../components/LocalAuth';
import UserBadge from '../components/UserBadge';
import Modal from '../components/Modal';
import OverlayHome from '../components/OverlayBase';

/**
 * A minimal user shape stored locally after authentication.
 */
type User = {
  userId: string;
  userName: string;
};

/**
 * Home screen:
 * - Neon p5 background
 * - Main navigation buttons
 * - Logo
 * - Auth badge + modal (local auth)
 * - Chat overlay + input
 */
export default function Home(): JSX.Element
{
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Restore persisted user on mount
  useEffect(() =>
  {
    const uid = localStorage.getItem('uid');
    const name = localStorage.getItem('name');

    if (uid && name)
    {
      setUser({ userId: uid, userName: name });
    }
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <P5Background />
      <HomeButtons />
      <Logo />

      {/* User badge (top-right) */}
      <UserBadge userName={user?.userName ?? null} onClick={() => setShowAuth(true)} />

      {/* Auth modal toggled by the badge */}
      <Modal open={showAuth} onClose={() => setShowAuth(false)}>
        <LocalAuth
          autoNotifyExisting={false} // prevent immediate auto-close on existing user
          initialMode="login"
          onAuth={(u) =>
          {
            if (u.userId && u.userName)
            {
              setUser(u);
            }
            setShowAuth(false);
          }}
        />
      </Modal>
      {/* EdgePeek overlay */}
            <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
              <OverlayHome />
            </div>
      {/* Chat */}
      <ChatOverlay />
      <ChatInput />
    </div>
  );
}
