import type React from "react";
import { createPortal } from "react-dom";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { ToothActionMenuCaret } from "./ToothActionMenuCaret";
import { ToothActionSecondaryButtons } from "./ToothActionSecondaryButtons";
import { ToothActionStatusGrid } from "./ToothActionStatusGrid";
import { ToothActionSurfacesAccordion } from "./ToothActionSurfacesAccordion";
import type { ToothActionMenuPortalProps } from "./toothActionMenuTypes";

export const ToothActionDesktopMenu: React.FC<ToothActionMenuPortalProps> = ({
	menuConfig,
	onClose,
	selectedTeeth,
	activeSurfaces,
	setActiveSurfaces,
	onApplyToothState,
	onOpenContextDrawer,
	onOpenHistory,
	onOpenEndo,
	onOneClickLabOrder,
	teethData,
}) => {
	if (!menuConfig || typeof document === "undefined") return null;

	const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
	const vh = typeof window !== "undefined" ? window.innerHeight : 900;
	const clampedX = Math.max(12, Math.min(vw - 282, menuConfig.x));
	const clampedY = Math.max(12, Math.min(vh - 412, menuConfig.y));
	const safeCaretOffset = Math.max(12, Math.min(88, menuConfig.caretOffset));

	return createPortal(
		<>
			<button
				type="button"
				style={{
					position: "fixed",
					inset: 0,
					zIndex: 99998,
					background: "transparent",
					border: "none",
					cursor: "default",
				}}
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
						e.preventDefault();
						onClose();
					}
				}}
			/>
			<div
				role="menu"
				className="tooth-radial-menu animate-in fade-in zoom-in-95 duration-150"
				style={{
					position: "fixed",
					left: clampedX,
					top: clampedY,
					zIndex: 99999,
				}}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						e.preventDefault();
						onClose();
					}
				}}
			>
				<ToothActionMenuCaret
					position={menuConfig.position}
					safeCaretOffset={safeCaretOffset}
				/>

				<div className="col-span-2 text-center mb-2">
					<div className="text-sm font-black text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-100">
						{selectedTeeth.length > 1
							? `Выбрано: ${selectedTeeth.length} зубов`
							: `Зуб #${menuConfig.toothNumber}`}
					</div>
					{selectedTeeth.length === 1 && (
						<div className="text-xs font-semibold text-[var(--odontogram-ink-muted,#64748b)]">
							{getToothFolkAndAnatomicalNameRu(menuConfig.toothNumber)}
						</div>
					)}
				</div>

				<ToothActionStatusGrid onApplyToothState={onApplyToothState} />
				<ToothActionSurfacesAccordion
					activeSurfaces={activeSurfaces}
					setActiveSurfaces={setActiveSurfaces}
				/>
				<ToothActionSecondaryButtons
					toothNumber={menuConfig.toothNumber}
					selectedTeeth={selectedTeeth}
					activeSurfaces={activeSurfaces}
					teethData={teethData}
					onClose={onClose}
					onOpenContextDrawer={onOpenContextDrawer}
					onOpenHistory={onOpenHistory}
					onOpenEndo={onOpenEndo}
					onOneClickLabOrder={onOneClickLabOrder}
				/>
			</div>
		</>,
		document.body,
	);
};
