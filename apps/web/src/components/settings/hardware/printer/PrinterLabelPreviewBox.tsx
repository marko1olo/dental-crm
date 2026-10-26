import React from "react";
import type { LabelPresetType } from "./printerTypes.js";

interface Props {
	activePreset: LabelPresetType;
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
}

export const PrinterLabelPreviewBox: React.FC<Props> = ({
	activePreset,
	autoclaveName,
	sterilizationMode,
	cycleNumber,
	responsibleStaff,
	validityDays,
	expirationDate,
	patientName,
	tubeVolume,
	clinicRoom,
	now,
}) => {
	const isSanpin = activePreset === "kraft_sanpin";

	return (
		<div
			data-testid="label-preview-box"
			style={{
				padding: "10px",
				background: "white",
				color: "black",
				border: "1px dashed var(--line)",
				borderRadius: "4px",
				fontFamily: "monospace",
				fontSize: "11px",
				lineHeight: "1.4",
				maxWidth: "280px",
				boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
			}}
		>
			<div style={{ textAlign: "center", fontWeight: "bold", borderBottom: "1px solid black", paddingBottom: "2px", marginBottom: "4px" }}>
				{isSanpin ? "СТЕРИЛЬНО (СанПиН 3.3686-21)" : "БИОМАТЕРИАЛ PRP"}
			</div>

			{isSanpin ? (
				<>
					<div>Стерилизатор: {autoclaveName}</div>
					<div>Режим: {sterilizationMode}</div>
					<div>Цикл/Партия: №{cycleNumber}</div>
					<div>Дата: {now.toLocaleDateString("ru-RU")} {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
					<div>Годен до: <strong>{expirationDate.toLocaleDateString("ru-RU")}</strong> ({validityDays} сут.)</div>
					<div>Медсестра: {responsibleStaff}</div>
					<div style={{ textAlign: "center", marginTop: "6px", fontWeight: "bold", letterSpacing: "1px" }}>
						*SANPIN-BATCH-{cycleNumber}*
					</div>
				</>
			) : (
				<>
					<div>Пациент: <strong>{patientName}</strong></div>
					<div>Материал: {tubeVolume}</div>
					<div>Кабинет: {clinicRoom}</div>
					<div>Забор: {now.toLocaleDateString("ru-RU")} {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
					<div style={{ textAlign: "center", marginTop: "6px", fontWeight: "bold", letterSpacing: "1px" }}>
						*PRP-TUBE-00142*
					</div>
				</>
			)}
		</div>
	);
};
