/**
 * VisiographDropzone.tsx — Зона перетаскивания и загрузки снимков визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { VisiographDropzoneActions } from "./dropzone/VisiographDropzoneActions.js";

export interface VisiographDropzoneProps {
	dropRef: React.RefObject<HTMLButtonElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	isDragOver: boolean;
	setIsDragOver: (over: boolean) => void;
	isAnalyzing: boolean;
	onDrop: (e: React.DragEvent) => void;
	onConnectRvg?: (() => void) | undefined;
	onUploadDicom?: (() => void) | undefined;
	onReferToRadiology?: (() => void) | undefined;
	toothCode?: string | undefined;
	effectivePatientId?: string | null | undefined;
	demoScanButton: React.ReactNode;
}

export function VisiographDropzone({
	dropRef,
	fileInputRef,
	isDragOver,
	setIsDragOver,
	isAnalyzing,
	onDrop,
	onConnectRvg,
	onUploadDicom,
	onReferToRadiology,
	toothCode,
	effectivePatientId,
	demoScanButton,
}: VisiographDropzoneProps) {
	return (
		<button
			type="button"
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			ref={dropRef as any}
			onDrop={onDrop}
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragOver(true);
			}}
			onDragLeave={() => setIsDragOver(false)}
			onClick={() => !isAnalyzing && fileInputRef.current?.click()}
			style={{
				width: "100%",
				border: `2px dashed ${isDragOver ? "var(--teal)" : "var(--line-strong)"}`,
				borderRadius: "14px",
				padding: "24px 16px",
				textAlign: "center",
				cursor: isAnalyzing ? "not-allowed" : "pointer",
				background: isDragOver ? "var(--teal-soft)" : "var(--paper-soft)",
				transition: "all 0.25s ease",
				opacity: isAnalyzing ? 0.7 : 1,
			}}
		>
			{isAnalyzing ? (
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
					<Loader2 size={36} className="animate-spin" style={{ color: "var(--teal)" }} />
					<p style={{ margin: 0, fontWeight: 600, color: "var(--ink)", fontSize: "0.95rem" }}>
						Анализируем снимок...
					</p>
					<p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
						ИИ-модель обрабатывает данные. Обычно 10–25 секунд.
					</p>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
					<div
						style={{
							width: "50px", height: "50px", borderRadius: "12px",
							background: isDragOver ? "var(--teal-soft)" : "var(--paper)",
							border: "1px solid var(--line)", display: "flex",
							alignItems: "center", justifyContent: "center",
							boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
						}}
					>
						<UploadCloud size={24} style={{ color: "var(--teal)" }} />
					</div>
					<div>
						<p style={{ margin: 0, fontWeight: 700, fontSize: "0.98rem", color: isDragOver ? "var(--teal)" : "var(--ink)" }}>
							{isDragOver ? "Отпустите снимок для загрузки" : "Перетащите снимок сюда или выберите файл"}
						</p>
						<p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
							Прицельный снимок (JPG, PNG, BMP). Мгновенное открытие (&lt;50мс).
						</p>
					</div>

					<VisiographDropzoneActions
						fileInputRef={fileInputRef}
						onConnectRvg={onConnectRvg}
						onUploadDicom={onUploadDicom}
						onReferToRadiology={onReferToRadiology}
						toothCode={toothCode}
						effectivePatientId={effectivePatientId}
						demoScanButton={demoScanButton}
					/>
				</div>
			)}
		</button>
	);
}
