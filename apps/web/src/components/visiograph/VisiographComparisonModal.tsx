/**
 * DENTE CRM — Visiograph Comparison & Consultation Modal (VisiographComparisonModal)
 * Dedicated chairside modal providing EzDent-i Side-by-Side Dual View comparison of
 * patient RVG visiograms (Before/After) alongside the 8 dental disciplines pathology library.
 *
 * Standards: EzDent-i Screenshots 25 & 26; Mandate 8b (<=800 lines); Mandate 8e (Doctor Autonomy).
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { RadiologyConsultationSplit } from "../radiology/RadiologyConsultationSplit.js";
import type { RadiologyStudy } from "../radiology/types.js";
import type { RadiologyFilmstripItem } from "../radiology/RadiologyFilmstripDock.js";

export interface VisiographComparisonModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientCardNumber?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientGender?: string | undefined;
	readonly currentStudy?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly candidateStudy?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly historyStudies?: readonly (RadiologyStudy | RadiologyFilmstripItem)[] | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly onInsertProtocol?: ((note: string) => void) | undefined;
}

export const VisiographComparisonModal: React.FC<VisiographComparisonModalProps> = ({
	isOpen,
	onClose,
	patientName = "Чухрова Лариса",
	patientCardNumber = "20190621_101042",
	patientAge = "58Y",
	patientGender = "Жен.",
	currentStudy,
	candidateStudy,
	historyStudies = [],
	activeToothFdi,
	onInsertProtocol,
}) => {
	// Close on Escape key
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;
	if (typeof document === "undefined") return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex flex-col p-2 sm:p-4 select-none"
			style={{
				backgroundColor: "rgba(15, 23, 42, 0.72)",
				backdropFilter: "blur(4px)",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#334155] shadow-2xl bg-[#020617]"
				style={{
					backgroundColor: "#020617",
					borderColor: "#334155",
				}}
				data-testid="visiograph-comparison-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Сплит-сравнение визиограмм и консультация"
			>
				<RadiologyConsultationSplit
					patientName={patientName}
					patientCardNumber={patientCardNumber}
					patientAge={patientAge}
					patientGender={patientGender}
					activeToothFdi={activeToothFdi}
					initialLeftStudy={currentStudy}
					initialRightStudy={candidateStudy}
					patientStudiesHistory={historyStudies}
					onClose={onClose}
					onInsertProtocol={onInsertProtocol}
				/>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
};
