import React from "react";
import {
	Activity,
	Bone,
	BookOpen,
	Check,
	Crown,
	Flame,
	HeartPulse,
	PlusCircle,
	Search,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	type ClinicalPresetCategory,
	type ClinicalQuickPreset,
	type ClinicalSoapPreset,
	type ToothClinicalState,
	CLINICAL_PRESETS,
	CLINICAL_SOAP_PRESETS,
	TOP_EXPRESS_PRESET_IDS,
} from "./clinicalSoapPresets";

export type { ToothClinicalState, ClinicalQuickPreset, ClinicalSoapPreset, ClinicalPresetCategory };
export { CLINICAL_PRESETS, CLINICAL_SOAP_PRESETS };

export interface ClinicalQuickPresetsBarProps {
	readonly onSelectPreset: (preset: ClinicalQuickPreset, targetTooth?: number | null) => void;
	readonly isLocked?: boolean;
	readonly className?: string;
	readonly onOpenPriceSearch?: () => void;
	readonly onOpenTemplatesModal?: () => void;
	readonly activeTooth?: number | null;
	readonly onSelectActiveTooth?: (tooth: number) => void;
}

const COMMON_FDI_TEETH = [16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44, 18, 48];

export const ClinicalQuickPresetsBar: React.FC<ClinicalQuickPresetsBarProps> = ({
	onSelectPreset,
	isLocked = false,
	className = "",
	onOpenPriceSearch,
	onOpenTemplatesModal,
	activeTooth = null,
	onSelectActiveTooth,
}) => {
	const [activeCategory, setActiveCategory] = React.useState<string>("all");
	const [localSelectedTooth, setLocalSelectedTooth] = React.useState<number | null>(activeTooth ?? 16);

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
		if (isLocked) {
			showToast("Дневник подписан — вставка шаблона заблокирована", "info");
			return;
		}
		const effectiveTooth = preset.category !== "hygiene" ? (currentTooth || preset.defaultTooth || 16) : null;
		onSelectPreset(preset, effectiveTooth);
		const toothSuffix = effectiveTooth ? ` (Зуб ${effectiveTooth})` : "";
		showToast(`Применен 1-Click Smart-Bundle: «${preset.title}»${toothSuffix}`, "success", 3000);
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

	return (
		<div
			className={`clinical-quick-presets-bar p-4 rounded-2xl border border-[var(--border)] bg-[var(--paper-soft)] text-[var(--ink)] space-y-3.5 ${className}`.trim()}
			data-testid="clinical-quick-presets-bar"
		>
			{/* Шапка бара пресетов с подсказкой и кнопками каталога */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2.5">
					<div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] shadow-2xs">
						<Zap size={18} />
					</div>
					<div>
						<h4 className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
							<span>1-Click Clinical Smart-Bundles (Протоколы СтАР)</span>
							<span className="text-xs px-2 py-0.5 rounded-md font-mono font-black bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)]">
								МКБ-10 + Одонтограмма + 804н
							</span>
						</h4>
						<p className="text-xs text-[var(--muted)]">
							1 клик: Окрашивание зуба на схеме • Чистый SOAP 043/у • Анестетик (с соматическим алертом) • Услуга 804н
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{onOpenTemplatesModal && (
						<button
							type="button"
							onClick={onOpenTemplatesModal}
							className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] shadow-xs transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]"
							title="Открыть полный каталог клинических протоколов Формы 043/у со списанием материалов"
							data-testid="btn-open-soap-templates-modal-bar"
						>
							<BookOpen size={16} />
							<span>Все шаблоны 043/у</span>
						</button>
					)}

					{onOpenPriceSearch && (
						<button
							type="button"
							onClick={onOpenPriceSearch}
							className="min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]"
							title="Быстрый поиск и добавление процедур из прайса клиники в протокол и счет"
							data-testid="btn-quick-add-from-pricelist"
						>
							<PlusCircle size={16} />
							<span>+ Каталог 804н</span>
						</button>
					)}
				</div>
			</div>

			{/* ── АКТИВНЫЙ ЗУБ FDI (ДИНАМИЧЕСКИЙ ВЫБОР ДЛЯ SMART-BUNDLE) ── */}
			<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-2 flex-wrap shadow-2xs">
				<div className="flex items-center gap-2">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--teal,var(--brand-primary))] flex items-center gap-1.5">
						<span>🦷</span>
						<span>Активный зуб:</span>
					</span>
					<span className="text-sm font-black font-mono px-2.5 py-1 rounded-lg bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shadow-2xs">
						{currentTooth ? `Зуб FDI #${currentTooth}` : "Не выбран (общий осмотр)"}
					</span>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] font-bold text-[var(--muted)] mr-1 hidden sm:inline">
						Быстрый выбор:
					</span>
					{COMMON_FDI_TEETH.slice(0, 8).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => handleToothSelect(t)}
							className={`min-h-[48px] px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer touch-manipulation active:scale-95 ${
								currentTooth === t
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)] shadow-2xs"
									: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
							}`}
							title={`Выбрать активным зуб FDI ${t}`}
							data-testid={`btn-select-active-tooth-${t}`}
						>
							{t}
						</button>
					))}
					<select
						value={currentTooth ?? 16}
						onChange={(e) => handleToothSelect(Number(e.target.value))}
						className="min-h-[48px] px-2 py-1 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
						title="Выбрать любой другой зуб из формулы"
					>
						{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
							<option key={t} value={t}>
								Зуб {t}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* ── ТОП-5 ЭКСПРЕСС-СЦЕНАРИЕВ (КРУПНЫЕ КНОПКИ >= 50px) ── */}
			<div className="space-y-1.5">
				<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-amber-500" />
					<span>Главные экспресс-сценарии приема:</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
					{topExpressPresets.map((preset) => {
						const isHygiene = preset.id === "hygiene_complex";
						const isCaries = preset.id === "caries_medium";
						const isPulpitis = preset.id === "pulpitis_acute";
						const isPerio = preset.id === "perio_srp_curettage";
						const isSurgery = preset.id === "surgery_extraction_simple";

						const bgGradient = isHygiene
							? "bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/30 hover:opacity-90"
							: isCaries
								? "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/25"
								: isPulpitis
									? "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30 hover:bg-rose-500/25"
									: isPerio
										? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/25"
										: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30 hover:bg-purple-500/25";

						const dynamicBadge = isHygiene
							? "Профгигиена"
							: isSurgery
								? currentTooth ? `Удаление ${currentTooth}` : "Удаление"
								: currentTooth
									? `${preset.shortBadge.replace(/\s*\d{2}/, "")} ${currentTooth}`
									: preset.shortBadge;

						return (
							<button
								key={`top-${preset.id}`}
								type="button"
								onClick={() => handlePresetClick(preset)}
								disabled={isLocked}
								className={`min-h-[50px] px-3.5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold border transition-all flex flex-col items-start justify-center gap-1 cursor-pointer shadow-xs active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-left ${bgGradient}`}
								title={`${preset.title} · МКБ-10: ${preset.icd10}`}
								data-testid={`express-preset-${preset.id}`}
							>
								<div className="flex items-center justify-between w-full gap-1.5">
									<div className="flex items-center gap-1.5 min-w-0">
										{isHygiene && <Sparkles size={17} className="text-[var(--ok-fg)] shrink-0" />}
										{isCaries && <Stethoscope size={17} className="text-blue-600 dark:text-blue-400 shrink-0" />}
										{isPulpitis && <Flame size={17} className="text-rose-600 dark:text-rose-400 shrink-0" />}
										{isPerio && <HeartPulse size={17} className="text-amber-600 dark:text-amber-400 shrink-0" />}
										{isSurgery && <Bone size={17} className="text-purple-600 dark:text-purple-400 shrink-0" />}
										<span className="truncate font-black">{dynamicBadge}</span>
									</div>
									<span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--border)] font-bold shrink-0">
										{preset.icd10}
									</span>
								</div>
								<span className="text-xs font-medium text-[var(--muted)] truncate w-full">
									{isHygiene ? "Осмотр, Air-Flow, фторирование" : isCaries ? "Кариес → Пломба + 804н" : isPulpitis ? "Анестезия + Экстирпация + Ca(OH)2" : isPerio ? "УЗ + AirFlow + Хлоргексидин" : "Удаление + Гемостаз + Шов"}
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
								className={`min-h-[48px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
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
							preset.category === "therapy"
								? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
								: preset.category === "surgery"
									? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
									: preset.category === "orthopedics"
										? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
										: preset.category === "periodontology"
											? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
											: "bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/20 hover:opacity-90";

						const badgeTitle = preset.category !== "hygiene" && currentTooth
							? `${preset.shortBadge} ${currentTooth}`
							: preset.shortBadge;

						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handlePresetClick(preset)}
								disabled={isLocked}
								className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-between gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-0 break-words touch-manipulation ${categoryBadgeColor}`}
								title={`${preset.title} · МКБ-10: ${preset.icd10}${preset.service804n ? ` · Услуга: ${preset.service804n.title}` : ""}`}
								data-testid={`quick-preset-${preset.id}`}
							>
								<div className="flex items-center gap-1.5 min-w-0 truncate">
									{preset.category === "therapy" && <Stethoscope size={15} className="shrink-0" />}
									{preset.category === "surgery" && <Bone size={15} className="shrink-0" />}
									{preset.category === "orthopedics" && <Crown size={15} className="shrink-0" />}
									{preset.category === "periodontology" && <HeartPulse size={15} className="shrink-0" />}
									{preset.category === "hygiene" && <Sparkles size={15} className="shrink-0" />}
									<span className="font-extrabold truncate">{badgeTitle}</span>
								</div>
								<span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] shrink-0 font-bold">
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
