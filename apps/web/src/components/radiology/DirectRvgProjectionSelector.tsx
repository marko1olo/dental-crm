import React from "react";
import { Activity, Layers } from "lucide-react";
import { PROJECTION_TYPES, type ProjectionAngleType } from "./directRvgTypes";

export type AnatomicalZone = "incisor" | "premolar" | "molar";
export type PatientCategory = "adult" | "child";

export interface DirectRvgProjectionSelectorProps {
	projectionType: ProjectionAngleType;
	onSelectProjectionType: (projId: ProjectionAngleType, typicalExposureSec?: number) => void;
	patientCategory?: PatientCategory;
	onChangePatientCategory?: (category: PatientCategory) => void;
	anatomicalZone?: AnatomicalZone;
	onChangeAnatomicalZone?: (zone: AnatomicalZone) => void;
	// Backward-compatibility props (no longer used in UI)
	voltageKv?: number;
	onChangeVoltageKv?: (val: number) => void;
	currentMa?: number;
	onChangeCurrentMa?: (val: number) => void;
	exposureSec?: number;
	onChangeExposureSec?: (val: number) => void;
}

const ANATOMICAL_ZONES: Array<{ id: AnatomicalZone; label: string; hint: string }> = [
	{ id: "incisor", label: "Резцы / Клыки", hint: "Фронтальная группа" },
	{ id: "premolar", label: "Премоляры", hint: "Малые коренные" },
	{ id: "molar", label: "Моляры", hint: "Жевательная группа" },
];

export const DirectRvgProjectionSelector: React.FC<DirectRvgProjectionSelectorProps> = ({
	projectionType,
	onSelectProjectionType,
	anatomicalZone = "molar",
	onChangeAnatomicalZone,
}) => {
	return (
		<div className="rvg-dock-section" data-testid="rvg-projection-dock-section">
			<div className="rvg-section-header">
				<span className="rvg-section-header-title">
					<Layers className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
					Анатомическая зона и проекция
				</span>
			</div>

			{/* 1. 1-Click Anatomical Zone Presets (Incisor / Premolar / Molar) */}
			<div className="mb-2">
				<span className="text-[11px] font-semibold text-[var(--muted,#94a3b8)] block mb-1">Анатомическая группа:</span>
				<div className="rvg-zone-presets" data-testid="rvg-anatomical-zone-presets">
					{ANATOMICAL_ZONES.map((zone) => {
						const isActive = anatomicalZone === zone.id;
						return (
							<button
								key={zone.id}
								type="button"
								onClick={() => onChangeAnatomicalZone?.(zone.id)}
								className={`rvg-zone-btn ${isActive ? "active" : ""}`}
								data-testid={`rvg-zone-${zone.id}`}
								title={zone.hint}
							>
								<span className="truncate">{zone.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 2. Clinical Projection Angles (Periapical / Bitewing / Occlusal) */}
			<div className="mb-2.5">
				<span className="text-[11px] font-semibold text-[var(--muted,#94a3b8)] block mb-1">Угол проекции:</span>
				<div className="rvg-projection-chips" data-testid="rvg-projection-chips">
					{PROJECTION_TYPES.map((proj) => {
						const isActive = projectionType === proj.id;
						return (
							<button
								key={proj.id}
								type="button"
								onClick={() => onSelectProjectionType(proj.id, proj.typicalExposureSec)}
								className={`rvg-projection-btn ${isActive ? "active" : ""}`}
								data-testid={`rvg-projection-${proj.id}`}
							>
								<span className="text-xs font-semibold truncate">
									{proj.label}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 3. Sensor Auto-Trigger Telemetry Status Banner (Friction-Killer Law) */}
			<div
				className="flex items-center gap-2 p-2 rounded-lg bg-teal-500/10 border border-teal-500/25 text-teal-700 dark:text-teal-300"
				data-testid="rvg-auto-trigger-status"
			>
				<Activity className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0" />
				<div className="min-w-0 flex-1 flex items-center justify-between">
					<span className="text-xs font-semibold">
						Датчик подключен · Ожидание снимка
					</span>
					<span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-600 dark:text-teal-300 font-mono font-bold">
						АВТОПОДЖИГ
					</span>
				</div>
			</div>
		</div>
	);
};

export default DirectRvgProjectionSelector;
