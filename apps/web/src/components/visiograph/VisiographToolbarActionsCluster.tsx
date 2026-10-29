/**
 * VisiographToolbarActionsCluster.tsx
 * Actions cluster: external 3D viewer, quick billing, secondary dropdown, Dominant Emerald CTA, close button.
 * Strict Mandate 8am: Exactly ONE Primary CTA button (#0d9488) per visible context.
 */

import { Box, Check, CreditCard, Sliders, X } from "lucide-react";
import React, { useState } from "react";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";
import { VisiographToolbarSecondaryMenu } from "./VisiographToolbarSecondaryMenu";

export interface VisiographToolbarActionsClusterProps {
	isLaunchingExternal: boolean;
	handleOpenRomexisEz3d: () => Promise<void>;
	isToolsMenuOpen: boolean;
	setIsToolsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setActiveTool: (tool: ActiveVisiographToolType) => void;
	onClearDrawing: () => void;
	onPrintProtocol: () => void;
	onOpenExportModal: () => void;
	onResetAll: () => void;
	isAttached: boolean;
	handleAttachClick: () => void;
	toothCode?: string | null | undefined;
	onClose?: (() => void) | undefined;
}

export function VisiographToolbarActionsCluster({
	isLaunchingExternal,
	handleOpenRomexisEz3d,
	isToolsMenuOpen,
	setIsToolsMenuOpen,
	setActiveTool,
	onClearDrawing,
	onPrintProtocol,
	onOpenExportModal,
	onResetAll,
	isAttached,
	handleAttachClick,
	toothCode = "16",
	onClose,
}: VisiographToolbarActionsClusterProps) {
	const [isBilled, setIsBilled] = useState(false);

	const handleQuickBill = () => {
		setIsBilled(true);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:add-service-to-cashbox", {
					detail: {
						title: `Прицельный снимок визиографа (зуб ${toothCode || "16"})`,
						amountRub: 450,
						amountKopecks: 45000,
						tooth: toothCode || "16",
						modality: "rvg",
					},
				}),
			);
		}
	};

	return (
		<div className="visiograph-toolbar-cluster">
			{/* Вторичная кнопка 1-клик добавления в кассу 54-ФЗ */}
			<button
				type="button"
				className="secondary-button"
				data-testid="btn-visiograph-quick-bill"
				onClick={handleQuickBill}
				title="Добавить услугу прицельного снимка (450 ₽) в кассовый чек приёма"
			>
				<CreditCard size={13} aria-hidden="true" />
				<span>{isBilled ? "✓ В чеке" : "+ В чек (450 ₽)"}</span>
			</button>

			<button
				type="button"
				className="secondary-button"
				data-testid="btn-open-romexis-ez3d"
				onClick={handleOpenRomexisEz3d}
				title="Открыть 3D исследование в нативном томографе (Romexis / Ez3D-i)"
			>
				<Box size={13} aria-hidden="true" />
				<span>Romexis / Ez3D</span>
			</button>

			<div style={{ position: "relative" }}>
				<button
					type="button"
					className="secondary-button"
					data-testid="btn-tools-dropdown"
					onClick={() => setIsToolsMenuOpen((prev) => !prev)}
					title="Дополнительные инструменты анализа"
				>
					<Sliders size={13} />
					<span>Ещё ▾</span>
				</button>

				{isToolsMenuOpen && (
					<VisiographToolbarSecondaryMenu
						onCloseMenu={() => setIsToolsMenuOpen(false)}
						setActiveTool={setActiveTool}
						onClearDrawing={onClearDrawing}
						onPrintProtocol={onPrintProtocol}
						onOpenExportModal={onOpenExportModal}
						onResetAll={onResetAll}
					/>
				)}
			</div>

			{/* Ровно ОДНА Primary CTA кнопка цвета var(--teal, #0d9488) */}
			<button
				type="button"
				className={`primary-button ${isAttached ? "is-attached" : ""}`}
				data-testid="btn-attach-to-visit"
				onClick={handleAttachClick}
				title="Сохранить снимок с измерениями в карту пациента (Прикрепить к визиту)"
			>
				<Check size={14} strokeWidth={2.5} />
				<span>{isAttached ? "В приёме (в карте)" : "Сохранить в карту пациента"}</span>
			</button>

			{onClose && (
				<button type="button" className="icon-button" onClick={onClose} title="Закрыть студию" aria-label="Закрыть">
					<X size={15} />
				</button>
			)}
		</div>
	);
}
