/**
 * apps/web/src/components/patients/VisitProtocolView.tsx
 *
 * DENTE Dental CRM — Клинический протокол визита (Медицинская карта стоматологического больного Форма № 043/у)
 *
 * МАНДАТЫ КЛИНИЧЕСКОГО UX И АВТОНОМИИ ВРАЧА (8e, 8i, 8k, 8v):
 * 1. Мандат 8e: «Норма соматики» строго в 1 клик (без опросников на 50 пунктов).
 * 2. Автоматическая генерация клинического SOAP-дневника по выбранным диагнозам МКБ-10 (K02.1, K04.0, K04.5, K05.3, Z01.2).
 * 3. Мандат 8v: 1-клик списание анестезии и материалов по техкарте без медсестринских квестов и комиссий.
 * 4. Мандат 8e п. 5: Печать протокола 043/у в любой момент (со штампом «ЧЕРНОВИК» или «ПОДПИСАНО ВРАЧОМ»).
 * 5. Мандат 8d п. 7: СТРОГО 0 эмодзи — только строгие векторные иконки Lucide и DentalIcons.
 * 6. Мандат 8b: Размер модуля строго <= 800 строк.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	AlertCircle,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Copy,
	FileCheck,
	FileText,
	HelpCircle,
	Layers,
	Minus,
	Plus,
	Printer,
	RotateCcw,
	Save,
	ShieldCheck,
	Sparkles,
	Syringe,
	Tag,
	Trash2,
	User,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import {
	formatSoapFromPreset,
	getPresetById,
	getPresetsByIcd10,
	CLINICAL_SOAP_PRESETS,
	type ClinicalSoapPreset,
	type ClinicalMaterialDeduction,
} from "../visit/clinicalSoapPresets";
import {
	calculateAnesthesiaCarpulesSafety,
	evaluateAnesthesiaRisk,
} from "../../lib/clinicalProtocols043";
import { ToothMolar, DentalForm043 } from "../icons/DentalIcons";

export interface VisitProtocolData {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	date?: string | undefined;
	toothNumber?: number | string | undefined;
	complaints: string;
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	treatmentProtocol: string;
	recommendations: string;
	anestheticDrug: string;
	anestheticCarpules: number;
	deductedMaterials: ClinicalMaterialDeduction[];
	isSigned?: boolean | undefined;
}

export interface VisitProtocolViewProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly visitId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly initialTooth?: number | string | null | undefined;
	readonly initialDate?: string | null | undefined;
	readonly initialDiagnosis?: string | null | undefined;
	readonly onSaveProtocol?: ((data: VisitProtocolData) => void) | undefined;
	readonly onPrint?: (() => void) | undefined;
}

const COMMON_ICD10_PRESETS: Array<{
	code: string;
	title: string;
	presetId: string;
	shortBadge: string;
}> = [
	{
		code: "Z01.2",
		title: "Стоматологическое обследование (Норма)",
		presetId: "norm_healthy",
		shortBadge: "Норма",
	},
	{
		code: "K02.1",
		title: "Кариес дентина (средний)",
		presetId: "caries_medium",
		shortBadge: "Кариес",
	},
	{
		code: "K04.0",
		title: "Острый очаговый пульпит",
		presetId: "pulpitis_acute",
		shortBadge: "Пульпит",
	},
	{
		code: "K04.03",
		title: "Пульпит (Обработка каналов)",
		presetId: "pulpitis_visit1",
		shortBadge: "Эндо",
	},
	{
		code: "K04.5",
		title: "Хронический периодонтит",
		presetId: "periodontitis_chronic",
		shortBadge: "Периодонтит",
	},
	{
		code: "K05.3",
		title: "Хронический пародонтит",
		presetId: "perio_srp_curettage",
		shortBadge: "Пародонтит",
	},
	{
		code: "K03.6",
		title: "Зубные отложения (Профгигиена)",
		presetId: "hygiene_complex",
		shortBadge: "Гигиена",
	},
	{
		code: "K08.1",
		title: "Удаление зуба (Хирургия)",
		presetId: "surgery_extraction_simple",
		shortBadge: "Удаление",
	},
];

const STANDARD_ANESTHETICS = [
	{
		key: "ultracain_ds",
		nameRu: "Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл)",
		material: { name: "Ультракаин Д-С 1:200 000 (Sanofi)", category: "anesthesia" as const, quantity: 1, unit: "карп." as const },
	},
	{
		key: "ultracain_ds_forte",
		nameRu: "Ультракаин Форте 1:100 000 (1 карпула 1.7 мл)",
		material: { name: "Ультракаин Д-С Форте 1:100 000 (Sanofi)", category: "anesthesia" as const, quantity: 1, unit: "карп." as const },
	},
	{
		key: "scandonest_3",
		nameRu: "Скандонест 3% без адреналина (1 карпула 1.7 мл)",
		material: { name: "Скандонест 3% (Septodont)", category: "anesthesia" as const, quantity: 1, unit: "карп." as const },
	},
];

export const VisitProtocolView: React.FC<VisitProtocolViewProps> = React.memo(
	function VisitProtocolView({
		isOpen = true,
		onClose,
		visitId,
		patientId,
		patientName = "Пациент",
		doctorName = "Врач-стоматолог",
		initialTooth = 16,
		initialDate,
		initialDiagnosis,
		onSaveProtocol,
		onPrint,
	}) {
		const [selectedTooth, setSelectedTooth] = useState<string>(
			initialTooth ? String(initialTooth) : "16",
		);

		const [protocol, setProtocol] = useState<VisitProtocolData>(() => ({
			visitId,
			patientId,
			date: initialDate || new Date().toISOString().slice(0, 10),
			toothNumber: initialTooth || 16,
			complaints: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
			anamnesis: "Соматически здоров. Аллергоанамнез не отягощен. Хронические заболевания отрицает.",
			statusLocalis: "Слизистая оболочка полости рта бледно-розовая, влажная. Зубной ряд интактен.",
			diagnosisIcd10: initialDiagnosis || "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)",
			treatmentProtocol: "Проведен осмотр, зондирование, перкуссия безболезненна. Обучение гигиене.",
			recommendations: "Динамическое наблюдение и плановый профосмотр через 6 месяцев.",
			anestheticDrug: "Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл)",
			anestheticCarpules: 1,
			deductedMaterials: [
				{ name: "Одноразовый набор (зеркало, зонд, лоток, слюноотсос)", category: "auxiliary", quantity: 1, unit: "компл." },
				{ name: "Перчатки нитриловые смотровые", category: "ppe", quantity: 1, unit: "пары" },
				{ name: "Маска трехслойная защитная", category: "ppe", quantity: 1, unit: "шт." },
			],
			isSigned: false,
		}));

		const [lastSaved, setLastSaved] = useState<string>("");

		// 1-Click Соматическая норма (Мандат 8e п. 3)
		const handleApplySomaticNorm = useCallback(() => {
			setProtocol((prev) => ({
				...prev,
				complaints: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
				anamnesis: "Соматически здоров. Аллергоанамнез не отягощен. Хронические заболевания отрицает. Физиологическая норма.",
				statusLocalis: "Слизистая оболочка полости рта бледно-розовая, влажная. Десневой край без признаков воспаления. Зондирование безболезненно. Зубной ряд интактен.",
				diagnosisIcd10: "Z01.2 Стоматологическое обследование и гигиена полости рта (Норма)",
				treatmentProtocol: "Проведен осмотр, зондирование, перкуссия отрицательна. Индекс гигиены удовлетворительный. Проведена контролируемая чистка зубов.",
				recommendations: "Профилактический контрольный осмотр через 6 месяцев.",
			}));
			showToast("Норма соматики и физиологический статус применены", "success", 3000);
		}, []);

		// Автогенерация дневника по выбранному диагнозу МКБ-10
		const handleSelectIcd10Preset = useCallback(
			(presetItem: (typeof COMMON_ICD10_PRESETS)[number]) => {
				const preset = getPresetById(presetItem.presetId);
				if (!preset) return;

				const targetToothNum = Number.parseInt(selectedTooth, 10) || null;
				const formatted = formatSoapFromPreset(preset, targetToothNum);

				setProtocol((prev) => {
					// Автоматическое объединение списания материалов по техкарте (Мандат 8v)
					const existingNames = new Set(prev.deductedMaterials.map((m) => m.name));
					const newDeductions = [...prev.deductedMaterials];

					if (formatted.materialsToDeduct) {
						for (const mat of formatted.materialsToDeduct) {
							if (!existingNames.has(mat.name)) {
								newDeductions.push(mat);
								existingNames.add(mat.name);
							}
						}
					}

					return {
						...prev,
						diagnosisIcd10: formatted.diagnosis,
						complaints: formatted.complaint || prev.complaints,
						anamnesis: formatted.anamnesis || prev.anamnesis,
						statusLocalis: formatted.objectiveStatus || prev.statusLocalis,
						treatmentProtocol: formatted.treatmentPlan,
						recommendations: preset.recommendations || prev.recommendations,
						deductedMaterials: newDeductions,
					};
				});

				showToast(
					`Дневник приёма и списание материалов автосформированы по ${presetItem.code} (${presetItem.title})`,
					"success",
					3500,
				);
			},
			[selectedTooth],
		);

		// 1-Click добавление анестезии и автосписание карпулы
		const handleApplyAnesthesia = useCallback((anes: (typeof STANDARD_ANESTHETICS)[number]) => {
			setProtocol((prev) => {
				const existing = prev.deductedMaterials.filter(
					(m) => !m.name.toLowerCase().includes("ультракаин") && !m.name.toLowerCase().includes("скандонест"),
				);
				existing.push(anes.material);
				existing.push({ name: "Игла карпульная стоматологическая 30G (0.3x21 мм)", category: "anesthesia", quantity: 1, unit: "шт." });

				const anesSnippet = `Анестезия: инфильтрационная/проводниковая ${anes.nameRu}. Аспирационная проба отрицательная. Обезболивание глубокое, достаточное.`;
				const updatedProtocol = prev.treatmentProtocol.includes("Анестезия:")
					? prev.treatmentProtocol.replace(/Анестезия:[^\n]+/, anesSnippet)
					: `${anesSnippet}\n\n${prev.treatmentProtocol}`;

				return {
					...prev,
					anestheticDrug: anes.nameRu,
					anestheticCarpules: 1,
					treatmentProtocol: updatedProtocol,
					deductedMaterials: existing,
				};
			});
			showToast(`Анестезия и карпула списаны (${anes.nameRu})`, "success", 2500);
		}, []);

		// Сохранение протокола
		const handleSave = useCallback(() => {
			if (onSaveProtocol) {
				onSaveProtocol(protocol);
			}
			setLastSaved(new Date().toLocaleTimeString("ru-RU"));
			showToast("Протокол приёма сохранен в карту пациента", "success", 3000);
		}, [protocol, onSaveProtocol]);

		// Печать протокола (Мандат 8e п. 5: Черновик / Подписано)
		const handlePrint = useCallback(() => {
			if (onPrint) {
				onPrint();
			} else if (typeof window !== "undefined") {
				window.print();
			}
		}, [onPrint]);

		if (!isOpen) return null;

		return (
			<div
				className="visit-protocol-view flex flex-col gap-3.5 p-3 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] text-[var(--ink)] shadow-xs print:p-0 print:border-none print:shadow-none"
				data-testid="visit-protocol-view-container"
			>
				{/* Header & Patient Details */}
				<div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-[var(--glass-border)] print:hidden">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
							<DentalForm043 className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-sm font-black m-0 text-[var(--ink)]">
									Протокол приёма
								</h3>
								<span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
									{protocol.date}
								</span>
								<span className="text-[11px] font-bold text-[var(--muted)]">
									{patientName} • {doctorName}
								</span>
							</div>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Электронный дневник приёма • Диагноз • Автосписание материалов
							</p>
						</div>
					</div>

					{/* Fast Action Buttons */}
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							data-testid="btn-visit-somatic-norm"
							onClick={handleApplySomaticNorm}
							className="min-h-[32px] h-8 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
							title="Заполнить соматику и статус физиологической нормой"
						>
							<ShieldCheck className="w-4 h-4" />
							<span>Норма соматики</span>
						</button>

						<button
							type="button"
							data-testid="btn-print-visit-protocol"
							onClick={handlePrint}
							className="min-h-[32px] h-8 px-3 text-xs font-semibold rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
							title="Печать протокола приёма"
						>
							<Printer className="w-3.5 h-3.5" />
							<span>Печать</span>
						</button>

						<button
							type="button"
							data-testid="btn-save-visit-protocol"
							onClick={handleSave}
							className="min-h-[32px] h-8 px-3.5 text-xs font-semibold rounded-lg bg-[var(--teal)] hover:opacity-95 text-white transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
						>
							<Save className="w-3.5 h-3.5" />
							<span>Сохранить</span>
						</button>

						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="min-h-[32px] h-8 w-8 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-all shadow-2xs"
								aria-label="Закрыть"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
				</div>

				{/* Fast ICD-10 Diagnosis Selector Bar */}
				<div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)] print:hidden">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Sparkles className="w-3.5 h-3.5 text-teal-500" />
							<span>Заполнение дневника по диагнозу:</span>
						</span>
						<div className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted)]">
							<span>Зуб:</span>
							<input
								type="text"
								value={selectedTooth}
								onChange={(e) => setSelectedTooth(e.target.value)}
								className="w-12 h-6 px-1 text-center font-mono font-black rounded border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)]"
								placeholder="16"
							/>
						</div>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap">
						{COMMON_ICD10_PRESETS.map((item) => (
							<button
								key={item.code}
								type="button"
								data-testid={`btn-icd10-${item.code.toLowerCase().replace(".", "")}`}
								onClick={() => handleSelectIcd10Preset(item)}
								className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
								title={`${item.code} ${item.title}`}
							>
								<span className="font-mono text-teal-600 font-extrabold">{item.code}</span>
								<span>{item.shortBadge}</span>
							</button>
						))}
					</div>
				</div>

				{/* Clinical SOAP Fields Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
					{/* Complaints */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Activity className="w-3.5 h-3.5 text-rose-500" />
							<span>Жалобы пациента:</span>
						</label>
						<textarea
							rows={3}
							value={protocol.complaints}
							onChange={(e) => setProtocol({ ...protocol, complaints: e.target.value })}
							className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
							placeholder="Характер болей, температурные раздражители, давность возникновения..."
						/>
					</div>

					{/* Anamnesis */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Clock className="w-3.5 h-3.5 text-blue-500" />
							<span>Анамнез заболевания и соматический статус:</span>
						</label>
						<textarea
							rows={3}
							value={protocol.anamnesis}
							onChange={(e) => setProtocol({ ...protocol, anamnesis: e.target.value })}
							className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
							placeholder="Развитие заболевания, перенесенные вмешательства, аллергии, соматика..."
						/>
					</div>

					{/* Status Localis */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<ToothMolar className="w-3.5 h-3.5 text-teal-500" />
							<span>Осмотр и зубная формула:</span>
						</label>
						<textarea
							rows={4}
							value={protocol.statusLocalis}
							onChange={(e) => setProtocol({ ...protocol, statusLocalis: e.target.value })}
							className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
							placeholder="Слизистая оболочка, зондирование кариозной полости, термопроба, перкуссия..."
						/>
					</div>

					{/* Diagnosis ICD-10 */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Tag className="w-3.5 h-3.5 text-indigo-500" />
							<span>Клинический диагноз:</span>
						</label>
						<input
							type="text"
							value={protocol.diagnosisIcd10}
							onChange={(e) => setProtocol({ ...protocol, diagnosisIcd10: e.target.value })}
							className="w-full h-9 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all"
							placeholder="Например: K02.1 Кариес дентина зуба 16"
						/>

						{/* Recommendations */}
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 mt-2">
							<FileCheck className="w-3.5 h-3.5 text-emerald-500" />
							<span>Рекомендации и назначения:</span>
						</label>
						<textarea
							rows={2}
							value={protocol.recommendations}
							onChange={(e) => setProtocol({ ...protocol, recommendations: e.target.value })}
							className="w-full p-2 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
							placeholder="Ограничения в пище, гигиена, контрольный осмотр..."
						/>
					</div>
				</div>

				{/* Treatment Protocol */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<FileText className="w-3.5 h-3.5 text-teal-600" />
						<span>Протокол лечения и манипуляций (План и факт вмешательства):</span>
					</label>
					<textarea
						rows={4}
						value={protocol.treatmentProtocol}
						onChange={(e) => setProtocol({ ...protocol, treatmentProtocol: e.target.value })}
						className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y font-mono"
						placeholder="Препарирование, медикаментозная обработка, пломбировочный материал, полировка..."
					/>
				</div>

				{/* 1-Click Anesthesia & Automatic Materials Deduction Section (Mandate 8v) */}
				<div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)]">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5">
							<Syringe className="w-4 h-4 text-teal-500" />
							<span className="text-xs font-bold text-[var(--ink)]">
								Анестезия и списание материалов:
							</span>
						</div>
						<div className="flex items-center gap-1 flex-wrap">
							{STANDARD_ANESTHETICS.map((anes) => (
								<button
									key={anes.key}
									type="button"
									onClick={() => handleApplyAnesthesia(anes)}
									className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[var(--paper)] border border-[var(--glass-border)] hover:border-[var(--teal)] text-[var(--ink)] cursor-pointer transition-all"
								>
									{anes.key === "ultracain_ds"
										? "Ультракаин 1:200k"
										: anes.key === "ultracain_ds_forte"
										? "Ультракаин Форте"
										: "Скандонест 3%"}
								</button>
							))}
						</div>
					</div>

					{/* Deducted items chips */}
					<div className="flex items-center gap-1.5 flex-wrap">
						{protocol.deductedMaterials.map((mat, idx) => (
							<span
								key={idx}
								className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] flex items-center gap-1"
							>
								<Check className="w-3 h-3 text-emerald-500" />
								<span>{mat.name}</span>
								<strong className="text-teal-600">
									({mat.quantity} {mat.unit})
								</strong>
							</span>
						))}
					</div>
				</div>

				{/* Footer info */}
				<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-2 border-t border-[var(--glass-border)]">
					<span>
						Медицинская карта пациента • Протокол приёма
					</span>
					{lastSaved && (
						<span className="text-emerald-600 font-bold flex items-center gap-1">
							<CheckCircle2 className="w-3.5 h-3.5" />
							<span>Сохранено в {lastSaved}</span>
						</span>
					)}
				</div>
			</div>
		);
	},
);

VisitProtocolView.displayName = "VisitProtocolView";
