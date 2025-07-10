import React, { useEffect, useState } from 'react';

export const AuthOverlay: React.FC = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const start = () => setActive(true);
    const end = () => setActive(false);
    window.addEventListener('passkey-auth-start', start);
    window.addEventListener('passkey-auth-end', end);
    return () => {
      window.removeEventListener('passkey-auth-start', start);
      window.removeEventListener('passkey-auth-end', end);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 neo-card font-black text-xl">
      Waiting for authentication...
    </div>
  );
};
