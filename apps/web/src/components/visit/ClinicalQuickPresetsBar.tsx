import {
	Activity,
	Baby,
	Bone,
	BookOpen,
	Crown,
	Flame,
	HeartPulse,
	PlusCircle,
	Scissors,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Zap,
} from "lucide-react";
import React from "react";
import { showToast } from "../GlobalToast";
import {
	CLINICAL_PRESETS,
	CLINICAL_SOAP_PRESETS,
	type ClinicalPresetCategory,
	type ClinicalQuickPreset,
	type ClinicalSoapPreset,
	THERAPY_ENDO_QUICK_PRESET_IDS,
	TOP_EXPRESS_PRESET_IDS,
	type ToothClinicalState,
} from "./clinicalSoapPresets";

export type {
	ClinicalPresetCategory,
	ClinicalQuickPreset,
	ClinicalSoapPreset,
	ToothClinicalState,
};
export { CLINICAL_PRESETS, CLINICAL_SOAP_PRESETS };

export interface ClinicalQuickPresetsBarProps {
	readonly onSelectPreset: (
		preset: ClinicalQuickPreset,
		targetTooth?: number | null,
	) => void;
	readonly isLocked?: boolean;
	readonly className?: string;
	readonly onOpenPriceSearch?: () => void;
	readonly onOpenTemplatesModal?: () => void;
	readonly activeTooth?: number | null;
	readonly onSelectActiveTooth?: (tooth: number) => void;
}

const COMMON_FDI_TEETH = [
	16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44, 18, 48,
];

interface ClinicalSpecialtySection {
	id: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	items: {
		presetId: string;
		label: string;
		subtext?: string;
	}[];
}

const CLINICAL_SPECIALTY_SECTIONS: readonly ClinicalSpecialtySection[] = [
	{
		id: "therapy",
		label: "Терапия (Кариес)",
		icon: Stethoscope,
		items: [
			{
				presetId: "caries_initial_icon",
				label: "Поверхностный кариес",
				subtext: "Инфильтрация Icon (без бора)",
			},
			{
				presetId: "caries_medium",
				label: "Средний кариес (K02.1)",
				subtext: "Препарирование + Estelite",
			},
			{
				presetId: "caries_deep",
				label: "Глубокий кариес",
				subtext: "Ca(OH)2 + СИЦ + реставрация",
			},
			{
				presetId: "wedge_defect_cervical",
				label: "Клиновидный дефект",
				subtext: "Beautifil Flow + эмаль",
			},
			{
				presetId: "filling_restoration",
				label: "Скол эмали",
				subtext: "Восстановление реставрации",
			},
		],
	},
	{
		id: "endo",
		label: "Эндодонтия (Пульпит/Периодонтит)",
		icon: Flame,
		items: [
			{
				presetId: "pulpitis_acute",
				label: "Острый пульпит (K04.0)",
				subtext: "ProTaper + NaOCl + AH Plus",
			},
			{
				presetId: "pulpitis_visit1",
				label: "Пульпит 1 эт. (экстирпация + Ca(OH)2)",
				subtext: "Экстирпация + Каласепт",
			},
			{
				presetId: "pulpitis_obturation",
				label: "Обтурация (AH Plus + гуттаперча)",
				subtext: "Латеральная конденсация",
			},
			{
				presetId: "periodontitis_destructive",
				label: "Периодонтит деструктивный (K04.5)",
				subtext: "УЗ + Metapex/Calcept",
			},
			{
				presetId: "periodontitis_chronic",
				label: "Хронический периодонтит",
				subtext: "Мехобработка + Ca(OH)2",
			},
		],
	},
	{
		id: "hygiene",
		label: "Гигиена",
		icon: Sparkles,
		items: [
			{
				presetId: "hygiene_complex",
				label: "Комплексная профгигиена",
				subtext: "Piezon + Air-Flow + фторлак",
			},
			{
				presetId: "hygiene_k036",
				label: "Снятие зубных отложений (K03.6)",
				subtext: "Piezon + Detartrine + Bifluorid",
			},
			{
				presetId: "hygiene_and_caries_mixed",
				label: "Air-Flow + полировка",
				subtext: "Удаление мягкого/пигм. налета",
			},
			{
				presetId: "cold_hot_sensitivity",
				label: "Реминерализующая терапия",
				subtext: "Gluma Desensitizer + фторирование",
			},
		],
	},
	{
		id: "surgery",
		label: "Хирургия (Удаление)",
		icon: Scissors,
		items: [
			{
				presetId: "surgery_extraction_simple",
				label: "Простое удаление зуба (K01.1)",
				subtext: "Анестезия + Элеватор + Щипцы",
			},
			{
				presetId: "surgery_extraction_complex",
				label: "Сложное удаление (разъединение корней)",
				subtext: "Кюретаж лунки + Альвожиль",
			},
			{
				presetId: "surgery_periostotomy",
				label: "Периостотомия (вскрытие абсцесса)",
				subtext: "Разрез + Дренирование",
			},
			{
				presetId: "surgery_implant_standard",
				label: "Дентальная имплантация",
				subtext: "Установка имплантата 35 Н/см",
			},
		],
	},
	{
		id: "orthopedics",
		label: "Ортопедия (Коронки)",
		icon: Crown,
		items: [
			{
				presetId: "ortho_crown_prep",
				label: "Препарирование под коронку",
				subtext: "Уступ + А-силиконовый оттиск",
			},
			{
				presetId: "ortho_prep_zirconia_emax",
				label: "Препарирование Zirconia / E-max",
				subtext: "Циркониевая коронка / винир",
			},
			{
				presetId: "ortho_try_in_framework_crown",
				label: "Примерка каркаса коронки",
				subtext: "Окклюзия, прилегание, цвет",
			},
			{
				presetId: "crown_adhesive_cementation",
				label: "Постоянная фиксация (цемент)",
				subtext: "RelyX / Panavia V5 / СИЦ",
			},
			{
				presetId: "ortho_removable_prosthetics",
				label: "Съемный протез",
				subtext: "Acry-Free / бюгельный протез",
			},
		],
	},
	{
		id: "periodontology",
		label: "Пародонтология",
		icon: HeartPulse,
		items: [
			{
				presetId: "perio_srp_curettage",
				label: "SRP кюретаж карманов",
				subtext: "Кюреты Грейси + Хлоргексидин",
			},
			{
				presetId: "perio_vector_therapy",
				label: "Вектор-терапия",
				subtext: "Аппарат Vector + Polish Fluid",
			},
			{
				presetId: "perio_srp_curettage",
				label: "Хронический пародонтит (K05.3)",
				subtext: "Метрогил Дента + шинирование",
			},
			{
				presetId: "perio_gingivitis_catarrhal",
				label: "Катаральный гингивит (K05.1)",
				subtext: "Скейлинг + аппликации геля",
			},
		],
	},
];

export const ClinicalQuickPresetsBar: React.FC<
	ClinicalQuickPresetsBarProps
> = ({
	onSelectPreset,
	isLocked = false,
	className = "",
	onOpenPriceSearch,
	onOpenTemplatesModal,
	activeTooth = null,
	onSelectActiveTooth,
}) => {
	const [activeCategory, setActiveCategory] = React.useState<string>("all");
	const [activeSpecialtyCategory, setActiveSpecialtyCategory] =
		React.useState<string>("therapy");
	const [localSelectedTooth, setLocalSelectedTooth] = React.useState<
		number | null
	>(activeTooth ?? 16);

	React.useEffect(() => {
		if (activeTooth) {
			setLocalSelectedTooth(activeTooth);
		}
	}, [activeTooth]);

	const currentTooth = activeTooth ?? localSelectedTooth;

	const handleToothSelect = (tooth: number) => {
		setLocalSelectedTooth(tooth);
		if (onSelectActiveTooth) {
			onSelectActiveTooth(tooth);
		}
	};

	const handlePresetClick = (preset: ClinicalQuickPreset) => {
		const isFullMouthOrNorm =
			preset.category === "hygiene" || preset.id === "norm_healthy";
		const effectiveTooth = !isFullMouthOrNorm
			? currentTooth || preset.defaultTooth || 16
			: null;
		onSelectPreset(preset, effectiveTooth);
		const toothSuffix = effectiveTooth ? ` (Зуб ${effectiveTooth})` : "";
		showToast(
			`Применен протокол: «${preset.title}»${toothSuffix}`,
			"success",
			3000,
		);
	};

	const filteredPresets = React.useMemo(() => {
		if (activeCategory === "all") return CLINICAL_SOAP_PRESETS;
		return CLINICAL_SOAP_PRESETS.filter((p) => p.category === activeCategory);
	}, [activeCategory]);

	const topExpressPresets = React.useMemo(() => {
		return TOP_EXPRESS_PRESET_IDS.map((id) =>
			CLINICAL_SOAP_PRESETS.find((p) => p.id === id),
		).filter((p): p is ClinicalQuickPreset => Boolean(p));
	}, []);

	const therapyEndoQuickPresets = React.useMemo(() => {
		return THERAPY_ENDO_QUICK_PRESET_IDS.map((id) =>
			CLINICAL_SOAP_PRESETS.find((p) => p.id === id),
		).filter((p): p is ClinicalQuickPreset => Boolean(p));
	}, []);

	const surgeryQuickPresets = React.useMemo(() => {
		const targetIds = ["surgery_extraction_complex", "surgery_periostotomy"];
		return targetIds
			.map((id) => CLINICAL_SOAP_PRESETS.find((p) => p.id === id))
			.filter((p): p is ClinicalQuickPreset => Boolean(p));
	}, []);

	const currentSpecialtySection = React.useMemo(() => {
		return (
			CLINICAL_SPECIALTY_SECTIONS.find(
				(s) => s.id === activeSpecialtyCategory,
			) || CLINICAL_SPECIALTY_SECTIONS[0]
		);
	}, [activeSpecialtyCategory]);

	return (
		<div
			className={`clinical-quick-presets-bar p-3 sm:p-3.5 rounded-xl border border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] space-y-3 ${className}`.trim()}
			data-testid="clinical-quick-presets-bar"
			data-tour="diary-preset"
		>
			{/* Шапка бара пресетов с подсказкой и кнопками каталога */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] shadow-2xs shrink-0">
						<Zap size={16} />
					</div>
					<div>
						<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink)] flex items-center gap-1.5">
							<span>Клинические протоколы СтАР</span>
							<span className="text-[10px] sm:text-xs px-1.5 py-0.2 rounded font-mono font-black bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)]">
								Стандарты Минздрава РФ
							</span>
						</h4>
						<p className="text-[11px] text-[var(--muted)]">
							Пакетное заполнение: статус зуба на схеме • дневник приёма •
							анестезия • каталог услуг
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 sm:gap-2">
					<button
						type="button"
						onClick={() => {
							const normPreset = CLINICAL_SOAP_PRESETS.find(
								(p) => p.id === "norm_healthy",
							);
							if (normPreset) {
								handlePresetClick(normPreset);
							}
						}}
						className="min-h-[48px] sm:min-h-[32px] sm:h-8 px-3 sm:px-2.5 py-1.5 sm:py-0 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
						title="Норма (Z01.2): соматически здоров, норма прикуса и пародонта"
						data-testid="btn-quick-apply-physio-norm"
					>
						<ShieldCheck size={15} className="shrink-0" />
						<span>Соматически здоров / Норма</span>
					</button>

					<button
						type="button"
						onClick={() => {
							const orthoPreset = CLINICAL_SOAP_PRESETS.find(
								(p) => p.id === "orthopedics_norm_checkup",
							);
							if (orthoPreset) {
								handlePresetClick(orthoPreset);
							}
						}}
						className="min-h-[48px] sm:min-h-[32px] sm:h-8 px-3 sm:px-2.5 py-1.5 sm:py-0 rounded-lg text-xs font-extrabold bg-cyan-700 hover:bg-cyan-600 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
						title="Норма ортопедии (Z46.3): контрольный осмотр конструкций, окклюзия стабильна"
						data-testid="btn-quick-apply-ortho-norm"
					>
						<ShieldCheck size={15} className="shrink-0" />
						<span>Норма: Ортопедия</span>
					</button>

					<button
						type="button"
						onClick={() => {
							const surgeryPreset = CLINICAL_SOAP_PRESETS.find(
								(p) => p.id === "surgery_norm_checkup",
							);
							if (surgeryPreset) {
								handlePresetClick(surgeryPreset);
							}
						}}
						className="min-h-[48px] sm:min-h-[32px] sm:h-8 px-3 sm:px-2.5 py-1.5 sm:py-0 rounded-lg text-xs font-extrabold bg-indigo-700 hover:bg-indigo-600 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
						title="Норма хирургии (Z09.0): послеоперационный осмотр, заживление без осложнений"
						data-testid="btn-quick-apply-surgery-norm"
					>
						<ShieldCheck size={15} className="shrink-0" />
						<span>Норма: Хирургия</span>
					</button>

					{onOpenTemplatesModal && (
						<button
							type="button"
							onClick={onOpenTemplatesModal}
							className="min-h-[48px] sm:min-h-[32px] sm:h-8 px-3 sm:px-2.5 py-1.5 sm:py-0 rounded-lg text-xs font-extrabold bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
							title="Открыть полный промышленный каталог клинических протоколов и дневников приёма (1 142 шаблона)"
							data-testid="btn-open-soap-templates-modal-bar"
						>
							<BookOpen size={15} className="shrink-0" />
							<span>Все шаблоны (1 142)</span>
						</button>
					)}

					{onOpenPriceSearch && (
						<button
							type="button"
							onClick={onOpenPriceSearch}
							className="min-h-[48px] sm:min-h-[32px] sm:h-8 px-3 sm:px-2.5 py-1.5 sm:py-0 rounded-lg text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
							title="Быстрый поиск и добавление процедур из каталога услуг в протокол и счет"
							data-testid="btn-quick-add-from-pricelist"
						>
							<PlusCircle size={15} className="shrink-0" />
							<span>Каталог услуг</span>
						</button>
					)}
				</div>
			</div>

			{/* ── АКТИВНЫЙ ЗУБ FDI (ДИНАМИЧЕСКИЙ ВЫБОР ДЛЯ SMART-BUNDLE) ── */}
			<div className="p-2 sm:p-2.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--glass-border)] flex items-center justify-between gap-2 flex-wrap shadow-2xs">
				<div className="flex items-center gap-1.5">
					<span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[var(--teal,var(--brand-primary))] flex items-center gap-1">
						<Activity size={13} className="shrink-0" />
						<span>Активный зуб:</span>
					</span>
					<span className="text-xs sm:text-sm font-black font-mono px-2 py-0.5 rounded-lg bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shadow-2xs">
						{currentTooth
							? `Зуб ${currentTooth}`
							: "Не выбран (общий осмотр)"}
					</span>
				</div>

				<div className="flex items-center gap-1 flex-wrap">
					<span className="text-[10px] sm:text-[11px] font-bold text-[var(--muted)] mr-0.5 hidden sm:inline">
						Быстрый выбор:
					</span>
					{COMMON_FDI_TEETH.slice(0, 8).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => handleToothSelect(t)}
							className={`min-h-[44px] sm:min-h-[28px] sm:h-7 px-2 py-0.5 rounded-md text-xs font-mono font-black border transition-all cursor-pointer touch-manipulation active:scale-95 ${
								currentTooth === t
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
									: "bg-[var(--paper-soft)] border-[var(--glass-border)] text-[var(--ink)] hover:border-[var(--teal)]"
							}`}
							title={`Выбрать активным зуб ${t}`}
							data-testid={`btn-select-active-tooth-${t}`}
						>
							{t}
						</button>
					))}
					<select
						value={currentTooth ?? 16}
						onChange={(e) => handleToothSelect(Number(e.target.value))}
						className="min-h-[44px] sm:min-h-[28px] sm:h-7 px-2 py-0.5 text-xs font-mono font-bold rounded-md border border-[var(--glass-border)] bg-[var(--paper-soft)] text-[var(--ink)]"
						title="Выбрать любой другой зуб из формулы"
					>
						{[
							18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
							48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
						].map((t) => (
							<option key={t} value={t}>
								Зуб {t}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* ── 🌟 ЭКСПРЕСС-ПАНЕЛЬ КЛИНИЧЕСКИХ КАТЕГОРИЙ И ТОПОВЫХ НОЗОЛОГИЙ ── */}
			<div
				className="p-2.5 sm:p-3 rounded-xl bg-[var(--paper)] border border-[var(--border)] shadow-xs space-y-2.5"
				data-testid="clinical-express-specialty-panel"
			>
				{/* Чипы категорий */}
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div
						className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap py-0.5 touch-pan-x"
						data-testid="clinical-category-chips-bar"
					>
						{CLINICAL_SPECIALTY_SECTIONS.map((sec) => {
							const IconComponent = sec.icon;
							const isActive = activeSpecialtyCategory === sec.id;
							return (
								<button
									key={sec.id}
									type="button"
									onClick={() => setActiveSpecialtyCategory(sec.id)}
									data-testid={`btn-specialty-category-${sec.id}`}
									className={`min-h-[44px] sm:min-h-[30px] sm:h-7.5 px-3 py-1 sm:py-0 rounded-lg text-xs font-extrabold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap touch-manipulation active:scale-95 ${
										isActive
											? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-xs"
											: "bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)]"
									}`}
								>
									<IconComponent size={13} className="shrink-0" />
									<span>{sec.label}</span>
								</button>
							);
						})}
					</div>
					<span className="text-[11px] font-mono text-[var(--muted)] hidden md:inline">
						Быстрый протокол в 1 клик
					</span>
				</div>

				{/* Сетка нозологий под активной категорией */}
				<div
					className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 min-w-0"
					data-testid="clinical-category-presets-grid"
				>
					{currentSpecialtySection.items.map((item) => {
						const preset = CLINICAL_SOAP_PRESETS.find(
							(p) => p.id === item.presetId,
						);
						if (!preset) return null;

						const dynamicBadge =
							preset.category !== "hygiene" && currentTooth
								? `${item.label} (${currentTooth})`
								: item.label;

						return (
							<button
								key={`spec-${item.presetId}`}
								type="button"
								onClick={() => handlePresetClick(preset)}
								data-testid={`btn-nosology-preset-${item.presetId}`}
								className="clinical-protocol-card min-h-[50px] sm:min-h-[44px] p-2 sm:p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-start justify-between gap-1 cursor-pointer shadow-xs active:scale-98 touch-manipulation text-left bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)]"
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
							>
								<div className="flex items-center justify-between w-full gap-1.5 min-w-0">
									<span className="font-extrabold text-xs text-[var(--ink)] truncate">
										{dynamicBadge}
									</span>
									<span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] shrink-0 font-bold">
										{preset.icd10}
									</span>
								</div>
								<span
									className="text-[11px] font-normal text-[var(--muted)] truncate w-full"
									title={item.subtext || preset.title}
								>
									{item.subtext || preset.title}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── ТОП-5 ЭКСПРЕСС-СЦЕНАРИЕВ (КРУПНЫЕ КНОПКИ >= 50px) ── */}
			<div className="space-y-1.5">
				<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-amber-500" />
					<span>Главные экспресс-сценарии приема:</span>
				</div>
				<div className="flex overflow-x-auto no-scrollbar whitespace-nowrap flex-nowrap scrollbar-none px-2 py-1 pr-6 gap-2 touch-pan-x">
					{topExpressPresets.map((preset) => {
						const isNorm = preset.id === "norm_healthy";
						const isHygiene = preset.id === "hygiene_complex";
						const isCaries = preset.id === "caries_medium";
						const isPulpitis = preset.id === "pulpitis_acute";
						const isPerio = preset.id === "perio_srp_curettage";
						const isSurgery = preset.id === "surgery_extraction_simple";

						const bgGradient = isNorm
							? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/25"
							: isHygiene
								? "bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/30 hover:opacity-90"
								: isCaries
									? "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/25"
									: isPulpitis
										? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30 hover:bg-rose-500/25"
										: isPerio
											? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/25"
											: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30 hover:bg-purple-500/25";

						const dynamicBadge = isNorm
							? "Норма (Здоров)"
							: isHygiene
								? "Профгигиена"
								: isSurgery
									? currentTooth
										? `Удаление ${currentTooth}`
										: "Удаление"
									: currentTooth
										? `${preset.shortBadge.replace(/\s*\d{2}/, "")} ${currentTooth}`
										: preset.shortBadge;

						const subtext = isNorm
							? "Осмотр: Здоров, норма"
							: isHygiene
								? "Осмотр, Air-Flow, фторирование"
								: isCaries
									? "Кариес → Пломба + услуга"
									: isPulpitis
										? "Анестезия + Экстирпация + Ca(OH)2"
										: isPerio
											? "УЗ + AirFlow + Хлоргексидин"
											: "Удаление + Гемостаз + Шов";

						return (
							<button
								key={`top-${preset.id}`}
								type="button"
								onClick={() => handlePresetClick(preset)}
								className={`clinical-protocol-card min-h-[50px] sm:min-h-[42px] min-w-[190px] sm:min-w-[210px] shrink-0 flex-shrink-0 px-3 sm:px-2.5 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-extrabold border transition-all flex flex-col items-start justify-center gap-0.5 cursor-pointer shadow-xs active:scale-98 touch-manipulation text-left select-none whitespace-nowrap ${bgGradient}`}
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
								data-testid={`express-preset-${preset.id}`}
								data-tour="diary-preset"
							>
								<div className="flex items-center justify-between w-full gap-1.5">
									<div className="flex items-center gap-1.5 min-w-0">
										{isNorm && (
											<ShieldCheck
												size={15}
												className="text-emerald-600 dark:text-emerald-400 shrink-0"
											/>
										)}
										{isHygiene && (
											<Sparkles
												size={15}
												className="text-[var(--ok-fg)] shrink-0"
											/>
										)}
										{isCaries && (
											<Stethoscope
												size={15}
												className="text-blue-600 dark:text-blue-400 shrink-0"
											/>
										)}
										{isPulpitis && (
											<Flame
												size={15}
												className="text-rose-600 dark:text-rose-400 shrink-0"
											/>
										)}
										{isPerio && (
											<HeartPulse
												size={15}
												className="text-amber-600 dark:text-amber-400 shrink-0"
											/>
										)}
										{isSurgery && (
											<Scissors
												size={15}
												className="text-purple-600 dark:text-purple-400 shrink-0"
											/>
										)}
										<span className="whitespace-nowrap shrink-0 font-black">
											{dynamicBadge}
										</span>
									</div>
									<span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--border)] font-bold shrink-0">
										{preset.icd10}
									</span>
								</div>
								<span
									className="text-[11px] font-medium text-[var(--muted)] whitespace-nowrap shrink-0"
									title={subtext}
								>
									{subtext}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── ТЕРАПИЯ И ЭНДОДОНТИЯ ── */}
			<div
				className="space-y-1.5 pt-1 border-t border-[var(--border)]"
				data-testid="therapy-endo-quick-actions-section"
			>
				<div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Stethoscope size={14} className="text-blue-500 shrink-0" />
						<span>Терапия и эндодонтия:</span>
					</div>
					<span className="text-[11px] font-mono text-[var(--muted)] font-normal hidden sm:inline">
						Пульпит (1/2 эт.) · Периодонтит · Кариес + списание
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{therapyEndoQuickPresets.map((preset) => {
						const dynamicBadge = currentTooth
							? `${preset.shortBadge.replace(/\s*\d{2}/, "")} ${currentTooth}`
							: preset.shortBadge;
						const subtitle =
							preset.id === "pulpitis_visit1"
								? "Экстирпация + Ca(OH)2 под дентин-пасту"
								: preset.id === "pulpitis_obturation"
									? "Обтурация гуттаперчей + AH Plus"
									: preset.id === "periodontitis_destructive"
										? "УЗ дезинфекция + Metapex/Calcept"
										: "OptiBond + Filtek/Estelite по слоям";

						return (
							<button
								key={`therapy-endo-${preset.id}`}
								type="button"
								onClick={() => handlePresetClick(preset)}
								className="clinical-protocol-card min-h-[50px] sm:min-h-[42px] px-3 sm:px-2.5 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-extrabold border transition-all flex flex-col items-start justify-center gap-0.5 cursor-pointer shadow-xs active:scale-98 touch-manipulation text-left bg-blue-500/15 text-blue-950 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/25"
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
								data-testid={`btn-therapy-endo-${preset.id}`}
							>
								<div className="flex items-center justify-between w-full gap-1.5">
									<div className="flex items-center gap-1.5 min-w-0">
										<Stethoscope
											size={15}
											className="text-blue-600 dark:text-blue-400 shrink-0"
										/>
										<span className="whitespace-nowrap shrink-0 font-black">
											{dynamicBadge}
										</span>
									</div>
									<span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--border)] font-bold shrink-0">
										{preset.icd10}
									</span>
								</div>
								<span
									className="text-[11px] font-medium text-[var(--muted)] line-clamp-2 leading-tight w-full"
									title={subtitle}
								>
									{subtitle}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── ХИРУРГИЧЕСКИЕ БЫСТРЫЕ ДЕЙСТВИЯ (ОСТРАЯ БОЛЬ) ── */}
			<div
				className="space-y-1.5 pt-1 border-t border-[var(--border)]"
				data-testid="surgery-quick-actions-section"
			>
				<div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Flame size={14} className="text-rose-500 shrink-0" />
						<span>Хирургические быстрые действия (Острая боль):</span>
					</div>
					<span className="text-[11px] font-mono text-[var(--muted)] font-normal hidden sm:inline">
						Сложное удаление / периостотомия
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
					{surgeryQuickPresets.map((preset) => {
						const isComplex = preset.id === "surgery_extraction_complex";
						const dynamicBadge = isComplex
							? currentTooth
								? `Сложн. удаление ${currentTooth}`
								: "Сложн. удаление"
							: currentTooth
								? `Периостотомия ${currentTooth}`
								: "Периостотомия";
						const subtitle = isComplex
							? "Разъединение корней + Кюретаж + Швы"
							: "Разрез + Вскрытие абсцесса + Дренаж";

						return (
							<button
								key={`surgery-quick-${preset.id}`}
								type="button"
								onClick={() => handlePresetClick(preset)}
								className="clinical-protocol-card min-h-[50px] sm:min-h-[42px] px-3 sm:px-2.5 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-extrabold border transition-all flex flex-col items-start justify-center gap-0.5 cursor-pointer shadow-xs active:scale-98 touch-manipulation text-left bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-500/30 hover:bg-rose-500/25"
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
								data-testid={`btn-surgery-quick-${preset.id}`}
							>
								<div className="flex items-center justify-between w-full gap-1.5">
									<div className="flex items-center gap-1.5 min-w-0">
										<Scissors
											size={15}
											className="text-rose-600 dark:text-rose-400 shrink-0"
										/>
										<span className="whitespace-nowrap shrink-0 font-black">
											{dynamicBadge}
										</span>
									</div>
									<span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--border)] font-bold shrink-0">
										{preset.icd10}
									</span>
								</div>
								<span
									className="text-[11px] font-medium text-[var(--muted)] whitespace-nowrap overflow-hidden text-ellipsis w-full"
									title={subtitle}
								>
									{subtitle}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* ── КАТЕГОРИИ И ПОЛНЫЙ КАТАЛОГ ШАБЛОНОВ ── */}
			<div className="space-y-2 pt-1 border-t border-[var(--border)]">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper)] border border-[var(--border)] overflow-x-auto flex-nowrap">
						{[
							{ id: "all", label: "Все шаблоны" },
							{ id: "pediatric", label: "Детские" },
							{ id: "therapy", label: "Терапия" },
							{ id: "surgery", label: "Хирургия" },
							{ id: "orthopedics", label: "Ортопедия" },
							{ id: "periodontology", label: "Пародонтология" },
							{ id: "hygiene", label: "Гигиена" },
						].map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() => setActiveCategory(cat.id)}
								className={`min-h-[44px] sm:min-h-[28px] sm:h-7 px-3 sm:px-2.5 py-1 sm:py-0 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
									activeCategory === cat.id
										? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{cat.label}
							</button>
						))}
					</div>
					<span className="text-xs font-semibold text-[var(--muted)]">
						Показано: {filteredPresets.length} из {CLINICAL_SOAP_PRESETS.length}
					</span>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 min-w-0">
					{filteredPresets.map((preset) => {
						const categoryBadgeColor =
							preset.category === "pediatric"
								? "bg-teal-500/10 text-teal-800 dark:text-teal-200 border-teal-500/20 hover:bg-teal-500/20"
								: preset.category === "therapy"
									? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
									: preset.category === "surgery"
										? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
										: preset.category === "orthopedics"
											? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
											: preset.category === "periodontology"
												? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
												: "bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/20 hover:opacity-90";

						const badgeTitle =
							preset.category !== "hygiene" && currentTooth
								? `${preset.shortBadge} ${currentTooth}`
								: preset.shortBadge;

						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handlePresetClick(preset)}
								className={`min-h-[48px] sm:min-h-[32px] sm:h-8 px-3 sm:px-2.5 py-1 sm:py-0 rounded-lg text-xs font-bold border transition-all flex items-center justify-between gap-2 cursor-pointer shadow-xs active:scale-95 min-w-0 break-words touch-manipulation ${categoryBadgeColor}`}
								title={`${preset.title} · МКБ-10: ${preset.icd10}${preset.service804n ? ` · Услуга: ${preset.service804n.title}` : ""}`}
								data-testid={`quick-preset-${preset.id}`}
							>
								<div className="flex items-center gap-1.5 min-w-0 truncate">
									{preset.category === "pediatric" && (
										<Baby size={14} className="shrink-0 text-teal-600" />
									)}
									{preset.category === "therapy" && (
										<Stethoscope size={14} className="shrink-0" />
									)}
									{preset.category === "surgery" && (
										<Bone size={14} className="shrink-0" />
									)}
									{preset.category === "orthopedics" && (
										<Crown size={14} className="shrink-0" />
									)}
									{preset.category === "periodontology" && (
										<HeartPulse size={14} className="shrink-0" />
									)}
									{preset.category === "hygiene" && (
										<Sparkles size={14} className="shrink-0" />
									)}
									<span className="font-extrabold truncate">{badgeTitle}</span>
								</div>
								<span className="text-[10px] sm:text-[11px] font-mono px-1 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] shrink-0 font-bold">
									{preset.icd10}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
