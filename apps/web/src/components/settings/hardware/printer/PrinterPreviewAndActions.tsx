import React from "react";
import { Eye, Printer } from "lucide-react";
import type { LabelPresetType } from "./printerTypes.js";
import { PrinterLabelPreviewBox } from "./PrinterLabelPreviewBox.js";

interface Props {
	activePreset: LabelPresetType;
	labelSize: string;
	autoclaveName: string;
	sterilizationMode: string;
	cycleNumber: string;
	responsibleStaff: string;
	validityDays: number;
	expirationDate: Date;
	patientName: string;
	tubeVolume: string;
	clinicRoom: string;
	now: Date;
	isPrinting: boolean;
	onPrintLabel: () => void;
}

export const PrinterPreviewAndActions: React.FC<Props> = (props) => {
	const { activePreset, labelSize, isPrinting, onPrintLabel } = props;
	const isSanpin = activePreset === "kraft_sanpin";

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: "16px",
				alignItems: "flex-start",
				padding: "14px",
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
			}}
		>
			<div style={{ flex: 1, minWidth: "260px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>
					<Eye size={13} />
					<span>Макет этикетки ({labelSize} мм):</span>
				</div>
				<PrinterLabelPreviewBox {...props} />
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "8px", alignSelf: "center" }}>
				<button
					type="button"
					className="hw-btn-compact primary"
					onClick={onPrintLabel}
					data-testid="label-btn-print"
					style={{ height: "34px", padding: "0 14px", fontSize: "13px" }}
				>
					<Printer size={15} className={isPrinting ? "animate-spin" : ""} />
					<span>{isSanpin ? "Печать тестовой этикетки крафт-пакета" : "Печать этикетки пробирки PRP"}</span>
				</button>
				<div style={{ fontSize: "11px", color: "var(--muted)", maxWidth: "260px" }}>
					Соответствует стандартам стерилизации для стоматологических ЦСО.
				</div>
			</div>
		</div>
	);
};
