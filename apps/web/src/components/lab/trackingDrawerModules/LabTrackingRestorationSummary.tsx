import React from "react";
import { money } from "../../../AppHelpers";
import { DentalLabFinancialGate } from "../DentalLabFinancialGate";
import type { FinancialGateCheckResult, DoctorClinicalOverride } from "../dentalLabFinancialGateEngine";
import { formatLabOrderTeethOrJaw, type DentalLabOrderData } from "../labMath";

export interface LabTrackingRestorationSummaryProps {
	order: DentalLabOrderData;
	financialSplit: {
		totalKopecks: number;
		clinicAmountRub: number;
		doctorAmountRub: number;
	};
	financialGateResult: FinancialGateCheckResult;
	gateOverride: DoctorClinicalOverride | null;
	onConfirmOverride: (override: DoctorClinicalOverride) => void;
	onOpenInstallmentModal: () => void;
}

export function LabTrackingRestorationSummary({
	order,
	financialSplit,
	financialGateResult,
	gateOverride,
	onConfirmOverride,
	onOpenInstallmentModal,
}: LabTrackingRestorationSummaryProps): React.JSX.Element {
	return (
		<div className="space-y-4">
			{/* Quick Restoration Summary Card */}
			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
						Параметры реставрации
					</span>
					<span className="text-xs px-2.5 py-1 rounded-lg bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] font-bold">
						{formatLabOrderTeethOrJaw(order)}
					</span>
				</div>
				<div className="grid grid-cols-2 gap-3 text-xs">
					<div>
						<span className="text-[var(--muted)] block">Конструкция:</span>
						<strong className="text-sm text-[var(--ink)]">{order.constructionType || "Одиночная коронка"}</strong>
					</div>
					<div>
						<span className="text-[var(--muted)] block">Материал:</span>
						<strong className="text-sm text-[var(--ink)]">{order.material || "Диоксид циркония"}</strong>
					</div>
					<div>
						<span className="text-[var(--muted)] block">Цвет VITA:</span>
						<strong className="text-sm text-[var(--ink)]">{order.colorVita || "A2"} {order.shadeStump ? `(Культя ${order.shadeStump})` : ""}</strong>
					</div>
					<div>
						<span className="text-[var(--muted)] block">Стоимость ЗТЛ:</span>
						<strong className="text-sm font-bold text-[var(--teal)] font-mono">{money(financialSplit.totalKopecks / 100)}</strong>
					</div>
				</div>
			</div>

			{/* Doctor Clinical Autonomy / Financial Gate Banner */}
			{!financialGateResult.isGatePassed && !gateOverride && (
				<DentalLabFinancialGate
					gateResult={financialGateResult}
					patientName={order.patientName || "Пациент"}
					stageTitle={`Наряд ЗТЛ (${order.constructionType || "Протезирование"})`}
					doctorName={order.doctorName || "Лечащий врач"}
					variant="banner"
					onConfirmOverride={onConfirmOverride}
					onOpenInstallmentModal={onOpenInstallmentModal}
				/>
			)}

			{/* Financial Breakdown */}
			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
				<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
					Финансовый расчет (Копеечная точность)
				</span>
				<div className="grid grid-cols-3 gap-3">
					<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)]">
						<span className="text-[11px] text-[var(--muted)] block">Стоимость ЗТЛ:</span>
						<span className="text-base font-extrabold text-[var(--ink)] font-mono">
							{money(financialSplit.totalKopecks / 100)}
						</span>
					</div>
					<div className="p-3 bg-[var(--teal-surface)] rounded-xl border border-[var(--teal-soft)]">
						<span className="text-[11px] text-[var(--teal)] block">Клиника ({order.clinicSharePct ?? 50}%):</span>
						<span className="text-base font-extrabold text-[var(--ink)] font-mono">
							{money(financialSplit.clinicAmountRub)}
						</span>
					</div>
					<div className="p-3 bg-[var(--warn-bg,rgba(245,158,11,0.1))] rounded-xl border border-[var(--warn-fg,rgba(245,158,11,0.3))]">
						<span className="text-[11px] text-[var(--warn-fg,#d97706)] block">Врач ({order.doctorSharePct ?? 50}%):</span>
						<span className="text-base font-extrabold text-[var(--ink)] font-mono">
							{money(financialSplit.doctorAmountRub)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
