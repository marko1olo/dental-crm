import React, { createContext, useContext } from "react";
import type { useAppLogic } from "../useAppLogic";

// Define the shape of our global AppLogic context
// We expose the entire hook return value as the context type
export type AppLogicContextType = ReturnType<typeof useAppLogic>;

const AppLogicContext = createContext<AppLogicContextType | null>(null);

export function AppLogicProvider({ children, value }: { children: React.ReactNode; value: AppLogicContextType }) {
  return (
    <AppLogicContext.Provider value={value}>
      {children}
    </AppLogicContext.Provider>
  );
}

export function useAppLogicContext() {
  const context = useContext(AppLogicContext);
  if (!context) {
    throw new Error("useAppLogicContext must be used within an AppLogicProvider");
  }
  return context;
}
