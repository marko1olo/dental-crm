import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Award, Copy, Printer, Send, MessageCircle, X } from "lucide-react";
import { showToast } from "../GlobalToast";
import { resolveBraveryDiplomaRequisites } from "../../utils/pediatric/braveryDiplomaGenerator.js";
import { printBraveryDiploma } from "./diploma/diplomaPrint";
import { PediatricBraveryDiplomaPreview } from "./diploma/PediatricBraveryDiplomaPreview";

export interface PediatricBraveryDiplomaModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly visitDate?: string | undefined;
}

export const PediatricBraveryDiplomaModal: React.FC<PediatricBraveryDiplomaModalProps> = ({
	isOpen,
	onClose,
	patientName,
	patientPhone,
	patientAgeYears = 6,
	doctorName,
	clinicName,
	visitDate,
}) => {
	const resolved = useMemo(
		() => resolveBraveryDiplomaRequisites({ patientName, patientAgeYears, doctorName, clinicName }),
		[patientName, patientAgeYears, doctorName, clinicName],
	);
	const effectiveDoctorName = resolved.doctorName;
	const effectiveClinicName = resolved.clinicName;
	const effectiveDate = useMemo(
		() => visitDate || new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
		[visitDate],
	);

	const [heroName, setHeroName] = useState<string>(patientName?.trim() || resolved.patientName || "Юный пациент");
	useEffect(() => {
		if (patientName?.trim()) setHeroName(patientName.trim());
	}, [patientName]);

	const praiseText = "Награждается за невероятную храбрость, ослепительную улыбку и дружбу с Зубной Феей на приеме у врача-стоматолога!";

	const heroDisplay = useMemo(() => {
		const t = heroName.trim();
		return !t ? "Герой: Юный пациент" : t.startsWith("Герой:") ? t : `Герой: ${t}`;
	}, [heroName]);

	const doctorDisplay = useMemo(() => {
		const t = effectiveDoctorName.trim();
		return !t ? "Доктор: Врач-стоматолог" : t.startsWith("Доктор:") ? t : `Доктор: ${t}`;
	}, [effectiveDoctorName]);

	const diplomaSummaryText = useMemo(() => {
		return `ДИПЛОМ ЗА ХРАБРОСТЬ № ${resolved.diplomaNumber}\n${heroDisplay}\n${praiseText}\n${doctorDisplay} • ${effectiveClinicName} • ${effectiveDate}`;
	}, [resolved.diplomaNumber, heroDisplay, praiseText, doctorDisplay, effectiveClinicName, effectiveDate]);

	const handleCopyDiplomaText = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(diplomaSummaryText).then(() => {
				showToast("Текст диплома скопирован в буфер обмена", "success");
			}).catch(() => {});
		}
	}, [diplomaSummaryText]);

	const handleWhatsApp = useCallback(() => {
		const cleanPhone = (patientPhone || "").replace(/\D/g, "");
		const encoded = encodeURIComponent(diplomaSummaryText);
		const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
		if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
		showToast("Диплом отправлен в WhatsApp!", "success");
	}, [diplomaSummaryText, patientPhone]);

	const handleTelegram = useCallback(() => {
		const encoded = encodeURIComponent(diplomaSummaryText);
		const url = `https://t.me/share/url?url=&text=${encoded}`;
		if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
		showToast("Диплом подготовлен для отправки в Telegram!", "success");
	}, [diplomaSummaryText]);

	const handlePrint = useCallback(() => {
		printBraveryDiploma({
			heroName,
			effectiveDoctorName,
			doctorName: effectiveDoctorName,
			effectiveClinicName,
			clinicName: effectiveClinicName,
			effectiveDate,
			visitDate: effectiveDate,
			praiseText,
			diplomaNumber: resolved.diplomaNumber,
		});
	}, [effectiveClinicName, effectiveDate, effectiveDoctorName, heroName, praiseText, resolved.diplomaNumber]);

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
			<div
				className="relative w-full max-w-2xl rounded-3xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto"
				data-testid="pediatric-hero-diploma-modal"
			>
				<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e2e8f0)]">
					<div className="flex items-center gap-2">
						<Award className="h-6 w-6 text-amber-500 shrink-0" />
						<h3 className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)]">Диплом за храбрость</h3>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
							data-testid="btn-print-bravery-diploma"
						>
							<Printer className="h-4 w-4 text-[var(--muted,#64748b)]" />
							<span>Распечатать (Enter)</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-8 w-8 rounded-full flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition cursor-pointer"
							aria-label="Закрыть"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				<PediatricBraveryDiplomaPreview
					effectiveClinicName={effectiveClinicName}
					heroDisplay={heroDisplay}
					praiseText={praiseText}
					doctorDisplay={doctorDisplay}
					effectiveDate={effectiveDate}
					diplomaNumber={resolved.diplomaNumber}
				/>

				<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<label htmlFor="diploma-hero-input" className="text-xs font-bold text-[var(--muted,#64748b)] shrink-0">Имя героя:</label>
						<input
							id="diploma-hero-input"
							type="text"
							value={heroName}
							onChange={(e) => setHeroName(e.target.value)}
							className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] w-full sm:w-48"
							placeholder="Имя ребенка"
							data-testid="diploma-hero-name-input"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleWhatsApp}
							className="min-h-[44px] sm:min-h-[36px] px-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="btn-whatsapp-diploma"
							title="Отправить родителям в WhatsApp"
						>
							<MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
							<span>WhatsApp</span>
						</button>

						<button
							type="button"
							onClick={handleTelegram}
							className="min-h-[44px] sm:min-h-[36px] px-3 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 text-xs font-bold hover:bg-sky-100 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="btn-telegram-diploma"
							title="Отправить в Telegram"
						>
							<Send className="w-3.5 h-3.5 text-sky-600" />
							<span>Telegram</span>
						</button>

						<button
							type="button"
							onClick={handleCopyDiplomaText}
							className="min-h-[44px] sm:min-h-[36px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="btn-copy-diploma-text"
						>
							<Copy className="w-3.5 h-3.5" />
							<span>Копировать</span>
						</button>

						<button
							type="button"
							onClick={handlePrint}
							className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer select-none active:scale-95"
							data-testid="btn-modal-print-diploma"
						>
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
