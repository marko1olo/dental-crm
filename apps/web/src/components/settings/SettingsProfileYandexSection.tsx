import type React from "react";
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
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
		<section className="rounded-2xl border border-[var(--line)] bg-[var(--paper-card)] p-5 shadow-xs">
			<div className="flex items-center gap-3 pb-3 border-b border-[var(--line)] mb-4">
				<div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
					<Calendar size={18} aria-hidden="true" />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">
						Яндекс.Календарь
					</h3>
					<p className="text-xs text-[var(--muted)] m-0">
						Синхронизация персонального графика визитов и приёмов
					</p>
				</div>
			</div>

			<form onSubmit={handleUpdateYandexSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-[var(--muted)]">
						ID Календаря
					</label>
					<input
						type="text"
						value={yandexCalendarId}
						onChange={(e) => setYandexCalendarId(e.target.value)}
						placeholder="Yandex Calendar ID"
						disabled={yandexLoading}
						className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm focus:outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 transition-all"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-semibold text-[var(--muted)]">
						Токен интеграции (JSON)
					</label>
					<input
						type="text"
						value={yandexCalendarToken}
						onChange={(e) => setYandexCalendarToken(e.target.value)}
						placeholder='{"access_token": "...", ...}'
						disabled={yandexLoading}
						className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm focus:outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 transition-all"
					/>
				</div>
				<div className="md:col-span-2 pt-2 flex items-center gap-3 flex-wrap">
					<button
						type="submit"
						disabled={yandexLoading}
						className="px-4 py-2.5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-[var(--on-teal)] text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
					>
						{yandexLoading ? "Сохранение..." : "Сохранить настройки"}
					</button>
					<button
						type="button"
						onClick={handleSyncYandexCalendar}
						disabled={yandexSyncLoading || !yandexCalendarId}
						className="px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
					>
						{yandexSyncLoading ? "Запуск..." : "Запустить синхронизацию"}
					</button>
					<button
						type="button"
						onClick={() => {
							window.location.href = "/api/integrations/yandex-calendar/auth";
						}}
						className="px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
					>
						Подключить Яндекс.Календарь
					</button>
				</div>
			</form>
		</section>
	);
}
