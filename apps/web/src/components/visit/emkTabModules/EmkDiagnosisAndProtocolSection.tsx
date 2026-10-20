/**
 * apps/web/src/components/visit/emkTabModules/EmkDiagnosisAndProtocolSection.tsx
 *
 * Блок выбора клинического диагноза из единого справочника @dental/shared
 * (clinicalDiagnosesSsot.ts) и заполнения протокола лечения по шаблонам.
 * Строго 0 мультяшных эмодзи и 0 голых кодов МКБ-10 без русского клинического описания.
 */

import React from "react";
import { BookOpen, Check, Stethoscope } from "lucide-react";
import {
	CLINICAL_DIAGNOSES_SSOT,
	getAllOutpatientDentalDiagnoses,
	getClinicalDiagnosisByIcd10,
	getStandardSoapProtocolForDiagnosis,
	searchClinicalDiagnoses,
	type ClinicalDiagnosisCategory,
	type CanonicalClinicalDiagnosis,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { EmkDiaryProtocolSection } from "../emk/EmkDiaryProtocolSection";
import type {
	EmkAppliedDiagnosisProtocol,
	EmkDiagnosisAndProtocolSectionProps,
} from "./emkTabTypes";

/**
 * Возвращает список амбулаторных стоматологических диагнозов из SSOT с фильтрацией по категории и поиску.
 */
export function getOutpatientDiagnosesForQuickPicker(
	category?: ClinicalDiagnosisCategory | "all",
	query?: string,
): readonly CanonicalClinicalDiagnosis[] {
	const base = query?.trim()
		? searchClinicalDiagnoses(query.trim())
		: getAllOutpatientDentalDiagnoses();
	if (!category || category === "all") {
		return base;
	}
	return base.filter((entry) => entry.category === category);
}

/**
 * Собирает готовый клинический протокол (жалобы, анамнез, объективный статус, диагноз, лечение, рекомендации)
 * по коду МКБ-10 или идентификатору из единого справочника clinicalDiagnosesSsot.ts.
 */
export function buildDiagnosisProtocolFromSsot(
	icd10OrId: string,
	toothNumber?: number | string | null,
): EmkAppliedDiagnosisProtocol | null {
	const normalized = icd10OrId.trim();
	const entry =
		getClinicalDiagnosisByIcd10(normalized) ??
		CLINICAL_DIAGNOSES_SSOT.find(
			(d) => d.id === normalized || d.icd10.toUpperCase() === normalized.toUpperCase(),
		);

	if (!entry) {
		return null;
	}

	const numericTooth =
		toothNumber !== null &&
		toothNumber !== undefined &&
		Number.isFinite(Number(toothNumber)) &&
		Number(toothNumber) > 0
			? Number(toothNumber)
			: undefined;

	const protocol = getStandardSoapProtocolForDiagnosis(entry.icd10);
	const formattedDiagnosis = numericTooth
		? `Зуб ${numericTooth}: ${entry.icd10} ${entry.title}`
		: `${entry.icd10} ${entry.title}`;

	return {
		diagnosisEntry: entry,
		formattedDiagnosis,
		complaints: protocol?.complaints || entry.soapTemplate?.complaints || "",
		anamnesis: protocol?.anamnesis || entry.soapTemplate?.anamnesis || "",
		objectiveStatus: protocol?.objective || entry.soapTemplate?.objective || "",
		treatmentPlan:
			(protocol as any)?.treatmentPlan ||
			(protocol as any)?.treatmentDone ||
			entry.soapTemplate?.treatmentPlan ||
			"",
		recommendations: protocol?.recommendations || entry.soapTemplate?.recommendations || "",
		order804nServices: (entry as any).recommendedServices || (entry as any).recommendedServices804n || [],
	};
}

export function EmkDiagnosisAndProtocolSection(
	props: EmkDiagnosisAndProtocolSectionProps,
) {
	const { isLocked, activeTooth, onOpenTemplatesModal } = props;
	const visitNoteForm: Record<string, any> = props.visitNoteForm ?? {};
	const updateVisitNoteField: (field: string, value: any) => void =
		props.updateVisitNoteField ?? (() => {});
	const quickSsotEntries = React.useMemo(
		() => getAllOutpatientDentalDiagnoses().slice(0, 6),
		[],
	);

	const currentDiagnosisText = String(visitNoteForm?.diagnosis || "");

	const handleSelectSsotDiagnosis = (entry: CanonicalClinicalDiagnosis) => {
		const built = buildDiagnosisProtocolFromSsot(entry.icd10, activeTooth);
		if (!built) return;

		updateVisitNoteField("diagnosis", built.formattedDiagnosis);
		if (!String(visitNoteForm?.complaint || "").trim()) {
			updateVisitNoteField("complaint", built.complaints);
		}
		if (!String(visitNoteForm?.anamnesis || "").trim()) {
			updateVisitNoteField("anamnesis", built.anamnesis);
		}
		if (!String(visitNoteForm?.objectiveStatus || "").trim()) {
			updateVisitNoteField("objectiveStatus", built.objectiveStatus);
		}
		if (!String(visitNoteForm?.treatmentPlan || "").trim()) {
			updateVisitNoteField("treatmentPlan", built.treatmentPlan);
		}
		if (!String(visitNoteForm?.recommendations || "").trim()) {
			updateVisitNoteField("recommendations", built.recommendations);
		}

		showToast(
			`Применён диагноз и протокол: ${entry.icd10} ${entry.shortTitle}`,
			"success",
			2400,
		);
	};

	return (
		<div
			className="space-y-2.5 w-full min-w-0"
			data-testid="emk-diagnosis-and-protocol-module"
		>
			{/* Компактная полоса справочника клинических диагнозов МКБ-10 (SSOT) */}
			<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2 min-w-0">
					<Stethoscope size={15} className="text-[var(--brand)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)]">
						Справочник диагнозов (МКБ-10):
					</span>
				</div>

				<div
					className="flex flex-wrap items-center gap-1.5"
					role="group"
					aria-label="Быстрый выбор амбулаторного диагноза МКБ-10"
				>
					{quickSsotEntries.map((entry) => {
						const isSelected = currentDiagnosisText.includes(entry.icd10);
						return (
							<button
								key={entry.id}
								type="button"
								onClick={() => handleSelectSsotDiagnosis(entry)}
								className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
									isSelected
										? "bg-[var(--brand)] text-white border-[var(--brand)]"
										: "bg-[var(--paper)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border-[var(--line)]"
								}`}
								data-testid={`emk-ssot-diag-${entry.id}`}
								title={`${entry.icd10} — ${entry.title}`}
							>
								{isSelected && <Check size={12} className="shrink-0" />}
								<span>
									{entry.icd10} {entry.shortTitle}
								</span>
							</button>
						);
					})}

					{onOpenTemplatesModal && (
						<button
							type="button"
							onClick={onOpenTemplatesModal}
							className="min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper)] hover:bg-[var(--surface-hover)] text-[var(--brand)] border border-[var(--line)] transition-colors cursor-pointer inline-flex items-center gap-1"
							data-testid="btn-open-ssot-protocols-catalog"
						>
							<BookOpen size={12} className="shrink-0" />
							<span>Все шаблоны</span>
						</button>
					)}
				</div>
			</div>

			<EmkDiaryProtocolSection
				visitNoteForm={visitNoteForm}
				updateVisitNoteField={updateVisitNoteField}
				isLocked={isLocked}
				activeTooth={typeof activeTooth === "number" ? activeTooth : (activeTooth ? Number(activeTooth) : null)}
				onOpenTemplatesModal={onOpenTemplatesModal}
			/>
		</div>
	);
}
