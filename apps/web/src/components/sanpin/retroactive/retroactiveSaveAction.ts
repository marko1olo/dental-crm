import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { RetroactiveDayRecord } from "../retroactiveSanpinEngine";

export async function saveRetroactiveBatchAction({
	generatedDays,
	periodLabelRu,
	nurseFullName,
	workingDaysCount,
	onSuccess,
	onDaysUpdated,
}: {
	generatedDays: RetroactiveDayRecord[];
	periodLabelRu: string;
	nurseFullName: string;
	workingDaysCount: number;
	onSuccess?: (() => void) | undefined;
	onDaysUpdated: (updater: (prev: RetroactiveDayRecord[]) => RetroactiveDayRecord[]) => void;
}) {
	if (generatedDays.length === 0) {
		showToast("Нет сгенерированных записей для сохранения", "warning");
		return;
	}
	try {
		const headers = {
			...denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			"Idempotency-Key": crypto.randomUUID(),
		};
		const res = await fetch("/api/registers/autofill-shift", {
			method: "POST",
			headers,
			body: JSON.stringify({
				batchDays: generatedDays,
				periodLabel: periodLabelRu,
				nurseFullName,
			}),
		});

		if (!res.ok) {
			const json = await res.json().catch(() => null);
			const payload = json?.data ?? json;
			throw new Error(payload?.message || `Ошибка сервера (${res.status})`);
		}

		onDaysUpdated((prev) => prev.map((d) => ({ ...d, isSavedToDb: true })));
		showToast(`Все журналы СанПиН за период (${workingDaysCount} рабочих смен) внесены в реестры!`, "success");
		if (onSuccess) onSuccess();
	} catch (err) {
		showToast(err instanceof Error ? err.message : "Ошибка сохранения реестров СанПиН", "error");
	}
}
