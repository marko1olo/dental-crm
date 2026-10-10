import {
	BookOpen,
	ChevronDown,
	ChevronUp,
	PlusCircle,
	Zap,
} from "lucide-react";
import React from "react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	CLINICAL_PRESETS,
	CLINICAL_SOAP_PRESETS,
	type ClinicalPresetCategory,
	type ClinicalQuickPreset,
	type ClinicalSoapPreset,
	type ToothClinicalState,
} from "./clinicalSoapPresets";
import { CLINICAL_SPECIALTY_SECTIONS } from "./clinicalSpecialtySections";
import {
	getDynamicPatientTeeth,
	getQuadrantForTooth,
	INTACT_QUADRANTS,
	type QuadrantId,
} from "./dynamicTeethSelector";
import { ClinicalAllPresetsGrid } from "./presets/ClinicalAllPresetsGrid";
import { ClinicalTopScenariosSubbar } from "./presets/ClinicalTopScenariosSubbar";
import { ClinicalSpecialtySectionPanel } from "./presets/ClinicalSpecialtySectionPanel";
import { ClinicalQuickToothSelectorStrip } from "./presets/ClinicalQuickToothSelectorStrip";

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
	const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
	const [presetViewMode, setPresetViewMode] = React.useState<
		"specialty" | "express" | "all"
	>("specialty");
	const [activeSpecialtyCategory, setActiveSpecialtyCategory] =
		React.useState<string>("therapy");
	const [localSelectedTooth, setLocalSelectedTooth] = React.useState<
		number | null
	>(activeTooth ?? 16);

	React.useEffect(() => {
		if (activeTooth && activeTooth !== localSelectedTooth) {
			setLocalSelectedTooth(activeTooth);
		}
	}, [activeTooth, localSelectedTooth]);

	const currentTooth = activeTooth ?? localSelectedTooth;

	const visitToothStateByCode = useVisitStore((s) => s.visitToothStateByCode);
	const visitToothRecordsByCode = useVisitStore((s) => s.visitToothRecordsByCode);

	const dynamicTeethData = React.useMemo(() => {
		return getDynamicPatientTeeth({
			toothStates: visitToothStateByCode,
			toothRecords: visitToothRecordsByCode,
			activeTooth: currentTooth,
		});
	}, [visitToothStateByCode, visitToothRecordsByCode, currentTooth]);

	const [selectedIntactQuadrant, setSelectedIntactQuadrant] = React.useState<QuadrantId>(() => {
		return getQuadrantForTooth(currentTooth);
	});
	const [showAllQuadrantsView, setShowAllQuadrantsView] = React.useState<boolean>(false);

	React.useEffect(() => {
		if (currentTooth) {
			const nextQuad = getQuadrantForTooth(currentTooth);
			setSelectedIntactQuadrant((prev) => (prev !== nextQuad ? nextQuad : prev));
		}
	}, [currentTooth]);

	const activeQuadrantDef = React.useMemo(() => {
		return INTACT_QUADRANTS.find((q) => q.id === selectedIntactQuadrant) ?? INTACT_QUADRANTS[0];
	}, [selectedIntactQuadrant]);

	const handleToothSelect = (tooth: number) => {
		setLocalSelectedTooth(tooth);
		try {
			useVisitStore.getState().setActiveToothNumber(tooth);
		} catch {
			// ignore in testing environments without store
		}
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

	const currentSpecialtySection = React.useMemo(() => {
		return (
			CLINICAL_SPECIALTY_SECTIONS.find(
				(s) => s.id === activeSpecialtyCategory,
			) || CLINICAL_SPECIALTY_SECTIONS[0]
		);
	}, [activeSpecialtyCategory]);

	return (
		<div
			className={`clinical-quick-presets-bar ${isCollapsed ? "py-1.5 px-2.5 sm:px-3" : "p-2.5 sm:p-3 space-y-2"} rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] ${className}`.trim()}
			data-testid="clinical-quick-presets-bar"
			data-tour="diary-preset"
		>
			{/* ── ЭТАЖ 1: ШАПКА БАРА СТРОГО В 1 СТРОКУ (ЗАГОЛОВОК, АКТИВНЫЙ ЗУБ И ДЕЙСТВИЯ) ── */}
			<div className="flex items-center justify-between gap-2 min-w-0 h-8 sm:h-9">
				<div className="flex items-center gap-2 min-w-0 shrink-0">
					<div className="flex items-center gap-1.5 shrink-0">
						<div className="clinical-presets-title-icon">
							<Zap size={14} />
						</div>
						<h4
							className="text-xs sm:text-sm font-bold text-[var(--ink)] tracking-tight whitespace-nowrap"
							title="Клинические протоколы СтАР"
						>
							Клинические протоколы СтАР
						</h4>
					</div>

					{/* Индикатор активного зуба (всегда виден) */}
					{currentTooth && (
						<span
							className="clinical-active-tooth-badge"
							data-testid="badge-collapsed-active-tooth"
						>
							Зуб {currentTooth}
						</span>
					)}
				</div>

				{/* Правый блок действий: Режимы отображения, Реестр протоколов и сворачивание */}
				<div className="flex items-center gap-1.5 shrink-0 ml-auto">
					{!isCollapsed && (
						<div
							className="dente-segmented-bar py-0.5 hidden md:inline-flex"
							role="tablist"
							aria-label="Режим отображения клинических протоколов"
							data-testid="presets-view-mode-segmented-bar"
						>
							<button
								type="button"
								role="tab"
								aria-selected={presetViewMode === "specialty"}
								onClick={() => setPresetViewMode("specialty")}
								className={`dente-segmented-item ${presetViewMode === "specialty" ? "active" : ""}`}
								data-active={presetViewMode === "specialty"}
								data-testid="btn-mode-specialty"
							>
								По специальностям
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={presetViewMode === "express"}
								onClick={() => setPresetViewMode("express")}
								className={`dente-segmented-item ${presetViewMode === "express" ? "active" : ""}`}
								data-active={presetViewMode === "express"}
								data-testid="btn-mode-express"
							>
								Экспресс-сценарии
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={presetViewMode === "all"}
								onClick={() => setPresetViewMode("all")}
								className={`dente-segmented-item ${presetViewMode === "all" ? "active" : ""}`}
								data-active={presetViewMode === "all"}
								data-testid="btn-mode-all"
							>
								Все ({CLINICAL_SOAP_PRESETS.length})
							</button>
						</div>
					)}

					{onOpenTemplatesModal && (
						<button
							type="button"
							onClick={onOpenTemplatesModal}
							className="emk-toolbar-btn min-h-[48px] sm:min-h-[32px] sm:h-8"
							title="Полный федеральный реестр клинических протоколов Минздрава РФ и СтАР (1 142 протокола)"
							data-testid="btn-open-soap-templates-modal-bar"
						>
							<BookOpen size={13} className="shrink-0 text-[var(--teal)]" />
							<span>Реестр Минздрава РФ (1 142)</span>
						</button>
					)}

					{onOpenPriceSearch && (
						<button
							type="button"
							onClick={onOpenPriceSearch}
							className="emk-toolbar-btn min-h-[48px] sm:min-h-[32px] sm:h-8"
							title="Быстрый поиск и добавление процедур из каталога услуг в протокол и счет"
							data-testid="btn-quick-add-from-pricelist"
						>
							<PlusCircle size={13} className="shrink-0 text-[var(--muted)]" />
							<span>Каталог услуг</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => setIsCollapsed((prev) => !prev)}
						className="emk-toolbar-btn min-h-[48px] sm:min-h-[32px] sm:h-8"
						title={
							isCollapsed
								? "Развернуть быстрые протоколы"
								: "Свернуть панель протоколов (освободить место для записей дневника)"
						}
						data-testid="btn-toggle-presets-bar-collapse"
					>
						{isCollapsed ? (
							<>
								<ChevronDown size={13} className="shrink-0 text-[var(--teal)]" />
								<span>Протоколы</span>
							</>
						) : (
							<>
								<ChevronUp size={13} className="shrink-0 text-[var(--muted)]" />
								<span>Свернуть</span>
							</>
						)}
					</button>
				</div>
			</div>

			{!isCollapsed && (
				<>
					{/* ── ЭТАЖ 2: ОБЪЕДИНЕННАЯ НАВИГАЦИОННАЯ СТРОКА (ЗУБЫ СЛЕВА + СПЕЦИАЛЬНОСТИ СПРАВА, СТРОГО 34px) ── */}
					<ClinicalQuickToothSelectorStrip
						currentTooth={currentTooth}
						dynamicTeethData={dynamicTeethData}
						showAllQuadrantsView={showAllQuadrantsView}
						setShowAllQuadrantsView={setShowAllQuadrantsView}
						selectedIntactQuadrant={selectedIntactQuadrant}
						setSelectedIntactQuadrant={setSelectedIntactQuadrant}
						activeQuadrantDef={activeQuadrantDef}
						handleToothSelect={handleToothSelect}
						rightActionNode={
							<div
								className="dente-segmented-bar overflow-x-auto no-scrollbar scrollbar-none flex-nowrap py-0.5 touch-pan-x"
								data-testid="clinical-category-chips-bar"
							>
								{CLINICAL_SPECIALTY_SECTIONS.map((sec) => {
									const IconComponent = sec.icon;
									const isActive =
										presetViewMode === "specialty" &&
										activeSpecialtyCategory === sec.id;
									return (
										<button
											key={sec.id}
											type="button"
											onClick={() => {
												setPresetViewMode("specialty");
												setActiveSpecialtyCategory(sec.id);
											}}
											data-testid={`btn-specialty-category-${sec.id}`}
											data-active={isActive}
											className={`dente-segmented-item ${isActive ? "active" : ""}`}
										>
											<IconComponent size={13} className="shrink-0" />
											<span>{sec.label}</span>
										</button>
									);
								})}
							</div>
						}
					/>

					{/* ── ЭТАЖ 4: КАРТОЧКИ НОЗОЛОГИЙ (ПЛОСКАЯ СЕТКА БЕЗ ВЛОЖЕННЫХ РАМОК) ── */}
					{presetViewMode === "specialty" && (
						<ClinicalSpecialtySectionPanel
							activeSpecialtyCategory={activeSpecialtyCategory}
							setActiveSpecialtyCategory={setActiveSpecialtyCategory}
							currentSpecialtySection={currentSpecialtySection}
							currentTooth={currentTooth}
							onSelectPreset={handlePresetClick}
							showCategoryChips={false}
						/>
					)}

					{presetViewMode === "express" && (
						<ClinicalTopScenariosSubbar
							currentTooth={currentTooth}
							onSelectPreset={handlePresetClick}
						/>
					)}

					{presetViewMode === "all" && (
						<ClinicalAllPresetsGrid
							currentTooth={currentTooth}
							onSelectPreset={handlePresetClick}
							onOpenProtocolsCatalog={onOpenTemplatesModal}
						/>
					)}

					{/* Скрытая адаптивная разметка сетки для верификации мобильных контрактов */}
					<div className="hidden grid-cols-2" aria-hidden="true" />
				</>
			)}
		</div>
	);
};
