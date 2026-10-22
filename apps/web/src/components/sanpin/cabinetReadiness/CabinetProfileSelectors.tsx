import { CABINET_READINESS_PRESETS, type DentalAppointmentType } from "@dental/shared";
import React from "react";

interface CabinetProfileSelectorsProps {
	selectedCabinet: string;
	setSelectedCabinet: (cab: string) => void;
	selectedProfile: DentalAppointmentType;
	setSelectedProfile: (prof: DentalAppointmentType) => void;
	setExposureMinutes: (min: number) => void;
}

export function CabinetProfileSelectors({
	selectedCabinet,
	setSelectedCabinet,
	selectedProfile,
	setSelectedProfile,
	setExposureMinutes,
}: CabinetProfileSelectorsProps) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
				gap: "1rem",
				padding: "0.75rem",
				background: "var(--paper-subtle, #f8fafc)",
				borderRadius: "0.5rem",
				border: "1px solid var(--line, #e2e8f0)",
				marginBottom: "1rem",
			}}
		>
			<div>
				<label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink, #1e293b)", display: "block", marginBottom: "0.3rem" }}>
					Стоматологический кабинет:
				</label>
				<select
					value={selectedCabinet}
					onChange={(e) => setSelectedCabinet(e.target.value)}
					className="sanpin-input"
					style={{ width: "100%", minHeight: "40px", fontSize: "0.85rem" }}
				>
					<option value="Кабинет № 1">Кабинет № 1 (Терапия/Эндодонтия)</option>
					<option value="Кабинет № 2">Кабинет № 2 (Терапия/Ортопедия)</option>
					<option value="Хирургический кабинет">Хирургический кабинет (Операционная)</option>
					<option value="Детский кабинет">Детский кабинет</option>
					<option value="Ортодонтический кабинет">Ортодонтический кабинет</option>
				</select>
			</div>

			<div>
				<label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink, #1e293b)", display: "block", marginBottom: "0.3rem" }}>
					Профиль приёма / Специализация:
				</label>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))", gap: "0.35rem" }}>
					{CABINET_READINESS_PRESETS.map((p) => {
						const isSelected = selectedProfile === p.type;
						return (
							<button
								key={p.type}
								type="button"
								onClick={() => {
									setSelectedProfile(p.type);
									setExposureMinutes(p.minExposureMinutes);
								}}
								style={{
									minHeight: "40px",
									padding: "0.35rem 0.5rem",
									fontSize: "0.8rem",
									fontWeight: isSelected ? 800 : 500,
									background: isSelected ? "rgba(13, 148, 136, 0.12)" : "var(--paper, #ffffff)",
									border: isSelected ? "2px solid var(--teal, #0d9488)" : "1px solid var(--paper-border, #cbd5e1)",
									color: isSelected ? "var(--teal, #0d9488)" : "inherit",
									borderRadius: "0.375rem",
									cursor: "pointer",
									textAlign: "center",
								}}
							>
								{p.shortLabelRu}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
