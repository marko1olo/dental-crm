/**
 * AuthContext.tsx — DENTE CRM Dedicated Authentication & Clinical Security Context
 *
 * Предоставляет изолированный контекст безопасности и авторизации:
 * - Управление административными секретами (Master Admin Secrets / PIN)
 * - Доменные заголовки запросов (denteClinicalMutationHeaders, denteClinicalReadHeaders)
 * - Управление профилем активного рабочего места клиники (activeWorkspaceProfile)
 * - Безопасное освобождение Blob / ObjectURL для снижения нагрузки на память
 * - Отказ от выдумывания: бросает явное исключение при вызове вне провайдера
 */

import React, { createContext, useContext, useMemo } from "react";
import { useOptionalAppLogicContext } from "./AppLogicContext";
import type { AdminSecretUnlockDomain } from "../AppHelpers";

export interface AuthContextType {
	activeWorkspaceProfile?: {
		id?: string;
		mode?: string;
		label?: string;
		description?: string;
		isDefault?: boolean;
	} | undefined;
	settingsAdminSecretDomain?: AdminSecretUnlockDomain;
	rememberAdminSecret: (secret: string, domain: AdminSecretUnlockDomain) => void;
	forgetAdminSecret: (domain: AdminSecretUnlockDomain) => void;
	currentAdminSecretUnlockDomain: () => AdminSecretUnlockDomain;
	resolvedAdminSecretUnlockDomain: (domainOverride?: AdminSecretUnlockDomain) => AdminSecretUnlockDomain;
	adminSecretDraftForDomain: (domain: AdminSecretUnlockDomain) => string;
	clearAdminSecretDraft: (domain: AdminSecretUnlockDomain) => void;
	settingsAccessHeaders: (domainOverride?: AdminSecretUnlockDomain) => Record<string, string>;
	scheduleMutationHeaders: () => Record<string, string>;
	denteClinicalMutationHeaders: () => Record<string, string>;
	denteClinicalReadHeaders: () => Record<string, string>;
	unlockTelegramAdminSession: (domainOverride?: AdminSecretUnlockDomain) => void;
	lockTelegramAdminSession: (domainOverride?: AdminSecretUnlockDomain) => void;
	revokeObjectUrlIfNeeded: (url: string) => void;
	revokeObjectUrlMap: (urls: Record<string, string>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
	children?: React.ReactNode;
	value?: AuthContextType | undefined;
}

export function AuthProvider({
	children,
	value,
}: AuthProviderProps) {
	const appLogic = useOptionalAppLogicContext();
	const appLogicAuth = appLogic?.auth as AuthContextType | undefined;
	const resolvedValue = useMemo(
		() => value ?? appLogicAuth ?? null,
		[value, appLogicAuth],
	);

	return (
		<AuthContext.Provider value={resolvedValue}>
			{children}
		</AuthContext.Provider>
	);
}

/**
 * Использование хука авторизации с гарантией наличия провайдера.
 * Бросает понятное исключение на русском языке при сборке вне дерева авторизации.
 */
export function useAuthContext(): AuthContextType {
	const context = useContext(AuthContext);
	if (context) {
		return context;
	}

	const appLogic = useOptionalAppLogicContext();
	if (appLogic?.auth) {
		return appLogic.auth as AuthContextType;
	}

	throw new Error(
		"ОШИБКА: useAuthContext вызван вне AuthProvider или AppLogicProvider. Убедитесь, что компонент обернут в AuthProvider или AppLogicProvider.",
	);
}

/**
 * Опциональный доступ к контексту авторизации (возвращает null, если провайдер отсутствует).
 */
export function useOptionalAuthContext(): AuthContextType | null {
	const context = useContext(AuthContext);
	if (context) return context;
	const appLogic = useOptionalAppLogicContext();
	return (appLogic?.auth as AuthContextType | undefined) ?? null;
}
