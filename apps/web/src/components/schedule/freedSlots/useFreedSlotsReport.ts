import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { showToast } from "../../GlobalToast";
import { type FreedSlotsReport, DEMO_SHOWCASE_FREED_REPORT } from "./types";

export function useFreedSlotsReport() {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [report, setReport] = useState<FreedSlotsReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const loadFailureText = useCallback((status: number, serverMessage: string | null): string => {
		if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
		if (status === 401 || status === 403)
			return "Нет прав смотреть освободившиеся окна: доступ закрыт или истёк вход в программу.";
		if (status === 404) return "Раздел освободившихся окон не отвечает.";
		if (status >= 500) return "Сбой на сервере клиники: список окон не собран.";
		return `Программа не смогла получить список окон (ответ ${status}).`;
	}, []);

	const load = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			let response: Response;
			try {
				response = await fetch("/api/schedule/freed-slots", {
					headers: auth ? auth.denteClinicalReadHeaders() : {},
				});
			} catch {
				if (isDemoShowcaseMode()) {
					setReport(DEMO_SHOWCASE_FREED_REPORT);
					setError(null);
					return;
				}
				setReport(null);
				setError("Сервер клиники не ответил. Проверьте, что программа клиники запущена и есть сеть.");
				return;
			}
			const payload = (await response.json().catch((err) => {
				showToast(
					actionFailureToast("Ошибка ответа сервера", (err as { status?: number })?.status ?? null),
					"error",
				);
				return null;
			})) as (FreedSlotsReport & { message?: string }) | null;

			if (!response.ok) {
				if (isDemoShowcaseMode()) {
					setReport(DEMO_SHOWCASE_FREED_REPORT);
					setError(null);
					return;
				}
				setReport(null);
				setError(loadFailureText(response.status, payload?.message ?? null));
				return;
			}
			if (!payload || !Array.isArray(payload.slots)) {
				if (isDemoShowcaseMode()) {
					setReport(DEMO_SHOWCASE_FREED_REPORT);
					setError(null);
					return;
				}
				setReport(null);
				setError("Сервер ответил, но списка окон в ответе нет.");
				return;
			}
			if (payload.slots.length === 0 && isDemoShowcaseMode()) {
				setReport(DEMO_SHOWCASE_FREED_REPORT);
				return;
			}
			setReport(payload);
		} finally {
			setLoading(false);
		}
	}, [auth, loadFailureText]);

	useEffect(() => {
		void load();
	}, [load]);

	return { report, error, loading, reload: load };
}
