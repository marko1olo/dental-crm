/**
 * @file DemoCaseTreatmentTimeline.tsx
 * @description Таймлайн этапов кейса: диагностика/терапия -> хирургия -> ортопедия -> финиш.
 * Интегрирует клинические протоколы (SOAP 043/у, наряд ЗТЛ, элайнеры, хирургия, дашборд главврача).
 * Layer 4: Презентационный компонент таймлайна (МАНДАТ 8y, МАНДАТ 8n).
 */

import React, { useState } from "react";
import {
	Activity,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Crown,
	FileText,
	Sparkles,
	Stethoscope,
	User,
} from "lucide-react";
import type { DemoTreatmentStage } from "./types.js";
import type {
	DemoOdontogramToothState,
	DemoSoapDiary,
	DemoLabOrderCase,
	DemoOrthoCase,
	DemoSurgeonCase,
	DemoExecutiveKpiCase,
} from "../../../utils/demo/demoClinicalCases.js";

export interface DemoCaseTreatmentTimelineProps {
	readonly stages: DemoTreatmentStage[];
	readonly activeRoleKey: string;
	readonly clinicalDetails?: {
		odontogram?: DemoOdontogramToothState[];
		soapDiary?: DemoSoapDiary;
		labOrder?: DemoLabOrderCase;
		orthoCase?: DemoOrthoCase;
		surgeonCase?: DemoSurgeonCase;
		executiveKpis?: DemoExecutiveKpiCase;
	};
}

export const DemoCaseTreatmentTimeline: React.FC<DemoCaseTreatmentTimelineProps> = ({
	stages,
	activeRoleKey,
	clinicalDetails,
}) => {
	const [expandedStageId, setExpandedStageId] = useState<string>(stages[0]?.id || "");
	const [showRoleDetails, setShowRoleDetails] = useState<boolean>(true);

	const getStatusBadge = (status: DemoTreatmentStage["status"]) => {
		switch (status) {
			case "completed":
				return (
					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							background: "rgba(16, 185, 129, 0.15)",
							color: "var(--ok-fg, #10b981)",
							padding: "2px 8px",
							borderRadius: "4px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<CheckCircle2 size={12} /> Завершено
					</span>
				);
			case "in_progress":
				return (
					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							background: "rgba(99, 102, 241, 0.15)",
							color: "var(--brand-accent, #6366f1)",
							padding: "2px 8px",
							borderRadius: "4px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Clock size={12} /> В процессе
					</span>
				);
			case "planned":
			default:
				return (
					<span
						style={{
							fontSize: "11px",
							fontWeight: 600,
							background: "var(--line-subtle, #f1f5f9)",
							color: "var(--muted, #64748b)",
							padding: "2px 8px",
							borderRadius: "4px",
						}}
					>
						Запланировано
					</span>
				);
		}
	};

	return (
		<div
			data-testid="demo-treatment-timeline"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			{/* Верхняя плашка переключения между таймлайном и протоколом роли */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "8px 12px",
					background: "var(--paper, #f8fafc)",
					borderRadius: "8px",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					Клинический маршрут пациента ({stages.length} этапа)
				</span>
				<button
					type="button"
					onClick={() => setShowRoleDetails(!showRoleDetails)}
					style={{
						padding: "4px 10px",
						borderRadius: "6px",
						fontSize: "11px",
						fontWeight: 600,
						border: "1px solid var(--line, #e2e8f0)",
						background: showRoleDetails ? "var(--teal-soft, rgba(13, 148, 136, 0.1))" : "transparent",
						color: showRoleDetails ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
						cursor: "pointer",
					}}
				>
					{showRoleDetails ? "Скрыть детали протокола" : "Показать протокол приёма"}
				</button>
			</div>

			{/* Список шагов таймлайна */}
			<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
				{stages.map((stage) => {
					const isExpanded = stage.id === expandedStageId;
					return (
						<div
							key={stage.id}
							data-testid="demo-timeline-stage"
							style={{
								border: isExpanded
									? "1px solid var(--brand-accent, #6366f1)"
									: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
								background: "var(--paper-strong, #ffffff)",
								overflow: "hidden",
								transition: "all 0.15s ease",
							}}
						>
							<div
								onClick={() => setExpandedStageId(isExpanded ? "" : stage.id)}
								style={{
									padding: "12px 16px",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									cursor: "pointer",
									background: isExpanded ? "var(--paper, #f8fafc)" : "transparent",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
									<div
										style={{
											width: "26px",
											height: "26px",
											borderRadius: "50%",
											background: stage.status === "completed"
												? "var(--ok-fg, #10b981)"
												: stage.status === "in_progress"
													? "var(--brand-accent, #6366f1)"
													: "var(--line, #e2e8f0)",
											color: "#ffffff",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "12px",
											fontWeight: 700,
										}}
									>
										{stage.stageNumber}
									</div>

									<div>
										<div style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink, #0f172a)" }}>
											{stage.title}
										</div>
										<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
											Врач: {stage.doctorName} • Срок: ~{stage.durationDays} дн.
										</div>
									</div>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
									<span style={{ fontWeight: 700, fontSize: "13px", color: "var(--teal, #0d9488)" }}>
										{stage.stageCostRub.toLocaleString("ru-RU")} ₽
									</span>
									{getStatusBadge(stage.status)}
									{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
								</div>
							</div>

							{isExpanded && (
								<div
									style={{
										padding: "14px 16px",
										borderTop: "1px solid var(--line, #e2e8f0)",
										background: "var(--paper-strong, #ffffff)",
										fontSize: "12px",
										display: "flex",
										flexDirection: "column",
										gap: "8px",
									}}
								>
									<div>
										<strong>Клиническое содержание:</strong> {stage.clinicalDescription}
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
										<strong style={{ color: "var(--muted, #64748b)" }}>Номенклатура 804н:</strong>
										{stage.nomenclatureCodes.map((code) => (
											<span
												key={code}
												style={{
													fontFamily: "monospace",
													fontSize: "11px",
													background: "var(--paper, #f8fafc)",
													border: "1px solid var(--line, #e2e8f0)",
													padding: "1px 6px",
													borderRadius: "4px",
												}}
											>
												{code}
											</span>
										))}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Протокол активной роли (SOAP, ЗТЛ, Ортодонтия, Хирургия, KPIs) */}
			{showRoleDetails && clinicalDetails && (
				<div
					style={{
						marginTop: "8px",
						padding: "16px",
						borderRadius: "8px",
						background: "var(--paper, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					{/* ТЕРАПЕВТ: SOAP 043/у */}
					{activeRoleKey === "therapist" && clinicalDetails.soapDiary && (
						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							<div style={{ fontWeight: 700, color: "var(--teal, #0d9488)", fontSize: "13px" }}>
								📋 Электронная медицинская карта (Форма 043/у):
							</div>
							<div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
								<div><strong>Жалобы:</strong> {clinicalDetails.soapDiary.complaints}</div>
								<div><strong>Анамнез:</strong> {clinicalDetails.soapDiary.anamnesis}</div>
								<div><strong>Status Localis:</strong> {clinicalDetails.soapDiary.statusLocalis}</div>
								<div>
									<strong>Диагноз (МКБ-10):</strong>{" "}
									<span style={{ color: "var(--danger, #ef4444)", fontWeight: 700 }}>
										{clinicalDetails.soapDiary.diagnosisIcd10}
									</span>
								</div>
								<div><strong>Протокол лечения:</strong> {clinicalDetails.soapDiary.treatmentProtocol}</div>
								<div><strong>Рекомендации:</strong> {clinicalDetails.soapDiary.recommendations}</div>
							</div>
						</div>
					)}

					{/* ОРТОПЕД: Заказ-наряд ЗТЛ */}
					{activeRoleKey === "orthopedist" && clinicalDetails.labOrder && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<span style={{ fontWeight: 700, fontSize: "13px", color: "var(--amber, #f59e0b)" }}>
									Заказ-наряд в ЗТЛ {clinicalDetails.labOrder.orderNumber}
								</span>
								<span
									style={{
										fontSize: "11px",
										fontWeight: 600,
										padding: "2px 8px",
										borderRadius: "4px",
										background: "rgba(245, 158, 11, 0.15)",
										color: "var(--amber, #d97706)",
									}}
								>
									Этап: {clinicalDetails.labOrder.currentStageRu} ({clinicalDetails.labOrder.currentStageIndex} из {clinicalDetails.labOrder.totalStagesCount})
								</span>
							</div>
							<div><strong>Конструкция:</strong> {clinicalDetails.labOrder.constructionTypeRu} — {clinicalDetails.labOrder.materialRu}</div>
							<div><strong>Расцветка (VITA):</strong> {clinicalDetails.labOrder.vitaShade} (культя: {clinicalDetails.labOrder.stumpShade})</div>
							<div><strong>Лаборатория:</strong> {clinicalDetails.labOrder.labName} ({clinicalDetails.labOrder.technicianName})</div>
							<div>
								<strong>Финансы:</strong> Для пациента: {clinicalDetails.labOrder.patientPriceRub.toLocaleString("ru-RU")} ₽ |
								ЗТЛ: {clinicalDetails.labOrder.labCostRub.toLocaleString("ru-RU")} ₽ |
								Врачу (20%): {clinicalDetails.labOrder.doctorCommissionRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
					)}

					{/* ОРТОДОНТ: Элайнеры */}
					{activeRoleKey === "orthodontist" && clinicalDetails.orthoCase && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
							<div style={{ fontWeight: 700, fontSize: "13px", color: "var(--brand-accent, #6366f1)" }}>
								Ортодонтическая карта: {clinicalDetails.orthoCase.systemType}
							</div>
							<div><strong>Диагноз:</strong> {clinicalDetails.orthoCase.biteDiagnosisRu} ({clinicalDetails.orthoCase.angleClass})</div>
							<div>
								<strong>Прогресс элайнеров:</strong> Капа {clinicalDetails.orthoCase.currentAlignerTray} из {clinicalDetails.orthoCase.totalAlignerTrays} ({clinicalDetails.orthoCase.progressPercent}% выполнено)
							</div>
							<div><strong>Аттачменты:</strong> Зубы {clinicalDetails.orthoCase.attachmentTeeth.join(", ")}</div>
							<div><strong>IPR:</strong> {clinicalDetails.orthoCase.iprProtocolRu}</div>
						</div>
					)}

					{/* ХИРУРГ: Имплантация */}
					{activeRoleKey === "surgeon" && clinicalDetails.surgeonCase && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
							<div style={{ fontWeight: 700, fontSize: "13px", color: "var(--danger, #ef4444)" }}>
								Хирургический протокол имплантации (Зуб {clinicalDetails.surgeonCase.toothNumber})
							</div>
							<div><strong>Имплантат:</strong> {clinicalDetails.surgeonCase.implantSystemRu} ({clinicalDetails.surgeonCase.implantSizeRu})</div>
							<div><strong>Торк затяжки:</strong> {clinicalDetails.surgeonCase.insertionTorqueNcm} Н·см | ISQ: {clinicalDetails.surgeonCase.stabilityIsq} (кость: {clinicalDetails.surgeonCase.boneDensityMisch})</div>
							<div><strong>Анестезия:</strong> {clinicalDetails.surgeonCase.anesthesiaProtocolRu}</div>
							<div><strong>Ход операции:</strong> {clinicalDetails.surgeonCase.surgicalProtocolRu}</div>
							<div><strong>ИДС:</strong> <span style={{ color: "var(--ok-fg, #10b981)", fontWeight: 700 }}>✓ Подписано (ИДС-ХИР-1051н)</span></div>
						</div>
					)}

					{/* ГЛАВВРАЧ: KPIs */}
					{activeRoleKey === "owner" && clinicalDetails.executiveKpis && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
							<div style={{ fontWeight: 700, fontSize: "13px", color: "var(--gold, #d97706)" }}>
								Сквозная аналитика: {clinicalDetails.executiveKpis.periodName}
							</div>
							<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
								<div style={{ padding: "8px", background: "var(--paper-strong, #ffffff)", borderRadius: "6px", border: "1px solid var(--line, #e2e8f0)" }}>
									<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>Выручка факт</div>
									<div style={{ fontSize: "14px", fontWeight: 700 }}>{clinicalDetails.executiveKpis.monthRevenueFactRub.toLocaleString("ru-RU")} ₽</div>
								</div>
								<div style={{ padding: "8px", background: "var(--paper-strong, #ffffff)", borderRadius: "6px", border: "1px solid var(--line, #e2e8f0)" }}>
									<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>Загрузка кресел</div>
									<div style={{ fontSize: "14px", fontWeight: 700 }}>{clinicalDetails.executiveKpis.chairOccupancyRatePercent}%</div>
								</div>
								<div style={{ padding: "8px", background: "var(--paper-strong, #ffffff)", borderRadius: "6px", border: "1px solid var(--line, #e2e8f0)" }}>
									<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>Средний чек</div>
									<div style={{ fontSize: "14px", fontWeight: 700 }}>{clinicalDetails.executiveKpis.averageCheckRub.toLocaleString("ru-RU")} ₽</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
