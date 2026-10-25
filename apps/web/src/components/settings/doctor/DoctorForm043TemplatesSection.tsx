/**
 * apps/web/src/components/settings/doctor/DoctorForm043TemplatesSection.tsx
 *
 * Секция управления и живого предпросмотра шаблонов дневников приёма
 * с автозаполнением клинических тегов ({зуб}, {диагноз}, {материал}, {анестезия}, {изоляция}).
 * Decomposed facade strictly <= 120 lines following Mandate 8b.
 */

import { Copy, FileText } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useDoctorPreferencesStore } from "../../../store/doctorPreferencesStore";
import { showToast } from "../../GlobalToast";
import {
	buildContextFromDoctorPreferences,
	extractTemplateTags,
	interpolateDiaryTemplateTags,
	STATUTORY_DIARY_TEMPLATES,
} from "./diaryTemplateTags";
import { DoctorDiaryLivePreviewCard } from "./templates/DoctorDiaryLivePreviewCard";
import { DoctorDiaryPlaygroundBar } from "./templates/DoctorDiaryPlaygroundBar";
import { DoctorDiaryTemplateChips } from "./templates/DoctorDiaryTemplateChips";

export function DoctorForm043TemplatesSection() {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);

	const [selectedTemplateId, setSelectedTemplateId] = useState<string>("caries_restoration");
	const [activeSpecialtyFilter, setActiveSpecialtyFilter] = useState<string>("all");
	const [testTooth, setTestTooth] = useState<string>("16");
	const [testDiagnosis, setTestDiagnosis] = useState<string>("К02.1 Кариес дентина");

	const filteredTemplates = useMemo(() => {
		if (activeSpecialtyFilter === "all") return STATUTORY_DIARY_TEMPLATES;
		return STATUTORY_DIARY_TEMPLATES.filter((t) => t.specialty === activeSpecialtyFilter);
	}, [activeSpecialtyFilter]);

	const currentTemplate = useMemo(() => {
		return STATUTORY_DIARY_TEMPLATES.find((t) => t.id === selectedTemplateId) || STATUTORY_DIARY_TEMPLATES[0]!;
	}, [selectedTemplateId]);

	const tagContext = useMemo(() => {
		return buildContextFromDoctorPreferences(preferences, { tooth: testTooth, diagnosis: testDiagnosis });
	}, [preferences, testTooth, testDiagnosis]);

	const interpolatedComplaints = useMemo(
		() => interpolateDiaryTemplateTags(currentTemplate.complaintTemplate, tagContext),
		[currentTemplate, tagContext],
	);
	const interpolatedObjective = useMemo(
		() => interpolateDiaryTemplateTags(currentTemplate.objectiveTemplate, tagContext),
		[currentTemplate, tagContext],
	);
	const interpolatedTreatment = useMemo(
		() => interpolateDiaryTemplateTags(currentTemplate.treatmentTemplate, tagContext),
		[currentTemplate, tagContext],
	);

	const fullDiaryText = useMemo(() => {
		return [
			`Жалобы: ${interpolatedComplaints}`,
			`Объективно: ${interpolatedObjective}`,
			`Лечение: ${interpolatedTreatment}`,
		].join("\n\n");
	}, [interpolatedComplaints, interpolatedObjective, interpolatedTreatment]);

	const templateTags = useMemo(() => {
		return extractTemplateTags(
			`${currentTemplate.complaintTemplate} ${currentTemplate.objectiveTemplate} ${currentTemplate.treatmentTemplate}`,
		);
	}, [currentTemplate]);

	const handleCopyFullDiary = () => {
		navigator.clipboard.writeText(fullDiaryText);
		showToast(`Протокол «${currentTemplate.title}» скопирован в буфер с заполненными тегами`, "success");
	};

	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4" data-testid="doctor-form043-templates-section">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
						<FileText size={18} />
					</div>
					<div>
						<h4 className="font-extrabold text-sm sm:text-base text-[var(--ink)] m-0">
							Шаблоны дневников медицинской карты с автозаполнением тегов
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Умная подстановка тегов &#123;зуб&#125;, &#123;диагноз&#125;, &#123;материал&#125;, &#123;анестезия&#125;, &#123;изоляция&#125;
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={handleCopyFullDiary}
					className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] flex items-center gap-1.5 cursor-pointer min-h-[36px]"
					title="Скопировать готовый дневник с подставленными значениями"
				>
					<Copy size={13} className="text-teal-600" />
					<span>Копировать весь дневник</span>
				</button>
			</div>

			<DoctorDiaryPlaygroundBar testTooth={testTooth} onToothChange={setTestTooth} testDiagnosis={testDiagnosis} onDiagnosisChange={setTestDiagnosis} activeSpecialtyFilter={activeSpecialtyFilter} onSpecialtyFilterChange={setActiveSpecialtyFilter} />
			<DoctorDiaryTemplateChips templates={filteredTemplates} selectedTemplateId={selectedTemplateId} onSelectTemplate={setSelectedTemplateId} />
			<DoctorDiaryLivePreviewCard templateTitle={currentTemplate.title} templateTags={templateTags} interpolatedComplaints={interpolatedComplaints} interpolatedObjective={interpolatedObjective} interpolatedTreatment={interpolatedTreatment} />
		</div>
	);
}

export default DoctorForm043TemplatesSection;
