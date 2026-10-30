/**
 * DENTE Dental CRM — OdontogramQuickBar (Consolidated Ergonomic Toolbar SSOT)
 *
 * Mandate 8b / 8zi Sweet Spot: ~200-300 lines.
 * Single console <= 40px height with 2 functional islands:
 * - Island 1 (Left): View Mode Radios (Анатомическая / ГОСТ / Детская) + Dentition Switcher (Взрослый / Детский / Сменный)
 * - Island 2 (Right): Single Primary CTA «✓ Санирован» (#0d9488, 1-click Mandate 8e) + QuickActions & MoreMenu Dropdowns
 */

import { ChevronDown, Layers, ShieldCheck, SlidersHorizontal } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { TOOTH_STATE_LABELS } from "./chart/toothChartTypes";
import { MoreMenuClinicalModules } from "./MoreMenuClinicalModules";
import { MoreMenuDisplayModes } from "./MoreMenuDisplayModes";
import type { OdontogramToolbarProps } from "./odontogramToolbarTypes";
import { ODONTOGRAM_VIEW_MODES } from "./OdontogramViewTypes";
import { QuickActionsBatchOps } from "./QuickActionsBatchOps";
import { QuickActionsJaws } from "./QuickActionsJaws";
import { QuickActionsQuadrants } from "./QuickActionsQuadrants";
import { useQuickActionsHandlers } from "./useQuickActionsHandlers";
import "./OdontogramToolbar.css";

export interface OdontogramQuickBarProps extends OdontogramToolbarProps {
	readonly hideModeSwitcher?: boolean | undefined;
}

export const OdontogramQuickBar: React.FC<OdontogramQuickBarProps> = React.memo(
	(props) => {
		if (props.hideModeSwitcher) {
			return null;
		}

		const moreMenuRef = useRef<HTMLDivElement>(null);
		const currentDentition =
			props.dentitionMode ?? (props.pediatricMode ? "pediatric" : "adult");

		// Click outside listener for "More..." menu
		useEffect(() => {
			const handleClickOutside = (e: MouseEvent) => {
				if (
					moreMenuRef.current &&
					!moreMenuRef.current.contains(e.target as Node)
				) {
					props.setIsMoreMenuOpen(false);
				}
			};
			if (props.isMoreMenuOpen) {
				document.addEventListener("mousedown", handleClickOutside);
			}
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}, [props.isMoreMenuOpen, props.setIsMoreMenuOpen]);

		const allDentitionTeeth = props.isPediatricEffective
			? [
					...props.PEDIATRIC_Q5,
					...props.PEDIATRIC_Q6,
					...props.PEDIATRIC_Q7,
					...props.PEDIATRIC_Q8,
				]
			: [
					...props.ADULT_Q1,
					...props.ADULT_Q2,
					...props.ADULT_Q3,
					...props.ADULT_Q4,
				];

		const handlers = useQuickActionsHandlers({
			allDentitionTeeth,
			activeStampTool: props.activeStampTool,
			selectedTeeth: props.selectedTeeth,
			onQuickStateChange: props.onQuickStateChange,
			handleMarkIntactDentition: props.handleMarkIntactDentition,
			handleMarkWisdomTeethMissing: props.handleMarkWisdomTeethMissing,
			handleBatchSelectGroup: props.handleBatchSelectGroup,
			onInvertSelection: props.onInvertSelection,
			onClearSelection: props.onClearSelection,
		});

		const stampHint = props.activeStampTool
			? ` (Штамп «${TOOTH_STATE_LABELS[props.activeStampTool] || props.activeStampTool}» окрасит всю группу)`
			: "";

		const isMoreActiveIndicator =
			props.isFastExtractMode ||
			props.isMultiSelectMode ||
			props.isPerioOpen ||
			props.isOrthoCephOpen;

		return (
			<div
				className="odontogram-toolbar select-none"
				role="toolbar"
				aria-label="Панель управления зубной формулой"
			>
				{/* Island 1: View Modes & Dentition */}
				<div className="odontogram-toolbar__island odontogram-toolbar__island--left">
					<div className="odontogram-toolbar__segmented">
						{ODONTOGRAM_VIEW_MODES.map((option) => {
							const isActive = props.activeMode === option.mode;
							return (
								<button
									key={option.mode}
									type="button"
									aria-pressed={isActive}
									title={option.tooltip}
									data-testid={`odontogram-mode-btn-${option.mode}`}
									onClick={() => props.handleModeSwitch(option.mode)}
									className={`odontogram-toolbar__segment-btn ${isActive ? "odontogram-toolbar__segment-btn--active" : ""}`}
								>
									{option.icon}
									<span>{option.compactLabel || option.shortLabel}</span>
								</button>
							);
						})}
					</div>

					{props.onDentitionModeChange && (
						<div className="odontogram-toolbar__segmented">
							<button
								type="button"
								onClick={() => props.onDentitionModeChange?.("adult")}
								className={`odontogram-toolbar__segment-btn ${currentDentition === "adult" ? "odontogram-toolbar__segment-btn--teal-active" : ""}`}
								title="Постоянный прикус взрослых (11–48, 32 зуба)"
								data-testid="toolbar-dentition-adult"
								aria-pressed={currentDentition === "adult"}
							>
								<span>Взрослый</span>
							</button>
							<button
								type="button"
								onClick={() => props.onDentitionModeChange?.("pediatric")}
								className={`odontogram-toolbar__segment-btn ${currentDentition === "pediatric" ? "odontogram-toolbar__segment-btn--teal-active" : ""}`}
								title="Детский молочный прикус (51–85, 20 зубов)"
								data-testid="toolbar-dentition-pediatric"
								aria-pressed={currentDentition === "pediatric"}
							>
								<span>Детский</span>
							</button>
							<button
								type="button"
								onClick={() => props.onDentitionModeChange?.("mixed")}
								className={`odontogram-toolbar__segment-btn ${currentDentition === "mixed" ? "odontogram-toolbar__segment-btn--teal-active" : ""}`}
								title="Сменный прикус"
								data-testid="toolbar-dentition-mixed"
								aria-pressed={currentDentition === "mixed"}
							>
								<span>Сменный</span>
							</button>
						</div>
					)}
				</div>

				{/* Island 2: 1-Click Sanitation + QuickActions Dropdown + MoreMenu */}
				<div className="odontogram-toolbar__island odontogram-toolbar__island--right">
					{/* Mandate 8e: 1-click physiological norm. Strictly the ONLY Primary CTA button (#0d9488) */}
					{props.onQuickStateChange && (
						<button
							type="button"
							onClick={props.handleMarkIntactDentition}
							className="odontogram-toolbar__btn odontogram-toolbar__btn--primary-cta"
							title="Физиологическая норма: вся зубная формула отмечается здоровой (1 клик, Мандат 8e)"
							data-testid="mark-intact-dentition-btn"
						>
							<ShieldCheck size={14} className="text-white shrink-0" />
							<span>✓ Норма в 1 клик</span>
						</button>
					)}

					{/* Quick Actions Dropdown */}
					<details className="relative shrink-0">
						<summary
							className="list-none odontogram-tools-trigger-btn"
							title="Выделение квадрантов, челюстей, инверсия и санация"
							data-testid="odontogram-quick-actions-menu"
						>
							<Layers size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
							<span className="hidden sm:inline font-bold">Выделение</span>
							<ChevronDown size={13} className="shrink-0 text-[var(--muted,#64748b)]" />
						</summary>
						<div className="absolute right-0 top-full mt-1.5 z-40 w-72 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2">
							{props.onQuickStateChange && (
								<QuickActionsBatchOps
									pediatricMode={props.pediatricMode}
									onSanitizeAll={handlers.handleSanitizeAll}
									onWisdomMissing={handlers.handleWisdomMissing}
									onInvert={handlers.handleInvert}
									onClear={handlers.handleClear}
								/>
							)}
							<QuickActionsQuadrants
								isPediatricEffective={props.isPediatricEffective}
								activeStampTool={props.activeStampTool}
								stampHint={stampHint}
								onGroupAction={handlers.handleGroupAction}
								ADULT_Q1={props.ADULT_Q1}
								ADULT_Q2={props.ADULT_Q2}
								ADULT_Q3={props.ADULT_Q3}
								ADULT_Q4={props.ADULT_Q4}
								ADULT_FRONT={props.ADULT_FRONT}
								PEDIATRIC_Q5={props.PEDIATRIC_Q5}
								PEDIATRIC_Q6={props.PEDIATRIC_Q6}
								PEDIATRIC_Q7={props.PEDIATRIC_Q7}
								PEDIATRIC_Q8={props.PEDIATRIC_Q8}
								PEDIATRIC_FRONT={props.PEDIATRIC_FRONT}
							/>
							<QuickActionsJaws onSelectJaw={props.setActiveJawModalTarget} />
						</div>
					</details>

					{/* More Menu Dropdown */}
					<div className="relative shrink-0" ref={moreMenuRef}>
						<button
							type="button"
							onClick={() => props.setIsMoreMenuOpen((prev) => !prev)}
							className={`odontogram-tools-trigger-btn ${
								props.isMoreMenuOpen || isMoreActiveIndicator
									? "odontogram-tools-trigger-btn--active"
									: ""
							}`}
							title="Дополнительные инструменты, модули анализа и настройки"
							data-testid="btn-odontogram-more-menu"
							aria-expanded={props.isMoreMenuOpen}
							aria-haspopup="true"
						>
							<SlidersHorizontal
								size={14}
								className={`shrink-0 ${props.isMoreMenuOpen ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`}
							/>
							<span className="font-bold">Инструменты</span>
							<ChevronDown
								size={13}
								className={`shrink-0 transition-transform duration-200 ${props.isMoreMenuOpen ? "rotate-180 text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"}`}
							/>
							{isMoreActiveIndicator && (
								<span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0 ml-0.5" />
							)}
						</button>

						{props.isMoreMenuOpen && (
							<div
								className="absolute right-0 top-full mt-1.5 z-50 w-80 sm:w-84 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2 max-h-[82vh] overflow-y-auto"
								role="menu"
								aria-label="Дополнительные инструменты"
							>
								<MoreMenuClinicalModules
									{...props}
									onCloseMenu={() => props.setIsMoreMenuOpen(false)}
								/>
								<div className="h-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800" />
								<MoreMenuDisplayModes
									showWisdomTeeth={props.showWisdomTeeth}
									setShowWisdomTeeth={props.setShowWisdomTeeth}
									activeMode={props.activeMode}
									showPulpAndCanals={props.showPulpAndCanals}
									setShowPulpAndCanals={props.setShowPulpAndCanals}
									isFastExtractMode={props.isFastExtractMode}
									setIsFastExtractMode={props.setIsFastExtractMode}
									isMultiSelectMode={props.isMultiSelectMode}
									onToggleMultiSelect={props.onToggleMultiSelect}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	},
);
OdontogramQuickBar.displayName = "OdontogramQuickBar";
