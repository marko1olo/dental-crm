import React from "react";
import type { ToothStatus } from "../store/patientStore";
import { UPPER_TEETH, LOWER_TEETH } from "./odontogram/OdontogramConstants";
import { useOdontogramLogic } from "./odontogram/useOdontogramLogic";
import { OdontogramToolbar } from "./odontogram/OdontogramToolbar";
import { OdontogramToothItem } from "./odontogram/OdontogramToothItem";

export function Odontogram() {
	const {
		odontogramState,
		selectedPatientId,
		setToothStatus,
		saveToothStatus,
		hoveredTooth,
		setHoveredTooth,
		radialMenuOpen,
		setRadialMenuOpen,
		multiSelectMode,
		setMultiSelectMode,
		selectedTeeth,
		setSelectedTeeth,
		bulkMenuOpen,
		setBulkMenuOpen,
		handleToothClick,
		applyBulkStatus,
	} = useOdontogramLogic();

	const renderTooth = (tooth: number) => {
		const status = (odontogramState[tooth] || "Healthy") as ToothStatus;
		const isHovered = hoveredTooth === tooth;
		const isSelected = selectedTeeth.has(tooth);

		return (
			<OdontogramToothItem
				key={tooth}
				tooth={tooth}
				status={status}
				isHovered={isHovered}
				isSelected={isSelected}
				multiSelectMode={multiSelectMode}
				radialMenuOpen={radialMenuOpen}
				setHoveredTooth={setHoveredTooth}
				handleToothClick={handleToothClick}
				setRadialMenuOpen={setRadialMenuOpen}
				selectedPatientId={selectedPatientId}
				saveToothStatus={saveToothStatus}
				setToothStatus={setToothStatus}
			/>
		);
	};

	return (
		<div
			className="odontogram-card"
			style={{
				background: "var(--paper)",
				borderRadius: "16px",
				padding: "28px 20px",
				border: "1px solid var(--odontogram-border, var(--line))",
				boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
				display: "flex",
				flexDirection: "column",
				gap: "32px",
				width: "100%",
				overflowX: "auto",
				marginBottom: "16px",
			}}
		>
			<OdontogramToolbar
				multiSelectMode={multiSelectMode}
				setMultiSelectMode={setMultiSelectMode}
				selectedTeeth={selectedTeeth}
				setSelectedTeeth={setSelectedTeeth}
				bulkMenuOpen={bulkMenuOpen}
				setBulkMenuOpen={setBulkMenuOpen}
				setRadialMenuOpen={setRadialMenuOpen}
				applyBulkStatus={applyBulkStatus}
			/>

			{/* Dental Grid */}
			<div style={{ width: "100%", overflowX: "auto", paddingBottom: "12px" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "10px",
						minWidth: "max-content",
						padding: "0 12px",
					}}
				>
					{/* Upper arch */}
					<div
						style={{
							display: "flex",
							gap: "2px",
							justifyContent: "center",
							position: "relative",
							paddingBottom: "10px",
							borderBottom: "3px solid var(--line)",
						}}
					>
						<div
							style={{
								position: "absolute",
								left: "50%",
								top: "0",
								bottom: "-10px",
								width: "3px",
								background: "var(--line)",
								zIndex: 0,
							}}
						/>
						<div style={{ display: "flex", gap: "2px", paddingRight: "6px" }}>
							{UPPER_TEETH.slice(0, 8).map(renderTooth)}
						</div>
						<div style={{ display: "flex", gap: "2px", paddingLeft: "6px" }}>
							{UPPER_TEETH.slice(8, 16).map(renderTooth)}
						</div>
					</div>

					{/* Lower arch */}
					<div
						style={{
							display: "flex",
							gap: "2px",
							justifyContent: "center",
							position: "relative",
							paddingTop: "10px",
						}}
					>
						<div
							style={{
								position: "absolute",
								left: "50%",
								top: "-10px",
								bottom: "0",
								width: "3px",
								background: "var(--line)",
								zIndex: 0,
							}}
						/>
						<div style={{ display: "flex", gap: "2px", paddingRight: "6px" }}>
							{LOWER_TEETH.slice(0, 8).map(renderTooth)}
						</div>
						<div style={{ display: "flex", gap: "2px", paddingLeft: "6px" }}>
							{LOWER_TEETH.slice(8, 16).map(renderTooth)}
						</div>
					</div>
				</div>
			</div>

			{/* Hints */}
			<div className="odontogram-hints">
				<span>
					<kbd>Shift</kbd> + Клик — групповой выбор
				</span>
				<span className="hint-divider">|</span>
				<span>Кнопка «Групповой выбор» — режим мультивыбора</span>
			</div>

			<style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
		</div>
	);
}
