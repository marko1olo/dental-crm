/**
 * apps/web/src/components/shift/studio/ShiftZReportPreview.tsx
 *
 * Fiscal Z-Report Preview Component (54-FZ Compliant & Clinical Language).
 * Renders clinic legal identity, fiscal identifiers, and tender revenue tallies.
 */

import React from "react";
import {
	CheckCircle2,
	FileText,
	Printer,
	QrCode,
	ShieldCheck,
} from "lucide-react";
import {
	type CashShiftRecord,
	buildZReportPrintData,
	formatKopecksToRub,
} from "../shiftCatalogData";

export interface ShiftZReportPreviewProps {
	readonly shift: CashShiftRecord;
	readonly onPrint?: () => void;
}

export const ShiftZReportPreview: React.FC<ShiftZReportPreviewProps> = ({
	shift,
	onPrint,
}) => {
	const zData = buildZReportPrintData(shift);

	return (
		<div className="shift-card space-y-3" data-testid="shift-z-report-preview">
			<div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[var(--ink)]">
				<span className="flex items-center gap-1.5">
					<FileText className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					Предпросмотр фискального Z-отчёта (Кассовый чек закрытия)
				</span>
				<div className="flex items-center gap-2">
					<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
						<ShieldCheck className="w-3.5 h-3.5" />
						ОФД: Доставлен ✓
					</span>
					{onPrint && (
						<button
							type="button"
							onClick={onPrint}
							className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1 transition-colors"
							title="Печать бумажного Z-отчёта"
						>
							<Printer className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							Печать
						</button>
					)}
				</div>
			</div>

			{/* Slip Ticket Simulation Container */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-mono space-y-2 text-[var(--ink)] select-text">
				{/* Clinic Header */}
				<div className="text-center border-b border-dashed border-[var(--line)] pb-2 space-y-0.5">
					<div className="font-bold text-xs">{zData.clinicLegalName}</div>
					<div className="text-[10px] text-[var(--muted)]">{zData.clinicAddress}</div>
					<div className="text-[10px] text-[var(--muted)]">
						ИНН: {zData.inn} • Кассир: {zData.cashierFullName}
					</div>
					<div className="text-[10px] text-[var(--muted)]">
						ККТ: {zData.kktSerialNumber} • ФН: {zData.fnSerialNumber}
					</div>
				</div>

				{/* Shift & Time Details */}
				<div className="flex justify-between text-[11px] pt-1">
					<span>СМЕНА №{zData.shiftNumber}</span>
					<span>ДОКУМЕНТ: {zData.zReportNumber}</span>
				</div>
				<div className="flex justify-between text-[10px] text-[var(--muted)]">
					<span>Открыта: {new Date(zData.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
					<span>Закрыта: {new Date(zData.closedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
				</div>

				{/* Revenue Tenders Summary */}
				<div className="border-t border-b border-dashed border-[var(--line)] py-1.5 space-y-1 text-[11px]">
					<div className="flex justify-between">
						<span className="text-[var(--muted)]">Наличные:</span>
						<span className="font-semibold">{zData.incomeCashRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[var(--muted)]">Безналичные (карта):</span>
						<span className="font-semibold">{zData.incomeCardRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[var(--muted)]">QR-код СБП:</span>
						<span className="font-semibold">{zData.incomeSbpRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[var(--muted)]">Зачёт авансов:</span>
						<span className="font-semibold">{zData.incomeDepositRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-[var(--line)]">
						<span>ИТОГ ВЫРУЧКИ:</span>
						<span className="text-[var(--teal,#0d9488)]">{zData.grossRevenueRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				</div>

				{/* Cash Drawer Status */}
				<div className="flex justify-between text-[11px]">
					<span className="text-[var(--muted)]">Инкассировано:</span>
					<span className="font-semibold">{zData.encashmentRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="flex justify-between text-[11px]">
					<span className="text-[var(--muted)]">Остаток в денежном ящике:</span>
					<span className="font-semibold">{zData.cashInDrawerClosingRub.toLocaleString("ru-RU")} ₽</span>
				</div>

				{/* Fiscal Seal Stamp */}
				<div className="pt-2 text-center text-[10px] text-emerald-700 dark:text-emerald-400 font-sans flex items-center justify-center gap-1.5">
					<CheckCircle2 className="w-3.5 h-3.5" />
					<span>Смена закрыта • Z-отчёт с гашением принят ОФД</span>
				</div>
			</div>
		</div>
	);
};

export default ShiftZReportPreview;
