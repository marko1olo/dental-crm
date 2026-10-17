import React from "react";
import { Sparkles, UserCheck, UserPlus } from "lucide-react";
import type { TelephonyPatientCategory } from "../../../store/telephonyTypes";

interface IncomingCallerStatusBadgeProps {
	isKnownPatient: boolean;
	resolvedCategory: TelephonyPatientCategory;
}

export const IncomingCallerStatusBadge: React.FC<IncomingCallerStatusBadgeProps> = ({
	isKnownPatient,
	resolvedCategory,
}) => {
	if (isKnownPatient) {
		if (resolvedCategory === "VIP") {
			return (
				<span
					className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1 shadow-xs"
					data-testid="incoming-caller-status-vip"
					title="VIP пациент клиники"
				>
					<Sparkles size={11} className="text-amber-600 dark:text-amber-400" />
					VIP
				</span>
			);
		}
		if (resolvedCategory === "Первичный") {
			return (
				<span
					className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 inline-flex items-center gap-1"
					data-testid="incoming-caller-status-new"
					title="Первичный пациент"
				>
					<UserPlus size={11} className="text-sky-600 dark:text-sky-400" />
					Первичный
				</span>
			);
		}
		return (
			<span
				className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1"
				data-testid="incoming-caller-status-regular"
				title="Постоянный пациент клиники"
			>
				<UserCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
				Постоянный
			</span>
		);
	}

	return (
		<span
			className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1"
			data-testid="incoming-caller-status-unregistered"
			title="Новый пациент (номер отсутствует в базе CRM)"
		>
			<UserPlus size={11} className="text-amber-600 dark:text-amber-400" />
			Новый пациент / Лид
		</span>
	);
};
