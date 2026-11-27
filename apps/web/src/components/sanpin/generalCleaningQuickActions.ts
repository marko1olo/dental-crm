import { generateUuidV7, type CreateGeneralCleaningLogDto } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../services/logging/clientLogger.js";
import { showToast } from "../GlobalToast.js";

async function readJsonSafely(res: Response): Promise<{ count?: number; message?: string }> {
	try {
		const data: unknown = await res.json();
		if (typeof data === "object" && data !== null) {
			return data as { count?: number; message?: string };
		}
	} catch (err) {
		clientLogger.debug("Failed to parse cleaning API JSON", err);
	}
	return {};
}

export async function executeAutopilotMonthCleaning(
	onSuccess: () => Promise<void>,
	setLoading: (val: boolean) => void,
): Promise<void> {
	try {
		setLoading(true);
		const res = await fetch("/api/registers/cleaning/autopilot-month", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify({}),
		});
		if (res.ok) {
			const data = await readJsonSafely(res);
			showToast(`График генеральных уборок на месяц успешно заполнен (${data.count || 20} уборок, интервал 7 дней)`, "success");
			await onSuccess();
		} else {
			const err = await readJsonSafely(res);
			showToast(err.message || "Ошибка при генерации графика", "error");
		}
	} catch (err) {
		clientLogger.warn("executeAutopilotMonthCleaning failed", err);
		showToast("Сетевая ошибка при генерации графика", "error");
	} finally {
		setLoading(false);
	}
}

export async function executeQuickRecordNormCleaning(
	onSuccess: () => Promise<void>,
	setSubmitting: (val: boolean) => void,
): Promise<void> {
	try {
		setSubmitting(true);
		const payload: CreateGeneralCleaningLogDto = {
			cleaningType: "general",
			scheduledDate: new Date().toISOString().slice(0, 10),
			actualDateTime: new Date().toISOString(),
			roomName: "Операционная / Хирургический кабинет №1",
			treatedAreaM2: 32.5,
			disinfectantName: "Аламинол 5%",
			activeIngredient: "Алкилдиметилбензиламмоний хлорид + Глутаровый альдегид",
			solutionConcentrationPercent: 5.0,
			applicationMethod: "wiping",
			exposureTimeMinutes: 60,
			uvIrradiationMinutes: 120,
			ventilationMinutes: 15,
			status: "completed",
			notes: "Уборка по графику выполнена: Дезсредство Аламинол 5%, экспозиция 60 мин, УФ 120 мин, проветривание 15 мин. Поверхности чистые.",
		};

		const res = await fetch("/api/registers/cleaning", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify(payload),
		});

		if (res.ok) {
			showToast("Уборка по норме успешно зафиксирована (Аламинол 5%, 60 мин, УФ 120 мин)", "success");
			await onSuccess();
		} else {
			const err = await readJsonSafely(res);
			showToast(err.message || "Ошибка при фиксации уборки", "error");
		}
	} catch (err) {
		clientLogger.warn("executeQuickRecordNormCleaning failed", err);
		showToast("Сетевая ошибка при фиксации уборки", "error");
	} finally {
		setSubmitting(false);
	}
}

export async function verifyCleaningLogRecord(id: string, onSuccess: () => void): Promise<void> {
	try {
		const res = await fetch(`/api/registers/cleaning/${id}/verify`, {
			method: "PUT",
			headers: denteClinicalMutationHeaders({
				"Idempotency-Key": generateUuidV7(),
			}),
		});
		if (res.ok) {
			showToast("Качество уборки заверено ответственным лицом", "success");
			onSuccess();
		} else {
			showToast("Ошибка при подтверждении", "error");
		}
	} catch (err) {
		clientLogger.warn("verifyCleaningLogRecord failed", err);
		showToast("Ошибка при подтверждении", "error");
	}
}
