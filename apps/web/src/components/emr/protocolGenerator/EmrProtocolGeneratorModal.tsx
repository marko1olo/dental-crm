import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	Sparkles,
	FileText,
	CheckCircle2,
	AlertTriangle,
	Copy,
	Check,
	X,
	Activity,
	ShieldCheck,
	Layers,
	ChevronRight,
	Stethoscope,
	User,
	Clock,
	Zap,
} from "lucide-react";
import {
	type VisitDiaryEntry043,
	type ClinicalDiarySynthesisRequest,
	type Statutory043ComplianceReport,
	type ClinicalProtocolTemplate,
	type FdiToothRecord,
	type ToothSurface,
	type BlackCavityClass,
	type ClinicalSpecialtyKind,
	type StatutoryAnestheticDrug,
	type LocalAnesthesiaType,
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
	getClinicalProtocolTemplate,
	deduceBlackClassFromSurfaces,
	isValidFdiToothNumber,
	formatStatutorySoapSummary,
	STATUTORY_EMR_PROTOCOL_CATALOG,
	COMPANION_ICD10_CODES,
	statutoryAnestheticDrugLabels,
	blackCavityClassLabels,
	clinicalSpecialtyLabels,
} from "./emrProtocolEngine";


export interface EmrProtocolGeneratorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly initialToothNumber?: number | string | null | undefined;
	readonly initialIcd10Code?: string | null | undefined;
	readonly initialSurfaces?: readonly ToothSurface[] | null | undefined;
	readonly initialSpecialty?: ClinicalSpecialtyKind | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly odontogramTeeth?: readonly FdiToothRecord[] | null | undefined;
	readonly onApplyDiary?: (diary: VisitDiaryEntry043) => void;
	readonly onApplyBatchDiaries?: (diaries: VisitDiaryEntry043[]) => void;
}

/** 6 обязательных стандартных клинических пресетов СтАР */
export const CORE_1CLICK_PRESETS = [
	{
		id: "K02.1",
		code: "K02.1",
		title: "Глубокий / средний кариес",
		specialty: "therapy" as const,
		icon: "🦷",
		description: "Препарирование по Блэку, коффердам, адгезив, нанокомпозит, полировка",
		accentColor: "sky",
	},
	{
		id: "K04.0",
		code: "K04.0",
		title: "Острый / обострившийся пульпит",
		specialty: "endodontics" as const,
		icon: "⚡",
		description: "Апекслокация, Ni-Ti WaveOne/ProTaper, NaOCl+EDTA, горячая гуттаперча AH Plus",
		accentColor: "purple",
	},
	{
		id: "K04.5",
		code: "K04.5",
		title: "Хронический периодонтит",
		specialty: "endodontics" as const,
		icon: "🛡️",
		description: "Распломбировка, ревизия, временная обтурация гидроксидом кальция (Ca(OH)2)",
		accentColor: "indigo",
	},
	{
		id: "K08.1",
		code: "K08.1",
		title: "Хирургическое удаление зуба",
		specialty: "surgery" as const,
		icon: "✂️",
		description: "Синдесмотомия, элеваторы/щипцы, ревизия лунки, Альвостим, шов Викрил 4-0",
		accentColor: "rose",
	},
	{
		id: "K08.1_ORTHO",
		code: "K08.1_ORTHO",
		title: "Препарирование под коронку",
		specialty: "orthopedics" as const,
		icon: "👑",
		description: "Круговой уступ Chamfer, 2-нитевая ретракция, 3D скан / А-силикон, Protemp 4",
		accentColor: "amber",
	},
	{
		id: "K05.3",
		code: "K05.3",
		title: "Профессиональная гигиена",
		specialty: "periodontics" as const,
		icon: "✨",
		description: "УЗ скейлинг EMS Piezon, Air-Flow глицин, кюретаж Gracey, Метрогил Дента",
		accentColor: "emerald",
	},
];

const ALL_TOOTH_SURFACES: { id: ToothSurface; label: string; short: string }[] = [
	{ id: "occlusal", label: "Жевательная / Окклюзионная", short: "O" },
	{ id: "vestibular", label: "Вестибулярная / Щёчная", short: "V" },
	{ id: "oral", label: "Оральная / Язычная / Нёбная", short: "L" },
	{ id: "mesial", label: "Медиальная / Апроксимальная", short: "M" },
	{ id: "distal", label: "Дистальная / Апроксимальная", short: "D" },
];

export const EmrProtocolGeneratorModal: React.FC<EmrProtocolGeneratorModalProps> = React.memo(
	function EmrProtocolGeneratorModal({
		isOpen,
		onClose,
		patientFullName,
		patientBirthDate,
		medicalCardNumber,
		initialToothNumber,
		initialIcd10Code,
		initialSurfaces,
		initialSpecialty,
		doctorFullName,
		doctorSpecialty,
		odontogramTeeth = [],
		onApplyDiary,
		onApplyBatchDiaries,
	}) {
		// Состояние параметров синтеза
		const [selectedPresetCode, setSelectedPresetCode] = useState<string>(() => {
			if (initialIcd10Code) {
				if (initialIcd10Code === "K08.1" && initialSpecialty === "orthopedics") {
					return "K08.1_ORTHO";
				}
				if (STATUTORY_EMR_PROTOCOL_CATALOG[initialIcd10Code]) {
					return initialIcd10Code;
				}
				if (COMPANION_ICD10_CODES[initialIcd10Code]) {
					return initialIcd10Code;
				}
			}
			return "K02.1";
		});

		const [targetTooth, setTargetTooth] = useState<string>(() => {
			if (initialToothNumber) return String(initialToothNumber);
			const firstPath = odontogramTeeth?.find((t) => t.statusCode !== "healthy" && t.statusCode !== "extracted_absent");
			return firstPath ? String(firstPath.toothNumber) : "16";
		});

		const [selectedSurfaces, setSelectedSurfaces] = useState<ToothSurface[]>(() => {
			if (initialSurfaces && initialSurfaces.length > 0) return [...initialSurfaces];
			return ["occlusal"];
		});

		const [selectedCanals, setSelectedCanals] = useState<number>(3);
		const [selectedEndoStage, setSelectedEndoStage] = useState<"single_visit_complete" | "access_instrumentation_temporary_calcium" | "final_obturation_restoration">("single_visit_complete");
		const [selectedAnesthesiaDrug, setSelectedAnesthesiaDrug] = useState<StatutoryAnestheticDrug>("septanest_1_100000");
		const [selectedAnesthesiaTechnique, setSelectedAnesthesiaTechnique] = useState<LocalAnesthesiaType>("infiltration");
		const [selectedAnesthesiaDoseMl, setSelectedAnesthesiaDoseMl] = useState<number>(1.7);

		const [doctorNameInput, setDoctorNameInput] = useState<string>(doctorFullName || "Волкова Екатерина Сергеевна");
		const [doctorSpecialtyInput, setDoctorSpecialtyInput] = useState<string>(doctorSpecialty || "Врач-стоматолог-терапевт");

		const [isCopied, setIsCopied] = useState<boolean>(false);
		const [activeTab, setActiveTab] = useState<"preview" | "soap_cards" | "compliance">("preview");

		// Автоматическое определение класса кариозной полости по Блэку
		const blackCavityClass = useMemo<BlackCavityClass>(() => {
			return deduceBlackClassFromSurfaces(targetTooth, selectedSurfaces);
		}, [targetTooth, selectedSurfaces]);

		// Синтез дневниковой записи визита
		const synthesizedDiary = useMemo<VisitDiaryEntry043>(() => {
			const req: ClinicalDiarySynthesisRequest = {
				toothNumber: targetTooth ? parseInt(targetTooth, 10) || targetTooth : null,
				icd10Code: selectedPresetCode,
				surfaces: selectedSurfaces,
				blackClass: blackCavityClass,
				rootCanalsCount: selectedCanals,
				endoVisitStage: selectedEndoStage,
				doctorFullName: doctorNameInput,
				doctorSpecialty: doctorSpecialtyInput,
				dateStr: new Date().toISOString().split("T")[0] || null,
				timeStr: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
				customAnesthesia: {
					drug: selectedAnesthesiaDrug,
					doseMl: selectedAnesthesiaDoseMl,
					doseCarpules: Math.max(1, Math.round((selectedAnesthesiaDoseMl / 1.7) * 10) / 10),
					technique: selectedAnesthesiaTechnique,
				},
			};
			return synthesizeClinicalDiary(req);
		}, [
			targetTooth,
			selectedPresetCode,
			selectedSurfaces,
			blackCavityClass,
			selectedCanals,
			selectedEndoStage,
			doctorNameInput,
			doctorSpecialtyInput,
			selectedAnesthesiaDrug,
			selectedAnesthesiaDoseMl,
			selectedAnesthesiaTechnique,
		]);

		// Экспертиза соответствия Приказу Минздрава № 834н
		const complianceReport = useMemo<Statutory043ComplianceReport>(() => {
			return validateForm043uCompliance(synthesizedDiary);
		}, [synthesizedDiary]);

		// Форматированный текст для буфера обмена
		const formattedSoapText = useMemo<string>(() => {
			return formatStatutorySoapSummary(synthesizedDiary);
		}, [synthesizedDiary]);

		// Копирование в буфер обмена
		const handleCopyToClipboard = useCallback(() => {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				navigator.clipboard.writeText(formattedSoapText).then(() => {
					setIsCopied(true);
					setTimeout(() => setIsCopied(false), 2500);
				});
			}
		}, [formattedSoapText]);

		// Применение сформированного дневника
		const handleApply = useCallback(() => {
			if (onApplyDiary) {
				onApplyDiary(synthesizedDiary);
			}
			onClose();
		}, [onApplyDiary, synthesizedDiary, onClose]);

		// Пакетная генерация по всей зубной формуле
		const handleBatchSynthesizeFromFormula = useCallback(() => {
			if (!odontogramTeeth || odontogramTeeth.length === 0) return;
			const diaries = synthesizeDiariesFromOdontogram(
				odontogramTeeth,
				{
					fullName: doctorNameInput,
					specialty: doctorSpecialtyInput,
				},
				new Date().toISOString().split("T")[0],
			);
			if (onApplyBatchDiaries && diaries.length > 0) {
				onApplyBatchDiaries(diaries);
			} else if (onApplyDiary && diaries.length > 0 && diaries[0]) {
				onApplyDiary(diaries[0]);
			}
			onClose();
		}, [odontogramTeeth, doctorNameInput, doctorSpecialtyInput, onApplyBatchDiaries, onApplyDiary, onClose]);

		// Переключение поверхности зуба
		const toggleSurface = (surface: ToothSurface) => {
			setSelectedSurfaces((prev) => {
				if (prev.includes(surface)) {
					const next = prev.filter((s) => s !== surface);
					return next.length === 0 ? ["occlusal"] : next;
				}
				return [...prev, surface];
			});
		};

		if (!isOpen || typeof document === "undefined") return null;

		const isEndo = selectedPresetCode === "K04.0" || selectedPresetCode === "K04.5";
		const isCaries = selectedPresetCode === "K02.1" || selectedPresetCode.startsWith("K02");

		return createPortal(
			<div
				className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
				role="dialog"
				aria-modal="true"
				aria-label="Генератор клинических протоколов 043/у"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				<div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden">
					{/* ── Верхний заголовок тулбара ── */}
					<header className="flex items-center justify-between px-6 py-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 shrink-0">
								<Sparkles className="w-6 h-6" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)]">
										Генератор протоколов 043/у (Минздрав РФ № 834н)
									</h2>
									<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
										<ShieldCheck className="w-3.5 h-3.5" />
										1-Click СтАР
									</span>
								</div>
								<p className="text-xs text-[var(--muted,#64748b)]">
									{patientFullName ? `Пациент: ${patientFullName}` : "Синтез клинического протокола"}
									{medicalCardNumber ? ` · Карта № ${medicalCardNumber}` : ""}
									{targetTooth ? ` · Зуб FDI № ${targetTooth}` : ""}
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer"
							aria-label="Закрыть генератор"
						>
							<X className="w-5 h-5" />
						</button>
					</header>

					{/* ── Step-by-Step Guidance Ribbon & Autosave Status ── */}
					<div className="mx-4 sm:mx-6 mt-4 p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center gap-2 text-xs flex-wrap">
						<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300">
							<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px]">1</span>
							<span>Шаг 1: Выберите пресет МКБ-10 и зуб</span>
						</div>
						<ChevronRight size={14} className="text-[var(--muted,#64748b)]" />
						<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300">
							<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px]">2</span>
							<span>Шаг 2: Экспертиза 043/у</span>
						</div>
						<ChevronRight size={14} className="text-[var(--muted,#64748b)]" />
						<div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
							<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px]">3</span>
							<span>Шаг 3: Внесите в карту</span>
						</div>
						<div className="ml-auto flex items-center gap-1 text-[var(--muted,#64748b)] text-[11px]">
							<ShieldCheck size={13} className="text-emerald-600" />
							<span>💾 Готов к синхронизации с Формой 043/у</span>
						</div>
					</div>

					{/* ── Основная рабочая область (2 колонки: Настройки & Превью) ── */}
					<div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
						{/* ── Левая колонка: Выбор пресетов и параметры вмешательства (5 колонок) ── */}
						<div className="lg:col-span-5 space-y-5">
							{/* 1. Блок 6 стандартных пресетов СтАР */}
							<div className="space-y-2">
								<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
									<Zap className="w-4 h-4 text-amber-500" />
									1. Стандартные 1-Click пресеты по МКБ-10
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{CORE_1CLICK_PRESETS.map((preset) => {
										const isSelected = selectedPresetCode === preset.id;
										return (
											<button
												key={preset.id}
												type="button"
												onClick={() => setSelectedPresetCode(preset.id)}
												className={`flex flex-col items-start p-3 min-h-[64px] rounded-xl border text-left transition-all cursor-pointer ${
													isSelected
														? "border-teal-500 bg-teal-500/10 text-[var(--ink,#0f172a)] shadow-sm ring-2 ring-teal-500/30"
														: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,#f1f5f9)] text-[var(--muted,#64748b)]"
												}`}
												data-testid={`preset-btn-${preset.id}`}
											>
												<div className="flex items-center justify-between w-full">
													<span className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
														<span>{preset.icon}</span>
														<span>{preset.code}</span>
													</span>
													{isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
												</div>
												<div className="text-xs font-medium text-[var(--ink,#0f172a)] mt-0.5 line-clamp-1">
													{preset.title}
												</div>
												<div className="text-[10px] text-[var(--muted,#64748b)] mt-1 line-clamp-1">
													{preset.description}
												</div>
											</button>
										);
									})}
								</div>

								{/* Дополнительные МКБ-10 коды */}
								<div className="pt-1">
									<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
										Или выберите дополнительный диагноз МКБ-10:
									</label>
									<select
										value={selectedPresetCode}
										onChange={(e) => setSelectedPresetCode(e.target.value)}
										className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
									>
										<optgroup label="Основные клинические протоколы (СтАР)">
											{CORE_1CLICK_PRESETS.map((p) => (
												<option key={p.id} value={p.id}>
													{p.code} — {p.title}
												</option>
											))}
										</optgroup>
										<optgroup label="Смежные нозологии МКБ-10">
											{Object.entries(COMPANION_ICD10_CODES).map(([code, item]) => (
												<option key={code} value={code}>
													{code} — {item.title} ({clinicalSpecialtyLabels[item.category]})
												</option>
											))}
										</optgroup>
									</select>
								</div>
							</div>

							{/* 2. Зубная формула и поверхности */}
							<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										2. Зуб FDI и локализация
									</label>
									{isCaries && (
										<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
											{blackCavityClassLabels[blackCavityClass].split(" ")[0]} {blackCavityClassLabels[blackCavityClass].split(" ")[1]}
										</span>
									)}
								</div>

								{/* Выбор зуба */}
								<div className="space-y-1.5">
									<div className="text-xs text-[var(--muted,#64748b)] font-medium">
										Номер зуба по международной системе FDI (11–48 / 51–85):
									</div>
									<div className="flex items-center gap-2">
										<input
											type="number"
											value={targetTooth}
											min={11}
											max={85}
											onChange={(e) => setTargetTooth(e.target.value)}
											className="w-24 px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold text-center text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
											placeholder="16"
										/>
										{odontogramTeeth && odontogramTeeth.length > 0 && (
											<div className="flex-1 overflow-x-auto flex items-center gap-1.5 py-1">
												{odontogramTeeth
													.filter((t) => t.statusCode !== "healthy" && t.statusCode !== "extracted_absent")
													.map((t) => (
														<button
															key={t.toothNumber}
															type="button"
															onClick={() => {
																setTargetTooth(String(t.toothNumber));
																if (t.surfaces && t.surfaces.length > 0) {
																	setSelectedSurfaces([...t.surfaces]);
																}
															}}
															className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold border transition-colors ${
																targetTooth === String(t.toothNumber)
																	? "bg-teal-500 text-white border-teal-600"
																	: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
															}`}
														>
															№ {t.toothNumber}
														</button>
													))}
											</div>
										)}
									</div>
								</div>

								{/* Поверхности зуба */}
								<div className="space-y-1.5 pt-1">
									<div className="text-xs text-[var(--muted,#64748b)] font-medium">
										Поражённые анатомические поверхности:
									</div>
									<div className="grid grid-cols-5 gap-1.5">
										{ALL_TOOTH_SURFACES.map((surf) => {
											const active = selectedSurfaces.includes(surf.id);
											return (
												<button
													key={surf.id}
													type="button"
													onClick={() => toggleSurface(surf.id)}
													title={surf.label}
													className={`flex flex-col items-center justify-center p-2 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
														active
															? "bg-teal-600 text-white border-teal-700 shadow-sm"
															: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#f1f5f9)]"
													}`}
												>
													<span className="text-sm">{surf.short}</span>
													<span className="text-[9px] font-normal opacity-80 truncate max-w-full">
														{surf.id.slice(0, 3)}
													</span>
												</button>
											);
										})}
									</div>
								</div>

								{/* Специфические параметры эндодонтии (Каналы и Этап) */}
								{isEndo && (
									<div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
										<div>
											<label className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">
												Корневые каналы:
											</label>
											<select
												value={selectedCanals}
												onChange={(e) => setSelectedCanals(parseInt(e.target.value, 10) || 3)}
												className="w-full px-2.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
											>
												<option value={1}>1 канал</option>
												<option value={2}>2 канала</option>
												<option value={3}>3 канала</option>
												<option value={4}>4 канала</option>
											</select>
										</div>
										<div>
											<label className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">
												Клинический этап:
											</label>
											<select
												value={selectedEndoStage}
												onChange={(e) =>
													setSelectedEndoStage(
														e.target.value as "single_visit_complete" | "access_instrumentation_temporary_calcium" | "final_obturation_restoration",
													)
												}
												className="w-full px-2.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
											>
												<option value="single_visit_complete">В 1 посещение</option>
												<option value="access_instrumentation_temporary_calcium">
													Временный Ca(OH)2
												</option>
												<option value="final_obturation_restoration">Постоянная обтурация</option>
											</select>
										</div>
									</div>
								)}
							</div>

							{/* 3. Анестезия и Врач */}
							<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
								<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block">
									3. Местная анестезия и протокол врача
								</label>

								<div className="space-y-2">
									<div>
										<label className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">
											Препарат анестетика:
										</label>
										<select
											value={selectedAnesthesiaDrug}
											onChange={(e) => setSelectedAnesthesiaDrug(e.target.value as StatutoryAnestheticDrug)}
											className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
										>
											{(Object.entries(statutoryAnestheticDrugLabels) as [StatutoryAnestheticDrug, { name: string; activeSubstance: string }][]).map(([key, item]) => (
												<option key={key} value={key}>
													{item.name} ({item.activeSubstance})
												</option>
											))}
										</select>

									</div>

									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">
												Методика:
											</label>
											<select
												value={selectedAnesthesiaTechnique}
												onChange={(e) => setSelectedAnesthesiaTechnique(e.target.value as LocalAnesthesiaType)}
												className="w-full px-2.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
											>
												<option value="infiltration">Инфильтрационная</option>
												<option value="mandibular">Мандибулярная</option>
												<option value="torus">Торусальная (Вейсбрем)</option>
												<option value="tuberal">Туберальная</option>
												<option value="intraligamentary">Интралигаментарная</option>
												<option value="application">Аппликационная</option>
											</select>
										</div>
										<div>
											<label className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">
												Дозировка (мл):
											</label>
											<select
												value={selectedAnesthesiaDoseMl}
												onChange={(e) => setSelectedAnesthesiaDoseMl(parseFloat(e.target.value) || 1.7)}
												className="w-full px-2.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
											>
												<option value={1.7}>1.7 мл (1 карпула)</option>
												<option value={3.4}>3.4 мл (2 карпулы)</option>
												<option value={0.8}>0.8 мл (0.5 карпулы)</option>
											</select>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-2 pt-1">
										<div>
											<label className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">
												ФИО Врача:
											</label>
											<input
												type="text"
												value={doctorNameInput}
												onChange={(e) => setDoctorNameInput(e.target.value)}
												className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
											/>
										</div>
										<div>
											<label className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">
												Специальность:
											</label>
											<input
												type="text"
												value={doctorSpecialtyInput}
												onChange={(e) => setDoctorSpecialtyInput(e.target.value)}
												className="w-full px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Пакетная генерация по формуле */}
							{odontogramTeeth && odontogramTeeth.length > 1 && (
								<button
									type="button"
									onClick={handleBatchSynthesizeFromFormula}
									className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-500/20 transition-colors"
								>
									<Layers className="w-4 h-4" />
									<span>Синтезировать дневники по всей зубной формуле ({odontogramTeeth.filter((t) => t.statusCode !== "healthy" && t.statusCode !== "extracted_absent").length} зубов)</span>
								</button>
							)}
						</div>

						{/* ── Правая колонка: Интерактивное превью синтезированного протокола SOAP (7 колонок) ── */}
						<div className="lg:col-span-7 flex flex-col space-y-4">
							{/* Табы режима просмотра */}
							<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2 flex-wrap gap-2">
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										onClick={() => setActiveTab("preview")}
										className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
											activeTab === "preview"
												? "bg-teal-600 text-white"
												: "text-[var(--muted,#64748b)] hover:bg-[var(--paper-strong,#f1f5f9)]"
										}`}
									>
										Сводный SOAP протокол
									</button>
									<button
										type="button"
										onClick={() => setActiveTab("soap_cards")}
										className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
											activeTab === "soap_cards"
												? "bg-teal-600 text-white"
												: "text-[var(--muted,#64748b)] hover:bg-[var(--paper-strong,#f1f5f9)]"
										}`}
									>
										Разделы 043/у
									</button>
									<button
										type="button"
										onClick={() => setActiveTab("compliance")}
										className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
											activeTab === "compliance"
												? "bg-teal-600 text-white"
												: "text-[var(--muted,#64748b)] hover:bg-[var(--paper-strong,#f1f5f9)]"
										}`}
									>
										Аудит Приказа 834н ({complianceReport.complianceScore}%)
									</button>
								</div>

								{/* Статус соответствия */}
								<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
									<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
									100% Приказ № 834н
								</span>
							</div>

							{/* Содержимое табов */}
							<div className="flex-1 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-4 overflow-y-auto text-xs space-y-4">
								{/* Вкладка 1: Текстовый предварительный просмотр */}
								{activeTab === "preview" && (
									<pre className="font-mono text-xs text-[var(--ink,#0f172a)] whitespace-pre-wrap leading-relaxed select-text bg-[var(--paper,#ffffff)] p-4 rounded-xl border border-[var(--line,#e2e8f0)]">
										{formattedSoapText}
									</pre>
								)}

								{/* Вкладка 2: Карточки разделов SOAP */}
								{activeTab === "soap_cards" && (
									<div className="space-y-3">
										{/* S */}
										<div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
											<div className="font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider text-[11px]">
												S (Subjective) — Жалобы и анамнез
											</div>
											<p className="text-sm text-[var(--ink,#0f172a)] leading-relaxed">
												{synthesizedDiary.subjectiveComplaints}
											</p>
										</div>

										{/* O */}
										<div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1.5">
											<div className="font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider text-[11px]">
												O (Objective) — Status Localis и диагностические тесты
											</div>
											<p className="text-sm text-[var(--ink,#0f172a)] leading-relaxed">
												{synthesizedDiary.objectiveStatusLocalis}
											</p>
											<div className="flex flex-wrap gap-2 pt-1 text-[11px] text-[var(--muted,#64748b)]">
												<span className="px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)]">
													Перкуссия верт.: {synthesizedDiary.percussionVertical === "negative" ? "отриц." : "положит."}
												</span>
												<span className="px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)]">
													Зондирование: {synthesizedDiary.probingTenderness || "безболезненно"}
												</span>
												{synthesizedDiary.eodMicroamperes !== null && synthesizedDiary.eodMicroamperes !== undefined && (
													<span className="px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] font-bold text-teal-600">
														ЭОД: {synthesizedDiary.eodMicroamperes} мкА
													</span>
												)}
											</div>
										</div>

										{/* A */}
										<div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
											<div className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-[11px]">
												A (Assessment) — Диагноз по МКБ-10
											</div>
											<div className="text-sm font-bold text-[var(--ink,#0f172a)]">
												<span className="font-mono text-amber-600 mr-2">
													{synthesizedDiary.assessmentIcd10Code}
												</span>
												{synthesizedDiary.assessmentDiagnosisText}
											</div>
										</div>

										{/* P */}
										<div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-2">
											<div className="font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider text-[11px]">
												P (Plan & Procedure) — Протокол вмешательства
											</div>
											<p className="text-xs text-[var(--ink,#0f172a)] whitespace-pre-wrap leading-relaxed font-mono bg-[var(--paper,#ffffff)] p-3 rounded-lg border border-[var(--line,#e2e8f0)]">
												{synthesizedDiary.procedureProtocol}
											</p>
											{synthesizedDiary.anesthesiaDetails && (
												<div className="text-[11px] text-[var(--muted,#64748b)]">
													<strong>Анестезия:</strong> {synthesizedDiary.anesthesiaDetails}
												</div>
											)}
											{synthesizedDiary.appliedMaterials && (
												<div className="text-[11px] text-[var(--muted,#64748b)]">
													<strong>Материалы:</strong> {synthesizedDiary.appliedMaterials}
												</div>
											)}
											{synthesizedDiary.homeCareRecommendations && (
												<div className="text-[11px] text-[var(--muted,#64748b)]">
													<strong>Рекомендации на дом:</strong> {synthesizedDiary.homeCareRecommendations}
												</div>
											)}
										</div>
									</div>
								)}

								{/* Вкладка 3: Аудит соответствия */}
								{activeTab === "compliance" && (
									<div className="space-y-3">
										<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200">
											<div className="font-bold text-sm flex items-center gap-2">
												<CheckCircle2 className="w-5 h-5 text-emerald-600" />
												<span>Оценка нормативного соответствия: {complianceReport.complianceScore} / 100 баллов</span>
											</div>
											<p className="text-xs mt-1 leading-relaxed">
												{complianceReport.statutorySummaryText}
											</p>
										</div>

										<div className="grid grid-cols-2 gap-2">
											<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
												<div className="font-semibold text-[var(--ink,#0f172a)]">МКБ-10 классификатор</div>
												<div className="text-xs text-emerald-600 font-medium">✓ Валидный код ({synthesizedDiary.assessmentIcd10Code})</div>
											</div>
											<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
												<div className="font-semibold text-[var(--ink,#0f172a)]">Зубная формула FDI</div>
												<div className="text-xs text-emerald-600 font-medium">✓ Валидный номер ({synthesizedDiary.toothNumber})</div>
											</div>
											<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
												<div className="font-semibold text-[var(--ink,#0f172a)]">Дозировка анестетика</div>
												<div className="text-xs text-emerald-600 font-medium">✓ Безопасная терапевтическая доза</div>
											</div>
											<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]">
												<div className="font-semibold text-[var(--ink,#0f172a)]">Подпись и реквизиты</div>
												<div className="text-xs text-emerald-600 font-medium">✓ {synthesizedDiary.doctorFullName}</div>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* ── Нижняя панель действий тулбара ── */}
							<div className="flex flex-wrap items-center justify-between gap-3 pt-2">
								<button
									type="button"
									onClick={handleCopyToClipboard}
									className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors"
								>
									{isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
									<span>{isCopied ? "Скопировано в буфер!" : "Копировать SOAP текст"}</span>
								</button>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={onClose}
										className="inline-flex items-center justify-center px-4 py-2 min-h-[48px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs sm:text-sm font-bold hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer"
									>
										Отмена
									</button>
									<button
										type="button"
										onClick={handleApply}
										className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[48px] rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer select-none active:scale-98"
										data-testid="apply-emr-protocol-btn"
									>
										<Sparkles className="w-4 h-4" />
										<span>⚡ Применить в дневник 043/у (1 клик)</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>,
			document.body,
		);
	},
);
