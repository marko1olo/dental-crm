/**
 * DENTE CRM — Interactive Clinical Conflict Resolver Modal (Form 043/u).
 *
 * Implements:
 * 1. Side-by-Side visual split-brain comparison of Form 043/u clinical diary
 *    (Doctor's offline notebook vs Cloud/Assistant synchronized version).
 * 2. Non-destructive multi-field merging across clinical sections:
 *    - Жалобы (Complaints)
 *    - Анамнез (Anamnesis)
 *    - Объективный осмотр (Objective examination)
 *    - Клинический диагноз & МКБ-10 (Diagnosis & ICD-10)
 *    - Проведенное лечение & Протокол (Treatment)
 *    - Назначения & Рекомендации (Recommendations)
 *    - Зубная формула FDI (Tooth numbers)
 * 3. 1-Click Fast Actions:
 *    - Stethoscope: «Принять версию врача (Офлайн)»
 *    - Cloud: «Принять версию облака (Сервер)»
 *    - GitMerge: «Объединить неразрушающе (Smart Merge)»
 * 4. Section-level granular override toggles with real-time merged preview.
 */

import React, { useMemo, useState } from "react";
import { Check, ClipboardList, Cloud, GitMerge, Stethoscope, X } from "lucide-react";
import {
	type Clinical043DiaryRecord,
	type Clinical043SectionDiff,
	calculate043ClinicalDiff,
	mergeClinical043DiariesNonDestructive,
} from "../../services/sync/conflictResolver.js";
import "./ClinicalConflictModal.css";

export interface ClinicalConflictModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onResolve: (
		resolvedRecord: Clinical043DiaryRecord,
		strategy: "doctor" | "cloud" | "merge" | "custom",
	) => void;
	readonly conflictItem: {
		readonly id: string;
		readonly patientName?: string | undefined;
		readonly card043Number?: string | undefined;
		readonly doctorVersion: Clinical043DiaryRecord;
		readonly cloudVersion: Clinical043DiaryRecord;
		readonly conflictReason?: string | undefined;
		readonly conflictDetectedAt?: string | undefined;
	} | null;
}

type SectionChoice = "doctor" | "cloud" | "merge";

export const ClinicalConflictModal: React.FC<ClinicalConflictModalProps> = ({
	isOpen,
	onClose,
	onResolve,
	conflictItem,
}) => {
	if (!isOpen || !conflictItem) {
		return null;
	}

	const { doctorVersion, cloudVersion, patientName, card043Number, conflictReason } = conflictItem;

	// Calculate section-by-section diffs
	const sectionDiffs = useMemo(() => {
		return calculate043ClinicalDiff(doctorVersion, cloudVersion);
	}, [doctorVersion, cloudVersion]);

	// Initial selection state per section
	const [sectionChoices, setSectionChoices] = useState<Record<string, SectionChoice>>(() => {
		const initial: Record<string, SectionChoice> = {};
		for (const diff of sectionDiffs) {
			if (diff.isDifferent) {
				initial[diff.field] = diff.recommendedStrategy === "doctor"
					? "doctor"
					: diff.recommendedStrategy === "cloud"
						? "cloud"
						: "merge";
			} else {
				initial[diff.field] = "merge";
			}
		}
		return initial;
	});

	// Active overall strategy
	const [overallStrategy, setOverallStrategy] = useState<"doctor" | "cloud" | "merge" | "custom">("merge");

	// Fast 1-click global handlers
	const handleApplyAllDoctor = () => {
		const next: Record<string, SectionChoice> = {};
		for (const diff of sectionDiffs) {
			next[diff.field] = "doctor";
		}
		setSectionChoices(next);
		setOverallStrategy("doctor");
	};

	const handleApplyAllCloud = () => {
		const next: Record<string, SectionChoice> = {};
		for (const diff of sectionDiffs) {
			next[diff.field] = "cloud";
		}
		setSectionChoices(next);
		setOverallStrategy("cloud");
	};

	const handleApplyAllMerge = () => {
		const next: Record<string, SectionChoice> = {};
		for (const diff of sectionDiffs) {
			next[diff.field] = "merge";
		}
		setSectionChoices(next);
		setOverallStrategy("merge");
	};

	const handleSectionChoiceChange = (field: string, choice: SectionChoice) => {
		setSectionChoices((prev) => ({
			...prev,
			[field]: choice,
		}));
		setOverallStrategy("custom");
	};

	// Compute live merged record
	const mergedRecord = useMemo(() => {
		return mergeClinical043DiariesNonDestructive(doctorVersion, cloudVersion, sectionChoices);
	}, [doctorVersion, cloudVersion, sectionChoices]);

	const handleSave = () => {
		onResolve(mergedRecord, overallStrategy);
		onClose();
	};

	const doctorAuthor = doctorVersion.authorName || "Врач (офлайн)";
	const cloudAuthor = cloudVersion.authorName || "Ассистент / Облако";

	const differingCount = sectionDiffs.filter((d) => d.isDifferent).length;

	return (
		<div
			className="clinical-conflict-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="conflict-modal-title"
		>
			<div className="clinical-conflict-modal">
				{/* 1. Header */}
				<div className="clinical-conflict-modal__header">
					<div className="clinical-conflict-modal__title-area">
						<div className="clinical-conflict-modal__title-row">
							<h2 id="conflict-modal-title" className="clinical-conflict-modal__title">
								Разрешение клинического конфликта карты 043/у
							</h2>
							<span className="clinical-conflict-modal__badge">
								{differingCount > 0 ? `Расхождений: ${differingCount}` : "Идентично"}
							</span>
						</div>
						<p className="clinical-conflict-modal__subtitle">
							{patientName ? `Пациент: ${patientName}` : "Клинический дневник приема"}
							{card043Number ? ` • Карта № ${card043Number}` : ""}
							{conflictReason ? ` • ${conflictReason}` : ""}
						</p>
					</div>

					<button
						type="button"
						className="clinical-conflict-modal__close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* 2. Global 1-Click Fast Action Bar */}
				<div className="clinical-conflict-modal__quick-actions">
					<span className="clinical-conflict-modal__quick-label">
						Быстрое разрешение (1 клик):
					</span>
					<div className="clinical-conflict-modal__quick-buttons">
						<button
							type="button"
							className={`clinical-conflict-btn clinical-conflict-btn--doctor ${overallStrategy === "doctor" ? "clinical-conflict-btn--active" : ""}`}
							onClick={handleApplyAllDoctor}
							data-testid="btn-apply-all-doctor"
						>
							<Stethoscope size={15} />
							<span>Принять версию врача</span>
						</button>
						<button
							type="button"
							className={`clinical-conflict-btn clinical-conflict-btn--cloud ${overallStrategy === "cloud" ? "clinical-conflict-btn--active" : ""}`}
							onClick={handleApplyAllCloud}
							data-testid="btn-apply-all-cloud"
						>
							<Cloud size={15} />
							<span>Принять версию облака</span>
						</button>
						<button
							type="button"
							className={`clinical-conflict-btn clinical-conflict-btn--merge ${overallStrategy === "merge" ? "clinical-conflict-btn--active" : ""}`}
							onClick={handleApplyAllMerge}
							data-testid="btn-apply-all-merge"
						>
							<GitMerge size={15} />
							<span>Объединить неразрушающе</span>
						</button>
					</div>
				</div>

				{/* 3. Modal Body: Section by Section Side-by-Side Diff */}
				<div className="clinical-conflict-modal__body">
					{sectionDiffs.map((section) => {
						const currentChoice = sectionChoices[section.field] || "merge";

						return (
							<div
								key={section.field}
								className={`clinical-conflict-diff-card ${section.isDifferent ? "clinical-conflict-diff-card--conflict" : "clinical-conflict-diff-card--identical"}`}
								data-testid={`diff-section-${section.field}`}
							>
								<div className="clinical-conflict-diff-card__header">
									<div className="clinical-conflict-diff-card__title-area">
										<h4 className="clinical-conflict-diff-card__title">{section.labelRu}</h4>
										<span
											className={`clinical-conflict-diff-card__status-tag ${section.isDifferent ? "clinical-conflict-diff-card__status-tag--diff" : "clinical-conflict-diff-card__status-tag--same"}`}
										>
											{section.isDifferent ? "Расхождение" : "Идентично"}
										</span>
									</div>

									{/* 3-Way Segmented Control */}
									{section.isDifferent && (
										<div className="clinical-conflict-segmented" role="radiogroup">
											<button
												type="button"
												className={`clinical-conflict-segmented__btn ${currentChoice === "doctor" ? "clinical-conflict-segmented__btn--active" : ""}`}
												onClick={() => handleSectionChoiceChange(section.field, "doctor")}
												aria-label={`Выбрать версию врача для ${section.labelRu}`}
											>
												<Stethoscope size={13} />
												<span>Врач</span>
											</button>
											<button
												type="button"
												className={`clinical-conflict-segmented__btn ${currentChoice === "merge" ? "clinical-conflict-segmented__btn--active" : ""}`}
												onClick={() => handleSectionChoiceChange(section.field, "merge")}
												aria-label={`Объединить обе версии для ${section.labelRu}`}
											>
												<GitMerge size={13} />
												<span>Слить</span>
											</button>
											<button
												type="button"
												className={`clinical-conflict-segmented__btn ${currentChoice === "cloud" ? "clinical-conflict-segmented__btn--active" : ""}`}
												onClick={() => handleSectionChoiceChange(section.field, "cloud")}
												aria-label={`Выбрать версию облака для ${section.labelRu}`}
											>
												<Cloud size={13} />
												<span>Облако</span>
											</button>
										</div>
									)}
								</div>

								{/* Side-by-Side Comparison Columns */}
								<div className="clinical-conflict-columns">
									{/* Doctor Column */}
									<div
										className={`clinical-conflict-col ${currentChoice === "doctor" || currentChoice === "merge" ? "clinical-conflict-col--selected" : ""}`}
									>
										<div className="clinical-conflict-col__meta">
											<span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
												<Stethoscope size={13} />
												<span>{doctorAuthor}</span>
											</span>
											<span>Локально</span>
										</div>
										<div className="clinical-conflict-col__content">
											{section.doctorValue || <span className="clinical-conflict-col__empty">— пусто —</span>}
										</div>
									</div>

									{/* Cloud Column */}
									<div
										className={`clinical-conflict-col ${currentChoice === "cloud" || currentChoice === "merge" ? "clinical-conflict-col--selected" : ""}`}
									>
										<div className="clinical-conflict-col__meta">
											<span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
												<Cloud size={13} />
												<span>{cloudAuthor}</span>
											</span>
											<span>Сервер</span>
										</div>
										<div className="clinical-conflict-col__content">
											{section.cloudValue || <span className="clinical-conflict-col__empty">— пусто —</span>}
										</div>
									</div>
								</div>
							</div>
						);
					})}

					{/* 4. Live Merged Preview */}
					<div className="clinical-conflict-preview">
						<h4 className="clinical-conflict-preview__title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<ClipboardList size={16} />
							<span>Итоговый результат объединения (Предпросмотр карты 043/у):</span>
						</h4>
						<div className="clinical-conflict-col__content" data-testid="merged-preview-diagnosis">
							<strong>Диагноз:</strong> {mergedRecord.diagnosis || "—"} ({mergedRecord.icd10Code || "МКБ-10 не указан"})
						</div>
						<div className="clinical-conflict-col__content" data-testid="merged-preview-treatment">
							<strong>Лечение:</strong> {mergedRecord.treatment || "—"}
						</div>
					</div>
				</div>

				{/* 5. Modal Footer */}
				<div className="clinical-conflict-modal__footer">
					<div className="clinical-conflict-modal__footer-status">
						<span>
							Режим:{" "}
							<strong>
								{overallStrategy === "doctor"
									? "Версия врача"
									: overallStrategy === "cloud"
										? "Версия облака"
										: overallStrategy === "merge"
											? "Неразрушающее слияние"
											: "Пользовательский выбор"}
							</strong>
						</span>
					</div>

					<div className="clinical-conflict-modal__footer-buttons">
						<button
							type="button"
							className="clinical-conflict-btn clinical-conflict-btn--cancel"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="button"
							className="clinical-conflict-btn clinical-conflict-btn--submit"
							onClick={handleSave}
							data-testid="btn-confirm-resolve"
						>
							<Check size={15} />
							<span>Сохранить и синхронизировать</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ClinicalConflictModal;
