/**
 * DENTE Dental CRM — Application Boot & Auth Screens (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React, { Suspense } from "react";
import { AppLoadingState, AppUnlockState } from "../AppBootState";
import { operatorWorkflowFailureMessage } from "../AppHelpers";
import { lazyWithRetry } from "../lib/lazyWithRetry";
import { cacheActiveStaffUser, getCachedStaffList } from "../lib/offlineStorage";
import type { AppSessionAuthState } from "./appStateTypes";

const AuthHub = lazyWithRetry(() =>
	import("../components/auth/AuthHub").then((m) => ({ default: m.AuthHub })),
);
const StaffPinPad = lazyWithRetry(() =>
	import("../components/auth/StaffPinPad").then((m) => ({ default: m.StaffPinPad })),
);

interface AppBootScreensProps {
	sessionAuth: AppSessionAuthState;
	appLogic: any;
}

export function AppBootScreens({ sessionAuth, appLogic }: AppBootScreensProps) {
	const { dashboard, error, setError, accessUnlockRequired, accessUnlockMessage, clinicalAdminSecretDraft, setClinicalAdminSecretDraft, unlockTelegramAdminSession, loadDashboard } = appLogic;

	if (!sessionAuth.clinicAuthed) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка авторизации" />}>
				<AuthHub
					onSuccess={(_cp, up) => {
						sessionAuth.setClinicAuthed(true);
						if (up) {
							sessionAuth.setStaffAuthed(true);
							sessionAuth.setActiveStaffUser(up);
							cacheActiveStaffUser(up);
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
				accessMessage={accessUnlockMessage}
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
					void loadDashboard().catch((e: unknown) => {
						setError(operatorWorkflowFailureMessage("Не удалось загрузить данные клиники", e));
					});
				}}
			/>
		);
	}

	return <AppLoadingState message="Загрузка рабочей смены" />;
}
