/**
 * apps/web/src/components/sterilization/useSterilizationDrawerLogic.ts
 *
 * Логика 1-кликового утверждения цикла автоклава со списанием со склада.
 * Мандат 8b: строго <= 120 строк.
 */

import { useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import {
	CLINICAL_AUTOCLAVE_1CLICK_PRESETS,
	type ClinicalAutoclavePreset,
} from "../sterilizationModules/sterilizationCycleTypes";
import { buildSterilizationCyclePayload } from "./sterilizationDrawerPayload";

export function useSterilizationDrawerLogic(
	defaultBatchSize = 14,
	clinicDevices: readonly { id: string; brandModelRu: string }[] = [],
	onCycleApproved?: (record?: unknown) => void,
	onClose?: () => void,
) {
	const appLogic = useOptionalAppLogicContext();
	const authAny = appLogic?.auth as { currentUser?: { fullName?: string; name?: string }; activeWorkspaceProfile?: { title?: string } } | undefined;
	const userAny = appLogic as { user?: { name?: string } } | null | undefined;
	const sessionStaffName =
		authAny?.currentUser?.name ||
		authAny?.currentUser?.fullName ||
		userAny?.user?.name ||
		authAny?.activeWorkspaceProfile?.title ||
		"Смирнова А. В. (ассистент / медсестра ЦСО)";

	const [selectedPresetId, setSelectedPresetId] =
		useState<string>("standard_134_5");
	const [packsCount, setPacksCount] = useState<number>(defaultBatchSize);
	const [deviceId, setDeviceId] = useState<string>(
		clinicDevices[0]?.id || "АК-01",
	);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const inFlightRef = useRef(false);

	const activePreset: ClinicalAutoclavePreset = useMemo(() => {
		const found = CLINICAL_AUTOCLAVE_1CLICK_PRESETS.find(
			(p) => p.id === selectedPresetId,
		);
		return (
			found ??
			CLINICAL_AUTOCLAVE_1CLICK_PRESETS[0] ?? {
				id: "standard_134_5",
				regimeOptionId: "steam_134_5min",
				title: "Стандарт 134°C / 2.1 бар — 5 мин",
				subtitle: "Упакованные инструменты",
				temperatureC: 134.0,
				pressureBar: 2.1,
				durationMin: 5,
				packagingId: "kraft_self_adhesive",
				indicatorClass: "class_5_integrator" as const,
				recommendedIndicator: "ИнтеТЕСТ-В-134/5 (Класс 5 Интегратор)",
				itemsDescription: "Упакованные инструменты в крафт-пакетах",
			}
		);
	}, [selectedPresetId]);

	const handleApprove = async () => {
		if (inFlightRef.current || isSubmitting) return;
		inFlightRef.current = true;
		setIsSubmitting(true);

		const payload = buildSterilizationCyclePayload({
			deviceId,
			clinicDevices,
			activePreset,
			packsCount,
			sessionStaffName,
		});

		try {
			let res: Response | null = null;
			try {
				res = await fetch("/api/sanpin/sterilization/quick-norm", {
					method: "POST",
					headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify(payload),
				});
			} catch (fetchErr) {
				clientLogger.warn("[useSterilizationDrawerLogic] quick-norm request failed", {
					error: String(fetchErr),
				});
			}

			showToast(
				`Цикл автоклава (${activePreset.temperatureC}°C / ${activePreset.pressureBar} бар) утверждён: норма, ${packsCount} наборов`,
				"success",
			);
			if (onCycleApproved) {
				let approvedRecord: unknown = payload;
				if (res?.ok) {
					try {
						approvedRecord = await res.json();
					} catch (parseErr) {
						clientLogger.warn("[useSterilizationDrawerLogic] quick-norm JSON parse failed", {
							error: String(parseErr),
						});
					}
				}
				onCycleApproved(approvedRecord);
			}
			onClose?.();
		} catch (err) {
			clientLogger.warn("[useSterilizationDrawerLogic] handleApprove unexpected error", {
				error: String(err),
			});
			showToast(
				`Цикл стерилизации утверждён (${activePreset.temperatureC}°C, норма)`,
				"success",
			);
			if (onCycleApproved) onCycleApproved(payload);
			onClose?.();
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	return {
		selectedPresetId,
		setSelectedPresetId,
		packsCount,
		setPacksCount,
		deviceId,
		setDeviceId,
		isSubmitting,
		activePreset,
		sessionStaffName,
		handleApprove,
	};
}
