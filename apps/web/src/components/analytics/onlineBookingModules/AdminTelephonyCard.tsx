import React from "react";
import { PhoneCall } from "lucide-react";
import { formatKopecksRu, type Kopecks } from "@dental/shared";
import type {
	AdminPhoneFunnelMetric,
	OnlineBookingComparisonData,
} from "./onlineBookingTypes";

interface AdminTelephonyCardProps {
	readonly comparison: OnlineBookingComparisonData;
	readonly adminFunnel: AdminPhoneFunnelMetric;
}

export function AdminTelephonyCard({
	comparison,
	adminFunnel,
}: AdminTelephonyCardProps) {
	const callToBookingConversion =
		adminFunnel.incomingCallsCount > 0
			? Math.round((adminFunnel.bookedAppointmentsCount / adminFunnel.incomingCallsCount) * 100)
			: 0;

	return (
		<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)]">
						<PhoneCall size={18} />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Регистратура (АТС / Звонки)
						</h4>
						<p className="text-xs text-[var(--muted)] m-0">
							Входящие звонки, обработанные администраторами
						</p>
					</div>
				</div>
				<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--teal)]/15 text-[var(--teal)]">
					{comparison.adminSharePercent}% потока
				</span>
			</div>

			<div className="space-y-1.5 text-xs">
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Входящих звонков:</span>
					<span className="font-bold text-[var(--ink)]">
						{adminFunnel.incomingCallsCount} (принято {adminFunnel.answeredCallsCount})
					</span>
				</div>
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Записей на прием:</span>
					<span className="font-bold text-[var(--ink)]">{adminFunnel.bookedAppointmentsCount} записей</span>
				</div>
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Доходимость (Явка):</span>
					<span className="font-bold text-[var(--ink)]">
						{comparison.adminAttendancePercent}% ({adminFunnel.attendedCount} чел.)
					</span>
				</div>
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Выручка от звонков:</span>
					<span className="font-bold text-[var(--ink)]">
						{formatKopecksRu(adminFunnel.revenueKopecks || (0 as Kopecks))}
					</span>
				</div>
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Ср. длительность разговора:</span>
					<span className="font-bold text-[var(--ink)]">
						{Math.round(adminFunnel.avgCallDurationSeconds / 60)} мин {adminFunnel.avgCallDurationSeconds % 60} сек
					</span>
				</div>
				<div className="flex justify-between py-1.5">
					<span className="text-[var(--muted)]">Конверсия звонок → запись:</span>
					<span className="font-bold text-[var(--teal)]">
						{callToBookingConversion}%
					</span>
				</div>
			</div>
		</div>
	);
}
