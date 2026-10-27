import React, { useState } from "react";
import { BellRing, Clock, Globe, HeartPulse, MapPin } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { DelimitedTileCard } from "../DelimitedTileCard";
import {
	loadReminderCadenceSettings,
	saveReminderCadenceSettings,
} from "../ReminderCadenceConfigPanel";

export const AdminMessengersCadenceCard: React.FC = () => {
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

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 space-y-2.5 shadow-xs">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<BellRing size={14} className="text-[var(--teal)]" />
					<h4 className="text-xs font-bold text-[var(--ink)]">
						Каденция оповещения пациентов
					</h4>
				</div>
				<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
					Автоматическая отправка без участия администратора
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<DelimitedTileCard
					icon={Clock}
					title="За 24ч до приема"
					description="Подтверждение визита"
					checked={cadence.remind24hEnabled}
					onChange={toggleRemind24h}
					testId="admin-cadence-toggle-24h"
				/>
				<DelimitedTileCard
					icon={MapPin}
					title="За 2ч до приема"
					description="Геолокация клиники"
					checked={cadence.remind2hEnabled}
					onChange={toggleRemind2h}
					testId="admin-cadence-toggle-2h"
				/>
				<DelimitedTileCard
					icon={HeartPulse}
					title="После операции"
					description="Опрос самочувствия (24ч)"
					checked={cadence.postOp24hEnabled}
					onChange={togglePostOp24h}
					testId="admin-cadence-toggle-postop"
				/>
				<DelimitedTileCard
					icon={Globe}
					title="Онлайн-запись"
					description="Виджет на сайте"
					checked={onlineBookingEnabled}
					onChange={toggleOnlineBooking}
					testId="admin-cadence-toggle-booking"
				/>
			</div>
		</div>
	);
};
