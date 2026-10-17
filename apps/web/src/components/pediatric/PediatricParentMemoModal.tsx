import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Copy } from "lucide-react";
import { showToast } from "../GlobalToast";
import type {
	FranklRating,
	PediatricSilveringOptions,
	PediatricFissureSealingOptions,
	PediatricPulpotomyOptions,
} from "../../odontogram/pediatricDentitionEngine";
import { buildParentMemoText } from "./parentMemo/parentMemoTextGenerator";
import { printParentMemo } from "./parentMemo/parentMemoPrint";
import { PediatricParentMemoForm } from "./parentMemo/PediatricParentMemoForm";
import { PediatricParentMemoFooter } from "./parentMemo/PediatricParentMemoFooter";

export interface PediatricParentMemoModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientName?: string | undefined;
	patientPhone?: string | undefined;
	patientAgeYears?: number | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	initialFrankl?: FranklRating | undefined;
	initialSilvering?: PediatricSilveringOptions | undefined;
	initialFissureSealing?: PediatricFissureSealingOptions | undefined;
	initialPulpotomy?: PediatricPulpotomyOptions | undefined;
	onApplyFrankl?: ((rating: FranklRating, note?: string) => void) | undefined;
	onBack?: (() => void) | undefined;
}

export const PediatricParentMemoModal: React.FC<PediatricParentMemoModalProps> = ({
	isOpen,
	onClose,
	patientName = "Юный пациент",
	patientPhone,
	patientAgeYears = 7,
	doctorName = "Врач-стоматолог детский",
	clinicName = "Детское отделение DENTE",
	initialFrankl = 3,
	initialSilvering,
	initialFissureSealing,
	initialPulpotomy,
	onApplyFrankl,
}) => {
	const [frankl, setFrankl] = useState<FranklRating>(initialFrankl);
	const [hasAnesthesia, setHasAnesthesia] = useState<boolean>(true);
	const [hasPulpotomy, setHasPulpotomy] = useState<boolean>(Boolean(initialPulpotomy));
	const [pulpotomyTooth, setPulpotomyTooth] = useState<number>(initialPulpotomy?.toothNumber ?? 54);
	const [hasFissureSealing, setHasFissureSealing] = useState<boolean>(Boolean(initialFissureSealing));
	const [fissureTeeth, setFissureTeeth] = useState<string>((initialFissureSealing?.teethNumbers ?? [16, 26, 36, 46]).join(", "));
	const [hasSilvering, setHasSilvering] = useState<boolean>(Boolean(initialSilvering));
	const [silveringTeeth, setSilveringTeeth] = useState<string>((initialSilvering?.teethNumbers ?? [51, 52, 61, 62]).join(", "));
	const [customNotes, setCustomNotes] = useState<string>("");

	const memoText = useMemo(() => {
		const parsedFissure = fissureTeeth.split(",").map((s) => Number.parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
		const parsedSilvering = silveringTeeth.split(",").map((s) => Number.parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
		return buildParentMemoText({ patientName, patientAgeYears, clinicName, doctorName, frankl, hasPulpotomy, pulpotomyTooth, hasFissureSealing, parsedFissureTeeth: parsedFissure, hasSilvering, parsedSilveringTeeth: parsedSilvering, customNotes, hasAnesthesia });
	}, [customNotes, doctorName, clinicName, fissureTeeth, frankl, hasAnesthesia, hasFissureSealing, hasPulpotomy, hasSilvering, patientAgeYears, patientName, pulpotomyTooth, silveringTeeth]);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(memoText);
		showToast("Текст памятки скопирован в буфер обмена", "success");
	}, [memoText]);

	const handleWhatsApp = useCallback(() => {
		const cleanPhone = (patientPhone || "").replace(/\D/g, "");
		const encoded = encodeURIComponent(memoText);
		const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
		if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
		showToast("Памятка открыта для отправки в WhatsApp!", "success");
	}, [memoText, patientPhone]);

	const handleTelegram = useCallback(() => {
		const encoded = encodeURIComponent(memoText);
		const url = `https://t.me/share/url?url=&text=${encoded}`;
		if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
		showToast("Памятка подготовлена для отправки в Telegram!", "success");
	}, [memoText]);

	const handlePrint = useCallback(() => {
		printParentMemo({ patientName, memoText, clinicName, doctorName });
		if (onApplyFrankl) onApplyFrankl(frankl);
	}, [clinicName, doctorName, frankl, memoText, onApplyFrankl, patientName]);

	if (!isOpen) return null;

	const content = (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
			<div className="relative w-full max-w-2xl rounded-3xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto">
				<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)]">
					<h3 className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)]">Памятка родителям после приёма</h3>
					<div className="flex items-center gap-2">
						<button type="button" onClick={handlePrint} className="h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition" data-testid="btn-print-parent-memo">
							<Printer className="h-4 w-4" />
							<span>Печать</span>
						</button>
						<button type="button" onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition" aria-label="Закрыть">
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>
				<PediatricParentMemoForm frankl={frankl} setFrankl={setFrankl} hasAnesthesia={hasAnesthesia} setHasAnesthesia={setHasAnesthesia} hasPulpotomy={hasPulpotomy} setHasPulpotomy={setHasPulpotomy} pulpotomyTooth={pulpotomyTooth} setPulpotomyTooth={setPulpotomyTooth} hasFissureSealing={hasFissureSealing} setHasFissureSealing={setHasFissureSealing} fissureTeeth={fissureTeeth} setFissureTeeth={setFissureTeeth} hasSilvering={hasSilvering} setHasSilvering={setHasSilvering} silveringTeeth={silveringTeeth} setSilveringTeeth={setSilveringTeeth} customNotes={customNotes} setCustomNotes={setCustomNotes} />
				<PediatricParentMemoFooter onCopy={handleCopy} onWhatsApp={handleWhatsApp} onTelegram={handleTelegram} onPrint={handlePrint} />
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};

export default PediatricParentMemoModal;
