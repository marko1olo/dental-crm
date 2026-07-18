import React from "react";
import type { ToothStatus } from "../../store/patientStore";
import {
	STATUS_COLORS,
	STATUS_GLOW,
	STATUS_OPTIONS,
	RADIAL_MENU_COLORS,
} from "./OdontogramConstants";
import { OdontogramToothSvg } from "./OdontogramToothSvg";

interface OdontogramToothItemProps {
	tooth: number;
	status: ToothStatus;
	isHovered: boolean;
	isSelected: boolean;
	multiSelectMode: boolean;
	radialMenuOpen: number | null;
	setHoveredTooth: (t: number | null) => void;
	handleToothClick: (tooth: number, shiftKey: boolean) => void;
	setRadialMenuOpen: (t: number | null) => void;
	selectedPatientId: string | null;
	saveToothStatus: (
		patientId: string,
		tooth: number | number[],
		status: ToothStatus,
	) => Promise<void>;
	setToothStatus: (tooth: number, status: ToothStatus) => void;
}

export function OdontogramToothItem({
	tooth,
	status,
	isHovered,
	isSelected,
	multiSelectMode,
	radialMenuOpen,
	setHoveredTooth,
	handleToothClick,
	setRadialMenuOpen,
	selectedPatientId,
	saveToothStatus,
	setToothStatus,
}: OdontogramToothItemProps) {
	const color = STATUS_COLORS[status];
	const isUpper = tooth >= 11 && tooth <= 28;

	return (
		<div
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
						isHovered || isSelected ? "scale(1.08) translateY(-2px)" : "scale(1)",
					filter: isHovered
						? "drop-shadow(0 4px 8px rgba(0,0,0,0.12))"
						: isSelected
							? `drop-shadow(0 0 6px ${STATUS_GLOW[status]})`
							: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))",
				}}
			>
				<OdontogramToothSvg
					tooth={tooth}
					status={status}
					color={color}
					isSelected={isSelected}
				/>
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
							const radius = 54;
							const x = Math.cos((angle * Math.PI) / 180) * radius;
							const y = Math.sin((angle * Math.PI) / 180) * radius;
							const colorScheme = RADIAL_MENU_COLORS[opt];

							return (
								<button
									key={opt}
									onClick={(e) => {
										e.stopPropagation();
										if (selectedPatientId) {
											void saveToothStatus(selectedPatientId, tooth, opt);
										} else {
											setToothStatus(tooth, opt);
										}
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
										e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
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
}
