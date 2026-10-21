/**
 * DENTE Dental CRM — Odontogram Toolbar "More..." (Ещё) Dropdown Menu
 * Clinical modules triggers (Perio, Ceph TRG, Diagnocat, A4 Print) and display preferences.
 */

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { MoreMenuClinicalModules } from "./MoreMenuClinicalModules";
import { MoreMenuDisplayModes } from "./MoreMenuDisplayModes";
import type { OdontogramToolbarMoreMenuProps } from "./OdontogramToolbarMoreMenuTypes.js";

export type { OdontogramToolbarMoreMenuProps };

export const OdontogramToolbarMoreMenu: React.FC<OdontogramToolbarMoreMenuProps> =
	React.memo((props) => {
		const moreMenuRef = useRef<HTMLDivElement>(null);

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

		const isActiveIndicator =
			props.isFastExtractMode ||
			props.isMultiSelectMode ||
			props.isPerioOpen ||
			props.isOrthoCephOpen;

		return (
			<div className="relative shrink-0" ref={moreMenuRef}>
				<button
					type="button"
					onClick={() => props.setIsMoreMenuOpen((prev) => !prev)}
					className={`odontogram-tools-trigger-btn ${
						props.isMoreMenuOpen || isActiveIndicator
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
					{isActiveIndicator && (
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
		);
	});
OdontogramToolbarMoreMenu.displayName = "OdontogramToolbarMoreMenu";
