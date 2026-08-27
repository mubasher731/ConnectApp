import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

interface SessionConfig {
  sessionDuration: number;
  sessionBuffer: number;
  extendIncrement: number;
  extendMax: number;
}

const SessionConfigContext = createContext<SessionConfig>({
  sessionDuration: 15,
  sessionBuffer: 5,
  extendIncrement: 5,
  extendMax: 30,
});

export const useSessionConfig = () => useContext(SessionConfigContext);

export const SessionConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<SessionConfig>({
    sessionDuration: 15,
    sessionBuffer: 5,
    extendIncrement: 5,
    extendMax: 30,
  });

  useEffect(() => {
    let mounted = true;
    api
      .get('/api/config/session')
      .then((res) => {
        if (mounted && res.data) {
          setConfig({
            sessionDuration: res.data.sessionDuration ?? 15,
            sessionBuffer: res.data.sessionBuffer ?? 5,
            extendIncrement: res.data.extendIncrement ?? 5,
            extendMax: res.data.extendMax ?? 30,
          });
        }
      })
      .catch(() => {
        // Keep defaults
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SessionConfigContext.Provider value={config}>
      {children}
    </SessionConfigContext.Provider>
  );
};
