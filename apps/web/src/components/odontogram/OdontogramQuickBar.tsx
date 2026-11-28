/**
 * DENTE Dental CRM — OdontogramQuickBar (Consolidated Ergonomic Toolbar SSOT)
 *
 * Mandate 8b / 8zi Sweet Spot: ~200-300 lines.
 * Single console <= 40px height with 2 functional islands:
 * - Island 1 (Left): View Mode Radios (Анатомическая / ГОСТ / Детская) + Dentition Switcher (Взрослый / Детский / Сменный)
 * - Island 2 (Right): Single Primary CTA «✓ Санирован» (#0d9488, 1-click Mandate 8e) + QuickActions & MoreMenu Dropdowns
 */

import { Receipt, ShieldCheck } from "lucide-react";
import React from "react";
import { OdontogramToolbarMoreMenu } from "./OdontogramToolbarMoreMenu";
import type { OdontogramToolbarProps } from "./odontogramToolbarTypes";
import { ODONTOGRAM_VIEW_MODES } from "./OdontogramViewTypes";
import { OdontogramToolbarQuickActions } from "./OdontogramToolbarQuickActions";
import "./OdontogramToolbar.css";

export interface OdontogramQuickBarProps extends OdontogramToolbarProps {
	readonly hideModeSwitcher?: boolean | undefined;
}

export const OdontogramQuickBar: React.FC<OdontogramQuickBarProps> = React.memo(
	(props) => {
		if (props.hideModeSwitcher) {
			return null;
		}

		const currentDentition =
			props.dentitionMode ?? (props.pediatricMode ? "pediatric" : "adult");

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
					{/* Mandate 8e: 1-click physiological norm (Secondary inside Odontogram to keep 1 Primary CTA in VisitViewHeader) */}
					{props.onQuickStateChange && (
						<button
							type="button"
							onClick={props.handleMarkIntactDentition}
							className="odontogram-toolbar__btn"
							title="Физиологическая норма: вся зубная формула отмечается интактной"
							data-testid="mark-intact-dentition-btn"
						>
							<ShieldCheck size={14} className="text-[var(--ink-muted)] shrink-0" />
							<span>Физиологическая норма</span>
						</button>
					)}

					{/* Live Invoice / Estimate toggle */}
					<button
						type="button"
						onClick={() => props.setIsLiveInvoiceOpen((prev) => !prev)}
						className={`odontogram-tools-trigger-btn ${
							props.isLiveInvoiceOpen
								? "odontogram-tools-trigger-btn--active"
								: ""
						}`}
						title="Смета приёма и расчёт услуг"
						data-testid="toolbar-live-invoice-btn"
						aria-pressed={props.isLiveInvoiceOpen}
					>
						<Receipt size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
						<span className="hidden sm:inline font-bold">Смета</span>
						{props.liveGrossTotalRub !== undefined && props.liveGrossTotalRub > 0 && (
							<span className="font-mono text-xs px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
								{props.liveGrossTotalRub.toLocaleString("ru-RU")} ₽
							</span>
						)}
					</button>

					{/* Quick Actions Dropdown */}
					<OdontogramToolbarQuickActions
						isPediatricEffective={props.isPediatricEffective}
						pediatricMode={props.pediatricMode}
						activeStampTool={props.activeStampTool}
						selectedTeeth={props.selectedTeeth}
						onQuickStateChange={props.onQuickStateChange}
						handleMarkIntactDentition={props.handleMarkIntactDentition}
						handleMarkWisdomTeethMissing={props.handleMarkWisdomTeethMissing}
						handleMarkFrontalHygiene={props.handleMarkFrontalHygiene}
						handleBatchSelectGroup={props.handleBatchSelectGroup}
						onInvertSelection={props.onInvertSelection}
						onClearSelection={props.onClearSelection}
						setActiveJawModalTarget={props.setActiveJawModalTarget}
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

					<OdontogramToolbarMoreMenu {...props} />
				</div>
			</div>
		);
	},
);
OdontogramQuickBar.displayName = "OdontogramQuickBar";
