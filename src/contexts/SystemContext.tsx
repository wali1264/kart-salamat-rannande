import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppMode = 'student' | 'teacher';

interface SystemContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isTeacherMode: boolean;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem('app_mode');
    return (saved as AppMode) || 'student';
  });

  useEffect(() => {
    localStorage.setItem('app_mode', mode);
  }, [mode]);

  const isTeacherMode = mode === 'teacher';

  return (
    <SystemContext.Provider value={{ mode, setMode, isTeacherMode }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
