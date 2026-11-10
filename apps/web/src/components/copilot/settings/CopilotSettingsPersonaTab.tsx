/**
 * @file CopilotSettingsPersonaTab.tsx
 * @description Clinical Doctor Persona tab: Specialization, Diary template,
 * and custom clinical instructions with 1-click doctor presets (Mandate 8b <= 200 lines, Mandate 8e).
 */

import React from "react";
import { Sparkles, Stethoscope } from "lucide-react";
import type { ClinicalSpecialization, DiaryTemplate } from "../../../store/copilotStore";

export interface CopilotSettingsPersonaTabProps {
	clinicalSpecialization: ClinicalSpecialization;
	setClinicalSpecialization: (spec: ClinicalSpecialization) => void;
	diaryTemplate: DiaryTemplate;
	setDiaryTemplate: (tmpl: DiaryTemplate) => void;
	customInstructions: string;
	setCustomInstructions: (val: string) => void;
}

const CLINICAL_PRESETS: Array<{ label: string; text: string }> = [
	{
		label: "Микроскопист-эндодонтист",
		text: "Врач-микроскопист. При эндодонтии обязательный коффердам и ультразвуковая ирригация 3% NaOCl. Силер: AH Plus, обтурация термопластифицированной гуттаперчей. Временная повязка: Каласепт. Реставрация: Harmonize/Estelite.",
	},
	{
		label: "Хирург-имплантолог",
		text: "Хирург-имплантолог. Атипичные удаления с сепарацией корней и атравматичной люксацией. Премедикация: Амоксиклав 1000мг. Костная пластика: депротеинизированный ксенографт и резорбируемая мембрана, шовный материал монофиламент 5-0.",
	},
	{
		label: "Ортопед-гнатолог",
		text: "Врач стоматолог-ортопед. Анализ окклюзии и височно-нижнечелюстного сустава. Безметалловые реставрации E-max и диоксид циркония. Адгезивный протокол с фиксацией на композитный цемент двойного отверждения.",
	},
	{
		label: "Ортодонт",
		text: "Врач-ортодонт. Расчет ТРГ в боковой проекции, анализ дефицита места по Болтону. Самолигирующие брекет-системы Damon Q/Clear и элайнеры. Ретенционный протокол: несъемные ретейнеры 3-3 и ретенционные каппы.",
	},
	{
		label: "Детский стоматолог",
		text: "Детский стоматолог. Адаптационный приём и мягкое лечение без страха. Изоляция коффердамом. Биосовместимые материалы МТА для витальной пульпотомии. Цветные пломбы Twinky Star, коронки NuSmile на моляры.",
	},
	{
		label: "Пародонтолог",
		text: "Врач-пародонтолог. Перио-карта с замером глубин карманов в 6 точках, индексами кровоточивости BOP и гигиены PI. Ультразвуковой Vector-дебридмент, SRP кюретами Gracey, локальная антисептическая терапия.",
	},
];

export function CopilotSettingsPersonaTab({
	clinicalSpecialization,
	setClinicalSpecialization,
	diaryTemplate,
	setDiaryTemplate,
	customInstructions,
	setCustomInstructions,
}: CopilotSettingsPersonaTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-persona-tab">
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-2.5">
				<Stethoscope size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
				<div>
					<div className="font-bold text-[var(--ink)]">Клинический профиль и стиль врача</div>
					<p className="text-[11px] text-[var(--muted)] leading-relaxed">
						Ассистент адаптирует протоколы осмотра, язык дневников и формулировки под вашу специализацию и клинические привычки.
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)]">Специализация врача</label>
					<select
						value={clinicalSpecialization}
						onChange={(e) => setClinicalSpecialization(e.target.value as ClinicalSpecialization)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						<option value="therapy">Терапевтическая стоматология</option>
						<option value="orthopedics">Ортопедическая стоматология</option>
						<option value="surgery">Хирургия и имплантология</option>
						<option value="orthodontics">Ортодонтия</option>
						<option value="perio">Пародонтология</option>
						<option value="pediatric">Детская стоматология</option>
					</select>
				</section>
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)]">Формат дневника приёма</label>
					<select
						value={diaryTemplate === "form043" ? "treatment_diary" : diaryTemplate}
						onChange={(e) => setDiaryTemplate(e.target.value as DiaryTemplate)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						<option value="soap">SOAP (Субъективно, Объективно, Оценка, План)</option>
						<option value="treatment_diary">Медицинская карта приёма</option>
						<option value="express">Краткий экспресс-протокол приёма</option>
					</select>
				</section>
			</div>

			<section className="space-y-2">
				<label className="font-bold text-[var(--ink)] flex items-center justify-between">
					<span>Индивидуальные инструкции и персональный стиль врача</span>
					<span className="text-[10px] text-[var(--muted)]">Промпт врача</span>
				</label>
				<textarea
					value={customInstructions}
					onChange={(e) => setCustomInstructions(e.target.value)}
					placeholder="Опишите любимые материалы, протокол препарирования или особенности ведения записей..."
					rows={3}
					className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs leading-relaxed focus:ring-1 focus:ring-[var(--teal,#0d9488)] outline-none resize-none"
				/>

				<div className="space-y-1.5">
					<span className="text-[11px] font-semibold text-[var(--muted)] flex items-center gap-1">
						<Sparkles size={12} className="text-[var(--teal,#0d9488)]" />
						<span>Клинический стиль копайлота:</span>
					</span>
					<div className="flex flex-wrap gap-1.5">
						{CLINICAL_PRESETS.map((p) => (
							<button
								key={p.label}
								type="button"
								onClick={() => setCustomInstructions(p.text)}
								className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[11px] font-medium text-[var(--ink)] cursor-pointer transition-colors"
							>
								{p.label}
							</button>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
