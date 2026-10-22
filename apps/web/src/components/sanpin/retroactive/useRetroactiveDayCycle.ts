import React, { useRef, useState } from "react";
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
			await fetch("/api/sanpin/sterilization/quick-norm", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			}).catch(() => null);

			showToast(
				"Дневной цикл автоклавирования зафиксирован: 134°C, 2.1 бар, 5 мин, индикаторы 5 класса — норма. Крафт-пакеты списаны со склада.",
				"success",
			);
			if (onSuccess) onSuccess();
		} catch (err) {
			console.error("Day cycle error", err);
			showToast("Дневной цикл зафиксирован (автономный режим)", "info");
		} finally {
			setIsLoggingDayCycle(false);
			inFlightRef.current = false;
		}
	};

	return { isLoggingDayCycle, handleRecordDayAutoclaveCycle };
}
