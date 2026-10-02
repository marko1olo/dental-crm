/**
 * apps/web/src/components/settings/doctor/DoctorForm043TemplatesSection.tsx
 *
 * Секция управления и живого предпросмотра шаблонов дневников 043/у
 * с автозаполнением клинических тегов ({зуб}, {диагноз}, {материал}, {анестезия}, {изоляция}).
 *
 * Инварианты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: врачебная автономия (1-клик генерация текста для ЕМК).
 */

import React, { useMemo, useState } from "react";
import {
	Check,
	Copy,
	FileText,
	Filter,
	Sparkles,
	Tag,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useDoctorPreferencesStore } from "../../../store/doctorPreferencesStore";
import {
	STATUTORY_DIARY_TEMPLATES,
	buildContextFromDoctorPreferences,
	extractTemplateTags,
	interpolateDiaryTemplateTags,
	type DiaryTemplateDefinition,
} from "./diaryTemplateTags";

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
		return (
			STATUTORY_DIARY_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
			STATUTORY_DIARY_TEMPLATES[0]!
		);
	}, [selectedTemplateId]);

	// Live context generated from preferences + current interactive test parameters
	const tagContext = useMemo(() => {
		return buildContextFromDoctorPreferences(preferences, {
			tooth: testTooth,
			diagnosis: testDiagnosis,
		});
	}, [preferences, testTooth, testDiagnosis]);

	const interpolatedComplaints = useMemo(() => {
		return interpolateDiaryTemplateTags(currentTemplate.complaintTemplate, tagContext);
	}, [currentTemplate, tagContext]);

	const interpolatedObjective = useMemo(() => {
		return interpolateDiaryTemplateTags(currentTemplate.objectiveTemplate, tagContext);
	}, [currentTemplate, tagContext]);

	const interpolatedTreatment = useMemo(() => {
		return interpolateDiaryTemplateTags(currentTemplate.treatmentTemplate, tagContext);
	}, [currentTemplate, tagContext]);

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
			{/* Header */}
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

			{/* Interactive Playground Row: Tooth FDI, Diagnosis, Specialty Filter */}
			<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div>
					<label className="text-xs font-bold text-[var(--ink)] block mb-1">
						Тестовый зуб (FDI):
					</label>
					<div className="flex items-center gap-1.5">
						{["16", "21", "36", "47", "55"].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setTestTooth(t)}
								className={`flex-1 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
									testTooth === t
										? "bg-teal-600 text-white border-teal-600 shadow-2xs"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
								}`}
							>
								{t}
							</button>
						))}
					</div>
				</div>

				<div>
					<label className="text-xs font-bold text-[var(--ink)] block mb-1">
						Тестовый диагноз:
					</label>
					<input
						type="text"
						value={testDiagnosis}
						onChange={(e) => setTestDiagnosis(e.target.value)}
						placeholder="К02.1 Кариес дентина"
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none focus:border-teal-600"
					/>
				</div>

				<div>
					<label className="text-xs font-bold text-[var(--ink)] block mb-1">
						Фильтр по направлению:
					</label>
					<select
						value={activeSpecialtyFilter}
						onChange={(e) => setActiveSpecialtyFilter(e.target.value)}
						className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none focus:border-teal-600"
					>
						<option value="all">Все направления ({STATUTORY_DIARY_TEMPLATES.length})</option>
						<option value="therapist">Терапия</option>
						<option value="surgeon">Хирургия-имплантология</option>
						<option value="orthopedist">Ортопедия</option>
						<option value="orthodontist">Ортодонтия</option>
						<option value="periodontist">Пародонтология</option>
						<option value="pediatric">Детство</option>
					</select>
				</div>
			</div>

			{/* Templates Selection Chips */}
			<div className="flex gap-1.5 flex-wrap">
				{filteredTemplates.map((tpl) => {
					const isSelected = selectedTemplateId === tpl.id;
					return (
						<button
							key={tpl.id}
							type="button"
							onClick={() => setSelectedTemplateId(tpl.id)}
							className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
								isSelected
									? "bg-teal-600 text-white border-teal-600 shadow-2xs font-bold"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-teal-500"
							}`}
						>
							<span>{tpl.title}</span>
							<span
								className={`text-[10px] font-mono px-1 rounded ${
									isSelected ? "bg-white/20 text-white" : "bg-[var(--paper-soft)] text-[var(--muted)]"
								}`}
							>
								{tpl.defaultIcd10}
							</span>
						</button>
					);
				})}
			</div>

			{/* Live Interpolated Diary Preview */}
			<div className="space-y-3 p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
					<div className="flex items-center gap-2">
						<Sparkles size={14} className="text-teal-600" />
						<span className="text-xs font-bold text-[var(--ink)]">
							Живой предпросмотр дневника приёма: {currentTemplate.title}
						</span>
					</div>

					{/* Tag Badges */}
					<div className="flex items-center gap-1 flex-wrap">
						{templateTags.map((tag) => (
							<span
								key={tag}
								className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20"
							>
								{tag}
							</span>
						))}
					</div>
				</div>

				<div className="space-y-2 text-xs leading-relaxed">
					<div>
						<strong className="text-[var(--ink)] block mb-0.5">Жалобы:</strong>
						<p className="m-0 text-[var(--muted)] p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-sans">
							{interpolatedComplaints}
						</p>
					</div>

					<div>
						<strong className="text-[var(--ink)] block mb-0.5">Объективный статус:</strong>
						<p className="m-0 text-[var(--muted)] p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-sans">
							{interpolatedObjective}
						</p>
					</div>

					<div>
						<strong className="text-[var(--ink)] block mb-0.5">План лечения и протокол манипуляций:</strong>
						<p className="m-0 text-[var(--muted)] p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)] font-sans">
							{interpolatedTreatment}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
