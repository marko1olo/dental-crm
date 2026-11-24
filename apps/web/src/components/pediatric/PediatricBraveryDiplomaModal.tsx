import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Award, Copy, Printer, Send, MessageCircle, X } from "lucide-react";
import { showToast } from "../GlobalToast";
import { resolveBraveryDiplomaRequisites } from "../../utils/pediatric/braveryDiplomaGenerator";
import { printBraveryDiploma } from "./diploma/diplomaPrint";
import { PediatricBraveryDiplomaPreview } from "./diploma/PediatricBraveryDiplomaPreview";

export interface PediatricBraveryDiplomaModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
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
	patientId,
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

	const persistBraveryDiploma = useCallback(async () => {
		if (!patientId || !patientId.trim()) return;
		try {
			await fetch(`/api/patients/${encodeURIComponent(patientId.trim())}/pediatric/bravery-diploma`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					patientName: heroName.trim() || resolved.patientName || "Юный пациент",
					patientAgeYears,
					doctorName: effectiveDoctorName,
					clinicName: effectiveClinicName,
					awardReasonRu: praiseText,
					awardedDateIso: new Date().toISOString(),
				}),
			});
		} catch {
			// Offline-first graceful fallback per Mandate 8e
		}
	}, [patientId, heroName, resolved.patientName, patientAgeYears, effectiveDoctorName, effectiveClinicName, praiseText]);

	const heroDisplay = useMemo(() => {
		const t = heroName.trim();
		return !t ? "Герой: Юный пациент" : t.startsWith("Герой:") ? t : `Герой: ${t}`;
	}, [heroName]);

	const doctorDisplay = useMemo(() => {
		const t = effectiveDoctorName.trim();
		return !t ? "Доктор: Врач-стоматолог" : t.startsWith("Доктор:") ? t : `Доктор: ${t}`;
	}, [effectiveDoctorName]);

	const diplomaSummaryText = useMemo(() => {
		return `Диплом за храбрость № ${resolved.diplomaNumber}\n${heroDisplay}\n${praiseText}\n${doctorDisplay} • ${effectiveClinicName} • ${effectiveDate}`;
	}, [resolved.diplomaNumber, heroDisplay, praiseText, doctorDisplay, effectiveClinicName, effectiveDate]);

	const handleCopyDiplomaText = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(diplomaSummaryText).then(() => {
				showToast("Текст диплома скопирован в буфер обмена", "success");
			}).catch(() => {});
		}
	}, [diplomaSummaryText]);

	const handleWhatsApp = useCallback(() => {
		void persistBraveryDiploma();
		const cleanPhone = (patientPhone || "").replace(/\D/g, "");
		const encoded = encodeURIComponent(diplomaSummaryText);
		const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
		if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
		showToast("Диплом отправлен в WhatsApp!", "success");
	}, [persistBraveryDiploma, diplomaSummaryText, patientPhone]);

	const handleTelegram = useCallback(() => {
		void persistBraveryDiploma();
		const encoded = encodeURIComponent(diplomaSummaryText);
		const url = `https://t.me/share/url?url=&text=${encoded}`;
		if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
		showToast("Диплом подготовлен для отправки в Telegram!", "success");
	}, [persistBraveryDiploma, diplomaSummaryText]);

	const handlePrint = useCallback(() => {
		void persistBraveryDiploma();
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
	}, [persistBraveryDiploma, effectiveClinicName, effectiveDate, effectiveDoctorName, heroName, praiseText, resolved.diplomaNumber]);

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
			className="fixed inset-0 z-[10060] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			data-testid="pediatric-bravery-diploma-modal"
		>
			<div
				className="relative w-full max-w-2xl rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto"
				data-testid="pediatric-hero-diploma-modal"
			>
				<div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<Award className="h-5 w-5 text-[var(--primary)] shrink-0" />
						<h3 className="text-base sm:text-lg font-semibold text-[var(--ink)]">Диплом за храбрость</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] h-8 w-8 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<PediatricBraveryDiplomaPreview
					effectiveClinicName={effectiveClinicName}
					heroDisplay={heroDisplay}
					praiseText={praiseText}
					doctorDisplay={doctorDisplay}
					effectiveDate={effectiveDate}
					diplomaNumber={resolved.diplomaNumber}
				/>

				<div className="mt-4 pt-3 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<label htmlFor="diploma-hero-input" className="text-xs font-medium text-[var(--ink-muted)] shrink-0">Имя героя:</label>
						<input
							id="diploma-hero-input"
							type="text"
							value={heroName}
							onChange={(e) => setHeroName(e.target.value)}
							className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] w-full sm:w-48"
							placeholder="Имя ребенка"
							data-testid="diploma-hero-name-input"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleWhatsApp}
							className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium hover:bg-[var(--paper-soft)] transition flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="btn-whatsapp-diploma"
							title="Отправить родителям в WhatsApp"
						>
							<MessageCircle className="w-4 h-4 shrink-0" />
							<span>WhatsApp</span>
						</button>

						<button
							type="button"
							onClick={handleTelegram}
							className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium hover:bg-[var(--paper-soft)] transition flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="btn-telegram-diploma"
							title="Отправить в Telegram"
						>
							<Send className="w-4 h-4 shrink-0" />
							<span>Telegram</span>
						</button>

						<button
							type="button"
							onClick={handleCopyDiplomaText}
							className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition flex items-center gap-1.5 cursor-pointer active:scale-95"
							data-testid="btn-copy-diploma-text"
						>
							<Copy className="w-4 h-4 shrink-0" />
							<span>Копировать</span>
						</button>

						<button
							type="button"
							onClick={handlePrint}
							className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer select-none active:scale-95"
							data-testid="btn-modal-print-diploma"
						>
							<Printer className="h-4 w-4 shrink-0" />
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
