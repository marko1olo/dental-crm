import React from "react";
import { CheckCircle2, Printer, Zap } from "lucide-react";
import { ClinicalPackageMoreMenu } from "./ClinicalPackageMoreMenu";

export interface ClinicalPackageFooterProps {
	readonly missingCount: number;
	readonly onBatchCreate: () => void;
	readonly onBatchPrint: () => void;
	readonly onPrintBlank: () => void;
	readonly onClose: () => void;
	readonly isMoreMenuOpen: boolean;
	readonly setIsMoreMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export function ClinicalPackageFooter({
	missingCount,
	onBatchCreate,
	onBatchPrint,
	onPrintBlank,
	onClose,
	isMoreMenuOpen,
	setIsMoreMenuOpen,
}: ClinicalPackageFooterProps): React.JSX.Element {
	return (
		<div className="document-package-modal-footer">
			<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
				{missingCount > 0 ? (
					<button
						type="button"
						className="secondary-button"
						onClick={onBatchCreate}
						data-testid="clinical-batch-create-btn"
						style={{ minHeight: "36px", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600 }}
					>
						<Zap size={15} aria-hidden="true" />
						<span>Сформировать в базе ({missingCount})</span>
					</button>
				) : (
					<span className="inline-flex items-center gap-1.5" style={{ fontSize: "13px", color: "var(--success-fg, #10b981)", fontWeight: 600 }}>
						<CheckCircle2 size={15} aria-hidden="true" />
						Комплект в базе оформлен
					</span>
				)}

				<button
					type="button"
					className="primary-button"
					onClick={onBatchPrint}
					data-testid="clinical-batch-print-btn"
					style={{
						minHeight: "36px",
						backgroundColor: "var(--teal-fill, #0d9488)",
						color: "#ffffff",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						gap: "8px",
						padding: "0.45rem 1rem",
						borderRadius: "8px",
						cursor: "pointer",
						border: "none",
					}}
				>
					<Printer size={16} aria-hidden="true" />
					<span>Печать пакета (3 бланка)</span>
				</button>
			</div>

			<ClinicalPackageMoreMenu
				isMoreMenuOpen={isMoreMenuOpen}
				setIsMoreMenuOpen={setIsMoreMenuOpen}
				onPrintBlank={onPrintBlank}
				onClose={onClose}
			/>
		</div>
	);
}
