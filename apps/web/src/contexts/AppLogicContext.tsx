import type { Dashboard } from "@dental/shared";
import type React from "react";
import { createContext, useContext } from "react";

// Define the shape of our global AppLogic context
// This will incrementally absorb properties from useAppLogic.tsx
export type AppLogicContextType = Record<string, any> & {
	dashboard: Dashboard | null;
};

const AppLogicContext = createContext<AppLogicContextType | null>(null);

export function AppLogicProvider({
	children,
	value,
}: {
	children: React.ReactNode;
	value: AppLogicContextType;
}) {
	return (
		<AppLogicContext.Provider value={value}>
			{children}
		</AppLogicContext.Provider>
	);
}

export function useAppLogicContext() {
	const context = useContext(AppLogicContext);
	if (!context) {
		throw new Error(
			"useAppLogicContext must be used within an AppLogicProvider",
		);
	}
	return context;
}
