import { useCallback, useState } from "react";
import { type ToothStatus, usePatientStore } from "../store/patientStore";
import { getToothConfig, getToothPath } from "../utils/math/toothGeometry";

const TOOTH_NUMBERS = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
	45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

const UPPER_TEETH = TOOTH_NUMBERS.slice(0, 16);
const LOWER_TEETH = TOOTH_NUMBERS.slice(16, 32);

const STATUS_COLORS: Record<ToothStatus, string> = {
	Healthy: "#ffffff",
	Caries: "#dc2626",
	Filling: "#0ea5e9",
	Missing: "#94a3b8",
	Implant: "#0f766e",
	Crown: "#f59e0b",
};

const STATUS_GLOW: Record<ToothStatus, string> = {
	Healthy: "rgba(148,163,184,0.4)",
	Caries: "rgba(220,38,38,0.5)",
	Filling: "rgba(14,165,233,0.5)",
	Missing: "rgba(148,163,184,0.3)",
	Implant: "rgba(15,118,110,0.5)",
	Crown: "rgba(245,158,11,0.5)",
};

const STATUS_OPTIONS: ToothStatus[] = [
	"Healthy",
	"Caries",
	"Filling",
	"Missing",
	"Implant",
	"Crown",
];

const renderToothSvg = (
	tooth: number,
	status: ToothStatus,
	color: string,
	isSelected: boolean,
) => {
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
				<line
					x1="25"
					y1="60"
					x2="75"
					y2="60"
					stroke="#0f766e"
					strokeWidth="2"
				/>
				<line
					x1="30"
					y1="80"
					x2="70"
					y2="80"
					stroke="#0f766e"
					strokeWidth="2"
				/>
				<line
					x1="35"
					y1="100"
					x2="65"
					y2="100"
					stroke="#0f766e"
					strokeWidth="2"
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
};

export function Odontogram() {
	const { odontogramState, setToothStatus } = usePatientStore();
	const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
	const [radialMenuOpen, setRadialMenuOpen] = useState<number | null>(null);
	const [multiSelectMode, setMultiSelectMode] = useState(false);
	const [selectedTeeth, setSelectedTeeth] = useState<Set<number>>(new Set());
	const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

	const toggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) => {
			const next = new Set(prev);
			next.has(tooth) ? next.delete(tooth) : next.add(tooth);
			return next;
		});
	}, []);

	const handleToothClick = useCallback(
		(tooth: number, shiftKey: boolean) => {
			if (multiSelectMode || shiftKey) {
				toggleTooth(tooth);
				// open bulk menu if ≥1 tooth selected
				setBulkMenuOpen(false);
				return;
			}
			setRadialMenuOpen((prev) => (prev === tooth ? null : tooth));
		},
		[multiSelectMode, toggleTooth],
	);

	const applyBulkStatus = useCallback(
		(status: ToothStatus) => {
			selectedTeeth.forEach((t) => setToothStatus(t, status));
			setSelectedTeeth(new Set());
			setBulkMenuOpen(false);
			setMultiSelectMode(false);
		},
		[selectedTeeth, setToothStatus],
	);

	const renderTooth = (tooth: number) => {
		const status = (odontogramState[tooth] || "Healthy") as ToothStatus;
		const color = STATUS_COLORS[status];
		const isHovered = hoveredTooth === tooth;
		const isSelected = selectedTeeth.has(tooth);
		const isUpper = tooth >= 11 && tooth <= 28;

		return (
			<div
				key={tooth}
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "6px",
					position: "relative",
					cursor: "pointer",
					padding: "4px",
					minWidth: "44px",
					minHeight: "44px",
					touchAction: "manipulation",
					borderRadius: "8px",
					transition: "all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
					background: isSelected
						? "rgba(99,102,241,0.15)"
						: isHovered
							? "var(--paper-soft)"
							: "transparent",
					boxShadow: isSelected
						? `0 0 0 2px #6366f1, 0 0 12px ${STATUS_GLOW[status]}`
						: "none",
					width: "max-content",
				}}
				onMouseEnter={() => setHoveredTooth(tooth)}
				onMouseLeave={() => setHoveredTooth(null)}
				onClick={(e) => handleToothClick(tooth, e.shiftKey)}
			>
				{isUpper && (
					<span
						className="tooth-number"
						style={{
							color: isSelected ? "#6366f1" : isHovered ? "#2563eb" : undefined,
						}}
					>
						{tooth}
					</span>
				)}

				<div
					style={{
						transition: "transform 0.18s, filter 0.18s",
						transform:
							isHovered || isSelected
								? "scale(1.08) translateY(-2px)"
								: "scale(1)",
						filter: isHovered
							? "drop-shadow(0 4px 8px rgba(0,0,0,0.12))"
							: isSelected
								? `drop-shadow(0 0 6px ${STATUS_GLOW[status]})`
								: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))",
					}}
				>
					{renderToothSvg(tooth, status, color, isSelected)}
				</div>

				{!isUpper && (
					<span
						className="tooth-number"
						style={{
							color: isSelected ? "#6366f1" : isHovered ? "#2563eb" : undefined,
						}}
					>
						{tooth}
					</span>
				)}

				{/* Tooltip */}
				<div
					style={{
						position: "absolute",
						bottom: isUpper ? "100%" : "auto",
						top: !isUpper ? "100%" : "auto",
						left: "50%",
						transform: "translateX(-50%)",
						marginBottom: isUpper ? "10px" : "0",
						marginTop: !isUpper ? "10px" : "0",
						background: "#1e293b",
						color: "#ffffff",
						padding: "5px 9px",
						borderRadius: "7px",
						fontSize: "12px",
						fontWeight: 600,
						pointerEvents: "none",
						whiteSpace: "nowrap",
						zIndex: 20,
						boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
						opacity:
							isHovered && radialMenuOpen !== tooth && !multiSelectMode ? 1 : 0,
						transition: "opacity 0.15s",
					}}
				>
					Зуб {tooth}: {status}
				</div>

				{/* Single-tooth radial menu */}
				{!multiSelectMode && radialMenuOpen === tooth && (
					<div
						style={{
							position: "absolute",
							top: isUpper ? "100%" : "auto",
							bottom: !isUpper ? "100%" : "auto",
							left: "50%",
							transform: isUpper
								? "translateX(-50%) translateY(14px)"
								: "translateX(-50%) translateY(-14px)",
							zIndex: 50,
							width: "160px",
							height: "160px",
							pointerEvents: "auto",
							background: "var(--paper, #ffffff)",
							border: "1px solid var(--odontogram-border, var(--line))",
							borderRadius: "16px",
							boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)",
							backdropFilter: "blur(16px)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Caret */}
						<div
							style={{
								position: "absolute",
								top: isUpper ? "-6px" : "auto",
								bottom: !isUpper ? "-6px" : "auto",
								left: "50%",
								transform: "translateX(-50%) rotate(45deg)",
								width: "12px",
								height: "12px",
								background: "var(--paper, #ffffff)",
								borderLeft: isUpper
									? "1px solid var(--odontogram-border, var(--line))"
									: "none",
								borderTop: isUpper
									? "1px solid var(--odontogram-border, var(--line))"
									: "none",
								borderRight: !isUpper
									? "1px solid var(--odontogram-border, var(--line))"
									: "none",
								borderBottom: !isUpper
									? "1px solid var(--odontogram-border, var(--line))"
									: "none",
								zIndex: 1,
							}}
						/>

						<div
							style={{
								position: "relative",
								width: "100%",
								height: "100%",
								zIndex: 2,
							}}
						>
							<div
								style={{
									position: "fixed",
									top: -9999,
									left: -9999,
									right: -9999,
									bottom: -9999,
									cursor: "default",
									pointerEvents: "auto",
									zIndex: -1,
								}}
								onClick={(e) => {
									e.stopPropagation();
									setRadialMenuOpen(null);
								}}
							/>
							{STATUS_OPTIONS.map((opt, i) => {
								const angle = i * (360 / STATUS_OPTIONS.length) - 90;
								const radius = 54; // slightly smaller radius to fit inside 160px card
								const x = Math.cos((angle * Math.PI) / 180) * radius;
								const y = Math.sin((angle * Math.PI) / 180) * radius;

								// Color mapping matching active buttons
								const btnColors: Record<
									ToothStatus,
									{ bg: string; text: string; border: string }
								> = {
									Healthy: {
										bg: "rgba(16, 185, 129, 0.15)",
										text: "#10b981",
										border: "rgba(16, 185, 129, 0.3)",
									},
									Caries: {
										bg: "rgba(239, 68, 68, 0.15)",
										text: "#ef4444",
										border: "rgba(239, 68, 68, 0.3)",
									},
									Filling: {
										bg: "rgba(14, 165, 233, 0.15)",
										text: "#0ea5e9",
										border: "rgba(14, 165, 233, 0.3)",
									},
									Missing: {
										bg: "rgba(100, 116, 139, 0.2)",
										text: "#64748b",
										border: "rgba(100, 116, 139, 0.3)",
									},
									Implant: {
										bg: "rgba(234, 179, 8, 0.15)",
										text: "#fbbf24",
										border: "rgba(234, 179, 8, 0.3)",
									},
									Crown: {
										bg: "rgba(59, 130, 246, 0.15)",
										text: "#60a5fa",
										border: "rgba(59, 130, 246, 0.3)",
									},
								};
								const colorScheme = btnColors[opt];

								return (
									<button
										key={opt}
										onClick={(e) => {
											e.stopPropagation();
											setToothStatus(tooth, opt);
											setRadialMenuOpen(null);
										}}
										style={{
											position: "absolute",
											left: `calc(50% + ${x}px)`,
											top: `calc(50% + ${y}px)`,
											transform: "translate(-50%, -50%)",
											width: "38px",
											height: "38px",
											borderRadius: "50%",
											background: colorScheme.bg,
											border: `1.5px solid ${colorScheme.border}`,
											boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "pointer",
											pointerEvents: "auto",
											transition: "transform 0.12s, background 0.12s",
											color: colorScheme.text,
											fontSize: "10px",
											fontWeight: "bold",
										}}
										title={opt}
										onMouseEnter={(e) => {
											e.currentTarget.style.transform =
												"translate(-50%, -50%) scale(1.15)";
											e.currentTarget.style.background = colorScheme.bg
												.replace("0.15", "0.3")
												.replace("0.2", "0.4");
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.transform =
												"translate(-50%, -50%) scale(1)";
											e.currentTarget.style.background = colorScheme.bg;
										}}
									>
										{opt.substring(0, 1)}
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>
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
			{/* Toolbar */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "12px",
				}}
			>
				<h3
					style={{
						margin: 0,
						color: "var(--ink)",
						fontSize: "19px",
						fontWeight: 700,
					}}
				>
					Зубная формула
				</h3>

				<div
					style={{
						display: "flex",
						gap: "10px",
						flexWrap: "wrap",
						alignItems: "center",
					}}
				>
					{/* Multi-select toggle */}
					<button
						onClick={() => {
							setMultiSelectMode((m) => !m);
							setSelectedTeeth(new Set());
							setBulkMenuOpen(false);
							setRadialMenuOpen(null);
						}}
						style={{
							padding: "6px 14px",
							borderRadius: "8px",
							border: `1.5px solid ${multiSelectMode ? "var(--teal)" : "var(--line)"}`,
							background: multiSelectMode ? "var(--teal-soft)" : "var(--paper)",
							color: multiSelectMode ? "var(--teal-dark)" : "var(--ink)",
							fontSize: "13px",
							fontWeight: 700,
							cursor: "pointer",
							transition: "all 0.15s",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<span>
							{multiSelectMode ? "✓ Групповой выбор" : "☐ Групповой выбор"}
						</span>
						{multiSelectMode && selectedTeeth.size > 0 && (
							<span
								style={{
									background: "var(--teal)",
									color: "#fff",
									borderRadius: "9999px",
									padding: "1px 7px",
									fontSize: "11px",
									fontWeight: 800,
								}}
							>
								{selectedTeeth.size}
							</span>
						)}
					</button>

					{/* Apply to selected */}
					{multiSelectMode && selectedTeeth.size > 0 && (
						<div style={{ position: "relative" }}>
							<button
								onClick={() => setBulkMenuOpen((m) => !m)}
								style={{
									padding: "6px 14px",
									borderRadius: "8px",
									background:
										"linear-gradient(135deg, var(--teal-dark), var(--teal))",
									border: "none",
									color: "#fff",
									fontSize: "13px",
									fontWeight: 700,
									cursor: "pointer",
									boxShadow: "0 0 18px var(--teal-glow)",
									transition: "opacity 0.15s",
								}}
							>
								Применить к {selectedTeeth.size} зубам ▾
							</button>

							{bulkMenuOpen && (
								<div
									style={{
										position: "absolute",
										top: "110%",
										right: 0,
										background: "var(--paper)",
										border: "1px solid var(--line)",
										borderRadius: "10px",
										boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
										zIndex: 100,
										minWidth: "180px",
										overflow: "hidden",
										animation: "popIn 0.15s ease",
									}}
								>
									{STATUS_OPTIONS.map((opt) => (
										<button
											key={opt}
											onClick={() => applyBulkStatus(opt)}
											style={{
												width: "100%",
												textAlign: "left",
												padding: "9px 14px",
												background: "none",
												border: "none",
												cursor: "pointer",
												fontSize: "13px",
												fontWeight: 600,
												color: "var(--ink)",
												display: "flex",
												alignItems: "center",
												gap: "10px",
												transition: "background 0.12s",
												borderBottom: "1px solid var(--line)",
											}}
											onMouseEnter={(e) =>
												(e.currentTarget.style.background = "var(--paper-soft)")
											}
											onMouseLeave={(e) =>
												(e.currentTarget.style.background = "none")
											}
										>
											<span
												style={{
													width: "14px",
													height: "14px",
													borderRadius: "50%",
													background: STATUS_COLORS[opt],
													border: "1px solid var(--muted)",
													flexShrink: 0,
												}}
											/>
											{opt}
										</button>
									))}
								</div>
							)}
						</div>
					)}

					{/* Legend */}
					<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
						{STATUS_OPTIONS.map((s) => (
							<div
								key={s}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "5px",
									fontSize: "12px",
									fontWeight: 600,
									color: "var(--muted)",
								}}
							>
								<div
									style={{
										width: "12px",
										height: "12px",
										borderRadius: "50%",
										background: STATUS_COLORS[s],
										border: "1px solid var(--muted)",
									}}
								/>
								{s}
							</div>
						))}
					</div>
				</div>
			</div>

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
