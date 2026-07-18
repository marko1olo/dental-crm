import React from "react";
import { type ToothStatus } from "../../store/patientStore";
import { getToothConfig, getToothPath } from "../../utils/math/toothGeometry";

export function OdontogramToothSvg({
	tooth,
	status,
	color,
	isSelected,
}: {
	tooth: number;
	status: ToothStatus;
	color: string;
	isSelected: boolean;
}) {
	const geom = getToothPath(tooth);
	const cfg = getToothConfig(tooth);
	const w = `${parseFloat(cfg.width)}px`;
	const h = `${parseFloat(cfg.height)}px`;

	if (status === "Missing") {
		return (
			<svg
				width={w}
				height={h}
				viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
				preserveAspectRatio="xMidYMid meet"
			>
				<path
					d={geom.root}
					fill="#f1f5f9"
					stroke="#cbd5e1"
					strokeWidth="1.2"
					opacity="0.15"
				/>
				<path
					d={geom.crown}
					fill="#f1f5f9"
					stroke="#cbd5e1"
					strokeWidth="1.2"
					opacity="0.15"
				/>
				<path
					d="M20 20L80 130M80 20L20 130"
					stroke="#ef4444"
					strokeWidth="5"
					strokeLinecap="round"
					opacity="0.7"
				/>
				{isSelected && (
					<rect
						x="0"
						y="0"
						width={cfg.viewWidth}
						height={cfg.viewHeight}
						fill="none"
						stroke="#6366f1"
						strokeWidth="4"
						rx="6"
						strokeDasharray="6 3"
					/>
				)}
			</svg>
		);
	}

	if (status === "Implant") {
		return (
			<svg
				width={w}
				height={h}
				viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
				preserveAspectRatio="xMidYMid meet"
			>
				<path
					d={geom.root}
					fill="#f1f5f9"
					stroke="#0f766e"
					strokeWidth="2"
					strokeLinejoin="round"
				/>
				<path
					d={geom.crown}
					fill="#ffffff"
					stroke="#0f766e"
					strokeWidth="2.2"
					strokeLinejoin="round"
				/>
				<line x1="25" y1="60" x2="75" y2="60" stroke="#0f766e" strokeWidth="2" />
				<line x1="30" y1="80" x2="70" y2="80" stroke="#0f766e" strokeWidth="2" />
				<line x1="35" y1="100" x2="65" y2="100" stroke="#0f766e" strokeWidth="2" />
				{isSelected && (
					<rect
						x="0"
						y="0"
						width={cfg.viewWidth}
						height={cfg.viewHeight}
						fill="none"
						stroke="#6366f1"
						strokeWidth="4"
						rx="6"
						strokeDasharray="6 3"
					/>
				)}
			</svg>
		);
	}

	const fillOpacity = status === "Healthy" ? "1" : "0.2";
	const strokeColor = status === "Healthy" ? "#94a3b8" : color;

	return (
		<svg
			width={w}
			height={h}
			viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			preserveAspectRatio="xMidYMid meet"
		>
			<path
				d={geom.root}
				fill="#f8fafc"
				stroke="#cbd5e1"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			{geom.canals && status === "Filling" && (
				<path
					d={geom.canals}
					fill="none"
					stroke="#0ea5e9"
					strokeWidth="2.5"
					strokeLinecap="round"
					opacity="0.85"
				/>
			)}
			<path
				d={geom.crown}
				fill={status === "Healthy" ? "#ffffff" : color}
				fillOpacity={fillOpacity}
				stroke={strokeColor}
				strokeWidth="2.2"
				strokeLinejoin="round"
			/>
			{geom.fissures && (
				<path
					d={geom.fissures}
					fill="none"
					stroke="rgba(0,0,0,0.15)"
					strokeWidth="0.8"
				/>
			)}
			{status === "Caries" && (
				<circle
					cx={cfg.viewWidth / 2}
					cy={tooth >= 11 && tooth <= 28 ? 110 : 40}
					r="8"
					fill="#dc2626"
					opacity="0.9"
				/>
			)}
			{status === "Crown" && (
				<path
					d={geom.crown}
					fill="#f59e0b"
					opacity="0.3"
					stroke="#f59e0b"
					strokeWidth="1"
				/>
			)}
			{isSelected && (
				<rect
					x="0"
					y="0"
					width={cfg.viewWidth}
					height={cfg.viewHeight}
					fill="rgba(99,102,241,0.12)"
					stroke="#6366f1"
					strokeWidth="3.5"
					rx="6"
					strokeDasharray="6 3"
				/>
			)}
		</svg>
	);
}
