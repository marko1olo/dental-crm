import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Award, Copy, Printer, X } from "lucide-react";
import { resolveBraveryDiplomaRequisites } from "../../utils/pediatric/braveryDiplomaGenerator.js";
import { printBraveryDiploma } from "./diploma/diplomaPrint";
import { PediatricBraveryDiplomaPreview } from "./diploma/PediatricBraveryDiplomaPreview";

export interface PediatricBraveryDiplomaModalProps {
	readonly isOpen: boolean; readonly onClose: () => void;
	readonly patientName?: string; readonly patientAgeYears?: number;
	readonly doctorName?: string; readonly clinicName?: string; readonly visitDate?: string;
}

export const PediatricBraveryDiplomaModal: React.FC<PediatricBraveryDiplomaModalProps> = ({
	isOpen, onClose, patientName, patientAgeYears = 6, doctorName, clinicName, visitDate,
}) => {
	const resolved = useMemo(() => resolveBraveryDiplomaRequisites({ patientName, patientAgeYears, doctorName, clinicName }), [patientName, patientAgeYears, doctorName, clinicName]);
	const effectiveDoctorName = resolved.doctorName;
	const effectiveClinicName = resolved.clinicName;

	const effectiveDate = useMemo(() => visitDate || new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }), [visitDate]);

	const [heroName, setHeroName] = useState<string>(patientName?.trim() || resolved.patientName || "Юный пациент");
	useEffect(() => { if (patientName?.trim()) setHeroName(patientName.trim()); }, [patientName]);

	const [praiseText] = useState<string>("Награждается за невероятную храбрость, ослепительную улыбку и дружбу с Зубной Феей на приеме у врача-стоматолога!");

	const heroDisplay = useMemo(() => {
		const t = heroName.trim();
		return !t ? "Герой: Юный пациент" : t.startsWith("Герой:") ? t : `Герой: ${t}`;
	}, [heroName]);

	const doctorDisplay = useMemo(() => {
		const t = effectiveDoctorName.trim();
		return !t ? "Доктор: Врач-стоматолог" : t.startsWith("Доктор:") ? t : `Доктор: ${t}`;
	}, [effectiveDoctorName]);

	const handleCopyDiplomaText = useCallback(() => {
		const text = `ДИПЛОМ ЗА ХРАБРОСТЬ № ${resolved.diplomaNumber}\n${heroDisplay}\n${praiseText}\n${doctorDisplay} • ${effectiveClinicName} • ${effectiveDate}`;
		if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
	}, [resolved.diplomaNumber, heroDisplay, praiseText, doctorDisplay, effectiveClinicName, effectiveDate]);

	const handlePrint = useCallback(() => {
		printBraveryDiploma({ heroName, effectiveDoctorName, effectiveClinicName, effectiveDate, praiseText });
	}, [effectiveClinicName, effectiveDate, effectiveDoctorName, heroName, praiseText]);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
				e.preventDefault();
				handlePrint();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose, handlePrint]);

	if (!isOpen) return null;

	const content = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			data-testid="pediatric-bravery-diploma-modal"
		>
			<div className="relative w-full max-w-2xl rounded-3xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto">
				<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)]">
					<div className="flex items-center gap-2">
						<Award className="h-6 w-6 text-amber-500 shrink-0" />
						<h3 className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)]">Диплом за храбрость</h3>
					</div>
					<div className="flex items-center gap-2">
						<button type="button" onClick={handlePrint} className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition" data-testid="btn-print-bravery-diploma">
							<Printer className="h-4 w-4" />
							<span>Распечатать (Enter)</span>
						</button>
						<button type="button" onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition" aria-label="Закрыть">
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>
				<PediatricBraveryDiplomaPreview effectiveClinicName={effectiveClinicName} heroDisplay={heroDisplay} praiseText={praiseText} doctorDisplay={doctorDisplay} effectiveDate={effectiveDate} diplomaNumber={resolved.diplomaNumber} />
				<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<label htmlFor="diploma-hero-input" className="text-xs font-bold text-[var(--muted,#64748b)] shrink-0">Имя героя:</label>
						<input id="diploma-hero-input" type="text" value={heroName} onChange={(e) => setHeroName(e.target.value)} className="h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] w-full sm:w-48" placeholder="Имя ребенка" />
					</div>
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleCopyDiplomaText}
							className="h-9 sm:h-8 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="btn-copy-diploma-text"
						>
							<Copy className="w-3.5 h-3.5" />
							<span>Копировать</span>
						</button>
						<button type="button" onClick={handlePrint} className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer select-none" data-testid="btn-modal-print-diploma">
							<Printer className="h-4 w-4" />
							<span>Распечатать диплом (Enter)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};

export default PediatricBraveryDiplomaModal;
