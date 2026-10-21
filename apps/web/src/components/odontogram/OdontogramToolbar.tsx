/**
 * DENTE Dental CRM — Odontogram Unified Clinical Toolbar
 *
 * Professional 1-level console with 2 functional islands:
 * - Island 1 (Left): View Mode Radios + Dentition Selector
 * - Island 2 (Right): 1-Click Sanitation + QuickActions dropdown + MoreMenu dropdown
 */

import { ShieldCheck } from "lucide-react";
import React from "react";
import { OdontogramToolbarModeSelectors } from "./OdontogramToolbarModeSelectors";
import { OdontogramToolbarMoreMenu } from "./OdontogramToolbarMoreMenu";
import { OdontogramToolbarQuickActions } from "./OdontogramToolbarQuickActions";
import type { OdontogramToolbarProps } from "./odontogramToolbarTypes";
import "./OdontogramToolbar.css";

export type { OdontogramToolbarProps };

export const OdontogramToolbar: React.FC<OdontogramToolbarProps> = React.memo(
	(props) => {
		const currentDentition =
			props.dentitionMode ?? (props.pediatricMode ? "pediatric" : "adult");

		return (
			<div
				className="odontogram-toolbar select-none"
				role="toolbar"
				aria-label="Панель управления зубной формулой"
			>
				<OdontogramToolbarModeSelectors
					activeMode={props.activeMode}
					handleModeSwitch={props.handleModeSwitch}
					onDentitionModeChange={props.onDentitionModeChange}
					currentDentition={currentDentition}
				/>

				<div className="odontogram-toolbar__island odontogram-toolbar__island--right">
					{props.onQuickStateChange && (
						<button
							type="button"
							onClick={props.handleMarkIntactDentition}
							className="odontogram-toolbar__btn odontogram-toolbar__btn--sanitation"
							title="Физиологическая норма: вся зубная формула отмечается здоровой"
							data-testid="mark-intact-dentition-btn"
						>
							<ShieldCheck
								size={14}
								className="text-emerald-600 dark:text-emerald-400 shrink-0"
							/>
							<span>Санирован</span>
						</button>
					)}

					<OdontogramToolbarQuickActions {...props} />
					<OdontogramToolbarMoreMenu {...props} />
				</div>
			</div>
		);
	},
);
OdontogramToolbar.displayName = "OdontogramToolbar";
