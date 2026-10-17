import React from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardEdit, Copy } from "lucide-react";
import type { EvaluatedSafetyFlagsResult } from "./safetyMath";

interface PatientAllergyBannerActionsProps {
	evaluation: EvaluatedSafetyFlagsResult;
	compact: boolean;
	isDrawerOpen: boolean;
	setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
	handleApplySomaticNorm: () => void;
	handleSyncToDiary: () => void;
	showModalButton: boolean;
	setIsModalOpen: (open: boolean) => void;
}

export const PatientAllergyBannerActions: React.FC<PatientAllergyBannerActionsProps> = ({
	evaluation,
	compact,
	isDrawerOpen,
	setIsDrawerOpen,
	handleApplySomaticNorm,
	handleSyncToDiary,
	showModalButton,
	setIsModalOpen,
}) => (
	<div className="patient-safety-banner__actions">
		{evaluation.activeFlags.length === 0 && (
			<button
				type="button"
				onClick={handleApplySomaticNorm}
				className="safety-btn safety-btn--outline"
				data-testid="banner-apply-somatic-norm-btn"
				title="Зафиксировать физиологическую норму"
			>
				<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
				<span>Соматически здоров (норма)</span>
			</button>
		)}
		{evaluation.activeFlags.length > 0 && !compact && (
			<button
				type="button"
				onClick={() => setIsDrawerOpen((prev) => !prev)}
				aria-expanded={isDrawerOpen}
				className="safety-btn safety-btn--outline"
			>
				{isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
				<span>{isDrawerOpen ? "Свернуть" : "Подробнее"}</span>
			</button>
		)}
		{evaluation.activeFlags.length > 0 && (
			<button
				type="button"
				onClick={handleSyncToDiary}
				className="safety-btn safety-btn--outline"
				title="Скопировать сводку для дневника приёма"
			>
				<Copy className="w-3.5 h-3.5 shrink-0" />
				<span>В дневник</span>
			</button>
		)}
		{showModalButton && (
			<button
				type="button"
				onClick={() => setIsModalOpen(true)}
				className={`safety-btn ${evaluation.hasCriticalStopFlags ? "safety-btn--primary-red" : "safety-btn--outline"}`}
			>
				<ClipboardEdit className="w-3.5 h-3.5 shrink-0" />
				<span>Анкета здоровья</span>
			</button>
		)}
	</div>
);
