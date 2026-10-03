/**
 * DENTE CRM — Visiograph Comparison & Consultation Modal (VisiographComparisonModal)
 * Dedicated chairside modal providing EzDent-i Side-by-Side Dual View comparison of
 * patient RVG visiograms (Before/After) alongside the 8 dental disciplines pathology library.
 *
 * Standards: EzDent-i Screenshots 25 & 26; Mandate 8b (<=800 lines); Mandate 8e (Doctor Autonomy).
 */

import React, { useEffect } from "react";
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
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-xs p-2 sm:p-4 select-none"
			data-testid="visiograph-comparison-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Сплит-сравнение визиограмм и консультация"
		>
			<div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#334155] shadow-2xl bg-[#020617]">
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
};
