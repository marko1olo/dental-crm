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
					className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)] inline-flex items-center gap-1 shadow-xs"
					data-testid="incoming-caller-status-vip"
					title="VIP пациент клиники"
				>
					<Sparkles size={11} className="text-[var(--warning-ink)]" />
					VIP
				</span>
			);
		}
		if (resolvedCategory === "Первичный") {
			return (
				<span
					className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-[var(--primary-soft,var(--paper-soft))] text-[var(--primary)] border border-[var(--primary-soft,var(--line))] inline-flex items-center gap-1"
					data-testid="incoming-caller-status-new"
					title="Первичный пациент"
				>
					<UserPlus size={11} className="text-[var(--primary)]" />
					Первичный
				</span>
			);
		}
		return (
			<span
				className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)] inline-flex items-center gap-1"
				data-testid="incoming-caller-status-regular"
				title="Постоянный пациент клиники"
			>
				<UserCheck size={11} className="text-[var(--success-ink)]" />
				Постоянный
			</span>
		);
	}

	return (
		<span
			className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)] inline-flex items-center gap-1"
			data-testid="incoming-caller-status-unregistered"
			title="Новый пациент (номер отсутствует в базе CRM)"
		>
			<UserPlus size={11} className="text-[var(--warning-ink)]" />
			Новый пациент / Лид
		</span>
	);
};
