/**
 * DENTE CRM — Patient Portal Diagnostic Scans Section (Fast 2D Access)
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Encapsulates the diagnostic radiology scan grid with radiation dose indicators (µSv),
 * modal triggers, and honest empty/placeholder states.
 */

import { Camera, Eye, Scan } from "lucide-react";
import React from "react";
import type { PatientDiagnosticScan } from "./PlanScanViewerModal.js";

export interface PlanDiagnosticScansSectionProps {
	readonly scans: readonly PatientDiagnosticScan[];
	readonly onSelectScan: (scan: PatientDiagnosticScan) => void;
}

export const PlanDiagnosticScansSection: React.FC<PlanDiagnosticScansSectionProps> = ({
	scans,
	onSelectScan,
}) => {
	return (
		<div
			className="pc-card diagnostic-scans-card"
			data-testid="diagnostic-scans-card"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				borderRadius: "12px",
				border: "1px solid var(--pc-border, #334155)",
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "6px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Scan size={18} style={{ color: "var(--pc-primary, #0d9488)" }} />
					<div>
						<h4
							style={{
								margin: 0,
								fontSize: "15px",
								fontWeight: 800,
								color: "var(--pc-text-main, var(--ink, #0f172a))",
							}}
						>
							Диагностические снимки и рентген-контроль
						</h4>
						<p
							style={{
								margin: "2px 0 0 0",
								fontSize: "12px",
								color: "var(--pc-text-muted, #94a3b8)",
							}}
						>
							Быстрый просмотр цифровых снимков плана лечения без задержек и подвисаний:
						</p>
					</div>
				</div>
				<span
					style={{
						fontSize: "12px",
						fontWeight: 700,
						color: "var(--pc-primary, #0d9488)",
						backgroundColor: "rgba(13, 148, 136, 0.15)",
						padding: "4px 8px",
						borderRadius: "6px",
						border: "1px solid rgba(13, 148, 136, 0.3)",
					}}
				>
					Мгновенный 2D доступ
				</span>
			</div>

			{scans.length === 0 ? (
				<div
					data-testid="plan-scans-empty-state"
					style={{
						padding: "32px 16px",
						textAlign: "center",
						backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
						border: "1px dashed var(--pc-border, #334155)",
						borderRadius: "10px",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: "10px",
					}}
				>
					<Camera size={32} style={{ color: "var(--pc-text-muted, #94a3b8)", opacity: 0.6 }} />
					<div
						style={{
							fontSize: "13px",
							fontWeight: 700,
							color: "var(--pc-text-main, var(--ink, #0f172a))",
						}}
					>
						Диагностические снимки не прикреплены
					</div>
					<p
						style={{
							margin: 0,
							fontSize: "12px",
							color: "var(--pc-text-muted, #94a3b8)",
							maxWidth: "340px",
							lineHeight: "1.4",
						}}
					>
						В карте пациента пока нет загруженных радиовизиографических или томографических снимков. Снимки появятся здесь сразу после проведения рентген-диагностики.
					</p>
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
						gap: "12px",
					}}
				>
					{scans.map((scan) => (
						<div
							key={scan.id}
							style={{
								backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
								border: "1px solid var(--pc-border, #334155)",
								borderRadius: "10px",
								overflow: "hidden",
								display: "flex",
								flexDirection: "column",
							}}
							data-testid={`plan-scan-card-${scan.id}`}
						>
							<div
								style={{
									position: "relative",
									height: "140px",
									backgroundColor: "#020617",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									cursor: "pointer",
								}}
								onClick={() => onSelectScan(scan)}
								title="Нажмите для увеличения снимка"
							>
								{scan.previewUrl ? (
									<img
										src={scan.previewUrl}
										alt={scan.titleRu}
										loading="lazy"
										decoding="async"
										style={{
											maxHeight: "100%",
											maxWidth: "100%",
											objectFit: "contain",
										}}
									/>
								) : (
									<div
										data-testid={`scan-placeholder-${scan.id}`}
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											gap: "6px",
											color: "var(--pc-text-muted, #94a3b8)",
											padding: "16px",
											textAlign: "center",
										}}
									>
										<Camera size={28} style={{ opacity: 0.7 }} />
										<span style={{ fontSize: "12px", fontWeight: 600 }}>
											Снимок обрабатывается
										</span>
									</div>
								)}
								<span
									style={{
										position: "absolute",
										top: "8px",
										right: "8px",
										backgroundColor: "rgba(15, 23, 42, 0.85)",
										border: "1px solid rgba(255, 255, 255, 0.15)",
										color: "#38bdf8",
										fontSize: "12px",
										fontWeight: 800,
										padding: "2px 6px",
										borderRadius: "4px",
									}}
								>
									{scan.doseMicroSv} мкЗв
								</span>
							</div>

							<div
								style={{
									padding: "12px",
									display: "flex",
									flexDirection: "column",
									gap: "6px",
									flex: 1,
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										fontSize: "12px",
										color: "var(--pc-text-muted, #94a3b8)",
									}}
								>
									<span style={{ fontWeight: 700, color: "var(--pc-primary, #0d9488)" }}>
										{scan.modalityRu}
									</span>
									<span>{scan.dateRu}</span>
								</div>
								<strong
									style={{
										fontSize: "13px",
										color: "var(--pc-text-main, var(--ink, #0f172a))",
									}}
								>
									{scan.titleRu}
								</strong>
								<p
									style={{
										margin: 0,
										fontSize: "12px",
										color: "var(--pc-text-muted, #94a3b8)",
										lineHeight: "1.4",
									}}
								>
									{scan.conclusionRu}
								</p>

								<button
									type="button"
									onClick={() => onSelectScan(scan)}
									style={{
										marginTop: "auto",
										minHeight: "36px",
										backgroundColor: "rgba(255, 255, 255, 0.05)",
										border: "1px solid var(--pc-border, #334155)",
										borderRadius: "6px",
										color: "var(--pc-text-main, var(--ink, #0f172a))",
										fontSize: "12px",
										fontWeight: 700,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
									}}
									data-testid={`open-scan-btn-${scan.id}`}
								>
									<Eye size={14} style={{ color: "var(--pc-primary, #0d9488)" }} />
									<span>Открыть снимок</span>
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export const PatientPlanDiagnosticScansSection = PlanDiagnosticScansSection;
export default PlanDiagnosticScansSection;
