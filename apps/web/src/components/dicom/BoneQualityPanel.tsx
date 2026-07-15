import type React from "react";
import { useState } from "react";
import {
	type DrillProtocol,
	extractHUZones,
	generateDrillProtocol,
	type ImplantSystem,
	mischDescription,
} from "../../utils/dicom/boneQualityEngine";

interface Props {
	huSamples: number[]; // HU values sampled along the implant axis
	implantDiameterMm: number;
	implantLengthMm: number;
	implantSystem: ImplantSystem;
	toothFdi: number;
	onSystemChange: (s: ImplantSystem) => void;
}

const SYSTEMS: { value: ImplantSystem; label: string }[] = [
	{ value: "osstem", label: "Osstem (TS III / TSIV)" },
	{ value: "straumann", label: "Straumann (BLX / BLT)" },
	{ value: "nobel", label: "Nobel Biocare (Active / Parallel)" },
	{ value: "bredent", label: "Bredent (SKY / Blue Sky)" },
	{ value: "mdi", label: "MDI Mini Implants" },
];

const MISCH_COLORS: Record<string, string> = {
	D1: "#ef4444",
	D2: "#22c55e",
	D3: "#f59e0b",
	D4: "#f97316",
};

export function BoneQualityPanel({
	huSamples,
	implantDiameterMm,
	implantLengthMm,
	implantSystem,
	toothFdi,
	onSystemChange,
}: Props) {
	const [expanded, setExpanded] = useState(true);

	if (huSamples.length === 0) {
		return (
			<div style={panelStyle}>
				<PanelHeader
					expanded={expanded}
					onToggle={() => setExpanded((e) => !e)}
					toothFdi={toothFdi}
				/>
				{expanded && (
					<div style={{ padding: "12px", color: "#71717a", fontSize: "12px" }}>
						Нет данных плотности. Установите имплантат для анализа оси.
					</div>
				)}
			</div>
		);
	}

	const zones = extractHUZones(huSamples);
	const protocol: DrillProtocol = generateDrillProtocol(
		zones,
		implantSystem,
		implantDiameterMm,
		implantLengthMm,
	);
	const mischColor = MISCH_COLORS[protocol.mischClass] ?? "#a1a1aa";

	return (
		<div style={panelStyle}>
			<PanelHeader
				expanded={expanded}
				onToggle={() => setExpanded((e) => !e)}
				toothFdi={toothFdi}
			/>

			{expanded && (
				<>
					{/* Misch Class Badge */}
					<div
						style={{
							padding: "10px 12px 0",
							display: "flex",
							alignItems: "center",
							gap: "10px",
						}}
					>
						<div
							style={{
								background: mischColor,
								color: "#000",
								fontWeight: 800,
								fontSize: "18px",
								padding: "4px 14px",
								borderRadius: "8px",
								letterSpacing: "1px",
								flexShrink: 0,
							}}
						>
							{protocol.mischClass}
						</div>
						<div
							style={{ fontSize: "11px", color: "#a1a1aa", lineHeight: 1.4 }}
						>
							{mischDescription(protocol.mischClass)}
						</div>
					</div>

					{/* HU Zones */}
					<div
						style={{
							padding: "10px 12px",
							display: "grid",
							gridTemplateColumns: "1fr 1fr 1fr",
							gap: "6px",
						}}
					>
						<ZoneCard label="Кортикал" hu={zones.corticalHU} />
						<ZoneCard label="Губчатая" hu={zones.cancellousHU} />
						<ZoneCard label="Апекс" hu={zones.apicalHU} />
					</div>

					{/* Implant System Selector */}
					<div style={{ padding: "4px 12px 8px" }}>
						<label
							style={{
								fontSize: "10px",
								color: "#71717a",
								display: "block",
								marginBottom: "4px",
							}}
						>
							Система имплантации
						</label>
						<select
							value={implantSystem}
							onChange={(e) => onSystemChange(e.target.value as ImplantSystem)}
							style={selectStyle}
						>
							{SYSTEMS.map((s) => (
								<option key={s.value} value={s.value}>
									{s.label}
								</option>
							))}
						</select>
					</div>

					{/* Warnings */}
					{protocol.warnings.length > 0 && (
						<div style={{ padding: "0 12px 8px" }}>
							{protocol.warnings.map((w, i) => (
								<div key={i} style={warnStyle}>
									{w}
								</div>
							))}
						</div>
					)}

					{/* Drill Sequence */}
					<div style={{ padding: "0 12px 12px" }}>
						<div
							style={{
								fontSize: "11px",
								color: "#71717a",
								marginBottom: "6px",
								fontWeight: 600,
							}}
						>
							ПРОТОКОЛ СВЕРЛЕНИЯ
							{protocol.underdrillingApplied && (
								<span
									style={{
										marginLeft: "6px",
										color: "#f97316",
										fontSize: "10px",
									}}
								>
									UNDERDRILL
								</span>
							)}
							{protocol.corticalTapRequired && (
								<span
									style={{
										marginLeft: "6px",
										color: "#ef4444",
										fontSize: "10px",
									}}
								>
									CORTICAL TAP
								</span>
							)}
						</div>
						<div
							style={{ display: "flex", flexDirection: "column", gap: "4px" }}
						>
							{protocol.steps.map((step) => (
								<div key={step.step} style={stepStyle}>
									<div
										style={{
											width: "18px",
											height: "18px",
											borderRadius: "50%",
											background: "#3f3f46",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "9px",
											fontWeight: 700,
											color: "#e4e4e7",
											flexShrink: 0,
										}}
									>
										{step.step}
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontSize: "11px",
												fontWeight: 600,
												color: "#e4e4e7",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{step.drillType} — Ø{step.diameterMm}mm × {step.depthMm}mm
										</div>
										<div style={{ fontSize: "10px", color: "#71717a" }}>
											{step.rpmRange} · {step.torqueNcm}
											{step.irrigation ? " · 💧" : ""}
										</div>
										{step.note && (
											<div
												style={{
													fontSize: "10px",
													color: "#f59e0b",
													marginTop: "1px",
													whiteSpace: "normal",
												}}
											>
												{step.note}
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}

function PanelHeader({
	expanded,
	onToggle,
	toothFdi,
}: {
	expanded: boolean;
	onToggle: () => void;
	toothFdi: number;
}) {
	return (
		<div
			onClick={onToggle}
			style={{
				padding: "8px 12px",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				cursor: "pointer",
				borderBottom: "1px solid #3f3f46",
				userSelect: "none",
			}}
		>
			<span
				style={{
					fontSize: "11px",
					fontWeight: 700,
					color: "#a1a1aa",
					letterSpacing: "0.5px",
				}}
			>
				🦴 BONE QUALITY · FDI {toothFdi}
			</span>
			<span style={{ fontSize: "10px", color: "#52525b" }}>
				{expanded ? "▲" : "▼"}
			</span>
		</div>
	);
}

function ZoneCard({ label, hu }: { label: string; hu: number }) {
	const color =
		hu > 1250
			? "#ef4444"
			: hu >= 850
				? "#22c55e"
				: hu >= 350
					? "#f59e0b"
					: "#f97316";
	return (
		<div
			style={{
				background: "#18181b",
				borderRadius: "6px",
				padding: "6px 8px",
				border: "1px solid #3f3f46",
			}}
		>
			<div style={{ fontSize: "9px", color: "#71717a", marginBottom: "2px" }}>
				{label}
			</div>
			<div style={{ fontSize: "13px", fontWeight: 700, color }}>
				{Math.round(hu)} HU
			</div>
		</div>
	);
}

// --- Styles ---
const panelStyle: React.CSSProperties = {
	width: "240px",
	flexShrink: 0,
	background: "#09090b",
	borderLeft: "1px solid #27272a",
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
	fontSize: "12px",
	fontFamily: "monospace",
};

const selectStyle: React.CSSProperties = {
	width: "100%",
	background: "#18181b",
	color: "#e4e4e7",
	border: "1px solid #3f3f46",
	borderRadius: "6px",
	padding: "5px 8px",
	fontSize: "11px",
	cursor: "pointer",
	outline: "none",
};

const warnStyle: React.CSSProperties = {
	background: "rgba(239,68,68,0.1)",
	border: "1px solid rgba(239,68,68,0.3)",
	borderRadius: "6px",
	padding: "6px 8px",
	fontSize: "10px",
	color: "#fca5a5",
	lineHeight: 1.5,
	marginBottom: "4px",
};

const stepStyle: React.CSSProperties = {
	display: "flex",
	gap: "8px",
	alignItems: "flex-start",
	background: "#18181b",
	borderRadius: "6px",
	padding: "6px 8px",
	border: "1px solid #27272a",
};
