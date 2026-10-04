import React from "react";
import { Bold, BookOpen, Eraser, FileCheck, Italic, List, Pill, PlusCircle, Sparkles, Tag, Zap } from "lucide-react";
import { DebouncedEmkTextarea } from "./DebouncedEmkTextarea";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import { formatSoapFromPreset, getPresetsByIcd10 } from "../clinicalSoapPresets";
import {
	buildChairsideSmartProtocol,
	type ChairsideSmartProtocolKey,
} from "../clinicalVisitWorkflow";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import {
	mergeMultiToothDiagnoses,
	mergeMultiToothObjective,
	mergeMultiToothTreatmentPlan,
	sanitizeClinicalNormContradictions,
} from "../../../utils/clinicalTextSanitizer";

export interface EmkDiaryProtocolSectionProps extends EmkSectionProps {
	onOpenTemplatesModal?: () => void;
	focusedField?: "diagnosis" | "treatmentPlan" | "recommendations" | undefined;
}

const EXPRESS_PROTOCOLS: Array<{
	key: ChairsideSmartProtocolKey;
	label: string;
	shortName: string;
	code: string;
	color: string;
}> = [
	{ key: "caries", label: "Кариес дентина (K02.1)", shortName: "Кариес", code: "K02.1", color: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15" },
	{ key: "pulpitis", label: "Острый пульпит (K04.0)", shortName: "Пульпит", code: "K04.0", color: "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15" },
	{ key: "periodontitis", label: "Хронический периодонтит (K04.5)", shortName: "Периодонтит", code: "K04.5", color: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/15" },
	{ key: "hygiene", label: "Профгигиена полости рта (K05.1)", shortName: "Гигиена", code: "K05.1", color: "text-teal-600 dark:text-teal-400 border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/15" },
	{ key: "extraction", label: "Простое удаление зуба (K01.1)", shortName: "Удаление", code: "K01.1", color: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15" },
];

export function EmkDiaryProtocolSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	activeTooth,
	onOpenTemplatesModal,
	focusedField,
}: EmkDiaryProtocolSectionProps) {
	const toothPrefix = activeTooth ? `Зуб ${activeTooth}: ` : "";

	const icd10Chips = [
		{ code: "K02.1", label: `${toothPrefix}K02.1 Кариес дентина (средний/глубокий)` },
		{ code: "K04.0", label: `${toothPrefix}K04.0 Пульпит начальный / острый очаговый` },
		{ code: "K04.03", label: `${toothPrefix}K04.03 Хронический фиброзный пульпит` },
		{ code: "K04.5", label: `${toothPrefix}K04.5 Хронический апикальный периодонтит` },
		{ code: "K01.1", label: `${toothPrefix}K01.1 Простое удаление зуба (ретенция/дистопия)` },
		{ code: "K05.3", label: "K05.3 Хронический генерализованный пародонтит легкой/средней степени" },
		{ code: "K05.1", label: "K05.1 Хронический катаральный гингивит" },
		{ code: "K03.6", label: "K03.6 Зубные отложения (над- и поддесневой зубной камень)" },
		{ code: "Z01.2", label: "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)" },
	];

	const recommendationChips = [
		"Чистка зубов 2 раза в день выметающими движениями в течение 2–3 минут (зубная паста, флосс, ирригатор).",
		"Воздержаться от приема пищи и окрашивающих напитков в течение 2 часов после постановки пломбы.",
		"При болевом синдроме: Нимесулид 100 мг (1 таб.) или Ибупрофен 400 мг после еды, не более 2–3 дней.",
		"Ротовые ванночки с раствором Хлоргексидина 0.05% или Мирамистина 3 раза в день после еды 5 дней.",
		"Щадящая диета: исключить твердую, грубую, чрезмерно горячую и острую пищу.",
		"Явка на продолжение эндодонтического лечения через 2–3 дня.",
		"Плановый контрольный осмотр через 6 месяцев.",
	];

	const handleApplyExpressProtocol = (key: ChairsideSmartProtocolKey) => {
		useVisitStore.getState().pushVisitSnapshot(`Экспресс-протокол: ${key}`);
		const smart = buildChairsideSmartProtocol(key, activeTooth ?? undefined, { isLocked });

		if (activeTooth) {
			const nextDiagnosis = mergeMultiToothDiagnoses(visitNoteForm?.diagnosis || "", {
				toothNumber: activeTooth,
				icd10: smart.code,
				diagnosis: smart.diagnosis,
			});
			const nextObjective = mergeMultiToothObjective(visitNoteForm?.objectiveStatus || "", {
				toothNumber: activeTooth,
				content: smart.objectiveStatus,
			});
			const nextPlan = mergeMultiToothTreatmentPlan(visitNoteForm?.treatmentPlan || "", {
				toothNumber: activeTooth,
				content: smart.treatmentPlan,
			});

			updateVisitNoteField("diagnosis", nextDiagnosis);
			updateVisitNoteField("objectiveStatus", nextObjective);
			updateVisitNoteField("treatmentPlan", nextPlan);

			// Жалобы: объединяем и убираем артефакты нормы
			const curComplaint = visitNoteForm?.complaint || "";
			if (!curComplaint.trim()) {
				updateVisitNoteField("complaint", smart.complaint);
			} else if (!curComplaint.includes(`Зуб ${activeTooth}`)) {
				const sanitizedComplaint = sanitizeClinicalNormContradictions(`${curComplaint};\n${smart.complaint}`);
				updateVisitNoteField("complaint", sanitizedComplaint);
			}

			// Анамнез
			const curAnamnesis = visitNoteForm?.anamnesis || "";
			if (!curAnamnesis.trim()) {
				updateVisitNoteField("anamnesis", smart.anamnesis);
			}

			if (smart.recommendations) {
				const curRec = visitNoteForm?.recommendations || "";
				if (!curRec.trim()) {
					updateVisitNoteField("recommendations", smart.recommendations);
				} else if (!curRec.includes(smart.recommendations.slice(0, 20))) {
					updateVisitNoteField("recommendations", `${curRec}\n${smart.recommendations}`);
				}
			}

			// Сохраняем структурированную запись зуба в visitStore
			useVisitStore.getState().setVisitToothRecord(String(activeTooth), {
				toothNumber: activeTooth,
				diagnosis: smart.diagnosis,
				...(smart.icd10 ? { diagnosisIcd10: smart.icd10 } : {}),
				state: "treatment",
			});
		} else {
			updateVisitNoteField("diagnosis", smart.diagnosis);
			updateVisitNoteField("complaint", smart.complaint);
			updateVisitNoteField("anamnesis", smart.anamnesis);
			updateVisitNoteField("objectiveStatus", smart.objectiveStatus);
			updateVisitNoteField("treatmentPlan", smart.treatmentPlan);
			if (smart.recommendations) {
				updateVisitNoteField("recommendations", smart.recommendations);
			}
		}

		showToast(`Умный протокол: ${smart.title} применён к дневнику`, "success", 2500);
	};

	const handleSelectIcd10 = (chip: { code: string; label: string }, autoSoap: boolean = false) => {
		useVisitStore.getState().pushVisitSnapshot(`МКБ-10: ${chip.code}`);

		if (activeTooth) {
			const nextDiagnosis = mergeMultiToothDiagnoses(visitNoteForm?.diagnosis || "", {
				toothNumber: activeTooth,
				icd10: chip.code,
				diagnosis: chip.label,
			});
			updateVisitNoteField("diagnosis", nextDiagnosis);

			useVisitStore.getState().setVisitToothRecord(String(activeTooth), {
				toothNumber: activeTooth,
				diagnosis: chip.label,
				diagnosisIcd10: chip.code,
				state: "treatment",
			});
		} else {
			updateVisitNoteField("diagnosis", chip.label);
		}

		let complaint = "";
		let anamnesis = "";
		let objectiveStatus = "";
		let treatmentPlan = "";
		let recommendations = "";

		const presets = getPresetsByIcd10(chip.code);
		const preset = presets[0];
		if (preset) {
			const formatted = formatSoapFromPreset(preset, activeTooth ?? undefined);
			complaint = formatted.complaint;
			anamnesis = formatted.anamnesis;
			objectiveStatus = formatted.objectiveStatus;
			treatmentPlan = formatted.treatmentPlan;
			recommendations = formatted.recommendations || "";
		} else {
			// Fallback к chairside smart протоколам если пресета нет в каталоге (например K01.1, K05.1)
			let smartKey: ChairsideSmartProtocolKey | null = null;
			if (chip.code.startsWith("K02")) smartKey = "caries";
			else if (chip.code.startsWith("K04.0")) smartKey = "pulpitis";
			else if (chip.code.startsWith("K04.5")) smartKey = "periodontitis";
			else if (chip.code.startsWith("K01")) smartKey = "extraction";
			else if (chip.code.startsWith("K05") || chip.code.startsWith("K03") || chip.code.startsWith("Z01")) smartKey = "hygiene";

			if (smartKey) {
				const smart = buildChairsideSmartProtocol(smartKey, activeTooth ?? undefined, { isLocked });
				complaint = smart.complaint;
				anamnesis = smart.anamnesis;
				objectiveStatus = smart.objectiveStatus;
				treatmentPlan = smart.treatmentPlan;
				recommendations = smart.recommendations;
			}
		}

		let fieldsUpdatedCount = 0;

		// При явном запросе на autoSoap или если поля еще пустые — заполняем разделы дневника
		if (complaint && (autoSoap || !visitNoteForm?.complaint?.trim())) {
			if (activeTooth && visitNoteForm?.complaint?.trim()) {
				const merged = sanitizeClinicalNormContradictions(`${visitNoteForm.complaint};\n${complaint}`);
				updateVisitNoteField("complaint", merged);
			} else {
				updateVisitNoteField("complaint", complaint);
			}
			fieldsUpdatedCount++;
		}
		if (anamnesis && (autoSoap || !visitNoteForm?.anamnesis?.trim())) {
			updateVisitNoteField("anamnesis", anamnesis);
			fieldsUpdatedCount++;
		}
		if (objectiveStatus && (autoSoap || !visitNoteForm?.objectiveStatus?.trim())) {
			if (activeTooth) {
				const nextObj = mergeMultiToothObjective(visitNoteForm?.objectiveStatus || "", {
					toothNumber: activeTooth,
					content: objectiveStatus,
				});
				updateVisitNoteField("objectiveStatus", nextObj);
			} else {
				updateVisitNoteField("objectiveStatus", objectiveStatus);
			}
			fieldsUpdatedCount++;
		}
		if (treatmentPlan && (autoSoap || !visitNoteForm?.treatmentPlan?.trim())) {
			if (activeTooth) {
				const nextPlan = mergeMultiToothTreatmentPlan(visitNoteForm?.treatmentPlan || "", {
					toothNumber: activeTooth,
					content: treatmentPlan,
				});
				updateVisitNoteField("treatmentPlan", nextPlan);
			} else {
				updateVisitNoteField("treatmentPlan", treatmentPlan);
			}
			fieldsUpdatedCount++;
		}
		if (recommendations && (autoSoap || !visitNoteForm?.recommendations?.trim())) {
			updateVisitNoteField("recommendations", recommendations);
			fieldsUpdatedCount++;
		}

		if (fieldsUpdatedCount > 0) {
			showToast(`SOAP-протокол ${chip.code} применён к дневнику (${fieldsUpdatedCount} разд.)`, "success", 2500);
		}
	};

	const handleAddChip = (fieldKey: string, chipText: string) => {
		const current = visitNoteForm?.[fieldKey] || "";
		updateVisitNoteField(fieldKey, appendClinicalText(current, chipText, " "));
	};

	// 26px compact formatting tools (DEF-VIS-05, Mandates 8c, 8d)
	const applyFormatting = (prefix: string, suffix: string = "") => {
		const curr = visitNoteForm?.treatmentPlan || "";
		if (!curr) return;
		updateVisitNoteField("treatmentPlan", `${prefix}${curr}${suffix}`);
	};

	return (
		<div className="flex flex-col gap-2.5">
			{/* 1-клик протоколы у кресла: спокойный тихий аккордеон без серого визуального шума */}
			<details className="group text-xs transition-all">
				<summary className="inline-flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none text-xs font-semibold text-[var(--muted)] hover:text-[var(--teal)] transition-colors rounded-lg hover:bg-[var(--paper-soft)]">
					<BookOpen size={12} className="text-[var(--teal)] shrink-0" />
					<span className="font-medium">Экспресс-протоколы у кресла</span>
				</summary>
				<div className="pt-1.5 grid grid-cols-2 sm:grid-cols-5 gap-1.5 mt-1">
					{EXPRESS_PROTOCOLS.map((proto) => (
						<button
							key={proto.key}
							type="button"
							data-testid={`btn-emk-express-${proto.key}`}
							onClick={() => handleApplyExpressProtocol(proto.key)}
							className={`min-h-[28px] h-7 px-2.5 py-0.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs touch-manipulation active:scale-[0.98] ${proto.color}`}
							title={`Заполнить полный SOAP: ${proto.label}`}
						>
							<span className="font-mono text-[10px] font-bold">{proto.code}</span>
							<span className="truncate text-xs">{proto.shortName}</span>
						</button>
					))}
				</div>
			</details>

			{/* Диагноз */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Tag size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Основной диагноз по МКБ-10</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">Код и расшифровка диагноза</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="diagnosis"
					label="Диагноз МКБ-10"
					value={visitNoteForm?.diagnosis || ""}
					onCommit={updateVisitNoteField}
					placeholder="Код МКБ-10 и клинический развернутый диагноз..."
					className="w-full min-h-[60px] p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>

				{/* Быстрые чипы МКБ-10 */}
				<details className="group text-xs transition-all mt-0.5">
					<summary className="inline-flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none text-xs font-semibold text-[var(--muted)] hover:text-[var(--teal)] transition-colors rounded-lg hover:bg-[var(--paper-soft)]">
						<BookOpen size={12} className="text-[var(--teal)] shrink-0" />
						<span className="font-medium">Шаблоны диагнозов МКБ-10</span>
					</summary>
					<div className="pt-1.5 flex items-center gap-1.5 flex-wrap mt-1">
						{icd10Chips.map((chip, idx) => (
							<div
								key={idx}
								className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden shadow-2xs hover:border-[var(--teal)] transition-all"
							>
								<button
									type="button"
									onClick={() => handleSelectIcd10(chip, false)}
									className="px-2.5 py-0.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--glass-hover)] transition-all cursor-pointer inline-flex items-center gap-1"
									title={`${chip.label} (клик: диагноз + умное заполнение пустых разделов)`}
								>
									<span className="font-mono font-bold text-[var(--teal)]">{chip.code}</span>
									<span className="max-w-[180px] truncate">{chip.label.replace(/^.*K\d+(\.\d+)?\s*/, "")}</span>
								</button>
								<button
									type="button"
									data-testid={`btn-auto-soap-${chip.code.replace(".", "_")}`}
									onClick={() => handleSelectIcd10(chip, true)}
									className="px-2 py-0.5 text-[10px] font-bold bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] text-[var(--muted)] border-l border-[var(--line)] cursor-pointer inline-flex items-center gap-0.5 transition-colors"
									title={`Заполнить полный клинический SOAP-дневник для ${chip.code} в 1 клик`}
								>
									<Sparkles size={10} className="text-[var(--teal)]" />
									<span>SOAP</span>
								</button>
							</div>
						))}
					</div>
				</details>
			</div>

			{/* Протокол лечения / Дневник */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<FileCheck size={14} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Протокол лечения и манипуляций</span>
						</label>
						{onOpenTemplatesModal && (
							<button
								type="button"
								onClick={onOpenTemplatesModal}
								className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--paper-soft)] text-[var(--teal-ink,var(--teal))] hover:bg-[var(--teal)] hover:text-white border border-[var(--line)] transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
								data-testid="btn-open-protocols-catalog-diary"
								title="Открыть полный каталог клинических протоколов (1 142 шаблона)"
							>
								<BookOpen size={12} />
								<span>Каталог протоколов (1 142)</span>
							</button>
						)}
					</div>

					{/* 26px compact formatting toolbar */}
					<div className="flex items-center gap-1 bg-[var(--paper-subtle,rgba(0,0,0,0.02))] border border-[var(--line)] rounded-md px-1.5 py-0.5 h-[26px]">
						<button
							type="button"
							onClick={() => applyFormatting("**", "**")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							title="Жирный"
						>
							<Bold size={12} />
						</button>
						<button
							type="button"
							onClick={() => applyFormatting("_", "_")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							title="Курсив"
						>
							<Italic size={12} />
						</button>
						<button
							type="button"
							onClick={() => applyFormatting("\n• ")}
							className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							title="Список"
						>
							<List size={12} />
						</button>
						<button
							type="button"
							onClick={() => updateVisitNoteField("treatmentPlan", "")}
							className="p-1 rounded text-[var(--muted)] hover:text-red-500 cursor-pointer"
							title="Очистить"
						>
							<Eraser size={12} />
						</button>
					</div>
				</div>

				<DebouncedEmkTextarea
					fieldKey="treatmentPlan"
					label="Протокол лечения"
					value={visitNoteForm?.treatmentPlan || ""}
					onCommit={updateVisitNoteField}
					placeholder="Подробный протокол вмешательства: препарирование, медикаментозная обработка, пломбировочный материал, полировка, рекомендации..."
					className="w-full min-h-[140px] p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>
			</div>

			{/* Рекомендации и назначения */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Pill size={14} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Клинические рекомендации и назначения пациенту</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">Режим, гигиена, лекарственные средства</span>
				</div>

				<DebouncedEmkTextarea
					fieldKey="recommendations"
					label="Рекомендации"
					value={visitNoteForm?.recommendations || ""}
					onCommit={updateVisitNoteField}
					placeholder="Назначения врача, режим питания, медикаментозная терапия, дата контрольного визита..."
					className="w-full min-h-[75px] p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y leading-relaxed shadow-2xs"
				/>

				{/* Быстрые шаблоны рекомендаций */}
				<details className="group text-xs transition-all mt-0.5">
					<summary className="inline-flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none text-xs font-semibold text-[var(--muted)] hover:text-[var(--teal)] transition-colors rounded-lg hover:bg-[var(--paper-soft)]">
						<BookOpen size={12} className="text-[var(--teal)] shrink-0" />
						<span className="font-medium">Шаблоны рекомендаций</span>
					</summary>
					<div className="pt-1.5 flex items-center gap-1.5 flex-wrap mt-1">
						{recommendationChips.map((chip, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => handleAddChip("recommendations", chip)}
								className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
								title={chip}
							>
								<PlusCircle size={11} className="text-[var(--muted)]" />
								<span className="max-w-[280px] truncate">{chip}</span>
							</button>
						))}
					</div>
				</details>
			</div>
		</div>
	);
}
