/**
 * DmsPolicyEmergencyAndScanToggles.tsx — Переключатели экстренного приёма и отложенного ввода скана ГП
 */

import { AlertTriangle, CheckCircle2, FileCheck2 } from "lucide-react";
import React, { useRef } from "react";

export interface DmsPolicyEmergencyAndScanTogglesProps {
	readonly isEmergencyCare: boolean;
	readonly isDeferredScan: boolean;
	readonly attachedScanFileName: string;
	readonly onEmergencyCareChange: (val: boolean) => void;
	readonly onDeferredScanChange: (val: boolean) => void;
	readonly onAttachedScanFileNameChange: (fileName: string) => void;
}

export function DmsPolicyEmergencyAndScanToggles({
	isEmergencyCare,
	isDeferredScan,
	attachedScanFileName,
	onEmergencyCareChange,
	onDeferredScanChange,
	onAttachedScanFileNameChange,
}: DmsPolicyEmergencyAndScanTogglesProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	return (
		<>
			<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
				<label
					style={{
						display: "flex", alignItems: "center", gap: "6px", cursor: "pointer",
						padding: "4px 8px", borderRadius: "6px",
						background: isEmergencyCare ? "rgba(245, 158, 11, 0.15)" : "transparent",
						border: isEmergencyCare ? "1px solid var(--warn-fg, #d97706)" : "1px solid var(--line, #e2e8f0)",
						fontSize: "0.8125rem", fontWeight: 600,
					}}
				>
					<input
						type="checkbox"
						checked={isEmergencyCare}
						onChange={(e) => onEmergencyCareChange(e.target.checked)}
						style={{ width: "15px", height: "15px", cursor: "pointer" }}
					/>
					<span style={{ color: isEmergencyCare ? "var(--warn-fg, #d97706)" : "inherit" }}>
						<AlertTriangle size={14} className="inline mr-1 text-amber-500" /> Острая боль / Экстренная помощь
					</span>
				</label>

				<label
					style={{
						display: "flex", alignItems: "center", gap: "6px", cursor: "pointer",
						padding: "4px 8px", borderRadius: "6px",
						background: isDeferredScan ? "rgba(16, 185, 129, 0.15)" : "transparent",
						border: isDeferredScan ? "1px solid var(--ok-fg, #10b981)" : "1px solid var(--line, #e2e8f0)",
						fontSize: "0.8125rem", fontWeight: 600,
					}}
					title="Отложенный ввод скана: отсутствие файла в базе не блокирует расчет"
				>
					<input
						type="checkbox"
						checked={isDeferredScan}
						onChange={(e) => onDeferredScanChange(e.target.checked)}
						style={{ width: "15px", height: "15px", cursor: "pointer" }}
					/>
					<span style={{ color: isDeferredScan ? "var(--ok-fg, #059669)" : "inherit" }}>
						<CheckCircle2 size={14} className="inline mr-1 text-emerald-600" /> Отложенный ввод скана
					</span>
				</label>

				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf,image/*"
					style={{ display: "none" }}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) onAttachedScanFileNameChange(file.name);
					}}
				/>
				<button
					type="button"
					className="dms-btn dms-btn-secondary secondary-button"
					onClick={() => fileInputRef.current?.click()}
					title="Прикрепить скан гарантийного письма"
				>
					<FileCheck2 size={14} />
					<span>{attachedScanFileName ? `Скан: ${attachedScanFileName}` : "Скан ГП (PDF)"}</span>
				</button>
			</div>

			{isEmergencyCare && (
				<div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.1)", color: "var(--warn-fg, #d97706)", fontSize: "0.8125rem", fontWeight: 600, marginTop: "10px" }}>
					<AlertTriangle size={16} />
					<span>Задержка гарантийного письма ДМС не блокирует приём врача. Требуется досылка гарантийного письма ДМС.</span>
				</div>
			)}

			{isDeferredScan && !isEmergencyCare && (
				<div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", color: "var(--ok-fg, #059669)", fontSize: "0.8125rem", fontWeight: 600, marginTop: "10px" }}>
					<CheckCircle2 size={16} />
					<span>Режим досылки активен: отсутствие скана гарантийного письма не блокирует приём врача.</span>
				</div>
			)}
		</>
	);
}
