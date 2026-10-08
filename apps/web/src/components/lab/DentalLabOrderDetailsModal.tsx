/**
 * DentalLabOrderDetailsModal.tsx — Detail Inspection Modal, Warranty Rework Dialog,
 * and Action Prompt (Bite photo / technician comment) Modal.
 */

import React, { useState } from "react";
import { X, CheckCircle2, RotateCcw, Printer, Box } from "lucide-react";
import {
	type DentalLabWorkflowOrder,
	LAB_WORKFLOW_STATUSES,
	formatRussianDate,
} from "./dentalLabWorkflowEngine";
import {
	ABUTMENT_TYPE_OPTIONS,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	type LabTechnologicalStageId,
} from "./orders/labWorkOrderPresets";

export interface ActionPromptState {
	order: DentalLabWorkflowOrder;
	type: "bite_photo" | "technician_comment";
	title: string;
	label: string;
	placeholder: string;
}

export interface DentalLabOrderDetailsModalProps {
	readonly inspectingOrder: DentalLabWorkflowOrder | null;
	readonly onCloseInspect: () => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onAdvanceTechStage: (order: DentalLabWorkflowOrder, targetTechStage?: LabTechnologicalStageId) => void;
	readonly onOpenWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onView3DScan?: (order: DentalLabWorkflowOrder) => void;

	readonly warrantyReworkOrder: DentalLabWorkflowOrder | null;
	readonly onCloseWarrantyRework: () => void;
	readonly onWarrantyReworkSubmit: (order: DentalLabWorkflowOrder, reason: string) => void;

	readonly actionPrompt: ActionPromptState | null;
	readonly onCloseActionPrompt: () => void;
	readonly onActionPromptSubmit: (order: DentalLabWorkflowOrder, type: "bite_photo" | "technician_comment", value: string) => void;
}

export const DentalLabOrderDetailsModal: React.FC<DentalLabOrderDetailsModalProps> = ({
	inspectingOrder,
	onCloseInspect,
	onPrintBlank,
	onAdvanceTechStage,
	onOpenWarrantyRework,
	onView3DScan,
	warrantyReworkOrder,
	onCloseWarrantyRework,
	onWarrantyReworkSubmit,
	actionPrompt,
	onCloseActionPrompt,
	onActionPromptSubmit,
}) => {
	const [warrantyReason, setWarrantyReason] = useState<string>("Скол керамической облицовки");
	const [actionPromptValue, setActionPromptValue] = useState<string>("");

	const handleWarrantySubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!warrantyReworkOrder) return;
		onWarrantyReworkSubmit(warrantyReworkOrder, warrantyReason || "Гарантийная рекламация");
	};

	const handlePromptSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!actionPrompt || !actionPromptValue.trim()) return;
		onActionPromptSubmit(actionPrompt.order, actionPrompt.type, actionPromptValue.trim());
		setActionPromptValue("");
	};

	return (
		<>
			{/* ─── 1. МОДАЛКА ПРОСМОТРА ДЕТАЛЕЙ НАКАЗА ───────────────────────── */}
			{inspectingOrder && (
				<div className="ztl-detail-overlay">
					<div className="ztl-detail-card">
						<header className="ztl-detail-header">
							<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
								Детали наряд-заказа № {inspectingOrder.orderNumber}
							</h3>
							<button
								type="button"
								className="ztl-btn-icon"
								onClick={onCloseInspect}
							>
								<X size={16} />
							</button>
						</header>

						<div className="ztl-detail-body">
							{inspectingOrder.isWarrantyRework && (
								<div style={{ background: "rgba(225, 29, 72, 0.08)", border: "1px solid rgba(225, 29, 72, 0.3)", color: "var(--bad-fg, #e11d48)", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
									<RotateCcw size={16} color="var(--bad-fg, #e11d48)" />
									<div>
										<strong>Гарантийная рекламация!</strong> Исходный наряд: <strong>№ {inspectingOrder.originalOrderNumber || inspectingOrder.originalOrderId}</strong>
										{inspectingOrder.reworkReason && <div style={{ fontSize: "11px", marginTop: "2px" }}>Причина: {inspectingOrder.reworkReason}</div>}
									</div>
								</div>
							)}

							<div className="ztl-form-grid-2">
								<div className="min-w-0">
									<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Пациент:</p>
									<p style={{ margin: 0, fontWeight: 700 }} className="truncate" title={inspectingOrder.patientName}>{inspectingOrder.patientName}</p>
								</div>
								<div className="min-w-0">
									<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Врач-ортопед:</p>
									<p style={{ margin: 0, fontWeight: 700 }} className="truncate" title={inspectingOrder.doctorName}>{inspectingOrder.doctorName}</p>
								</div>
							</div>

							<div className="ztl-form-grid-2">
								<div className="min-w-0">
									<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Лаборатория:</p>
									<p style={{ margin: 0, fontWeight: 600 }} className="truncate" title={inspectingOrder.labName}>{inspectingOrder.labName}</p>
								</div>
								<div className="min-w-0">
									<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Конструкция:</p>
									<p style={{ margin: 0, fontWeight: 600 }} className="truncate" title={inspectingOrder.materialName}>{inspectingOrder.materialName}</p>
								</div>
							</div>

							<div className="ztl-form-grid-2">
								<div>
									<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Срок готовности ЗТЛ:</p>
									<p style={{ margin: 0, fontWeight: 700, color: "var(--teal, #0d9488)" }}>{formatRussianDate(inspectingOrder.expectedLabDateIso)}</p>
								</div>
								<div>
									<p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "var(--muted, #64748b)" }}>Дата примерки / Прием:</p>
									<p style={{ margin: 0, fontWeight: 700 }}>
										{inspectingOrder.fittingDate ? formatRussianDate(inspectingOrder.fittingDate) : "—"}
										{inspectingOrder.appointmentId ? ` (${inspectingOrder.appointmentId})` : ""}
									</p>
								</div>
							</div>

							{/* Параметры имплантации и фиксации */}
							{(inspectingOrder.implantPlatform || inspectingOrder.abutmentType || inspectingOrder.fixationType) && (
								<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
									<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
										Параметры имплантологической конструкции:
									</h4>
									<div className="ztl-form-grid-2" style={{ fontSize: "12px" }}>
										{inspectingOrder.implantPlatform && (
											<div>
												Платформа имплантата: <strong>{inspectingOrder.implantPlatform === "conical" ? "Конус Морзе (Morse Taper)" : "Шестигранник (Hex)"}</strong>
											</div>
										)}
										{inspectingOrder.abutmentType && (
											<div>
												Тип абатмента: <strong>{ABUTMENT_TYPE_OPTIONS.find((a) => a.id === inspectingOrder.abutmentType)?.nameRu || inspectingOrder.abutmentType}</strong>
											</div>
										)}
										{inspectingOrder.fixationType && (
											<div>
												Тип фиксации: <strong>{inspectingOrder.fixationType === "screw_retained" ? "Винтовая (Screw-retained)" : "Цементная (Cement-retained)"}</strong>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Маршрутный лист 8 технологических этапов ЗТЛ */}
							<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
									<h4 style={{ margin: 0, fontSize: "12px", fontWeight: 700 }}>
										Маршрутный лист 8 технологических этапов ЗТЛ:
									</h4>
									<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--teal, #0d9488)" }}>
										Текущий: {LAB_TECHNOLOGICAL_STAGES[inspectingOrder.techStage || "impression_scan"]?.shortTitleRu || inspectingOrder.techStage}
									</span>
								</div>
								<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
									{LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
										const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
										const currentStep = LAB_TECHNOLOGICAL_STAGES[inspectingOrder.techStage || "impression_scan"]?.stepNumber ?? 1;
										const isDone = sDef.stepNumber < currentStep;
										const isCurrent = sDef.stepNumber === currentStep;

										return (
											<button
												key={stageKey}
												type="button"
												onClick={() => onAdvanceTechStage(inspectingOrder, stageKey)}
												style={{
													padding: "6px",
													borderRadius: "6px",
													border: isCurrent ? "2px solid var(--teal, #0d9488)" : "1px solid var(--line, #e2e8f0)",
													background: isCurrent ? "var(--teal-surface, #f0fdfa)" : isDone ? "var(--paper-soft, #f8fafc)" : "var(--paper, #ffffff)",
													color: isCurrent ? "var(--teal, #0f766e)" : isDone ? "var(--muted, #64748b)" : "var(--ink, #0f172a)",
													textAlign: "left",
													cursor: "pointer",
													fontSize: "10.5px",
												}}
												title={`${sDef.nameRu}\nЦех: ${sDef.departmentRu}\n${sDef.descriptionRu}`}
											>
												<div style={{ fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
													<span>№{sDef.stepNumber}</span>
													<span style={{ fontSize: "9.5px", display: "inline-flex", alignItems: "center", gap: "2px", color: isDone ? "var(--teal, #059669)" : isCurrent ? "var(--teal, #0d9488)" : "var(--muted, #94a3b8)" }}>
														{isDone ? <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" /> : isCurrent ? "В РАБОТЕ" : "ОЖИДАНИЕ"}
													</span>
												</div>
												<div style={{ marginTop: "2px", fontWeight: isCurrent ? 700 : 500 }} className="truncate">
													{sDef.shortTitleRu}
												</div>
											</button>
										);
									})}
								</div>
							</div>

							<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
								<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
									Финансовый расчет (в копейках):
								</h4>
								<div className="ztl-form-grid-2" style={{ fontSize: "12px" }}>
									<div>Стоимость пациента: <strong>{inspectingOrder.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽</strong></div>
									<div>Себестоимость ЗТЛ: <strong>{inspectingOrder.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽</strong></div>
									<div>Маржа клиники: <strong style={{ color: "var(--teal, #0d9488)" }}>{inspectingOrder.financials.clinicGrossMarginRub.toLocaleString("ru-RU")} ₽</strong></div>
									<div>ЗП врача ({inspectingOrder.financials.doctorPercent}%): <strong>{inspectingOrder.financials.doctorWageRub.toLocaleString("ru-RU")} ₽</strong></div>
								</div>
							</div>

							{/* История стадий */}
							<div>
								<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
									История статусов клинического цикла:
								</h4>
								<div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
									{inspectingOrder.stageHistory.map((hist, i) => (
										<div key={i} style={{ borderLeft: "2px solid var(--teal, #0d9488)", paddingLeft: "8px" }}>
											<span style={{ fontWeight: 700 }}>{LAB_WORKFLOW_STATUSES[hist.stage]?.nameRu || hist.stage}</span>
											<span style={{ color: "var(--muted, #64748b)", marginLeft: "8px" }}>
												{hist.timestampIso.slice(0, 16).replace("T", " ")} ({hist.authorName})
											</span>
											{hist.note && <div style={{ color: "var(--muted, #64748b)" }}>{hist.note}</div>}
										</div>
									))}
								</div>
							</div>
						</div>

						<footer className="ztl-detail-footer">
							{inspectingOrder.currentStage === "installed_completed" && (
								<button
									type="button"
									className="ztl-btn-secondary"
									style={{ color: "var(--bad-fg, #e11d48)", borderColor: "var(--bad-line, #fecdd3)", fontWeight: 700 }}
									onClick={() => onOpenWarrantyRework(inspectingOrder)}
									title="Оформить рекламацию и отправить на гарантийную переделку"
								>
									<RotateCcw size={14} />
									<span>Рекламация</span>
								</button>
							)}
							{onView3DScan && (
								<button
									type="button"
									className="ztl-btn-secondary"
									data-testid="ztl-details-view-3d-scan-btn"
									style={{ color: "var(--teal, #0d9488)", borderColor: "var(--teal-line, #99f6e4)", fontWeight: 700 }}
									onClick={() => onView3DScan(inspectingOrder)}
									title="Открыть интерактивный 3D-скан челюсти (STL/PLY/OBJ)"
								>
									<Box size={14} />
									<span>3D-скан (STL/PLY)</span>
								</button>
							)}
							<button
								type="button"
								className="ztl-btn-secondary"
								onClick={() => onPrintBlank(inspectingOrder)}
							>
								<Printer size={14} />
								<span>Распечатать А4</span>
							</button>
							<button
								type="button"
								className="ztl-btn-primary"
								onClick={onCloseInspect}
							>
								Закрыть
							</button>
						</footer>
					</div>
				</div>
			)}

			{/* ─── 2. МОДАЛЬНОЕ ОКНО ОФОРМЛЕНИЯ ГАРАНТИЙНОЙ РЕКЛАМАЦИИ В ЗТЛ ────── */}
			{warrantyReworkOrder && (
				<div className="ztl-detail-overlay">
					<div className="ztl-detail-card" style={{ maxWidth: "480px" }}>
						<header className="ztl-detail-header" style={{ borderBottom: "2px solid var(--bad-fg, #e11d48)" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<RotateCcw size={18} color="var(--bad-fg, #e11d48)" />
								<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--bad-fg, #e11d48)" }}>
									Гарантийная рекламация наряда № {warrantyReworkOrder.orderNumber}
								</h3>
							</div>
							<button
								type="button"
								className="ztl-btn-icon"
								onClick={onCloseWarrantyRework}
							>
								<X size={16} />
							</button>
						</header>

						<form onSubmit={handleWarrantySubmit}>
							<div className="ztl-detail-body">
								<p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
									Работа для пациента <strong>{warrantyReworkOrder.patientName}</strong> будет переведена в статус
									«Гарантийная переделка» с сохранением ссылки на исходный наряд № {warrantyReworkOrder.orderNumber}.
								</p>

								<div className="ztl-form-group">
									<label className="ztl-form-label">Причина рекламации / замечания врача *</label>
									<select
										className="ztl-select"
										style={{ width: "100%", marginBottom: "8px" }}
										value={warrantyReason}
										onChange={(e) => setWarrantyReason(e.target.value)}
									>
										<option value="Скол керамической облицовки">Скол керамической облицовки</option>
										<option value="Завышение прикуса / окклюзионный блок">Завышение прикуса / окклюзионный блок</option>
										<option value="Несоответствие цвета / оттенка VITA">Несоответствие цвета / оттенка VITA</option>
										<option value="Нарушение краевого прилегания (уступ)">Нарушение краевого прилегания (уступ)</option>
										<option value="Балансирование каркаса на культе">Балансирование каркаса на культе</option>
										<option value="Другая причина (указать вручную)">Другая причина (указать вручную)</option>
									</select>

									<textarea
										className="ztl-form-input"
										style={{ height: "70px", padding: "6px 10px", resize: "none" }}
										placeholder="Уточнение дефекта для зубного техника..."
										value={warrantyReason}
										onChange={(e) => setWarrantyReason(e.target.value)}
									/>
								</div>
							</div>

							<footer className="ztl-detail-footer">
								<button
									type="button"
									className="ztl-btn-secondary"
									onClick={onCloseWarrantyRework}
								>
									Отмена
								</button>
								<button
									type="submit"
									className="ztl-btn-primary"
									style={{ background: "var(--bad-fg, #e11d48)", borderColor: "var(--bad-border, #be123c)", color: "var(--paper-strong, #ffffff)" }}
								>
									<RotateCcw size={14} />
									<span>Отправить на рекламацию</span>
								</button>
							</footer>
						</form>
					</div>
				</div>
			)}

			{/* ─── 3. НЕБЛОКИРУЮЩИЙ ДИАЛОГ ВВОДА (ФОТО ПРИКУСА / КОММЕНТАРИЙ ТЕХНИКУ) ─── */}
			{actionPrompt && (
				<div className="ztl-detail-overlay" data-testid="ztl-action-prompt-modal">
					<div className="ztl-detail-card" style={{ maxWidth: "480px" }}>
						<header className="ztl-detail-header">
							<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
								{actionPrompt.title}
							</h3>
							<button
								type="button"
								className="ztl-btn-icon"
								onClick={onCloseActionPrompt}
								aria-label="Закрыть"
							>
								<X size={16} />
							</button>
						</header>

						<form onSubmit={handlePromptSubmit}>
							<div className="ztl-detail-body">
								<div className="ztl-form-group">
									<label className="ztl-form-label">{actionPrompt.label}</label>
									{actionPrompt.type === "bite_photo" ? (
										<input
											type="text"
											className="ztl-form-input"
											placeholder={actionPrompt.placeholder}
											value={actionPromptValue}
											onChange={(e) => setActionPromptValue(e.target.value)}
											data-testid="ztl-action-prompt-input"
											autoFocus
											required
										/>
									) : (
										<textarea
											className="ztl-form-input"
											style={{ height: "80px", padding: "8px 10px", resize: "none" }}
											placeholder={actionPrompt.placeholder}
											value={actionPromptValue}
											onChange={(e) => setActionPromptValue(e.target.value)}
											data-testid="ztl-action-prompt-input"
											autoFocus
											required
										/>
									)}
								</div>
							</div>

							<footer className="ztl-detail-footer">
								<button
									type="button"
									className="ztl-btn-secondary"
									onClick={onCloseActionPrompt}
									data-testid="ztl-action-prompt-cancel"
								>
									Отмена
								</button>
								<button
									type="submit"
									className="ztl-btn-primary"
									data-testid="ztl-action-prompt-submit"
								>
									<CheckCircle2 size={14} />
									<span>Сохранить</span>
								</button>
							</footer>
						</form>
					</div>
				</div>
			)}
		</>
	);
};
