/**
 * DENTE CRM — EzDent-i Calibrated Vertical 5 mm Scale Ruler
 * Grounded in physical sensor matrix pixel pitch (35.0 µm for EzSensor 1.5, 14.8 µm for Soft HR).
 * Standards: EzDent-i screenshots 22, 24; Mandate 8b (<=800 lines); Clinical measurement accuracy.
 */

import React, { useMemo } from "react";
import {
	calculateScaleRulerHeightPx,
	resolveCalibratedPixelSpacing,
	VATECH_DEVICE_CALIBRATION_PRESETS,
} from "./dentalViewerMath.js";

export interface RadiologyCalibratedScaleRulerProps {
	readonly zoom: number;
	readonly pixelPitchMicrons?: number; // e.g. 35.0 or 14.8
	readonly sensorModelOrDevice?: string; // e.g. "vatech_ezsensor_1_5" or "EzSensor Soft High Resolution"
	readonly targetLengthMm?: number; // default: 5 mm
	readonly position?: "right" | "left";
	readonly className?: string;
	readonly showSensorBadge?: boolean;
}

export const RadiologyCalibratedScaleRuler: React.FC<RadiologyCalibratedScaleRulerProps> = ({
	zoom,
	pixelPitchMicrons,
	sensorModelOrDevice = "vatech_ezsensor",
	targetLengthMm = 5.0,
	position = "right",
	className = "",
	showSensorBadge = true,
}) => {
	// Resolve active pixel pitch in microns
	const effectivePitchMicrons = useMemo(() => {
		if (pixelPitchMicrons && pixelPitchMicrons > 0) {
			return pixelPitchMicrons;
		}
		const resolvedSpacingMm = resolveCalibratedPixelSpacing(sensorModelOrDevice, 0.0350);
		return Number((resolvedSpacingMm * 1000.0).toFixed(1));
	}, [pixelPitchMicrons, sensorModelOrDevice]);

	// Calculate rendered pixel height for 5 mm
	const renderedHeightPx = useMemo(() => {
		return calculateScaleRulerHeightPx(targetLengthMm, effectivePitchMicrons, zoom);
	}, [targetLengthMm, effectivePitchMicrons, zoom]);

	// Generate millimeter subdivisions (0, 1, 2, 3, 4, 5 mm)
	const ticks = useMemo(() => {
		const result: Array<{ mm: number; topPct: number; isMajor: boolean }> = [];
		const totalMm = Math.round(targetLengthMm);
		for (let mm = 0; mm <= totalMm; mm++) {
			result.push({
				mm,
				topPct: (mm / targetLengthMm) * 100,
				isMajor: mm === 0 || mm === totalMm,
			});
		}
		return result;
	}, [targetLengthMm]);

	// Sensor label
	const sensorLabel = useMemo(() => {
		if (effectivePitchMicrons <= 15.0) return "EzSensor HR (14.8 мкм)";
		if (effectivePitchMicrons <= 25.0) return "EzSensor P (20.0 мкм)";
		if (effectivePitchMicrons <= 30.0) return "EzSensor Soft (29.6 мкм)";
		if (effectivePitchMicrons <= 40.0) return "EzSensor 1.5 (35.0 мкм)";
		if (effectivePitchMicrons <= 80.0) return "PaX-i Pano (76.1 мкм)";
		return `${effectivePitchMicrons} мкм`;
	}, [effectivePitchMicrons]);

	// Bound minimum visible height so it doesn't vanish at micro zooms
	const clampedHeightPx = Math.max(24, Math.min(600, renderedHeightPx));

	return (
		<div
			data-testid="calibrated-scale-ruler-5mm"
			style={{
				position: "absolute",
				top: "50%",
				[position]: "14px",
				transform: "translateY(-50%)",
				zIndex: 20,
				pointerEvents: "none",
				userSelect: "none",
			}}
			className={`radiology-calibrated-scale-ruler flex flex-col items-end gap-1 ${className}`}
		>
			{/* Sensor Calibration Pill Badge */}
			{showSensorBadge && (
				<div
					data-testid="calibrated-sensor-badge"
					style={{
						backgroundColor: "rgba(2, 6, 23, 0.85)",
						border: "1px solid rgba(51, 65, 85, 0.8)",
						boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
					}}
					className="px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-300 tracking-wide mb-1 whitespace-nowrap"
				>
					{sensorLabel}
				</div>
			)}

			{/* The Vertical Scale Ruler Ladder */}
			<div className="relative flex items-center">
				{/* 5 mm Text Label */}
				<div
					style={{
						position: "absolute",
						right: "20px",
						top: "50%",
						transform: "translateY(-50%)",
						backgroundColor: "rgba(2, 6, 23, 0.9)",
						border: "1px solid rgba(0, 200, 83, 0.5)",
						color: "#f8fafc",
						textShadow: "0 1px 2px rgba(0,0,0,0.9)",
					}}
					className="px-1.5 py-0.5 rounded font-black text-[11px] tracking-tight whitespace-nowrap shadow-md"
				>
					{targetLengthMm} mm
				</div>

				{/* SVG Ladder Scale */}
				<div
					style={{
						height: `${clampedHeightPx}px`,
						width: "18px",
						position: "relative",
					}}
				>
					{/* Vertical Backbone Bar */}
					<div
						style={{
							position: "absolute",
							right: "2px",
							top: 0,
							bottom: 0,
							width: "2.5px",
							backgroundColor: "#00C853",
							boxShadow: "0 0 6px rgba(0, 200, 83, 0.7)",
							borderRadius: "1px",
						}}
					/>

					{/* Millimeter Ticks */}
					{ticks.map((t) => (
						<div
							key={t.mm}
							style={{
								position: "absolute",
								right: "2px",
								top: `${t.topPct}%`,
								transform: "translateY(-50%)",
								height: t.isMajor ? "2.5px" : "1.5px",
								width: t.isMajor ? "14px" : "8px",
								backgroundColor: t.isMajor ? "#ffffff" : "#00C853",
								boxShadow: "0 1px 3px rgba(0,0,0,0.8)",
							}}
							data-testid={`scale-tick-${t.mm}mm`}
						/>
					))}
				</div>
			</div>
		</div>
	);
};
