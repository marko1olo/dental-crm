/**
 * DENTE Dental CRM — Application Boot & Auth Screens (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React, { Suspense } from "react";
import { AppLoadingState, AppUnlockState } from "../AppBootState";
import { operatorWorkflowFailureMessage } from "../AppHelpers";
import { lazyWithRetry } from "../lib/lazyWithRetry";
import { cacheActiveStaffUser, getCachedStaffList } from "../lib/offlineStorage";
import type { StaffUser } from "../components/auth/staffPinPad/staffPinPadTypes";
import type { AppSessionAuthState } from "./appStateTypes";
import type { AdminSecretUnlockDomain } from "../helpers/types";

const AuthHub = lazyWithRetry(() =>
	import("../components/auth/AuthHub").then((m) => ({ default: m.AuthHub })),
);
const StaffPinPad = lazyWithRetry(() =>
	import("../components/auth/StaffPinPad").then((m) => ({ default: m.StaffPinPad })),
);

export interface AppBootScreensLogic {
	dashboard: {
		clinicSettings?: {
			staff?: unknown;
		};
		[key: string]: unknown;
	} | null;
	error: string | null;
	setError: (error: string | null) => void;
	accessUnlockRequired: boolean;
	accessUnlockMessage?: string | null;
	clinicalAdminSecretDraft: string;
	setClinicalAdminSecretDraft: (secret: string) => void;
	unlockTelegramAdminSession: (domainOverride?: AdminSecretUnlockDomain) => void | Promise<void>;
	loadDashboard: () => Promise<unknown> | void;
}

interface AppBootScreensProps {
	sessionAuth: AppSessionAuthState;
	appLogic: AppBootScreensLogic;
}

export function AppBootScreens({ sessionAuth, appLogic }: AppBootScreensProps) {
	const { dashboard, error, setError, accessUnlockRequired, accessUnlockMessage, clinicalAdminSecretDraft, setClinicalAdminSecretDraft, unlockTelegramAdminSession, loadDashboard } = appLogic;

	if (!sessionAuth.clinicAuthed) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка авторизации" />}>
				<AuthHub
					onSuccess={(_cp, up) => {
						sessionAuth.setClinicAuthed(true);
						if (up && typeof up === "object" && "id" in up && typeof up.id === "string") {
							const staffUser: StaffUser = {
								id: up.id,
								...(typeof up.fullName === "string" ? { fullName: up.fullName } : {}),
								...(typeof up.role === "string" ? { role: up.role } : {}),
								...(typeof up.organizationId === "string" ? { organizationId: up.organizationId } : {}),
								...(typeof up.email === "string" ? { email: up.email } : {}),
								...(typeof up.phone === "string" ? { phone: up.phone } : {}),
							};
							sessionAuth.setStaffAuthed(true);
							sessionAuth.setActiveStaffUser(staffUser);
							cacheActiveStaffUser(staffUser);
						}
						void loadDashboard();
					}}
				/>
			</Suspense>
		);
	}

	if (!sessionAuth.staffAuthed || sessionAuth.showStaffPinPad) {
		const cachedStaff = getCachedStaffList() ?? undefined;
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка авторизации" />}>
				<StaffPinPad
					staffMembers={dashboard ? dashboard.clinicSettings?.staff : cachedStaff}
					staffListLoading={!dashboard && !cachedStaff && !error && !accessUnlockRequired}
					staffListStatus={accessUnlockRequired ? 401 : dashboard || cachedStaff ? 200 : null}
					onUnlockSuccess={(user) => {
						cacheActiveStaffUser(user);
						sessionAuth.setActiveStaffUser(user);
						sessionAuth.setStaffAuthed(true);
						sessionAuth.setShowStaffPinPad(false);
					}}
					onClinicLogout={sessionAuth.handleClinicLogout}
					onRetryStaffList={() => {
						setError(null);
						void loadDashboard();
					}}
				/>
			</Suspense>
		);
	}

	if (accessUnlockRequired && !dashboard) {
		return (
			<AppUnlockState
				accessMessage={accessUnlockMessage ?? ""}
				adminSecretDraft={clinicalAdminSecretDraft}
				onAdminSecretChange={setClinicalAdminSecretDraft}
				onUnlock={() => unlockTelegramAdminSession("all")}
			/>
		);
	}

	if (error && !dashboard) {
		return (
			<AppLoadingState
				message={`Рабочий сервер недоступен: ${error}`}
				actionLabel="Повторить загрузку"
				onAction={() => {
					setError(null);
					void Promise.resolve(loadDashboard()).catch((e: unknown) => {
						setError(operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", e));
					});
				}}
			/>
		);
	}

	return <AppLoadingState message="Загрузка рабочей смены" />;
}
