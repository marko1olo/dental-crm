import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Award, Copy, Printer, X, Sparkles } from "lucide-react";
import { resolveBraveryDiplomaRequisites } from "../../utils/pediatric/braveryDiplomaGenerator.js";
import { printHeroDiploma, type HeroDiplomaPrintOptions } from "./pediatricHeroDiplomaPrint";

export interface PediatricHeroDiplomaModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly visitDate?: string | undefined;
}

export const PediatricHeroDiplomaModal: React.FC<PediatricHeroDiplomaModalProps> = ({
	isOpen, onClose, patientName, patientAgeYears = 6, doctorName, clinicName, visitDate,
}) => {
	const requisites = useMemo(() => resolveBraveryDiplomaRequisites({ patientName, patientAgeYears, doctorName, clinicName }), [patientName, patientAgeYears, doctorName, clinicName]);
	const [heroName, setHeroName] = useState<string>(patientName?.trim() || requisites.patientName || "Юный пациент");
	useEffect(() => { if (patientName?.trim()) setHeroName(patientName.trim()); }, [patientName]);

	const effectiveDoctor = requisites.doctorName;
	const effectiveClinic = requisites.clinicName;
	const effectiveDate = useMemo(() => visitDate || new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }), [visitDate]);
	const praiseText = "Награждается за невероятную храбрость, ослепительную улыбку и дружбу с Зубной Феей на приёме у стоматолога!";

	const handlePrint = useCallback(() => {
		printHeroDiploma({ heroName, doctorName: effectiveDoctor, clinicName: effectiveClinic, visitDate: effectiveDate, praiseText, diplomaNumber: requisites.diplomaNumber });
	}, [heroName, effectiveDoctor, effectiveClinic, effectiveDate, praiseText, requisites.diplomaNumber]);

	const handleCopy = useCallback(() => {
		const text = `ДИПЛОМ СУПЕРГЕРОЯ ЗА ХРАБРОСТЬ № ${requisites.diplomaNumber}\nГерой: ${heroName}\n${praiseText}\nВрач: ${effectiveDoctor} • ${effectiveClinic} • ${effectiveDate}`;
		if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
	}, [requisites.diplomaNumber, heroName, praiseText, effectiveDoctor, effectiveClinic, effectiveDate]);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
				e.preventDefault(); handlePrint();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose, handlePrint]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" data-testid="pediatric-hero-diploma-modal">
			<div className="relative w-full max-w-2xl rounded-3xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto">
				<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)]">
					<div className="flex items-center gap-2">
						<Award className="h-6 w-6 text-amber-500 shrink-0" />
						<h3 className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)]">Диплом супергероя за храбрость</h3>
					</div>
					<button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] rounded-full flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition cursor-pointer" aria-label="Закрыть">
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="rounded-2xl border-4 border-amber-400 bg-amber-50/70 dark:bg-amber-950/20 p-5 text-center relative overflow-hidden" data-testid="diploma-preview-card">
					<div className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider mb-1 flex items-center justify-center gap-1.5">
						<Sparkles className="h-3.5 w-3.5" /><span>{effectiveClinic} • № {requisites.diplomaNumber}</span><Sparkles className="h-3.5 w-3.5" />
					</div>
					<h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-amber-900 dark:text-amber-200 my-2">ДИПЛОМ ЗА ХРАБРОСТЬ</h2>
					<div className="my-2 inline-block rounded-xl bg-[var(--paper,#ffffff)] border border-amber-300 dark:border-amber-700/60 px-5 py-2 shadow-xs">
						<span className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-100 font-mono">Герой: {heroName}</span>
					</div>
					<p className="max-w-md mx-auto text-xs sm:text-sm text-[var(--ink,#0f172a)] font-medium leading-relaxed my-2">{praiseText}</p>
					<div className="mt-4 pt-3 border-t border-dashed border-amber-300 dark:border-amber-800/60 flex items-center justify-between text-xs font-bold text-[var(--muted,#64748b)]">
						<span className="font-mono text-amber-900 dark:text-amber-300 font-extrabold">Врач: {effectiveDoctor}</span>
						<span>{effectiveDate}</span>
					</div>
				</div>

				<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<label htmlFor="diploma-hero-input" className="text-xs font-bold text-[var(--muted,#64748b)] shrink-0">Имя героя:</label>
						<input id="diploma-hero-input" type="text" value={heroName} onChange={(e) => setHeroName(e.target.value)} className="min-h-[44px] sm:min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] w-full sm:w-48" placeholder="Имя ребенка" data-testid="diploma-hero-name-input" />
					</div>
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button type="button" onClick={handleCopy} className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition flex items-center gap-1.5 cursor-pointer active:scale-95" data-testid="btn-copy-diploma-text">
							<Copy className="w-4 h-4" /><span>Копировать</span>
						</button>
						<button type="button" onClick={handlePrint} className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer select-none active:scale-95" data-testid="btn-modal-print-diploma">
							<Printer className="h-4 w-4" /><span>Распечатать диплом (Enter)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default PediatricHeroDiplomaModal;
