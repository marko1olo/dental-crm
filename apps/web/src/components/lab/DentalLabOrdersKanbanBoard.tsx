/**
 * DentalLabOrdersKanbanBoard.tsx — 4-Column Clinical Kanban Board + Warranty Rework Column
 * with DOM virtualization, card actions, and secondary Miller menus.
 */

import React from "react";
import {
	Calendar,
	CheckCircle2,
	Eye,
	Building2,
	Truck,
	RotateCcw,
	Send,
	ChevronRight,
	MoreHorizontal,
	Printer,
	Camera,
	MessageSquare,
} from "lucide-react";
import { DentalLabOrder } from "../icons/DentalIcons";
import {
	ORTHOPEDIC_WORK_TYPES,
	type LabWorkflowStatus,
	LAB_WORKFLOW_STATUSES,
	ALL_LAB_WORKFLOW_STATUSES,
	type DentalLabWorkflowOrder,
	formatRussianDate,
} from "./dentalLabWorkflowEngine";
import {
	ABUTMENT_TYPE_OPTIONS,
	LAB_TECHNOLOGICAL_STAGES,
} from "./orders/labWorkOrderPresets";
import { sliceDomList } from "../../utils/domVirtualizationHelper";

export interface DentalLabOrdersKanbanBoardProps {
	readonly ordersByStage: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]>;
	readonly stageLimits: Record<string, number>;
	readonly setStageLimits: React.Dispatch<React.SetStateAction<Record<string, number>>>;
	readonly activeCardMenuOrderId: string | null;
	readonly setActiveCardMenuOrderId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly onInspectOrder: (order: DentalLabWorkflowOrder) => void;
	readonly onAdvanceStage: (order: DentalLabWorkflowOrder) => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onAttachBitePhoto: (order: DentalLabWorkflowOrder) => void;
	readonly onTechnicianComment: (order: DentalLabWorkflowOrder) => void;
	readonly onRepeatFitting: (order: DentalLabWorkflowOrder) => void;
	readonly onRequestWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onRescheduleAppointment?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly onPartialDelivery?: ((order: DentalLabWorkflowOrder) => void) | undefined;
}

export const DentalLabOrdersKanbanBoard: React.FC<DentalLabOrdersKanbanBoardProps> = ({
	ordersByStage,
	stageLimits,
	setStageLimits,
	activeCardMenuOrderId,
	setActiveCardMenuOrderId,
	onInspectOrder,
	onAdvanceStage,
	onPrintBlank,
	onAttachBitePhoto,
	onTechnicianComment,
	onRepeatFitting,
	onRequestWarrantyRework,
	onRescheduleAppointment,
	onPartialDelivery,
}) => {
	return (
		<main className="ztl-kanban-board">
			{ALL_LAB_WORKFLOW_STATUSES.map((stageId) => {
				const stageDef = LAB_WORKFLOW_STATUSES[stageId];
				const stageOrders = ordersByStage[stageId] || [];
				const stageLimit = stageLimits[stageId] ?? 40;
				const stageSlice = sliceDomList(stageOrders, stageLimit, 0);

				return (
					<div key={stageId} className="ztl-kanban-column">
						<div className="ztl-column-header">
							<div className="ztl-column-title-wrap">
								<span className="ztl-column-icon">
									{stageId === "draft" && <DentalLabOrder size={16} />}
									{stageId === "sent_to_lab" && <Truck size={16} />}
									{stageId === "fitting_scheduled" && <Calendar size={16} />}
									{stageId === "installed_completed" && <CheckCircle2 size={16} />}
									{stageId === "warranty_rework" && <RotateCcw size={16} />}
								</span>
								<h3 className="ztl-column-title" title={stageDef.nameRu}>
									{stageId === "warranty_rework" ? "Рекламация / Гарантия" : stageDef.nameRu}
								</h3>
							</div>
							<span className={`ztl-column-count ${stageOrders.length > 0 ? "has-items" : ""}`}>
								{stageOrders.length}
							</span>
						</div>

						<div className="ztl-column-cards">
							{stageSlice.visibleItems.map((order) => {
								const isDelayedStage = (order as any).currentStage === "delayed" || (order as any).status === "delayed";
								const hasDelay = isDelayedStage || order.isDelayedAlert || order.delayAlert?.isDelayedAlert || order.delayAlert?.status === "OVERDUE" || order.delayAlert?.status === "VISIT_CONFLICT";
								const preset = ORTHOPEDIC_WORK_TYPES[order.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;

								return (
									<article
										key={order.id}
										className={`ztl-order-card ${hasDelay ? "has-delay-alert" : ""}`}
										style={{
											contentVisibility: "auto",
											containIntrinsicSize: "1px 64px",
											contain: "content",
										}}
									>
										<div className="ztl-card-top-row">
											<span className="ztl-card-order-num">{order.orderNumber}</span>
											<span className="ztl-card-teeth-badge">
												Зубы: {order.selectedTeeth.join(", ")}
											</span>
										</div>

										{order.isWarrantyRework && (
											<div style={{ marginTop: "4px", fontSize: "10.5px", color: "var(--bad-fg, #e11d48)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
												<RotateCcw size={11} />
												<span className="truncate">ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 ₽){order.originalOrderNumber ? ` • исх. № ${order.originalOrderNumber}` : ""}</span>
											</div>
										)}

										{(order as any).isPartialDelivery && (
											<div style={{ marginTop: "3px", fontSize: "10.5px", color: "var(--teal, #0d9488)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
												<CheckCircle2 size={11} />
												<span className="truncate">Частичная поставка: готовы [{(order as any).deliveredTeeth?.join(", ") || order.selectedTeeth.join(", ")}]</span>
											</div>
										)}

										<h4 className="ztl-card-patient-name min-w-0" title={order.patientName}>
											{order.patientName}
										</h4>

										<p className="ztl-card-doctor min-w-0" title={order.doctorName}>
											{order.doctorName}
										</p>

										{/* Надежная передача расцветки VITA (Shade Fidelity) & анатомических особенностей */}
										<div className="ztl-card-work-type min-w-0" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", marginTop: "3px" }} title={`${preset.shortNameRu} • VITA: ${order.shadeCode}`}>
											<span style={{ fontWeight: 600 }}>{preset.shortNameRu}</span>
											<span
												style={{
													background: "var(--teal-surface, rgba(13, 148, 136, 0.1))",
													color: "var(--teal, #0d9488)",
													border: "1px solid var(--teal-soft, rgba(13, 148, 136, 0.3))",
													padding: "1px 5px",
													borderRadius: "4px",
													fontWeight: 700,
													fontSize: "10.5px",
												}}
												data-testid={`ztl-card-shade-${order.id}`}
											>
												VITA: {order.shadeCode}
											</span>
											{order.translucency && (
												<span
													style={{
														background: "var(--paper-soft, #f1f5f9)",
														color: "var(--ink, #334155)",
														border: "1px solid var(--line, #cbd5e1)",
														padding: "1px 4px",
														borderRadius: "4px",
														fontSize: "10px",
														fontWeight: 600,
													}}
													title="Прозрачность режущего края"
													data-testid={`ztl-card-translucency-${order.id}`}
												>
													{order.translucency}
												</span>
											)}
											{((order as any).mamelons || (order as any).opalescence || (order as any).calcifications) && (
												<span
													style={{
														background: "#ede9fe",
														color: "#6d28d9",
														border: "1px solid #ddd6fe",
														padding: "1px 4px",
														borderRadius: "4px",
														fontSize: "10px",
														fontWeight: 600,
													}}
													title={[
														(order as any).mamelons ? "Мамелоны" : "",
														(order as any).opalescence ? "Опалесценция" : "",
														(order as any).calcifications ? "Кальцификаты" : "",
													].filter(Boolean).join(" • ")}
													data-testid={`ztl-card-effects-${order.id}`}
												>
													{(order as any).opalescence && (order as any).mamelons
														? "Мамелоны+Опалесц."
														: (order as any).mamelons
														? "Мамелоны"
														: (order as any).opalescence
														? "Опалесценция"
														: "Кальцификаты"}
												</span>
											)}
											{(order as any).stumpShadeCode && (
												<span
													style={{
														background: "#fef3c7",
														color: "#92400e",
														border: "1px solid #fde68a",
														padding: "1px 4px",
														borderRadius: "4px",
														fontSize: "10px",
														fontWeight: 600,
													}}
													title="Цвет культи зуба (IPS Natural Die)"
													data-testid={`ztl-card-stump-${order.id}`}
												>
													{(order as any).stumpShadeCode}
												</span>
											)}
										</div>

										<div className="ztl-card-lab-name min-w-0" title={order.labName}>
											<Building2 size={11} className="shrink-0" />
											<span>{order.labName}</span>
										</div>

										{/* 8 технологических этапов ЗТЛ */}
										<div style={{ marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
											<span
												style={{
													fontSize: "10.5px",
													fontWeight: 700,
													color: LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.colorToken || "var(--teal, #3b82f6)",
													background: "var(--teal-surface, rgba(59, 130, 246, 0.08))",
													padding: "2px 6px",
													borderRadius: "4px",
													display: "inline-flex",
													alignItems: "center",
													gap: "4px",
												}}
												className="truncate min-w-0"
												title={`Этап ${LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepNumber || 1} из 8: ${LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.departmentRu || ""}`}
											>
												<span className="shrink-0">Этап {LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.stepNumber || 1}/8:</span>
												<span className="truncate">{LAB_TECHNOLOGICAL_STAGES[order.techStage || "impression_scan"]?.shortTitleRu || order.techStage}</span>
											</span>
										</div>

										{/* Платформа имплантата / Абатмент / Фиксация */}
										{(order.implantPlatform || order.abutmentType || order.fixationType) && (
											<div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px", fontSize: "10px" }}>
												{order.implantPlatform && (
													<span style={{ background: "var(--paper-soft, #e0f2fe)", color: "var(--teal, #0369a1)", border: "1px solid var(--line, #bae6fd)", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
														{order.implantPlatform === "conical" ? "Конус Морзе" : "Hex"}
													</span>
												)}
												{order.abutmentType && (
													<span style={{ background: "var(--paper-soft, #f3e8ff)", color: "var(--ink, #6b21a8)", border: "1px solid var(--line, #e9d5ff)", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
														{ABUTMENT_TYPE_OPTIONS.find((a) => a.id === order.abutmentType)?.nameRu.split(" ")[0] || order.abutmentType}
													</span>
												)}
												{order.fixationType && (
													<span style={{ background: "var(--paper-soft, #fef3c7)", color: "var(--amber-fg, #92400e)", border: "1px solid var(--line, #fde68a)", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
														{order.fixationType === "screw_retained" ? "Винтовая" : "Цементная"}
													</span>
												)}
											</div>
										)}

										{/* 1-Click Delay Alert: тревожный янтарный бейдж с быстрым переносом приема */}
										{hasDelay && (
											<div
												className="ztl-card-alert-badge ztl-delay-amber-badge"
												role="alert"
												style={{
													display: "flex",
													flexDirection: "column",
													gap: "5px",
													backgroundColor: "rgba(245, 158, 11, 0.12)",
													border: "1px solid rgba(245, 158, 11, 0.45)",
													borderRadius: "8px",
													padding: "7px 9px",
													marginTop: "5px",
												}}
												data-testid={`ztl-card-delay-alert-${order.id}`}
											>
												<div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--amber-fg, #b45309)", fontWeight: 700, fontSize: "11px" }}>
													<RotateCcw size={12} className="shrink-0 text-amber-600" />
													<span className="truncate">{order.delayAlert?.alertMessageRu || "Задерживается лабораторией. Требуется перенос визита."}</span>
												</div>
												<button
													type="button"
													className="ztl-btn-card-action ztl-delay-reschedule-btn"
													style={{
														alignSelf: "flex-start",
														backgroundColor: "#d97706",
														color: "#ffffff",
														border: "none",
														fontWeight: 700,
														fontSize: "10.5px",
														padding: "3px 8px",
														borderRadius: "5px",
														cursor: "pointer",
														display: "inline-flex",
														alignItems: "center",
														gap: "4px",
														boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
													}}
													onClick={(e) => {
														e.stopPropagation();
														if (onRescheduleAppointment) {
															onRescheduleAppointment(order);
														} else if (typeof window !== "undefined") {
															const rescheduleDraft = {
																patientId: order.patientId,
																patientName: order.patientName,
																orderNumber: order.orderNumber,
																dueDate: order.expectedLabDateIso,
																reason: "Перенос приема из-за задержки ЗТЛ",
															};
															try {
																window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(rescheduleDraft));
																window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: rescheduleDraft }));
																window.location.hash = "#schedule";
															} catch {
																// ignore
															}
														}
													}}
													data-testid={`ztl-delay-reschedule-btn-${order.id}`}
													title="Перейти к записи пациента в расписании для переноса"
												>
													<Calendar size={11} />
													<span>Перенести запись</span>
												</button>
											</div>
										)}

										{/* Даты готовности и примерки */}
										<div className="ztl-card-dates-row">
											<span title="Срок готовности из лаборатории">
												ЗТЛ: <strong>{formatRussianDate(order.expectedLabDateIso)}</strong>
											</span>
											<span title="Дата назначенной примерки в расписании">
												Примерка: <strong>{order.fittingDate ? formatRussianDate(order.fittingDate) : (order.scheduledVisitDateIso ? formatRussianDate(order.scheduledVisitDateIso) : "—")}</strong>
											</span>
										</div>

										{/* Финансы: цена / себестоимость в копейках */}
										<div className="ztl-card-price-row">
											<span title="Стоимость для пациента" style={order.isWarrantyRework ? { color: "var(--teal, #10b981)", fontWeight: 700 } : undefined}>
												{order.isWarrantyRework ? "0 ₽ (Гарантия)" : `${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽`}
											</span>
											<span style={{ color: "var(--muted, #64748b)", fontSize: "10px" }} title="Себестоимость ЗТЛ">
												Себест: {order.financials.labCostTotalRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>

										{/* Кнопки действий (Мандат 8d грех 3 — строго 2 кнопки прямого действия: Открыть + Сменить статус, вторичные в ...) */}
										<div className="ztl-card-actions-row" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<button
												type="button"
												className="ztl-btn-card-action min-h-[36px] sm:min-h-0"
												onClick={() => onInspectOrder(order)}
												title="Открыть спецификацию и детали наряда"
												data-testid={`ztl-card-open-${order.id}`}
											>
												<Eye size={13} />
												<span>Открыть</span>
											</button>
											{order.currentStage === "installed_completed" ? (
												<button
													type="button"
													className="ztl-btn-card-action min-h-[36px] sm:min-h-0"
													style={{ color: "var(--teal, #059669)", borderColor: "var(--teal-soft, #a7f3d0)", background: "var(--teal-surface, rgba(16, 185, 129, 0.08))", fontWeight: 700 }}
													onClick={() => onInspectOrder(order)}
													title="Работа зафиксирована и сдана пациенту"
													data-testid={`ztl-card-status-${order.id}`}
												>
													<CheckCircle2 size={13} />
													<span>Сдано</span>
												</button>
											) : order.currentStage === "warranty_rework" ? (
												<button
													type="button"
													className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
													onClick={() => onAdvanceStage(order)}
													title="Отправить работу повторно в ЗТЛ"
													data-testid={`ztl-card-status-${order.id}`}
												>
													<Send size={13} />
													<span>В ЗТЛ</span>
												</button>
											) : order.currentStage === "draft" ? (
												<button
													type="button"
													className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
													onClick={() => onAdvanceStage(order)}
													title="Передать наряд и слепки в ЗТЛ"
													data-testid={`ztl-card-status-${order.id}`}
												>
													<Send size={13} />
													<span>В ЗТЛ</span>
												</button>
											) : order.currentStage === "sent_to_lab" ? (
												<button
													type="button"
													className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
													onClick={() => onAdvanceStage(order)}
													title="Принять работу из лаборатории (назначить клиническую примерку)"
													data-testid={`ztl-card-status-${order.id}`}
												>
													<Calendar size={13} />
													<span>Примерка</span>
												</button>
											) : order.currentStage === "fitting_scheduled" ? (
												<button
													type="button"
													className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
													onClick={() => onAdvanceStage(order)}
													title="Выдать работу в кабинет (зафиксировать и сдать работу пациенту)"
													data-testid={`ztl-card-status-${order.id}`}
												>
													<CheckCircle2 size={13} />
													<span>Сдать</span>
												</button>
											) : (
												<button
													type="button"
													className="ztl-btn-card-action ztl-btn-advance min-h-[36px] sm:min-h-0"
													onClick={() => onAdvanceStage(order)}
													title="Передвинуть на следующий клинический статус"
													data-testid={`ztl-card-status-${order.id}`}
												>
													<ChevronRight size={13} />
													<span>Далее</span>
												</button>
											)}

											{/* Контекстное меню вторичных действий (...) */}
											<div style={{ position: "relative", flexShrink: 0 }}>
												<button
													type="button"
													className="ztl-btn-card-action min-h-[36px] sm:min-h-0 px-2"
													style={{ minWidth: "32px", padding: "0 6px", flex: "none" }}
													onClick={(e) => {
														e.stopPropagation();
														setActiveCardMenuOrderId((prev) => (prev === order.id ? null : order.id));
													}}
													title="Вторичные действия (Миллер: фото прикуса, комментарий технику, повторная примерка, рекламация)"
													aria-expanded={activeCardMenuOrderId === order.id}
													data-testid={`ztl-card-menu-btn-${order.id}`}
												>
													<MoreHorizontal size={13} />
												</button>

												{activeCardMenuOrderId === order.id && (
													<div
														style={{
															position: "absolute",
															right: 0,
															bottom: "calc(100% + 4px)",
															background: "var(--paper, #ffffff)",
															border: "1px solid var(--line, #e2e8f0)",
															borderRadius: "8px",
															boxShadow: "0 10px 25px -5px rgba(0,0,0,0.18)",
															padding: "4px",
															zIndex: 50,
															minWidth: "210px",
															display: "flex",
															flexDirection: "column",
															gap: "2px",
														}}
														role="menu"
														onClick={(e) => e.stopPropagation()}
													>
														<button
															type="button"
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																padding: "8px 10px",
																borderRadius: "6px",
																border: "none",
																background: "transparent",
																color: "var(--ink, #0f172a)",
																fontSize: "12px",
																fontWeight: 500,
																cursor: "pointer",
																width: "100%",
																textAlign: "left",
																minHeight: "36px",
															}}
															onClick={() => {
																onPrintBlank(order);
																setActiveCardMenuOrderId(null);
															}}
															title="Распечатать бланк наряда для курьера лаборатории"
															role="menuitem"
															data-testid={`ztl-card-print-a4-${order.id}`}
														>
															<Printer size={14} className="shrink-0 text-slate-600" />
															<span>Печать наряда (А4)</span>
														</button>

														<button
															type="button"
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																padding: "8px 10px",
																borderRadius: "6px",
																border: "none",
																background: "transparent",
																color: "var(--ink, #0f172a)",
																fontSize: "12px",
																fontWeight: 500,
																cursor: "pointer",
																width: "100%",
																textAlign: "left",
																minHeight: "36px",
															}}
															onClick={() => {
																onInspectOrder(order);
																setActiveCardMenuOrderId(null);
															}}
															title="Просмотреть детали и спецификацию наряда"
															role="menuitem"
														>
															<Eye size={14} className="shrink-0 text-teal-600" />
															<span>Детали наряда</span>
														</button>

														<button
															type="button"
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																padding: "8px 10px",
																borderRadius: "6px",
																border: "none",
																background: "transparent",
																color: "var(--ink, #0f172a)",
																fontSize: "12px",
																fontWeight: 500,
																cursor: "pointer",
																width: "100%",
																textAlign: "left",
																minHeight: "36px",
															}}
															onClick={() => {
																onAttachBitePhoto(order);
																setActiveCardMenuOrderId(null);
															}}
															title="Прикрепить фотографию окклюзии и прикуса"
															role="menuitem"
														>
															<Camera size={14} className="shrink-0 text-blue-600" />
															<span>Фото прикуса</span>
														</button>

														<button
															type="button"
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																padding: "8px 10px",
																borderRadius: "6px",
																border: "none",
																background: "transparent",
																color: "var(--ink, #0f172a)",
																fontSize: "12px",
																fontWeight: 500,
																cursor: "pointer",
																width: "100%",
																textAlign: "left",
																minHeight: "36px",
															}}
															onClick={() => {
																onTechnicianComment(order);
																setActiveCardMenuOrderId(null);
															}}
															title="Написать клинический комментарий технику"
															role="menuitem"
														>
															<MessageSquare size={14} className="shrink-0 text-amber-600" />
															<span>Комментарий технику</span>
														</button>

														{order.currentStage === "fitting_scheduled" && (
															<button
																type="button"
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "8px",
																	padding: "8px 10px",
																	borderRadius: "6px",
																	border: "none",
																	background: "transparent",
																	color: "var(--ink, #0f172a)",
																	fontSize: "12px",
																	fontWeight: 500,
																	cursor: "pointer",
																	width: "100%",
																	textAlign: "left",
																	minHeight: "36px",
																}}
																onClick={() => {
																	onRepeatFitting(order);
																	setActiveCardMenuOrderId(null);
																}}
																title="Назначить повторную примерку в расписании"
																role="menuitem"
															>
																<Calendar size={14} className="shrink-0 text-indigo-600" />
																<span>Повторная примерка</span>
															</button>
														)}

														<button
															type="button"
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																padding: "8px 10px",
																borderRadius: "6px",
																border: "none",
																background: "transparent",
																color: "#d97706",
																fontSize: "12px",
																fontWeight: 600,
																cursor: "pointer",
																width: "100%",
																textAlign: "left",
																minHeight: "36px",
															}}
															onClick={() => {
																setActiveCardMenuOrderId(null);
																if (onRescheduleAppointment) {
																	onRescheduleAppointment(order);
																} else if (typeof window !== "undefined") {
																	const rescheduleDraft = {
																		patientId: order.patientId,
																		patientName: order.patientName,
																		orderNumber: order.orderNumber,
																		dueDate: order.expectedLabDateIso,
																		reason: "Перенос приема из-за задержки ЗТЛ",
																	};
																	try {
																		window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(rescheduleDraft));
																		window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: rescheduleDraft }));
																		window.location.hash = "#schedule";
																	} catch {
																		// ignore
																	}
																}
															}}
															title="Перейти к записи пациента для переноса визита"
															role="menuitem"
															data-testid={`ztl-card-reschedule-${order.id}`}
														>
															<Calendar size={14} className="shrink-0 text-amber-600" />
															<span>Перенести запись (ЗТЛ задержка)</span>
														</button>

														{order.selectedTeeth.length > 1 && (
															<button
																type="button"
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "8px",
																	padding: "8px 10px",
																	borderRadius: "6px",
																	border: "none",
																	background: "transparent",
																	color: "var(--teal, #0d9488)",
																	fontSize: "12px",
																	fontWeight: 600,
																	cursor: "pointer",
																	width: "100%",
																	textAlign: "left",
																	minHeight: "36px",
																}}
																onClick={() => {
																	setActiveCardMenuOrderId(null);
																	if (onPartialDelivery) {
																		onPartialDelivery(order);
																	} else {
																		onRequestWarrantyRework(order);
																	}
																}}
																title="Оформить частичную приемку и гарантийную переделку дефектной единицы (0 ₽)"
																role="menuitem"
																data-testid={`ztl-card-partial-delivery-${order.id}`}
															>
																<CheckCircle2 size={14} className="shrink-0 text-teal-600" />
																<span>Частичная сдача / Рекламация (0 ₽)</span>
															</button>
														)}

														<button
															type="button"
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																padding: "8px 10px",
																borderRadius: "6px",
																border: "none",
																background: "transparent",
																color: "var(--bad-fg, #e11d48)",
																fontSize: "12px",
																fontWeight: 500,
																cursor: "pointer",
																width: "100%",
																textAlign: "left",
																minHeight: "36px",
															}}
															onClick={() => {
																onRequestWarrantyRework(order);
																setActiveCardMenuOrderId(null);
															}}
															title="Оформить гарантийную переделку / рекламацию"
															role="menuitem"
														>
															<RotateCcw size={14} className="shrink-0 text-rose-600" />
															<span>Рекламация (0 ₽)</span>
														</button>
													</div>
												)}
											</div>
										</div>
									</article>
								);
							})}
							{stageSlice.hasMore && (
								<div style={{ padding: "8px 4px", textAlign: "center" }}>
									<button
										type="button"
										className="ztl-chip"
										style={{
											width: "100%",
											justifyContent: "center",
											padding: "6px 10px",
											fontSize: "11px",
											fontWeight: 600,
										}}
										onClick={() =>
											setStageLimits((prev) => ({
												...prev,
												[stageId]: (prev[stageId] ?? 40) + 40,
											}))
										}
									>
										Показать ещё 40 нарядов (показано {stageSlice.displayedCount} из {stageSlice.totalCount})
									</button>
								</div>
							)}
							{stageOrders.length === 0 && (
								<div style={{ textAlign: "center", padding: "24px 8px", color: "var(--muted, #94a3b8)", fontSize: "11px" }}>
									Нет нарядов в этом статусе
								</div>
							)}
						</div>
					</div>
				);
			})}
		</main>
	);
};
