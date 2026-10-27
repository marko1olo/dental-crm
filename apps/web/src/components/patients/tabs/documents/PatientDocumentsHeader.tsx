import React, { useEffect, useRef, useState } from "react";
import type { Patient } from "@dental/shared";
import { ChevronDown, FileText, Printer } from "lucide-react";
import type { FastPrintDocType } from "../../../documents/FastClinicalPrintEngine";
import { PatientDocumentsBlanksMenu } from "./PatientDocumentsBlanksMenu";

interface PatientDocumentsHeaderProps {
	patient: Patient;
	onPrintOutpatientCard?: (() => void) | undefined;
	onOpenFastPrint: (docType: FastPrintDocType) => void;
}

export const PatientDocumentsHeader: React.FC<PatientDocumentsHeaderProps> = ({
	patient, onPrintOutpatientCard, onOpenFastPrint,
}) => {
	const [isBlanksMenuOpen, setIsBlanksMenuOpen] = useState(false);
	const blanksMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isBlanksMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (blanksMenuRef.current && !blanksMenuRef.current.contains(e.target as Node)) {
				setIsBlanksMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsBlanksMenuOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isBlanksMenuOpen]);

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--line)]">
			<div className="min-w-0">
				<h3 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider m-0 flex items-center gap-2">
					<FileText className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
					<span className="truncate">Официальная документация пациента</span>
				</h3>
				<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate hidden sm:block">
					Медицинские карты, договоры на оказание услуг, согласия на лечение и справки.
				</p>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={() => onOpenFastPrint("form043u")}
					className="h-8 min-h-[32px] px-3 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0 active:scale-95"
					data-testid="btn-fast-vector-print-hub"
					title="Мгновенная печать карты, акта и сметы"
				>
					<Printer size={13} className="shrink-0" />
					<span>Печать карты и смет</span>
				</button>

				<div className="relative" ref={blanksMenuRef}>
					<button
						type="button"
						onClick={() => setIsBlanksMenuOpen((prev) => !prev)}
						aria-expanded={isBlanksMenuOpen}
						className={`h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs hover:border-[var(--teal,#0d9488)] shrink-0 active:scale-95 ${
							isBlanksMenuOpen ? "border-[var(--teal,#0d9488)] bg-[var(--paper-soft)]" : ""
						}`}
						data-testid="btn-print-blanks-menu"
						title="Печать чистых медицинских бланков и выписок"
					>
						<FileText size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>Печать бланков</span>
						<ChevronDown size={12} className={`text-[var(--muted)] transition-transform duration-150 ${isBlanksMenuOpen ? "rotate-180" : ""}`} />
					</button>

					{isBlanksMenuOpen && (
						<PatientDocumentsBlanksMenu
							patient={patient}
							onClose={() => setIsBlanksMenuOpen(false)}
							onPrintOutpatientCard={onPrintOutpatientCard}
							onOpenFastPrint={onOpenFastPrint}
						/>
					)}
				</div>
			</div>
		</div>
	);
};
