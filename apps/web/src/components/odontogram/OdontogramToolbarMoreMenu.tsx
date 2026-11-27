/**
 * DENTE Dental CRM — Odontogram Toolbar "More..." (Ещё) Dropdown Menu
 * Clinical modules triggers (Perio, Ceph TRG, ИИ-ассистент снимков, A4 Print) and display preferences.
 */

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreMenuClinicalModules } from "./MoreMenuClinicalModules";
import { MoreMenuDisplayModes } from "./MoreMenuDisplayModes";
import type { OdontogramToolbarMoreMenuProps } from "./OdontogramToolbarMoreMenuTypes.js";

export type { OdontogramToolbarMoreMenuProps };

export const OdontogramToolbarMoreMenu: React.FC<OdontogramToolbarMoreMenuProps> =
	React.memo((props) => {
		const moreMenuRef = useRef<HTMLDivElement>(null);
		const portalMenuRef = useRef<HTMLDivElement>(null);
		const [menuPosition, setMenuPosition] = useState<{
			top: number;
			right: number;
			maxHeight: number;
		} | null>(null);

		useEffect(() => {
			if (!props.isMoreMenuOpen) {
				setMenuPosition(null);
				return;
			}
			const updatePosition = () => {
				if (typeof window === "undefined" || !moreMenuRef.current) return;
				const rect = moreMenuRef.current.getBoundingClientRect();
				const top = Math.max(8, Math.round(rect.bottom + 6));
				const right = Math.max(8, Math.round(window.innerWidth - rect.right));
				const maxHeight = Math.max(220, Math.round(window.innerHeight - top - 16));
				setMenuPosition({ top, right, maxHeight });
			};
			updatePosition();
			window.addEventListener("resize", updatePosition);
			window.addEventListener("scroll", updatePosition, true);
			return () => {
				window.removeEventListener("resize", updatePosition);
				window.removeEventListener("scroll", updatePosition, true);
			};
		}, [props.isMoreMenuOpen]);

		useEffect(() => {
			const handleClickOutside = (e: MouseEvent) => {
				const target = e.target as Node;
				const insideTrigger = moreMenuRef.current?.contains(target) ?? false;
				const insidePortal = portalMenuRef.current?.contains(target) ?? false;
				if (!insideTrigger && !insidePortal) {
					props.setIsMoreMenuOpen(false);
				}
			};
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					props.setIsMoreMenuOpen(false);
				}
			};
			if (props.isMoreMenuOpen) {
				document.addEventListener("mousedown", handleClickOutside);
				document.addEventListener("keydown", handleKeyDown);
			}
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
				document.removeEventListener("keydown", handleKeyDown);
			};
		}, [props.isMoreMenuOpen, props.setIsMoreMenuOpen]);

		const isActiveIndicator =
			props.isFastExtractMode ||
			props.isMultiSelectMode ||
			props.isPerioOpen ||
			props.isOrthoCephOpen;

		const portalMenuContent = props.isMoreMenuOpen ? (
			<div
				ref={portalMenuRef}
				style={
					menuPosition
						? {
								position: "fixed",
								top: `${menuPosition.top}px`,
								right: `${menuPosition.right}px`,
								maxHeight: `${menuPosition.maxHeight}px`,
							}
						: undefined
				}
				className="fixed z-40 w-80 sm:w-84 max-w-[calc(100vw-16px)] p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] flex flex-col gap-2 max-h-[82vh] overflow-y-auto"
				role="menu"
				aria-label="Дополнительные инструменты"
				data-testid="odontogram-more-menu-popover"
			>
				<MoreMenuClinicalModules
					{...props}
					onCloseMenu={() => props.setIsMoreMenuOpen(false)}
				/>
				<div className="h-[1px] bg-[var(--line,#e2e8f0)]" />
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
		) : null;

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
						className={`shrink-0 ${props.isMoreMenuOpen ? "text-[var(--primary,#0d9488)]" : "text-[var(--ink-muted,#64748b)]"}`}
					/>
					<span className="font-bold">Инструменты</span>
					<ChevronDown
						size={13}
						className={`shrink-0 transition-transform duration-200 ${props.isMoreMenuOpen ? "rotate-180 text-[var(--primary,#0d9488)]" : "text-[var(--ink-muted,#64748b)]"}`}
					/>
					{isActiveIndicator && (
						<span className="w-1.5 h-1.5 rounded-full bg-[var(--primary,#0d9488)] animate-pulse shrink-0 ml-0.5" />
					)}
				</button>

				{portalMenuContent &&
					(typeof document !== "undefined" && document.body
						? createPortal(portalMenuContent, document.body)
						: portalMenuContent)}
			</div>
		);
	});
OdontogramToolbarMoreMenu.displayName = "OdontogramToolbarMoreMenu";
