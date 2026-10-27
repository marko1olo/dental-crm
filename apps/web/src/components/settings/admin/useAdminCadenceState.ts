import { useState } from "react";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { showToast } from "../../GlobalToast";
import {
	loadReminderCadenceSettings,
	saveReminderCadenceSettings,
} from "../ReminderCadenceConfigPanel";

export function useAdminCadenceState() {
	const [cadence, setCadence] = useState(loadReminderCadenceSettings);
	const [onlineBookingEnabled, setOnlineBookingEnabled] = useState<boolean>(() => {
		const val = safeLocalStorageGetItem("dente_online_booking_enabled");
		return val === null ? true : val === "true";
	});

	const toggleRemind24h = () => {
		const next = !cadence.remind24hEnabled;
		const updated = { ...cadence, remind24hEnabled: next };
		setCadence(updated);
		saveReminderCadenceSettings(updated);
		showToast(
			next
				? "Напоминание за 24ч с подтверждением включено"
				: "Напоминание за 24ч отключено",
			"info",
		);
	};

	const toggleRemind2h = () => {
		const next = !cadence.remind2hEnabled;
		const updated = { ...cadence, remind2hEnabled: next };
		setCadence(updated);
		saveReminderCadenceSettings(updated);
		showToast(
			next
				? "Напоминание за 2ч с геопозицией включено"
				: "Напоминание за 2ч отключено",
			"info",
		);
	};

	const togglePostOp24h = () => {
		const next = !cadence.postOp24hEnabled;
		const updated = { ...cadence, postOp24hEnabled: next };
		setCadence(updated);
		saveReminderCadenceSettings(updated);
		showToast(
			next
				? "Памятка и опрос самочувствия через 24ч после операции включены"
				: "Памятка после операции отключена",
			"info",
		);
	};

	const toggleOnlineBooking = () => {
		const next = !onlineBookingEnabled;
		setOnlineBookingEnabled(next);
		safeLocalStorageSetItem("dente_online_booking_enabled", String(next));
		showToast(
			next
				? "Виджет онлайн-записи активирован"
				: "Виджет онлайн-записи временно приостановлен",
			"info",
		);
	};

	return {
		cadence,
		onlineBookingEnabled,
		toggleRemind24h,
		toggleRemind2h,
		togglePostOp24h,
		toggleOnlineBooking,
	};
}
