/**
 * @file index.tsx
 * @description Мастер-координатор DemoCaseViewerModal и публичные реэкспорты модулей модалки клинических демо-кейсов.
 * Layer 5: Координатор и публичный фасад директории caseViewerModal (МАНДАТ 8y, МАНДАТ 8n).
 */

import React, { useState } from "react";
import {
	Award,
	CheckCircle,
	Printer,
} from "lucide-react";
import {
	getDemoRoleClinicalDetails,
	generateDemoDiplomaForBravery,
	simulateDemoAppointmentStatusChange,
} from "../../../utils/demo/demoInteractiveSimulation.js";
import { showToast } from "../../GlobalToast.js";

import type { DemoCaseViewerModalProps } from "./types.js";
import { DEMO_CLINICAL_CASES } from "./types.js";
import { DemoCaseHeaderBar } from "./DemoCaseHeaderBar.js";
import { DemoCaseMediaGallery } from "./DemoCaseMediaGallery.js";
import { DemoCaseTreatmentTimeline } from "./DemoCaseTreatmentTimeline.js";
import { DemoCaseFinancialSummary } from "./DemoCaseFinancialSummary.js";

export * from "./types.js";
export * from "./DemoCaseHeaderBar.js";
export * from "./DemoCaseMediaGallery.js";
export * from "./DemoCaseTreatmentTimeline.js";
export * from "./DemoCaseFinancialSummary.js";

export const DemoCaseViewerModal: React.FC<DemoCaseViewerModalProps> = ({
	isOpen,
	activeRoleKey,
	onClose,
	onSelectRole,
	initialCaseId,
}) => {
	// Автоматический выбор кейса по активной клинической роли
	const getDefaultCaseId = (roleKey: string): string => {
		switch (roleKey) {
			case "surgeon":
				return "all_on_4";
			case "orthopedist":
				return "total_rehab";
			case "orthodontist":
				return "orthodontics";
			case "therapist":
				return "therapy_endo";
			case "owner":
				return "all_on_4";
			case "admin":
			default:
				return "all_on_4";
		}
	};

	const [selectedCaseId, setSelectedCaseId] = useState<string>(
		initialCaseId || getDefaultCaseId(activeRoleKey),
	);
	const [activeTab, setActiveTab] = useState<"case" | "media" | "estimate" | "diploma">("case");
	const [braveryAwarded, setBraveryAwarded] = useState(false);
	const [statusUpdated, setStatusUpdated] = useState(false);

	if (!isOpen) return null;

	const currentCase = DEMO_CLINICAL_CASES[selectedCaseId] || DEMO_CLINICAL_CASES.all_on_4!;
	const details = getDemoRoleClinicalDetails(activeRoleKey);
	const { profile } = details;

	const handleAwardDiploma = () => {
		const diploma = generateDemoDiplomaForBravery(
			profile.targetPatientId === "01a00000-0000-0000-0000-000000000001"
				? "Смирнова Анна Сергеевна"
				: profile.doctorName,
		);
		setBraveryAwarded(true);
		showToast(
			`Выдан ${diploma.diplomaNumber} пациенту ${diploma.patientName}!`,
			"success",
		);
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleSimulateStatusComplete = () => {
		simulateDemoAppointmentStatusChange(
			"01a00000-0000-0000-0001-000000000002",
			"completed",
		);
		setStatusUpdated(true);
		showToast("Статус приёма переключен: «Завершен». Смета готова к оплате!", "success");
	};

	return (
		<div
			className="demo-case-modal-overlay"
			data-testid="demo-case-modal"
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(15, 23, 42, 0.75)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 10000,
				padding: "16px",
			}}
			onClick={onClose}
		>
			<div
				className="demo-case-modal-card"
				role="dialog"
				aria-modal="true"
				aria-labelledby="demo-case-title"
				style={{
					background: "var(--paper-strong, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "12px",
					width: "100%",
					maxWidth: "880px",
					maxHeight: "92vh",
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
					color: "var(--ink, #0f172a)",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* 1. Модульная шапка кейса */}
				<DemoCaseHeaderBar
					activeRoleKey={activeRoleKey}
					selectedCaseId={selectedCaseId}
					currentCase={currentCase}
					onSelectCase={setSelectedCaseId}
					onSelectRole={onSelectRole}
					onClose={onClose}
					profileBadge={profile.badge}
					profileDescription={profile.description}
				/>

				{/* 2. Навигационные вкладки модалки */}
				<div
					style={{
						display: "flex",
						gap: "8px",
						padding: "10px 20px",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						background: "var(--paper, #f8fafc)",
						overflowX: "auto",
					}}
				>
					<button
						type="button"
						data-testid="demo-tab-case"
						onClick={() => setActiveTab("case")}
						style={{
							padding: "6px 14px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								activeTab === "case"
									? "var(--brand-accent, #6366f1)"
									: "transparent",
							color: activeTab === "case" ? "#ffffff" : "var(--ink, #0f172a)",
							whiteSpace: "nowrap",
							transition: "all 0.15s ease",
						}}
					>
						Клинический кейс и протокол
					</button>

					<button
						type="button"
						data-testid="demo-tab-media"
						onClick={() => setActiveTab("media")}
						style={{
							padding: "6px 14px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								activeTab === "media"
									? "var(--brand-accent, #6366f1)"
									: "transparent",
							color: activeTab === "media" ? "#ffffff" : "var(--ink, #0f172a)",
							whiteSpace: "nowrap",
							transition: "all 0.15s ease",
						}}
					>
						КТ & Фотопротокол До/После ({currentCase.media.length})
					</button>

					<button
						type="button"
						data-testid="demo-tab-estimate"
						onClick={() => setActiveTab("estimate")}
						style={{
							padding: "6px 14px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								activeTab === "estimate"
									? "var(--brand-accent, #6366f1)"
									: "transparent",
							color: activeTab === "estimate" ? "#ffffff" : "var(--ink, #0f172a)",
							whiteSpace: "nowrap",
							transition: "all 0.15s ease",
						}}
					>
						Смета приёма ({currentCase.totalNetRub.toLocaleString("ru-RU")} ₽)
					</button>

					<button
						type="button"
						data-testid="demo-tab-diploma"
						onClick={() => setActiveTab("diploma")}
						style={{
							padding: "6px 14px",
							borderRadius: "6px",
							fontSize: "12px",
							fontWeight: 600,
							border: "none",
							cursor: "pointer",
							background:
								activeTab === "diploma"
									? "var(--brand-accent, #6366f1)"
									: "transparent",
							color: activeTab === "diploma" ? "#ffffff" : "var(--ink, #0f172a)",
							whiteSpace: "nowrap",
							transition: "all 0.15s ease",
						}}
					>
						Диплом за храбрость
					</button>
				</div>

				{/* 3. Рабочая область модалки */}
				<div style={{ padding: "20px", overflowY: "auto", flex: 1, fontSize: "13px" }}>
					{/* Вкладка 1: Таймлайн этапов и клинический протокол */}
					{activeTab === "case" && (
						<DemoCaseTreatmentTimeline
							stages={currentCase.stages}
							activeRoleKey={activeRoleKey}
							clinicalDetails={details}
						/>
					)}

					{/* Вкладка 2: Галерея До/После и КТ сплиттер */}
					{activeTab === "media" && (
						<DemoCaseMediaGallery media={currentCase.media} />
					)}

					{/* Вкладка 3: Смета и финансовый расчет по 804н */}
					{activeTab === "estimate" && (
						<DemoCaseFinancialSummary
							items={currentCase.financialItems}
							totalGrossRub={currentCase.totalGrossRub}
							totalDiscountRub={currentCase.totalDiscountRub}
							totalNetRub={currentCase.totalNetRub}
							patientSavingsRub={currentCase.patientSavingsRub}
						/>
					)}

					{/* Вкладка 4: Диплом за храбрость (Печатная форма) */}
					{activeTab === "diploma" && (
						<div
							style={{
								padding: "24px",
								background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
								border: "2px solid #f59e0b",
								borderRadius: "12px",
								textAlign: "center",
								color: "#78350f",
							}}
						>
							<Award size={48} style={{ color: "#d97706", margin: "0 auto 8px" }} />
							<h2
								style={{
									margin: "0 0 6px",
									fontSize: "20px",
									fontWeight: 800,
									textTransform: "uppercase",
								}}
							>
								Диплом за храбрость
							</h2>
							<p style={{ margin: "0 0 14px", fontSize: "14px" }}>
								Награждается пациент:{" "}
								<strong>
									{profile.targetPatientId === "01a00000-0000-0000-0000-000000000001"
										? "Смирнова Анна Сергеевна"
										: profile.doctorName}
								</strong>
							</p>
							<div
								style={{
									fontSize: "13px",
									fontStyle: "italic",
									maxWidth: "460px",
									margin: "0 auto 16px",
								}}
							>
								«За выдающееся мужество, безупречное спокойствие в кресле стоматолога и
								образцовую сияющую улыбку!»
							</div>

							<div
								style={{
									display: "flex",
									justifyContent: "space-around",
									fontSize: "12px",
									borderTop: "1px dashed #d97706",
									paddingTop: "12px",
								}}
							>
								<div>Лечащий врач: {profile.doctorName}</div>
								<div>Клиника DENTE</div>
								<div>Дата: {new Date().toLocaleDateString("ru-RU")}</div>
							</div>

							<button
								type="button"
								onClick={handleAwardDiploma}
								style={{
									marginTop: "16px",
									background: "#d97706",
									color: "#ffffff",
									border: "none",
									borderRadius: "6px",
									padding: "8px 18px",
									fontWeight: 700,
									fontSize: "13px",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
								}}
							>
								<Printer size={16} /> Распечатать диплом
							</button>
						</div>
					)}
				</div>

				{/* 4. Подвал с интерактивными действиями (Zero Dead-Ends) */}
				<div
					style={{
						padding: "12px 20px",
						borderTop: "1px solid var(--line, #e2e8f0)",
						background: "var(--paper, #f8fafc)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							onClick={handleSimulateStatusComplete}
							disabled={statusUpdated}
							style={{
								background: statusUpdated
									? "var(--ok-fg, #10b981)"
									: "var(--brand-accent, #6366f1)",
								color: "#ffffff",
								border: "none",
								borderRadius: "6px",
								padding: "6px 14px",
								fontSize: "12px",
								fontWeight: 600,
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<CheckCircle size={14} />
							{statusUpdated ? "Приём завершён ✓" : "Симулировать: Завершить приём"}
						</button>
					</div>

					<button
						type="button"
						onClick={onClose}
						style={{
							background: "var(--paper-strong, #ffffff)",
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "6px",
							padding: "6px 14px",
							fontSize: "12px",
							fontWeight: 600,
							cursor: "pointer",
							color: "var(--ink, #0f172a)",
						}}
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};

export default DemoCaseViewerModal;
