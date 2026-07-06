import React, { createContext, useContext } from 'react';

export const AppLogicContext = createContext<any>(null);

export function useAppLogicContext() {
  const ctx = useContext(AppLogicContext);
  if (!ctx) throw new Error("useAppLogicContext must be used within AppLogicProvider");
  return ctx;
}

export const AppLogicProvider = AppLogicContext.Provider;
