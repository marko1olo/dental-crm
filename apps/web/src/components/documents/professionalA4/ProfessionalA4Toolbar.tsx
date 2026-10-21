import type React from "react";
import { Printer } from "lucide-react";
import { ProfessionalA4Tabs } from "./ProfessionalA4Tabs";
import type { A4ZoomMode, ProfessionalA4DocumentTab } from "./types";

export interface ProfessionalA4ToolbarProps {
	activeTab: ProfessionalA4DocumentTab;
	onTabChange?: ((tab: ProfessionalA4DocumentTab) => void) | undefined;
	zoom: A4ZoomMode;
	setZoom: (zoom: A4ZoomMode) => void;
	handlePrint: () => void;
	isInformedConsentTab: boolean;
}

export const ProfessionalA4Toolbar: React.FC<ProfessionalA4ToolbarProps> = ({
	activeTab,
	onTabChange,
	zoom,
	setZoom,
	handlePrint,
	isInformedConsentTab,
}) => {
	return (
		<div className="pro-a4-toolbar no-print">
			<ProfessionalA4Tabs
				activeTab={activeTab}
				onTabChange={onTabChange}
				isInformedConsentTab={isInformedConsentTab}
			/>

			<div className="pro-a4-toolbar-actions">
				<div
					className="pro-a4-zoom-group"
					role="group"
					aria-label="Масштаб отображения"
				>
					<button
						type="button"
						className={`pro-a4-zoom-btn ${zoom === "80%" ? "active" : ""}`}
						onClick={() => setZoom("80%")}
						data-testid="zoom-80"
						title="Уменьшить масштаб до 80%"
					>
						80%
					</button>
					<button
						type="button"
						className={`pro-a4-zoom-btn ${zoom === "100%" ? "active" : ""}`}
						onClick={() => setZoom("100%")}
						data-testid="zoom-100"
						title="Масштаб 100%"
					>
						100%
					</button>
					<button
						type="button"
						className={`pro-a4-zoom-btn ${zoom === "fit" ? "active" : ""}`}
						onClick={() => setZoom("fit")}
						data-testid="zoom-fit"
						title="Вписать по ширине окна"
					>
						По ширине
					</button>
				</div>

				<span className="pro-a4-format-caption text-[11px] text-[var(--muted)] font-medium hidden lg:inline">
					Формат A4 · 210 × 297 мм · ГОСТ
				</span>

				<button
					type="button"
					className="primary-button pro-a4-print-btn shrink-0"
					onClick={handlePrint}
					data-testid="btn-print-a4-document"
					title="Печать на принтере (Ctrl+P)"
				>
					<Printer size={15} aria-hidden="true" />
					<span>Печать А4</span>
				</button>
			</div>
		</div>
	);
};
