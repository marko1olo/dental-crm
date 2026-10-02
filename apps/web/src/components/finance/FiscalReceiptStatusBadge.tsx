/**
 * FiscalReceiptStatusBadge.tsx — 54-FZ Fiscal Receipt Status Badge.
 *
 * Compliance:
 * - Mandate 8d pt 7: Exclusively vector Lucide icons, zero cartoon emojis.
 * - Mandate 8d pt 4: WCAG AAA contrast in Light/Dark themes, CSS design tokens.
 * - Mandate 8e: Doctor & cashier autonomy, clear status telemetry without clutter.
 */

import React from "react";
import {
	CheckCircle2,
	Clock,
	AlertTriangle,
	ShieldCheck,
	RotateCcw,
	Layers,
	FileText,
} from "lucide-react";

export type FiscalReceiptStatusCode =
	| "fiscalized"
	| "pending"
	| "offline_buffered"
	| "refund"
	| "correction"
	| "error";

export interface FiscalReceiptStatusBadgeProps {
	readonly status: FiscalReceiptStatusCode;
	readonly receiptNumber?: string | undefined;
	readonly fiscalDocumentNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly fnSerial?: string | undefined;
	readonly dateRu?: string | undefined;
	readonly showDetails?: boolean | undefined;
	readonly className?: string | undefined;
}

export const FiscalReceiptStatusBadge: React.FC<FiscalReceiptStatusBadgeProps> = ({
	status,
	receiptNumber,
	fiscalDocumentNumber,
	fiscalSign,
	fnSerial,
	dateRu,
	showDetails = false,
	className = "",
}) => {
	const config = {
		fiscalized: {
			labelRu: "Фискализирован в ОФД",
			bgClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
			icon: CheckCircle2,
			title: "Кассовый чек успешно передан в ОФД и зарегистрирован в ФНС (54-ФЗ)",
		},
		pending: {
			labelRu: "В очереди ОФД",
			bgClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
			icon: Clock,
			title: "Чек ожидает отправки оператору фискальных данных",
		},
		offline_buffered: {
			labelRu: "Офлайн-буфер ККТ",
			bgClass: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30",
			icon: Layers,
			title: "Чек сохранён в локальном буфере кассы при отсутствии интернета",
		},
		refund: {
			labelRu: "Возврат прихода (54-ФЗ)",
			bgClass: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
			icon: RotateCcw,
			title: "Оформлен фискальный чек возврата денежных средств пациенту",
		},
		correction: {
			labelRu: "Чек коррекции",
			bgClass: "bg-amber-600/15 text-amber-900 dark:text-amber-200 border-amber-600/30",
			icon: ShieldCheck,
			title: "Фискальный чек коррекции по предписанию ФНС или самостоятельно",
		},
		error: {
			labelRu: "Ошибка ККТ",
			bgClass: "bg-red-500/15 text-red-800 dark:text-red-300 border-red-500/30",
			icon: AlertTriangle,
			title: "Ошибка связи с кассовым аппаратом или исчерпан ресурс ФН",
		},
	}[status];

	const Icon = config.icon;

	return (
		<div className={`inline-flex flex-col gap-1 ${className}`.trim()} data-testid="fiscal-receipt-status-badge">
			<div
				className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all select-none ${config.bgClass}`}
				title={config.title}
			>
				<Icon className="w-3.5 h-3.5 shrink-0" />
				<span>{config.labelRu}</span>
				{receiptNumber && (
					<span className="font-mono text-[11px] opacity-80 border-l border-current/20 pl-1.5 ml-0.5">
						{receiptNumber}
					</span>
				)}
			</div>

			{showDetails && (fiscalDocumentNumber || fiscalSign || fnSerial || dateRu) && (
				<div className="flex items-center gap-2 text-[11px] font-mono text-[var(--muted)] flex-wrap px-1">
					{dateRu && <span>{dateRu}</span>}
					{fiscalDocumentNumber && <span>ФД: <strong className="text-[var(--ink)]">{fiscalDocumentNumber}</strong></span>}
					{fiscalSign && <span>ФПД: <strong className="text-[var(--ink)]">{fiscalSign}</strong></span>}
					{fnSerial && <span>ФН: {fnSerial}</span>}
				</div>
			)}
		</div>
	);
};

export default FiscalReceiptStatusBadge;
