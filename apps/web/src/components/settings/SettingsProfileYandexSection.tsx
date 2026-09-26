import type React from "react";
import { useEffect, useState } from "react";
import { readDenteStaffToken } from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import type { StaffProfile } from "./settingsProfileLoad";

interface SettingsProfileYandexSectionProps {
	profile: StaffProfile | null;
}

export function SettingsProfileYandexSection({
	profile,
}: SettingsProfileYandexSectionProps) {
	const [yandexCalendarId, setYandexCalendarId] = useState("");
	const [yandexCalendarToken, setYandexCalendarToken] = useState("");
	const [yandexLoading, setYandexLoading] = useState(false);
	const [yandexSyncLoading, setYandexSyncLoading] = useState(false);

	useEffect(() => {
		if (profile) {
			setYandexCalendarId(profile.yandexCalendarId || "");
			setYandexCalendarToken(
				profile.yandexCalendarToken
					? JSON.stringify(profile.yandexCalendarToken)
					: "",
			);
		}
	}, [profile]);

	const handleUpdateYandexSettings = async (e: React.FormEvent) => {
		e.preventDefault();
		setYandexLoading(true);
		try {
			let parsedToken = null;
			if (yandexCalendarToken.trim()) {
				try {
					parsedToken = JSON.parse(yandexCalendarToken);
				} catch (_e) {
					showToast("Токен должен быть валидным JSON объектом", "warning");
					setYandexLoading(false);
					return;
				}
			}
			const r = await fetch("/api/integrations/yandex-calendar/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken() ?? "",
				},
				body: JSON.stringify({
					yandexCalendarId: yandexCalendarId || null,
					yandexCalendarToken: parsedToken,
				}),
			});
			if (!r.ok) throw new Error("Settings update failed");
			showToast("Настройки Яндекс.Календаря сохранены", "success");
		} catch (err) {
			logger.error("[Yandex] update failed", err);
			showToast("Ошибка сохранения настроек", "error");
		} finally {
			setYandexLoading(false);
		}
	};

	const handleSyncYandexCalendar = async () => {
		setYandexSyncLoading(true);
		try {
			const r = await fetch("/api/integrations/yandex-calendar/sync", {
				method: "POST",
				headers: {
					"x-dente-staff-token": readDenteStaffToken() ?? "",
				},
			});
			if (!r.ok) throw new Error("Sync failed");
			showToast("Синхронизация Яндекс.Календаря запущена", "success");
		} catch (err) {
			logger.error("[Yandex] sync failed", err);
			showToast("Ошибка запуска синхронизации", "error");
		} finally {
			setYandexSyncLoading(false);
		}
	};

	return (
		<section className="settings-section">
			<div className="settings-section-header">
				<h3>Яндекс.Календарь</h3>
			</div>
			<p
				className="form-hint"
				style={{
					marginBottom: 16,
					fontSize: 12,
					color: "var(--text-secondary)",
				}}
			>
				Подключите свой Яндекс.Календарь для синхронизации расписания приёмов.
			</p>
			<form onSubmit={handleUpdateYandexSettings} className="form-grid">
				<label className="form-span-1">
					ID Календаря
					<input
						type="text"
						value={yandexCalendarId}
						onChange={(e) => setYandexCalendarId(e.target.value)}
						placeholder="Yandex Calendar ID"
						disabled={yandexLoading}
						className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
					/>
				</label>
				<label className="form-span-1">
					Токен (JSON)
					<input
						type="text"
						value={yandexCalendarToken}
						onChange={(e) => setYandexCalendarToken(e.target.value)}
						placeholder='{"access_token": "...", ...}'
						disabled={yandexLoading}
						className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
					/>
				</label>
				<div className="form-actions form-span-2 flex gap-4 flex-wrap">
					<button
						className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
						type="submit"
						disabled={yandexLoading}
					>
						{yandexLoading ? "Сохранение..." : "Сохранить настройки"}
					</button>
					<button
						type="button"
						className="secondary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
						onClick={handleSyncYandexCalendar}
						disabled={yandexSyncLoading || !yandexCalendarId}
					>
						{yandexSyncLoading ? "Запуск..." : "Запустить синхронизацию"}
					</button>
					<button
						type="button"
						className="secondary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
						onClick={() => {
							window.location.href = "/api/integrations/yandex-calendar/auth";
						}}
					>
						Подключить Яндекс.Календарь
					</button>
				</div>
			</form>
		</section>
	);
}
