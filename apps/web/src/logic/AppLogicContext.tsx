import React, { createContext, useContext } from "react";

export const AppLogicContext = createContext<any>(null);

export function useAppLogicContext() {
	const ctx = useContext(AppLogicContext);
	if (!ctx)
		return {};
	return ctx;
}

export const AppLogicProvider = AppLogicContext.Provider;
