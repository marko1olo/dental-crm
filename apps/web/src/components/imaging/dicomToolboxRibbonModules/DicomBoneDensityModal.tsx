/**
 * DENTE CRM — Carl E. Misch Bone Density HU Modal (Layer 4)
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 * Portal mounting: strictly createPortal(..., document.body) (Anti-Matryoshka invariant: depth 1).
 */

import React from "react";
import { createPortal } from "react-dom";
import { Activity, FileText, X } from "lucide-react";
import {
	MISCH_CLINICAL_GUIDES,
	statPillStyle,
} from "./dicomRibbonConstants.js";
import type { DicomBoneDensityModalProps } from "./types.js";

export const DicomBoneDensityModal: React.FC<DicomBoneDensityModalProps> = ({
	isOpen,
	stats,
	onClose,
	onInsertToProtocol,
}) => {
	if (!isOpen || !stats) return null;
	if (typeof document === "undefined") return null;

	const modalContent = (
		<div
			data-testid="dicom-hu-density-modal"
			style={{
				position: "fixed",
				inset: 0,
				backgroundColor: "rgba(0,0,0,0.8)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 10003,
				padding: "16px",
			}}
			onClick={onClose}
		>
			<div
				style={{
					width: "560px",
					maxWidth: "100%",
					backgroundColor: "#0f172a",
					border: "1px solid #334155",
					borderRadius: "12px",
					padding: "18px",
					boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
					color: "#f8fafc",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						borderBottom: "1px solid #1e293b",
						paddingBottom: "10px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Activity size={18} color="#38bdf8" />
						<div>
							<div style={{ fontWeight: 800, fontSize: "14px" }}>
								Профиль плотности кости (Шкала Хаунсфилда HU)
							</div>
							<div style={{ fontSize: "12px", color: "#94a3b8" }}>
								Классификация Carl E. Misch (D1..D5) вдоль линии измерения ({stats.lengthMm} мм)
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "transparent",
							border: "none",
							color: "#94a3b8",
							cursor: "pointer",
						}}
					>
						<X size={18} />
					</button>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
					<div style={statPillStyle}>
						<span style={{ fontSize: "12px", color: "#94a3b8" }}>СРЕДНЯЯ</span>
						<strong style={{ fontSize: "13px", color: "#38bdf8" }}>{stats.meanHu} HU</strong>
					</div>
					<div style={statPillStyle}>
						<span style={{ fontSize: "12px", color: "#94a3b8" }}>КЛАСС MISCH</span>
						<strong style={{ fontSize: "13px", color: "#2dd4bf" }}>{stats.dominantClass}</strong>
					</div>
					<div style={statPillStyle}>
						<span style={{ fontSize: "12px", color: "#94a3b8" }}>МИНИМУМ</span>
						<strong style={{ fontSize: "13px", color: "#f59e0b" }}>{stats.minHu} HU</strong>
					</div>
					<div style={statPillStyle}>
						<span style={{ fontSize: "12px", color: "#94a3b8" }}>МАКСИМУМ</span>
						<strong style={{ fontSize: "13px", color: "#a855f7" }}>{stats.maxHu} HU</strong>
					</div>
				</div>

				{/* SVG Chart of HU Profile */}
				<div
					style={{
						height: "170px",
						backgroundColor: "#020617",
						borderRadius: "8px",
						border: "1px solid #1e293b",
						padding: "8px",
						position: "relative",
					}}
				>
					<svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
						<defs>
							<linearGradient id="huGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
								<stop offset="100%" stopColor="#0d9488" stopOpacity="0.05" />
							</linearGradient>
						</defs>
						<line
							x1="0"
							y1="35"
							x2="500"
							y2="35"
							stroke="#3b82f6"
							strokeDasharray="3 3"
							strokeOpacity="0.4"
						/>
						<text x="4" y="32" fill="#93c5fd" fontSize="9" fontWeight="bold">
							D1 (&gt;1250 HU)
						</text>
						<line
							x1="0"
							y1="65"
							x2="500"
							y2="65"
							stroke="#10b981"
							strokeDasharray="3 3"
							strokeOpacity="0.4"
						/>
						<text x="4" y="62" fill="#6ee7b7" fontSize="9" fontWeight="bold">
							D2 (850-1250 HU)
						</text>
						<line
							x1="0"
							y1="95"
							x2="500"
							y2="95"
							stroke="#f59e0b"
							strokeDasharray="3 3"
							strokeOpacity="0.4"
						/>
						<text x="4" y="92" fill="#fde68a" fontSize="9" fontWeight="bold">
							D3 (350-850 HU)
						</text>
						<line
							x1="0"
							y1="125"
							x2="500"
							y2="125"
							stroke="#ef4444"
							strokeDasharray="3 3"
							strokeOpacity="0.4"
						/>
						<text x="4" y="122" fill="#fca5a5" fontSize="9" fontWeight="bold">
							D4 (&lt;350 HU)
						</text>

						{stats.samples.length > 1 && (
							<>
								<polygon
									points={`0,145 ${stats.samples
										.map((s, idx) => {
											const x = (idx / (stats.samples.length - 1)) * 500;
											const clampedHu = Math.max(-500, Math.min(2500, s.hu));
											const y = 140 - ((clampedHu + 500) / 3000) * 130;
											return `${x.toFixed(1)},${y.toFixed(1)}`;
										})
										.join(" ")} 500,145`}
									fill="url(#huGradient)"
								/>
								<polyline
									points={stats.samples
										.map((s, idx) => {
											const x = (idx / (stats.samples.length - 1)) * 500;
											const clampedHu = Math.max(-500, Math.min(2500, s.hu));
											const y = 140 - ((clampedHu + 500) / 3000) * 130;
											return `${x.toFixed(1)},${y.toFixed(1)}`;
										})
										.join(" ")}
									fill="none"
									stroke="#38bdf8"
									strokeWidth="2.5"
								/>
							</>
						)}
					</svg>
				</div>

				{/* Clinical Recommendation Guide */}
				<div
					style={{
						backgroundColor: "rgba(13, 148, 136, 0.1)",
						border: "1px solid rgba(13, 148, 136, 0.3)",
						borderRadius: "8px",
						padding: "10px",
						fontSize: "12px",
						color: "#cbd5e1",
						lineHeight: "1.4",
					}}
				>
					<div style={{ fontWeight: 700, color: "#2dd4bf", marginBottom: "4px" }}>
						Клинический протокол для плотности кости {stats.dominantClass}:
					</div>
					<span>{MISCH_CLINICAL_GUIDES[stats.dominantClass] || MISCH_CLINICAL_GUIDES.D2}</span>
				</div>

				<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
					<button
						type="button"
						onClick={onClose}
						style={{
							height: "36px",
							padding: "0 16px",
							borderRadius: "8px",
							backgroundColor: "#1e293b",
							border: "1px solid #334155",
							color: "#cbd5e1",
							fontSize: "13px",
							fontWeight: 500,
							cursor: "pointer",
						}}
					>
						Закрыть
					</button>
					<button
						type="button"
						onClick={onInsertToProtocol}
						style={{
							height: "36px",
							padding: "0 18px",
							borderRadius: "8px",
							backgroundColor: "var(--teal)",
							border: "none",
							color: "var(--on-teal, #ffffff)",
							fontSize: "13px",
							fontWeight: 600,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<FileText size={15} />
						<span>Внести в медицинскую карту</span>
					</button>
				</div>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
};
