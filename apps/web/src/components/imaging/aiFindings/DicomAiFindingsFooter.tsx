/**
 * DicomAiFindingsFooter.tsx — Нижняя панель подтверждения находок ИИ
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Check, Loader2 } from "lucide-react";

interface Props {
	isApplyingToChart: boolean;
	onApplyFindingsToChart: () => void;
}

export const DicomAiFindingsFooter: React.FC<Props> = ({
	isApplyingToChart,
	onApplyFindingsToChart,
}) => {
	return (
		<div
			style={{
				padding: "14px 16px",
				borderTop: "1px solid #1e293b",
				backgroundColor: "#0f172a",
			}}
		>
			<button
				type="button"
				data-testid="btn-dicom-apply-findings"
				onClick={onApplyFindingsToChart}
				disabled={isApplyingToChart}
				style={{
					width: "100%",
					minHeight: "44px",
					padding: "10px 16px",
					borderRadius: "8px",
					border: "none",
					backgroundColor: isApplyingToChart ? "#334155" : "#0d9488",
					color: "#ffffff",
					fontSize: "13px",
					fontWeight: 700,
					cursor: isApplyingToChart ? "not-allowed" : "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "8px",
					transition: "all 0.2s ease",
				}}
			>
				{isApplyingToChart ? (
					<>
						<Loader2 size={16} className="animate-spin" /> Внесение в формулу...
					</>
				) : (
					<>
						<Check size={16} /> Применить к зубной формуле
					</>
				)}
			</button>
		</div>
	);
};
