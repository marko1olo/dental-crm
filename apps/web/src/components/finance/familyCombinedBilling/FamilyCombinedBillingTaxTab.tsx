import React from "react";
import { Printer } from "lucide-react";
import type { CombinedFamilyBillingResult, FamilyBillingPayerProfile } from "@dental/shared";

interface FamilyCombinedBillingTaxTabProps {
	readonly initialPayer: FamilyBillingPayerProfile;
	readonly billingResult: CombinedFamilyBillingResult;
	readonly onPrintAllTaxCerts: () => void;
}

export function FamilyCombinedBillingTaxTab({
	initialPayer,
	billingResult,
	onPrintAllTaxCerts,
}: FamilyCombinedBillingTaxTabProps) {
	return (
		<div className="space-y-4">
			<div className="p-4 rounded-xl bg-[var(--teal-soft)] border border-[var(--teal)]/30 text-xs text-[var(--ink)] flex items-start justify-between gap-3 flex-wrap">
				<div>
					<strong>Справка для налогового вычета:</strong>
					<div className="mt-1">
						Справки оформляются на имя плательщика (<strong>{initialPayer.payerFullName}</strong>{initialPayer.payerInn ? `, ИНН: ${initialPayer.payerInn}` : ""}) с автоматическим указанием кода родства:
						1 = лично, 2 = супруг, 3 = родитель, 4 = ребенок.
					</div>
					<div className="mt-1 text-[11px] text-[var(--muted,#64748b)] font-medium">
						* ИНН налогоплательщика опционален: при отсутствии ИНН справка в налоговую формируется на основании паспортных данных плательщика.
					</div>
				</div>

				<button
					type="button"
					onClick={onPrintAllTaxCerts}
					className="primary-button min-h-[44px] px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
					data-testid="btn-print-tax-certificates"
				>
					<Printer size={14} />
					<span>Печать всех справок на вычет (А4)</span>
				</button>
			</div>

			<div className="space-y-2.5">
				{billingResult.taxDeductionCertificates.map((cert) => (
					<div
						key={cert.certificateNumber}
						className="p-3.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3"
					>
						<div>
							<div className="flex items-center gap-2">
								<strong className="text-xs sm:text-sm text-[var(--ink,#0f172a)]">{cert.patientFullName}</strong>
								<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]">
									{cert.patientRelationshipRu} (Код ФНС: {cert.patientFnsCode})
								</span>
								<span className="font-mono text-xs text-[var(--muted,#64748b)]">
									{cert.certificateNumber}
								</span>
							</div>
							<div className="text-xs text-[var(--muted,#64748b)] mt-1 flex items-center gap-3">
								{cert.code01TotalRub > 0 && (
									<span>Код 01: <strong className="text-blue-600">{cert.code01TotalRub.toLocaleString("ru-RU")} ₽</strong></span>
								)}
								{cert.code02TotalRub > 0 && (
									<span>Код 02: <strong className="text-amber-600">{cert.code02TotalRub.toLocaleString("ru-RU")} ₽</strong></span>
								)}
								<span>Итого: <strong className="text-[var(--ink,#0f172a)]">{cert.grandTotalRub.toLocaleString("ru-RU")} ₽</strong></span>
							</div>
						</div>

						<div className="text-right shrink-0">
							<div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
								Возврат 13%: ~{cert.estimatedRefund13Rub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
