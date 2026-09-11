import {
	Activity,
	Check,
	CheckCircle2,
	Copy,
	FileText,
	Info,
	Layers,
	RotateCcw,
	Sliders,
	Sparkles,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import {
	ANGLE_CLASSES_DETAILED,
	BAD_HABITS_OPTIONS,
	DENTAL_ARCH_FORMS_LOWER,
	DENTAL_ARCH_FORMS_UPPER,
	ICD10_ORTHODONTIC_CODES,
	ORTHODONTIC_DIAGNOSTIC_PRESETS,
	PROFILE_TYPES,
	SAGITTAL_RELATION_OPTIONS,
	TRANSVERSAL_RELATION_OPTIONS,
	VERTICAL_RELATION_OPTIONS,
	calculateCephalometricClassification,
	createDefaultOrthodonticNormRecord,
	generateOrthodonticDiagnosticProtocol,
	type AngleClassification,
	type BadHabit,
	type EschlerBittnerTest,
	type FacialThirdsProportion,
	type FoldExpressiveness,
	type JawGrowthDirection,
	type LowerArchForm,
	type MidlineShiftDirection,
	type OrthodonticDiagnosticRecord,
	type ProfileType,
	type SagittalIncisorRelation,
	type TransversalRelation,
	type TransversalSide,
	type UpperArchForm,
	type VerticalIncisorRelation,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export interface OrthodonticExaminationCardProps {
	patientId?: string;
	patientName?: string;
	cardNumber?: string;
	patientCardNumber?: string;
	doctorName?: string;
	onProtocolGenerated?: (protocolText: string) => void;
	onInsertToVisit?: (protocolText: string, icd10: string) => void;
	onInsertToDiary?: (protocolText: string) => void;
}

export function OrthodonticExaminationCard({
	patientId = "",
	patientName = "Пациент",
	cardNumber = "043/у",
	patientCardNumber,
	doctorName = "Врач-ортодонт",
	onProtocolGenerated,
	onInsertToVisit,
	onInsertToDiary,
}: OrthodonticExaminationCardProps) {
	const effectiveCardNumber = patientCardNumber || cardNumber;

	// Full Orthodontic Diagnostic State
	const [record, setRecord] = useState<OrthodonticDiagnosticRecord>(() =>
		createDefaultOrthodonticNormRecord({
			patientId,
			patientName,
			cardNumber: effectiveCardNumber,
			doctorName,
		}),
	);

	// Active Sub-Section: "complaints" | "face" | "oral" | "trg" | "diagnosis" | "preview"
	const [activeSection, setActiveSection] = useState<
		"complaints" | "face" | "oral" | "trg" | "diagnosis" | "preview"
	>("oral");

	// 1-Click Set Baseline Norm (Mandate 8e: Doctor Autonomy)
	const handleResetToNorm = useCallback(() => {
		setRecord(
			createDefaultOrthodonticNormRecord({
				patientId,
				patientName,
				cardNumber,
				doctorName,
			}),
		);
		showToast("Физиологическая норма установлена в 1 клик", "info");
	}, [patientId, patientName, cardNumber, doctorName]);

	// 1-Click Apply Preset
	const handleApplyPreset = useCallback((presetId: string) => {
		const found = ORTHODONTIC_DIAGNOSTIC_PRESETS.find((p) => p.id === presetId);
		if (!found) return;
		setRecord({
			...found.record,
			patientId,
			patientName,
			cardNumber,
			doctorName,
			visitDate: new Date().toISOString().slice(0, 10),
		});
		showToast(`Клинический пресет «${found.shortLabel}» применён`, "success");
	}, [patientId, patientName, cardNumber, doctorName]);

	// Live Ceph Classification
	const cephClass = useMemo(() => {
		return calculateCephalometricClassification(record.trgDiagnostics);
	}, [record.trgDiagnostics]);

	// Live Form 043/u Protocol Text
	const generatedProtocol = useMemo(() => {
		return generateOrthodonticDiagnosticProtocol(record);
	}, [record]);

	// Copy to clipboard
	const handleCopyProtocol = useCallback(() => {
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(generatedProtocol).then(() => {
				showToast("Протокол 043/у скопирован в буфер", "success");
			}).catch(() => {
				showToast("Не удалось скопировать", "error");
			});
		}
		onProtocolGenerated?.(generatedProtocol);
	}, [generatedProtocol, onProtocolGenerated]);

	// Insert into visit note
	const handleApplyToVisit = useCallback(() => {
		if (onInsertToDiary) {
			onInsertToDiary(generatedProtocol);
		}
		if (onInsertToVisit) {
			onInsertToVisit(generatedProtocol, record.clinicalDiagnosisIcd10);
		} else if (!onInsertToDiary && typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						protocolText: generatedProtocol,
						title: `Первичный ортодонтический осмотр (МКБ ${record.clinicalDiagnosisIcd10})`,
						soap: {
							complaint: record.notes || "Первичная консультация ортодонта. Оценка прикуса.",
							objective: generatedProtocol,
							treatmentPlan: record.treatmentPlanText,
							recommendations: record.retentionPlanText,
							diagnosisIcd10: record.clinicalDiagnosisIcd10,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
			showToast("Протокол осмотра отправлен в карту 043/у", "success");
		}
	}, [generatedProtocol, onInsertToDiary, onInsertToVisit, record]);

	// Toggle Bad Habit
	const handleToggleBadHabit = (habit: BadHabit) => {
		setRecord((prev) => {
			const current = prev.complaintsAnamnesis.badHabits;
			if (habit === "none") {
				return {
					...prev,
					complaintsAnamnesis: {
						...prev.complaintsAnamnesis,
						badHabits: ["none"],
					},
				};
			}
			const withoutNone = current.filter((h) => h !== "none");
			const next = withoutNone.includes(habit)
				? withoutNone.filter((h) => h !== habit)
				: [...withoutNone, habit];
			return {
				...prev,
				complaintsAnamnesis: {
					...prev.complaintsAnamnesis,
					badHabits: next.length > 0 ? next : ["none"],
				},
			};
		});
	};

	return (
		<div className="flex flex-col gap-4 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100">
			{/* 1. Fast Clinical Presets & 1-Click Norm Header (Mandates 8e, 8k, 8n) */}
			<div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 flex flex-col gap-2.5">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
						<Zap size={15} className="text-amber-600 dark:text-amber-400 fill-amber-500" />
						<span className="text-xs uppercase tracking-wider font-black">
							Ортодонтическая таксономия StomX (Форма 043/у)
						</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleResetToNorm}
							className="h-8 min-h-[32px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
							title="Установить норму во всех разделах в 1 клик"
							data-testid="ortho-reset-norm-btn"
						>
							<RotateCcw size={13} />
							<span>Норма в 1 клик</span>
						</button>

						<button
							type="button"
							onClick={handleApplyToVisit}
							className="h-8 min-h-[32px] px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
							title="Вставить сгенерированный протокол в карту 043/у"
							data-testid="ortho-insert-043-btn"
						>
							<CheckCircle2 size={13} />
							<span>В карту 043/у</span>
						</button>
					</div>
				</div>

				{/* Presets pills */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400 mr-1">
						Клинические профили:
					</span>
					{ORTHODONTIC_DIAGNOSTIC_PRESETS.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => handleApplyPreset(preset.id)}
							className="h-7 px-2.5 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 hover:border-amber-500 text-[11px] font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
							title={preset.description}
						>
							<Sparkles size={11} className="text-amber-500" />
							<span>{preset.shortLabel}</span>
						</button>
					))}
				</div>
			</div>

			{/* 2. Navigation Strip: 1 row 32-36px (Mandate 8d, Hick's law) */}
			<div className="h-9 min-h-[36px] max-h-[36px] flex items-center justify-between px-2 bg-[var(--surface-soft,#f1f5f9)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-xl gap-1 overflow-x-auto whitespace-nowrap shrink-0">
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => setActiveSection("oral")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeSection === "oral"
								? "bg-amber-500 text-white shadow-xs font-black"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
					>
						<Layers size={13} />
						<span>Внутриротовой осмотр & Окклюзия</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("face")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeSection === "face"
								? "bg-amber-500 text-white shadow-xs font-black"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
					>
						<Sliders size={13} />
						<span>Лицо & Профиль</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("complaints")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeSection === "complaints"
								? "bg-amber-500 text-white shadow-xs font-black"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
					>
						<Info size={13} />
						<span>Жалобы & Анамнез</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("trg")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeSection === "trg"
								? "bg-amber-500 text-white shadow-xs font-black"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
					>
						<Activity size={13} />
						<span>ТРГ & Цефалометрия ({cephClass.skeletalClass.toUpperCase()})</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("diagnosis")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeSection === "diagnosis"
								? "bg-amber-500 text-white shadow-xs font-black"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
					>
						<Check size={13} />
						<span>Диагноз & План</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("preview")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeSection === "preview"
								? "bg-amber-500 text-white shadow-xs font-black"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
					>
						<FileText size={13} />
						<span>Протокол 043/у</span>
					</button>
				</div>

				<button
					type="button"
					onClick={handleCopyProtocol}
					className="h-7 px-2.5 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[11px] font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1"
					title="Скопировать готовый текст протокола в буфер обмена"
				>
					<Copy size={12} />
					<span>Копировать</span>
				</button>
			</div>

			{/* 3. Main Section Panels */}
			{/* SECTION 1: INTRAORAL EXAMINATION & OCCLUSION */}
			{activeSection === "oral" && (
				<div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
						1. Форма зубных рядов и симметрия (StomX 21.32)
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{/* Upper Arch Form */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Форма верхнего зубного ряда (ВЧ):
							</label>
							<select
								value={record.oralExamination.upperArchForm}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											upperArchForm: e.target.value as UpperArchForm,
										},
									}))
								}
								className="h-9 px-3 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100"
							>
								{DENTAL_ARCH_FORMS_UPPER.map((f) => (
									<option key={f.value} value={f.value}>
										{f.label}
									</option>
								))}
							</select>
						</div>

						{/* Lower Arch Form */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Форма нижнего зубного ряда (НЧ):
							</label>
							<select
								value={record.oralExamination.lowerArchForm}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											lowerArchForm: e.target.value as LowerArchForm,
										},
									}))
								}
								className="h-9 px-3 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100"
							>
								{DENTAL_ARCH_FORMS_LOWER.map((f) => (
									<option key={f.value} value={f.value}>
										{f.label}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Symmetry & Midline shift */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Симметрия зубных дуг:
							</label>
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={() =>
										setRecord((prev) => ({
											...prev,
											oralExamination: {
												...prev.oralExamination,
												archSymmetry: "preserved",
											},
										}))
									}
									className={`flex-1 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer ${
										record.oralExamination.archSymmetry === "preserved"
											? "bg-emerald-600 text-white font-black"
											: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)]"
									}`}
								>
									Сохранена
								</button>
								<button
									type="button"
									onClick={() =>
										setRecord((prev) => ({
											...prev,
											oralExamination: {
												...prev.oralExamination,
												archSymmetry: "disturbed",
											},
										}))
									}
									className={`flex-1 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer ${
										record.oralExamination.archSymmetry === "disturbed"
											? "bg-rose-600 text-white font-black"
											: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)]"
									}`}
								>
									Нарушена
								</button>
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Смещение косметического центра:
							</label>
							<div className="flex items-center gap-1.5">
								{(["none", "left", "right"] as MidlineShiftDirection[]).map((dir) => (
									<button
										key={dir}
										type="button"
										onClick={() =>
											setRecord((prev) => ({
												...prev,
												oralExamination: {
													...prev.oralExamination,
													midlineShift: dir,
													midlineShiftMm: dir === "none" ? 0 : prev.oralExamination.midlineShiftMm || 2,
												},
											}))
										}
										className={`flex-1 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer ${
											record.oralExamination.midlineShift === dir
												? "bg-amber-500 text-white font-black"
												: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)]"
										}`}
									>
										{dir === "none" ? "Норма" : dir === "left" ? "Влево" : "Вправо"}
									</button>
								))}
							</div>
						</div>

						{record.oralExamination.midlineShift !== "none" && (
							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
									Смещение (мм):
								</label>
								<input
									type="number"
									min="0"
									max="15"
									step="0.5"
									value={record.oralExamination.midlineShiftMm}
									onChange={(e) =>
										setRecord((prev) => ({
											...prev,
											oralExamination: {
												...prev.oralExamination,
												midlineShiftMm: Number(e.target.value) || 0,
											},
										}))
									}
									className="h-8 px-3 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100"
								/>
							</div>
						)}
					</div>

					{/* Occlusal Relations (Angle Classification) */}
					<div className="pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2">
						<div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
							2. Соотношение по Энглю (моляры и клыки)
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
							{/* Molar Right */}
							<div className="p-2.5 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700 flex flex-col gap-1">
								<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
									Моляры СПРАВА:
								</span>
								<select
									value={record.oralExamination.angleMolarRight}
									onChange={(e) =>
										setRecord((prev) => ({
											...prev,
											oralExamination: {
												...prev.oralExamination,
												angleMolarRight: e.target.value as AngleClassification,
											},
										}))
									}
									className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
								>
									{ANGLE_CLASSES_DETAILED.map((a) => (
										<option key={a.id} value={a.id}>
											{a.short}
										</option>
									))}
								</select>
							</div>

							{/* Molar Left */}
							<div className="p-2.5 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700 flex flex-col gap-1">
								<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
									Моляры СЛЕВА:
								</span>
								<select
									value={record.oralExamination.angleMolarLeft}
									onChange={(e) =>
										setRecord((prev) => ({
											...prev,
											oralExamination: {
												...prev.oralExamination,
												angleMolarLeft: e.target.value as AngleClassification,
											},
										}))
									}
									className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
								>
									{ANGLE_CLASSES_DETAILED.map((a) => (
										<option key={a.id} value={a.id}>
											{a.short}
										</option>
									))}
								</select>
							</div>

							{/* Canine Right */}
							<div className="p-2.5 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700 flex flex-col gap-1">
								<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
									Клыки СПРАВА:
								</span>
								<select
									value={record.oralExamination.angleCanineRight}
									onChange={(e) =>
										setRecord((prev) => ({
											...prev,
											oralExamination: {
												...prev.oralExamination,
												angleCanineRight: e.target.value as AngleClassification,
											},
										}))
									}
									className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
								>
									{ANGLE_CLASSES_DETAILED.map((a) => (
										<option key={a.id} value={a.id}>
											{a.short}
										</option>
									))}
								</select>
							</div>

							{/* Canine Left */}
							<div className="p-2.5 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700 flex flex-col gap-1">
								<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
									Клыки СЛЕВА:
								</span>
								<select
									value={record.oralExamination.angleCanineLeft}
									onChange={(e) =>
										setRecord((prev) => ({
											...prev,
											oralExamination: {
												...prev.oralExamination,
												angleCanineLeft: e.target.value as AngleClassification,
											},
										}))
									}
									className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
								>
									{ANGLE_CLASSES_DETAILED.map((a) => (
										<option key={a.id} value={a.id}>
											{a.short}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* Vertical, Sagittal & Transversal */}
					<div className="pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
						{/* Vertical */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Вертикальное перекрытие:
							</label>
							<select
								value={record.oralExamination.verticalRelation}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											verticalRelation: e.target.value as VerticalIncisorRelation,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								{VERTICAL_RELATION_OPTIONS.map((v) => (
									<option key={v.value} value={v.value}>
										{v.label}
									</option>
								))}
							</select>
							{record.oralExamination.verticalRelation === "open_bite" && (
								<div className="flex items-center gap-2 mt-1">
									<span className="text-[11px] text-amber-600 dark:text-amber-400">Щель (мм):</span>
									<input
										type="number"
										min="0"
										max="20"
										step="0.5"
										value={record.oralExamination.verticalOpenBiteMm}
										onChange={(e) =>
											setRecord((prev) => ({
												...prev,
												oralExamination: {
													...prev.oralExamination,
													verticalOpenBiteMm: Number(e.target.value) || 0,
												},
											}))
										}
										className="w-20 h-7 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
									/>
								</div>
							)}
						</div>

						{/* Sagittal */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Сагиттальное смыкание:
							</label>
							<select
								value={record.oralExamination.sagittalRelation}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											sagittalRelation: e.target.value as SagittalIncisorRelation,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								{SAGITTAL_RELATION_OPTIONS.map((s) => (
									<option key={s.value} value={s.value}>
										{s.label}
									</option>
								))}
							</select>
							{record.oralExamination.sagittalRelation !== "normal" && (
								<div className="flex items-center gap-2 mt-1">
									<span className="text-[11px] text-amber-600 dark:text-amber-400">Величина (мм):</span>
									<input
										type="number"
										min="-15"
										max="25"
										step="0.5"
										value={record.oralExamination.sagittalCleftMm}
										onChange={(e) =>
											setRecord((prev) => ({
												...prev,
												oralExamination: {
													...prev.oralExamination,
													sagittalCleftMm: Number(e.target.value) || 0,
												},
											}))
										}
										className="w-20 h-7 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
									/>
								</div>
							)}
						</div>

						{/* Transversal */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Трансверзальное соотношение:
							</label>
							<select
								value={record.oralExamination.transversalRelation}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											transversalRelation: e.target.value as TransversalRelation,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								{TRANSVERSAL_RELATION_OPTIONS.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
							{record.oralExamination.transversalRelation !== "normal" && (
								<div className="flex items-center gap-2 mt-1">
									<span className="text-[11px] text-amber-600 dark:text-amber-400">Сторона:</span>
									<select
										value={record.oralExamination.transversalSide}
										onChange={(e) =>
											setRecord((prev) => ({
												...prev,
												oralExamination: {
													...prev.oralExamination,
													transversalSide: e.target.value as TransversalSide,
												},
											}))
										}
										className="h-7 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
									>
										<option value="right">Справа</option>
										<option value="left">Слева</option>
										<option value="bilateral">Двусторонняя</option>
									</select>
								</div>
							)}
						</div>
					</div>

					{/* Space & Crowding */}
					<div className="pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
						<div className="flex flex-col gap-1">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Диастема ВЧ (мм):
							</span>
							<input
								type="number"
								min="0"
								max="10"
								step="0.5"
								value={record.oralExamination.diastemaUpperMm}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											diastemaUpperMm: Number(e.target.value) || 0,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Скученность ВЧ:
							</span>
							<select
								value={record.oralExamination.crowdingUpper}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											crowdingUpper: e.target.value as any,
										},
									}))
								}
								className="h-8 px-2 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								<option value="none">Нет</option>
								<option value="mild">Легкая (&lt;3 мм)</option>
								<option value="moderate">Средняя (3-5 мм)</option>
								<option value="severe">Тяжелая (&gt;5 мм)</option>
							</select>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Скученность НЧ:
							</span>
							<select
								value={record.oralExamination.crowdingLower}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											crowdingLower: e.target.value as any,
										},
									}))
								}
								className="h-8 px-2 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								<option value="none">Нет</option>
								<option value="mild">Легкая (&lt;3 мм)</option>
								<option value="moderate">Средняя (3-5 мм)</option>
								<option value="severe">Тяжелая (&gt;5 мм)</option>
							</select>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Гигиена полости рта:
							</span>
							<select
								value={record.oralExamination.oralHygiene}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										oralExamination: {
											...prev.oralExamination,
											oralHygiene: e.target.value as any,
										},
									}))
								}
								className="h-8 px-2 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								<option value="good">Хорошая</option>
								<option value="allowable">Удовлетворительная</option>
								<option value="bad">Плохая</option>
							</select>
						</div>
					</div>
				</div>
			)}

			{/* SECTION 2: FACE & PROFILE */}
			{activeSection === "face" && (
				<div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
						Осмотр лица и эстетика улыбки (StomX 20.x)
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
						{/* Symmetry */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Фас (симметрия):
							</label>
							<select
								value={record.faceExamination.faceSymmetry}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										faceExamination: {
											...prev.faceExamination,
											faceSymmetry: e.target.value as any,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								<option value="symmetric">Симметричное</option>
								<option value="asymmetric">Асимметричное</option>
							</select>
						</div>

						{/* Facial Thirds */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Пропорции третей лица:
							</label>
							<select
								value={record.faceExamination.facialThirdsProportion}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										faceExamination: {
											...prev.faceExamination,
											facialThirdsProportion: e.target.value as FacialThirdsProportion,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								<option value="proportional">Пропорциональны (норма)</option>
								<option value="lower_third_decreased">Снижение нижней трети</option>
								<option value="lower_third_increased">Увеличение нижней трети</option>
							</select>
						</div>

						{/* Profile Type */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Тип профиля:
							</label>
							<select
								value={record.faceExamination.profileType}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										faceExamination: {
											...prev.faceExamination,
											profileType: e.target.value as ProfileType,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								{PROFILE_TYPES.map((p) => (
									<option key={p.value} value={p.value}>
										{p.label}
									</option>
								))}
							</select>
						</div>

						{/* Lips in repose */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Смыкание губ в покое:
							</label>
							<select
								value={record.faceExamination.lipsClosedInRepose}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										faceExamination: {
											...prev.faceExamination,
											lipsClosedInRepose: e.target.value as any,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								<option value="closed_relaxed">Сомкнуты свободно (норма)</option>
								<option value="closed_strained">Смыкаются с напряжением</option>
								<option value="incompetent">Не смыкаются (зияние)</option>
							</select>
						</div>

						{/* Supramental Fold */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Подбородочная складка:
							</label>
							<select
								value={record.faceExamination.supramentalFold}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										faceExamination: {
											...prev.faceExamination,
											supramentalFold: e.target.value as FoldExpressiveness,
										},
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								<option value="normal">В норме</option>
								<option value="smoothed">Сглажена</option>
								<option value="pronounced">Углублена / выражена</option>
							</select>
						</div>

						{/* Gummy Smile */}
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Десневая улыбка (Gummy Smile):
							</label>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() =>
										setRecord((prev) => ({
											...prev,
											faceExamination: {
												...prev.faceExamination,
												gummySmile: !prev.faceExamination.gummySmile,
											},
										}))
									}
									className={`h-8 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
										record.faceExamination.gummySmile
											? "bg-rose-600 text-white font-black"
											: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)]"
									}`}
								>
									{record.faceExamination.gummySmile ? "Есть" : "Нет (норма)"}
								</button>
								{record.faceExamination.gummySmile && (
									<input
										type="number"
										min="0"
										max="12"
										step="0.5"
										value={record.faceExamination.gummySmileMm}
										onChange={(e) =>
											setRecord((prev) => ({
												...prev,
												faceExamination: {
													...prev.faceExamination,
													gummySmileMm: Number(e.target.value) || 0,
												},
											}))
										}
										className="w-20 h-8 px-2 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
										placeholder="мм"
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* SECTION 3: COMPLAINTS & ANAMNESIS */}
			{activeSection === "complaints" && (
				<div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
						Жалобы, функции и анамнез (StomX 18.x, 19.x)
					</div>

					{/* Complaints checkboxes */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
						<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 cursor-pointer">
							<input
								type="checkbox"
								checked={record.complaintsAnamnesis.aesthetic}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										complaintsAnamnesis: {
											...prev.complaintsAnamnesis,
											aesthetic: e.target.checked,
										},
									}))
								}
								className="w-4 h-4 rounded text-amber-600 cursor-pointer"
							/>
							<span className="font-bold">18.1 Эстетические (неровные зубы, улыбка)</span>
						</label>

						<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 cursor-pointer">
							<input
								type="checkbox"
								checked={record.complaintsAnamnesis.morphological}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										complaintsAnamnesis: {
											...prev.complaintsAnamnesis,
											morphological: e.target.checked,
										},
									}))
								}
								className="w-4 h-4 rounded text-amber-600 cursor-pointer"
							/>
							<span className="font-bold">18.2 Морфологические (прикус, жевание)</span>
						</label>

						<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 cursor-pointer">
							<input
								type="checkbox"
								checked={record.complaintsAnamnesis.tmjDysfunction}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										complaintsAnamnesis: {
											...prev.complaintsAnamnesis,
											tmjDysfunction: e.target.checked,
										},
									}))
								}
								className="w-4 h-4 rounded text-amber-600 cursor-pointer"
							/>
							<span className="font-bold">Дисфункция ВНЧС (хруст, боли, щелчки)</span>
						</label>

						<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 cursor-pointer">
							<input
								type="checkbox"
								checked={record.complaintsAnamnesis.lipIncompetence}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										complaintsAnamnesis: {
											...prev.complaintsAnamnesis,
											lipIncompetence: e.target.checked,
										},
									}))
								}
								className="w-4 h-4 rounded text-amber-600 cursor-pointer"
							/>
							<span className="font-bold">Несмыкание губ в покое</span>
						</label>

						<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 cursor-pointer">
							<input
								type="checkbox"
								checked={record.complaintsAnamnesis.infantileSwallowing}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										complaintsAnamnesis: {
											...prev.complaintsAnamnesis,
											infantileSwallowing: e.target.checked,
										},
									}))
								}
								className="w-4 h-4 rounded text-amber-600 cursor-pointer"
							/>
							<span className="font-bold">Инфантильное глотание</span>
						</label>

						<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 cursor-pointer">
							<input
								type="checkbox"
								checked={record.complaintsAnamnesis.mouthBreathing}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										complaintsAnamnesis: {
											...prev.complaintsAnamnesis,
											mouthBreathing: e.target.checked,
										},
									}))
								}
								className="w-4 h-4 rounded text-amber-600 cursor-pointer"
							/>
							<span className="font-bold">Ротовое дыхание</span>
						</label>

						<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 cursor-pointer">
							<input
								type="checkbox"
								checked={record.complaintsAnamnesis.bruxism}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										complaintsAnamnesis: {
											...prev.complaintsAnamnesis,
											bruxism: e.target.checked,
										},
									}))
								}
								className="w-4 h-4 rounded text-amber-600 cursor-pointer"
							/>
							<span className="font-bold">Бруксизм (ночной скрежет)</span>
						</label>

						<label className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800/60 cursor-pointer">
							<input
								type="checkbox"
								checked={record.complaintsAnamnesis.speechDisorders}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										complaintsAnamnesis: {
											...prev.complaintsAnamnesis,
											speechDisorders: e.target.checked,
										},
									}))
								}
								className="w-4 h-4 rounded text-amber-600 cursor-pointer"
							/>
							<span className="font-bold">Нарушения дикции</span>
						</label>
					</div>

					{/* Bad Habits (StomX 19.6) */}
					<div className="pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-1.5">
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
							Вредные привычки (сосание):
						</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{BAD_HABITS_OPTIONS.map((habit) => {
								const active = record.complaintsAnamnesis.badHabits.includes(habit.value);
								return (
									<button
										key={habit.value}
										type="button"
										onClick={() => handleToggleBadHabit(habit.value)}
										className={`h-7 px-2.5 rounded-md font-bold text-xs transition-all cursor-pointer border ${
											active
												? "bg-amber-500 text-white border-amber-600 font-black shadow-2xs"
												: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-[var(--line,#e2e8f0)] dark:border-slate-700"
										}`}
									>
										{habit.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* SECTION 4: TRG & CEPHALOMETRICS */}
			{activeSection === "trg" && (
				<div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
							Цефалометрический расчет боковой ТРГ (Штайнер / Твид / Бьорк)
						</div>
						<span className="px-2.5 py-1 rounded-md bg-teal-600/10 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 font-black text-[11px]">
							{cephClass.summary}
						</span>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
						{/* SNA */}
						<div className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								SNA (82°±2°)
							</span>
							<input
								type="number"
								step="0.5"
								value={record.trgDiagnostics.sna}
								onChange={(e) => {
									const sna = Number(e.target.value) || 82;
									setRecord((prev) => ({
										...prev,
										trgDiagnostics: {
											...prev.trgDiagnostics,
											sna,
											anb: sna - prev.trgDiagnostics.snb,
										},
									}));
								}}
								className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
							/>
						</div>

						{/* SNB */}
						<div className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								SNB (80°±2°)
							</span>
							<input
								type="number"
								step="0.5"
								value={record.trgDiagnostics.snb}
								onChange={(e) => {
									const snb = Number(e.target.value) || 80;
									setRecord((prev) => ({
										...prev,
										trgDiagnostics: {
											...prev.trgDiagnostics,
											snb,
											anb: prev.trgDiagnostics.sna - snb,
										},
									}));
								}}
								className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
							/>
						</div>

						{/* ANB */}
						<div className="flex flex-col gap-1 p-2 rounded-lg bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20">
							<span className="text-[11px] font-black text-amber-800 dark:text-amber-300">
								ANB (2°±2°)
							</span>
							<input
								type="number"
								step="0.5"
								value={record.trgDiagnostics.anb}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										trgDiagnostics: {
											...prev.trgDiagnostics,
											anb: Number(e.target.value) || 0,
										},
									}))
								}
								className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-black text-amber-800 dark:text-amber-200"
							/>
						</div>

						{/* Wits */}
						<div className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Wits (0±1 мм)
							</span>
							<input
								type="number"
								step="0.5"
								value={record.trgDiagnostics.wits}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										trgDiagnostics: {
											...prev.trgDiagnostics,
											wits: Number(e.target.value) || 0,
										},
									}))
								}
								className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
							/>
						</div>

						{/* FMA */}
						<div className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								FMA (25°±3°)
							</span>
							<input
								type="number"
								step="0.5"
								value={record.trgDiagnostics.fma}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										trgDiagnostics: {
											...prev.trgDiagnostics,
											fma: Number(e.target.value) || 25,
										},
									}))
								}
								className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
							/>
						</div>

						{/* Jarabak */}
						<div className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--surface-soft,#f8fafc)] dark:bg-slate-800">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Jarabak (62-65%)
							</span>
							<input
								type="number"
								step="0.5"
								value={record.trgDiagnostics.jarabakRatio}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										trgDiagnostics: {
											...prev.trgDiagnostics,
											jarabakRatio: Number(e.target.value) || 63.5,
										},
									}))
								}
								className="h-8 px-2 rounded-md bg-[var(--paper,#ffffff)] dark:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-600 text-xs font-bold"
							/>
						</div>
					</div>

					{/* Functional test: Eschler-Bittner (StomX 23.11) */}
					<div className="pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-1.5">
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
							Проба Эшлера-Битнера (выдвижение НЧ вперед до смыкания по I классу):
						</span>
						<select
							value={record.trgDiagnostics.eschlerBittnerTest}
							onChange={(e) =>
								setRecord((prev) => ({
									...prev,
									trgDiagnostics: {
										...prev.trgDiagnostics,
										eschlerBittnerTest: e.target.value as EschlerBittnerTest,
									},
								}))
							}
							className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
						>
							<option value="none">Не проводилась</option>
							<option value="improved">Профиль улучшился (показана стимуляция роста НЧ)</option>
							<option value="not_changed">Профиль не изменился</option>
							<option value="worsened">Профиль ухудшился (показано сдерживание роста ВЧ / хирургия)</option>
							<option value="impossible">Выдвижение невозможно</option>
						</select>
					</div>
				</div>
			)}

			{/* SECTION 5: DIAGNOSIS & TREATMENT PLAN */}
			{activeSection === "diagnosis" && (
				<div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
						Клинический диагноз по МКБ-10 и план лечения
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Код МКБ-10:
							</label>
							<select
								value={record.clinicalDiagnosisIcd10}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										clinicalDiagnosisIcd10: e.target.value,
									}))
								}
								className="h-8 px-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold"
							>
								{ICD10_ORTHODONTIC_CODES.map((c) => (
									<option key={c.code} value={c.code}>
										{c.label}
									</option>
								))}
							</select>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Формулировка клинического диагноза:
							</label>
							<input
								type="text"
								value={record.clinicalDiagnosisText}
								onChange={(e) =>
									setRecord((prev) => ({
										...prev,
										clinicalDiagnosisText: e.target.value,
									}))
								}
								className="h-8 px-3 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
							План аппаратурного лечения:
						</label>
						<textarea
							rows={3}
							value={record.treatmentPlanText}
							onChange={(e) =>
								setRecord((prev) => ({
									...prev,
									treatmentPlanText: e.target.value,
								}))
							}
							className="p-2.5 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 resize-y"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
							План ретенционного периода:
						</label>
						<input
							type="text"
							value={record.retentionPlanText}
							onChange={(e) =>
								setRecord((prev) => ({
									...prev,
									retentionPlanText: e.target.value,
								}))
							}
							className="h-8 px-3 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100"
						/>
					</div>
				</div>
			)}

			{/* SECTION 6: STATUTORY FORM 043/u PREVIEW */}
			{activeSection === "preview" && (
				<div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
							Предпросмотр записи первичного приема (Форма 043/у)
						</div>
						<button
							type="button"
							onClick={handleCopyProtocol}
							className="h-7 px-2.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
						>
							<Copy size={12} />
							<span>Скопировать в буфер</span>
						</button>
					</div>

					<pre className="p-3.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-950 border border-[var(--line,#e2e8f0)] dark:border-slate-800 text-[11px] font-mono text-[var(--ink,#0f172a)] dark:text-slate-300 whitespace-pre-wrap break-words max-h-96 overflow-y-auto leading-relaxed">
						{generatedProtocol}
					</pre>
				</div>
			)}
		</div>
	);
}
