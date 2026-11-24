import React, { useRef, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";

export function useRetroactiveDayCycle({
	availableSterilizers,
	sterilizerModel,
	onSuccess,
}: {
	availableSterilizers: Array<{ id: string; label: string; modelName: string }>;
	sterilizerModel: string;
	onSuccess?: (() => void) | undefined;
}) {
	const inFlightRef = useRef(false);
	const [isLoggingDayCycle, setIsLoggingDayCycle] = useState(false);

	const handleRecordDayAutoclaveCycle = async () => {
		if (inFlightRef.current || isLoggingDayCycle) return;
		inFlightRef.current = true;
		setIsLoggingDayCycle(true);
		try {
			const primarySterilizer = availableSterilizers[0]?.modelName || sterilizerModel || "Melag Vacuklav 23B+ (B-класс)";
			const payload = {
				regime: "standard_134",
				batchSize: 25,
				deviceName: primarySterilizer,
				autoclaveId: availableSterilizers[0]?.id || "АК-01",
				itemsDescription: "Дневной цикл автоклавирования: норма 134°C, 2.1 бар, экспозиция 5 мин, химические индикаторы 5 класса — норма",
				packagingType: "kraft_self_adhesive",
			};
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/sanpin/sterilization/quick-norm", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			showToast(
				"Дневной цикл автоклавирования зафиксирован: 134°C, 2.1 бар, 5 мин, индикаторы 5 класса — норма. Крафт-пакеты списаны со склада.",
				"success",
			);
			if (onSuccess) onSuccess();
		} catch (err) {
			clientLogger.error("Day cycle error", err);
			if (isDemoShowcaseMode()) {
				showToast("Дневной цикл зафиксирован (демо-режим)", "info");
				if (onSuccess) onSuccess();
			} else {
				showToast("Не удалось зафиксировать дневной цикл автоклавирования на сервере", "error");
			}
		} finally {
			setIsLoggingDayCycle(false);
			inFlightRef.current = false;
		}
	};

	return { isLoggingDayCycle, handleRecordDayAutoclaveCycle };
}
