/**
 * PrescriptionDocumentHeader.tsx — Printable Prescription Sheet Header
 * Official clinic stamp box, Minzdrav header & Series/Number.
 */

import type React from "react";
import type { PrescriptionFormType } from "./PrescriptionPrintModal";

export interface PrescriptionDocumentHeaderProps {
	readonly withStampAndSignature: boolean;
	readonly clinic: string;
	readonly address: string;
	readonly phone: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly licNum: string;
	readonly activeForm: PrescriptionFormType;
	readonly customSeriesNumber: string;
	readonly prescriptionDate: string;
}

export const PrescriptionDocumentHeader: React.FC<
	PrescriptionDocumentHeaderProps
> = ({
	withStampAndSignature,
	clinic,
	address,
	phone,
	ogrn,
	inn,
	licNum,
	activeForm,
	customSeriesNumber,
	prescriptionDate,
}) => {
	const formattedDate = new Date(
		prescriptionDate || Date.now(),
	).toLocaleDateString("ru-RU");

	return (
		<>
			{/* Form Official Header */}
			<div className="border-b-2 border-[var(--line)] pb-2 text-[10px] flex justify-between gap-2 text-[var(--ink)]">
				<div
					className={`w-7/12 p-1.5 rounded leading-tight transition-all ${
						withStampAndSignature
							? "border-2 border-blue-600 dark:border-blue-400 bg-blue-500/10 text-blue-900 dark:text-blue-200 shadow-xs"
							: "border border-dashed border-[var(--line)] text-[var(--muted)]"
					}`}
				>
					<div
						className={`font-bold uppercase text-[10px] ${withStampAndSignature ? "text-blue-900 dark:text-blue-200" : "text-[var(--ink)]"}`}
					>
						{clinic}
					</div>
					<div className="text-[9px]">Адрес: {address}</div>
					<div className="text-[9px]">Тел: {phone}</div>
					<div className="text-[9px]">
						ОГРН: {ogrn} · ИНН: {inn}
					</div>
					<div className="text-[8.5px] font-sans">Лицензия: № {licNum}</div>
					<div
						className={`text-[8px] font-bold italic mt-0.5 ${withStampAndSignature ? "text-blue-700 dark:text-blue-400" : "text-[var(--muted)]"}`}
					>
						{withStampAndSignature
							? "ШТАМП МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ"
							: "(Штамп медицинской организации)"}
					</div>
				</div>
				<div className="w-5/12 text-right leading-tight text-[9px] text-[var(--muted)]">
					<div>Министерство здравоохранения РФ</div>
					<div>Медицинская документация</div>
					<div className="font-bold text-[10px] mt-0.5 text-[var(--ink)]">
						{activeForm === "107-1u"
							? "Форма бланка № 107-1/у"
							: "Форма бланка № 148-1/у-88"}
					</div>
					<div
						className="text-[9px] text-[var(--muted)]"
						data-statutory="Приказ МЗ РФ № 1094н"
					>
						Приказ № 1094н
					</div>
				</div>
			</div>

			{/* Title */}
			<div className="text-center my-0.5 text-[var(--ink)]">
				<div
					className={`font-extrabold text-base tracking-widest uppercase ${activeForm === "148-1u-88" ? "text-rose-600 dark:text-rose-400" : "text-[var(--ink)]"}`}
				>
					РЕЦЕПТ {activeForm === "148-1u-88" ? "(ПКУ)" : ""}
				</div>
				<div className="text-[10px] font-sans text-[var(--muted)]">
					Серия:{" "}
					<strong className="text-[var(--ink)]">{customSeriesNumber}</strong> от{" "}
					<strong className="text-[var(--ink)]">{formattedDate}</strong>
				</div>
			</div>
		</>
	);
};
