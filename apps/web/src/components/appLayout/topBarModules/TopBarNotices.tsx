/**
 * TopBarNotices — Системные уведомления, демо-баннер и ошибки (Мандат 8b, <= 120 строк).
 */

import React, { type Dispatch, type SetStateAction } from "react";
import { AlertTriangle, Bot, Rocket } from "lucide-react";
import { isDemoShowcaseMode, disableDemoShowcaseMode } from "../../../lib/demoMode";
import { clearOfflineClinicCaches } from "../../../lib/offlineStorage";
import { DENTE_CLINIC_TOKEN_KEY, DENTE_STAFF_TOKEN_KEY, safeLocalStorageRemoveItem } from "../../../lib/safeLocalStorage";
import { DemoModeBanner } from "../../demo/DemoModeBanner";
import type { DenteTelegramHandoffTarget } from "../../../AppConstants";

export interface TopBarNoticesProps {
	clinicName?: string | undefined;
	currentView?: string | undefined;
	defaultClinicNoticeHidden?: boolean | undefined;
	setDefaultClinicNoticeHidden?: Dispatch<SetStateAction<boolean>> | undefined;
	reopenOnboarding?: (() => void) | undefined;
	error?: string | null | undefined;
	setError?: Dispatch<SetStateAction<string | null>> | undefined;
	uiPreferencesSyncError?: string | null | undefined;
	setUiPreferencesSyncError?: Dispatch<SetStateAction<string | null>> | undefined;
	telegramHandoffNotice?: DenteTelegramHandoffTarget | null | undefined;
	setTelegramHandoffNotice?: Dispatch<SetStateAction<DenteTelegramHandoffTarget | null>> | undefined;
}

export function TopBarNotices({
	clinicName,
	currentView,
	defaultClinicNoticeHidden,
	setDefaultClinicNoticeHidden,
	reopenOnboarding,
	error,
	setError,
	uiPreferencesSyncError,
	setUiPreferencesSyncError,
	telegramHandoffNotice,
	setTelegramHandoffNotice,
}: TopBarNoticesProps) {
	const clearDemoSession = (redirectUrl?: string) => {
		disableDemoShowcaseMode();
		clearOfflineClinicCaches();
		safeLocalStorageRemoveItem(DENTE_CLINIC_TOKEN_KEY);
		safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
		if (redirectUrl) {
			window.location.hash = redirectUrl;
			window.location.reload();
		} else {
			window.location.href = window.location.pathname;
		}
	};

	const showDefaultClinicBanner =
		currentView === "shift" &&
		clinicName === "Стоматология, 1 кабинет" &&
		!defaultClinicNoticeHidden;

	return (
		<>
			{showDefaultClinicBanner && (
				<div className="default-clinic-banner" role="status">
					<div className="banner-content">
						<span className="banner-icon" aria-hidden="true">
							<Rocket className="w-4 h-4 text-[var(--ink-muted)] shrink-0" aria-hidden="true" />
						</span>
						<p>
							<strong>Клиника ещё не настроена?</strong> Переименуйте её в настройках или пройдите быструю настройку.
						</p>
					</div>
					<button className="secondary-button banner-btn" type="button" onClick={reopenOnboarding}>
						Пройти настройку
					</button>
					<button
						className="secondary-button banner-btn"
						type="button"
						onClick={() => setDefaultClinicNoticeHidden?.(true)}
						aria-label="Скрыть подсказку"
					>
						Скрыть
					</button>
				</div>
			)}

			{isDemoShowcaseMode() && (
				<DemoModeBanner
					onExitDemo={() => clearDemoSession()}
					onRegisterClinic={() => clearDemoSession("#/auth/register")}
				/>
			)}

			{error ? (
				<section className="app-notice" role="alert" aria-live="assertive">
					<AlertTriangle aria-hidden="true" />
					<p>{error}</p>
					<button className="secondary-button" type="button" onClick={() => setError?.(null)}>
						Понятно
					</button>
				</section>
			) : null}

			{!error && uiPreferencesSyncError ? (
				<section className="app-notice" role="alert" aria-live="assertive">
					<AlertTriangle aria-hidden="true" />
					<p>{uiPreferencesSyncError}</p>
					<button className="secondary-button" type="button" onClick={() => setUiPreferencesSyncError?.(null)}>
						Понятно
					</button>
				</section>
			) : null}

			{!error && !uiPreferencesSyncError && telegramHandoffNotice ? (
				<section className="app-notice telegram-handoff-notice" role="status" aria-live="polite">
					<Bot aria-hidden="true" />
					<p>
						Открыто из Telegram: <strong>{telegramHandoffNotice.title}</strong>. {telegramHandoffNotice.detail}
					</p>
					<button className="secondary-button" type="button" onClick={() => setTelegramHandoffNotice?.(null)}>
						Понятно
					</button>
				</section>
			) : null}
		</>
	);
}
