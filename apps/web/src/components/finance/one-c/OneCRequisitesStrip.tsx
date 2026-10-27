import React from "react";
import type { OneCDocumentType } from "@dental/shared";

export interface OneCRequisitesStripProps {
	readonly isEditingRequisites: boolean;
	readonly setIsEditingRequisites: (v: boolean) => void;
	readonly docType: OneCDocumentType;
	readonly setDocType: (v: OneCDocumentType) => void;
	readonly actNumber: string;
	readonly setActNumber: (v: string) => void;
	readonly docDate: string;
	readonly setDocDate: (v: string) => void;
	readonly customDoctorName: string;
	readonly setCustomDoctorName: (v: string) => void;
	readonly todayIso: string;
}

export const OneCRequisitesStrip: React.FC<OneCRequisitesStripProps> = ({
	isEditingRequisites,
	setIsEditingRequisites,
	docType,
	setDocType,
	actNumber,
	setActNumber,
	docDate,
	setDocDate,
	customDoctorName,
	setCustomDoctorName,
	todayIso,
}) => {
	if (isEditingRequisites) {
		return (
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs space-y-2.5">
				<div className="flex items-center justify-between border-b border-[var(--border,#cbd5e1)] pb-1.5">
					<span className="font-bold text-xs text-[var(--ink,#0f172a)]">Реквизиты документа для выгрузки в 1С:</span>
					<button type="button" onClick={() => setIsEditingRequisites(false)} className="text-[11px] font-bold text-[var(--teal,#0d9488)] hover:underline cursor-pointer px-2 py-0.5">Готово</button>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<div>
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">Тип документа в 1С:</span>
						<select value={docType} onChange={(e) => setDocType(e.target.value as OneCDocumentType)} className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]">
							<option value="act">Акт выполненных работ</option>
							<option value="order">Заказ покупателя / Счет</option>
						</select>
					</div>

					<div>
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">Номер документа:</span>
						<input type="text" value={actNumber} onChange={(e) => setActNumber(e.target.value)} className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold font-mono outline-none focus:border-[var(--teal,#0d9488)]" />
					</div>

					<div>
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">Дата документа:</span>
						<input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]" />
					</div>

					<div>
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">Лечащий врач:</span>
						<input type="text" value={customDoctorName} onChange={(e) => setCustomDoctorName(e.target.value)} placeholder="ФИО врача" className="w-full h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] font-semibold outline-none focus:border-[var(--teal,#0d9488)]" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between gap-2 p-2.5 px-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs">
			<div className="flex items-center gap-2 flex-wrap min-w-0 flex-1 text-[var(--ink,#0f172a)]">
				<span className="font-semibold whitespace-nowrap">
					{docType === "act" ? "Акт" : "Заказ"} № <strong className="font-mono font-bold">{actNumber}</strong> от {docDate ? docDate.split("-").reverse().join(".") : todayIso.split("-").reverse().join(".")}
				</span>
				<span className="text-[var(--muted,#64748b)]/60">•</span>
				<span className="text-[var(--muted,#64748b)] whitespace-nowrap">
					Врач: <strong className="text-[var(--ink,#0f172a)] font-semibold">{customDoctorName || "Не указан"}</strong>
				</span>
			</div>
			<button type="button" onClick={() => setIsEditingRequisites(true)} className="text-[11px] font-bold text-[var(--teal,#0d9488)] hover:underline cursor-pointer shrink-0 ml-2 px-2 py-0.5 rounded-lg hover:bg-[var(--paper)] dark:hover:bg-[var(--paper-soft)] transition-colors">
				[Изменить]
			</button>
		</div>
	);
};
