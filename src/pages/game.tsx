import React, { useEffect, useState } from 'react';

export default function Compteur() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        const next = c + 1;
        if (next % 10 === 0) {
          console.log('ok'); // ici tu peux remplacer par un envoi vers ton chat / backend
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(id); // nettoyage
  }, []);

  return (
    <div
      style={{
        color: '#fff',
        background: '#000',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
      }}
    >
      {count}s
    </div>
  );
}
