import React from "react";
import {
	AlertOctagon,
	Box,
	CalendarCheck,
	Camera,
	CheckCircle2,
	DollarSign,
	ExternalLink,
	Layers,
	Link,
	MessageSquare,
	MoreVertical,
	Printer,
	RotateCcw,
} from "lucide-react";
import { money } from "../../../AppHelpers";
import { formatLabConstructionTitle } from "../../../pages/LabOrdersPage";
import { SHADE_SWATCH_MAP } from "../../lab/labMath";
import { is3DScanUrl } from "../../lab/LabAttachScanModal";
import type { LabOrdersTableProps } from "./types";

export function LabOrdersTable({
	orders,
	openMenuOrderId,
	setOpenMenuOrderId,
	onSelectTimelineOrder,
	onOpenReadyInClinicPrompt,
	onOpenPrintOrder,
	onOpenTracking,
	onView3DScan,
	onPayFromCashbox,
	onMarkInstalled,
	onAttach3DScan,
	onAttachBitePhoto,
	onTechnicianComment,
	onRepeatFitting,
	onReclamation,
	onOpenEditOrder,
	copyPortalLink,
	getStatusBadge,
}: LabOrdersTableProps): React.JSX.Element {
	return (
		<div
			className="w-full max-w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs"
			data-testid="lab-orders-table-container"
		>
			<table
				className="w-full min-w-[900px] text-left border-collapse"
				data-testid="lab-orders-dense-table"
			>
				<thead>
					<tr className="h-8 min-h-[32px] max-h-[32px] bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] select-none">
						<th className="px-2.5 py-0 whitespace-nowrap">№ Наряда</th>
						<th className="px-2.5 py-0 whitespace-nowrap">Пациент</th>
						<th className="px-2 py-0 whitespace-nowrap text-center">Зуб</th>
						<th className="px-2.5 py-0 whitespace-nowrap">Конструкция / Материал</th>
						<th className="px-2.5 py-0 whitespace-nowrap">VITA</th>
						<th className="px-2.5 py-0 whitespace-nowrap">Статус ЗТЛ</th>
						<th className="px-2.5 py-0 whitespace-nowrap">Срок</th>
						<th className="px-2.5 py-0 whitespace-nowrap font-mono text-right">Стоимость</th>
						<th className="px-2.5 py-0 whitespace-nowrap text-right">Действия</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line)]">
					{orders.map((order) => {
						const isReady =
							order.status === "ready" ||
							order.status === "ready_in_clinic" ||
							order.status === "shipped" ||
							order.status === "delivered" ||
							order.status === "received";
						const isOverdue =
							order.dueDate &&
							order.status !== "completed" &&
							order.status !== "cancelled" &&
							new Date(order.dueDate).getTime() < Date.now();
						const orderNumDisplay =
							(order as unknown as { orderNumber?: string }).orderNumber ||
							(order.id ? `ЗТЛ-${order.id.slice(-4).toUpperCase()}` : "ЗТЛ");
						const swatchBg =
							SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";
						const constructionTitle = formatLabConstructionTitle(
							order.constructionType,
							order.material ?? undefined,
						);
						const showMaterialSubtitle =
							Boolean(order.material) &&
							order.material?.trim().toLowerCase() !== constructionTitle.trim().toLowerCase();

						return (
							<tr
								key={order.id}
								className="h-9 min-h-[36px] hover:bg-[var(--paper-soft)] transition-colors text-xs text-[var(--ink)] cursor-pointer"
								data-testid={`lab-order-table-row-${order.id}`}
								onClick={() => {
									if (order.id) onSelectTimelineOrder(order.id);
								}}
							>
								<td className="px-2.5 py-1.5 whitespace-nowrap align-middle">
									<span className="font-mono font-bold text-[11px] text-teal-600 dark:text-teal-400">
										{orderNumDisplay}
									</span>
								</td>

								<td className="px-2.5 py-1.5 whitespace-nowrap align-middle">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span
											className="font-bold text-xs text-[var(--ink)]"
											title={order.patientName}
										>
											{order.patientName || "Пациент"}
										</span>
										{order.stageNumber ? (
											<span
												className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0 inline-block align-middle"
												title={`План лечения: Этап ${order.stageNumber}${
													order.stageTitle ? ` · ${order.stageTitle}` : ""
												}`}
											>
												Этап {order.stageNumber}
											</span>
										) : null}
									</div>
								</td>

								<td className="px-2 py-1.5 whitespace-nowrap align-middle text-center">
									<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-[var(--line)] font-mono">
										{order.toothFdi ? `№ ${order.toothFdi}` : "Челюсть"}
									</span>
								</td>

								<td className="px-2.5 py-1.5 align-middle">
									<div className="flex flex-col min-w-[160px] max-w-[340px] break-words">
										<span
											className="font-semibold text-xs text-[var(--ink)] leading-snug whitespace-normal break-words"
											title={`${order.constructionType || ""} ${order.material || ""}`}
										>
											{constructionTitle}
										</span>
										{showMaterialSubtitle && (
											<span className="text-[10px] text-[var(--muted)] leading-tight whitespace-normal break-words">
												{order.material}
											</span>
										)}
									</div>
								</td>

								<td className="px-2.5 py-0 whitespace-nowrap align-middle">
									{order.colorVita ? (
										<span className="inline-flex items-center gap-1 font-bold text-[11px]">
											<span
												className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
												style={{ backgroundColor: swatchBg }}
											/>
											<span>{order.colorVita}</span>
										</span>
									) : (
										<span className="text-[var(--muted)] text-[11px]">—</span>
									)}
								</td>

								<td className="px-2.5 py-0 whitespace-nowrap align-middle">
									{getStatusBadge(order.status)}
								</td>

								<td className="px-2.5 py-0 whitespace-nowrap align-middle">
									<span
										className={`text-[11px] font-mono ${
											isOverdue ? "text-rose-600 font-bold" : "text-[var(--muted)]"
										}`}
									>
										{order.dueDate
											? new Date(order.dueDate).toLocaleDateString("ru-RU")
											: "—"}
									</span>
								</td>

								<td className="px-2.5 py-0 whitespace-nowrap align-middle font-mono font-bold text-xs text-right">
									{(order as unknown as { isWarrantyRework?: boolean }).isWarrantyRework ||
									order.status === "refitting" ||
									order.priceRub === 0 ? (
										<span
											className="text-emerald-600 dark:text-emerald-400 font-bold"
											title="Гарантийная рекламация: 0 ₽ для пациента"
										>
											0 ₽ (Гарантия)
										</span>
									) : order.priceRub != null ? (
										<div className="inline-flex items-center gap-1.5 justify-end">
											<span>{money(order.priceRub)}</span>
											{Boolean(
												(order as unknown as { paidFromCashOperationId?: string })
													.paidFromCashOperationId,
											) && (
												<span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
													<CheckCircle2 className="w-2.5 h-2.5" />
													Оплачен
												</span>
											)}
										</div>
									) : (
										"—"
									)}
								</td>

								<td
									className="px-2.5 py-0 whitespace-nowrap align-middle text-right"
									onClick={(e) => e.stopPropagation()}
								>
									<div className="inline-flex items-center gap-1">
										{isReady ? (
											<button
												type="button"
												onClick={() => onOpenReadyInClinicPrompt(order)}
												className="h-7 min-h-[28px] px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
												title="Работа готова в клинике! Записать пациента на прием"
												data-testid={`lab-order-table-schedule-btn-${order.id}`}
											>
												<CalendarCheck className="w-3 h-3" />
												<span>Запись</span>
											</button>
										) : (
											<button
												type="button"
												onClick={() => onOpenPrintOrder(order)}
												className="h-7 min-h-[28px] px-2 rounded-lg border border-teal-600/30 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
												title="Распечатать наряд в зуботехническую лабораторию"
												data-testid={`lab-order-table-print-btn-${order.id}`}
											>
												<Printer className="w-3 h-3 text-teal-600 dark:text-teal-400" />
												<span>Печать</span>
											</button>
										)}

										<button
											type="button"
											onClick={() => onOpenTracking(order)}
											className="h-7 min-h-[28px] w-7 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
											title="Этапы изготовления в лаборатории"
											data-testid={`lab-order-table-track-btn-${order.id}`}
										>
											<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
										</button>

										{order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl) && (
											<button
												type="button"
												onClick={() => onView3DScan(order)}
												className="h-7 min-h-[28px] px-2 rounded-lg border border-teal-500/30 bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
												title="Открыть прикрепленный 3D-скан (STL/PLY)"
												data-testid={`lab-order-table-view-scan-btn-${order.id}`}
											>
												<Box className="w-3.5 h-3.5 text-teal-500" />
												<span>3D-скан</span>
											</button>
										)}

										<div className="relative">
											<button
												type="button"
												onClick={() =>
													setOpenMenuOrderId(
														openMenuOrderId === order.id ? null : (order.id ?? null),
													)
												}
												className="h-7 min-h-[28px] w-7 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
												aria-label="Вторичные действия"
												data-testid={`lab-order-table-menu-btn-${order.id}`}
											>
												<MoreVertical className="w-3.5 h-3.5" />
											</button>

											{openMenuOrderId === order.id && (
												<div
													className="absolute right-0 top-full mt-1 w-52 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl z-30 py-1 text-xs text-[var(--ink)] animate-in fade-in-50 duration-100 text-left"
													onClick={(e) => e.stopPropagation()}
												>
													{order.attachedImageUrl &&
														is3DScanUrl(order.attachedImageUrl) && (
															<button
																type="button"
																onClick={() => {
																	setOpenMenuOrderId(null);
																	onView3DScan(order);
																}}
																className="w-full px-3 py-1.5 hover:bg-teal-500/10 flex items-center gap-2 cursor-pointer text-[11px] text-teal-700 dark:text-teal-300 font-bold"
																data-testid={`lab-order-table-menu-view-scan-btn-${order.id}`}
															>
																<Box className="w-3.5 h-3.5 text-teal-500" />
																<span>Открыть 3D-скан</span>
															</button>
														)}
													{!(
														order as unknown as {
															paidFromCashOperationId?: string;
														}
													).paidFromCashOperationId && (
														<button
															type="button"
															onClick={() => onPayFromCashbox(order)}
															className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold"
														>
															<DollarSign className="w-3.5 h-3.5" />
															<span>Оплатить из кассы</span>
														</button>
													)}
													{order.status !== "installed" &&
														order.status !== "completed" && (
															<button
																type="button"
																onClick={() => onMarkInstalled(order)}
																className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-teal-700 dark:text-teal-400 font-semibold"
															>
																<CheckCircle2 className="w-3.5 h-3.5" />
																<span>Сдать работу пациенту</span>
															</button>
														)}
													<button
														type="button"
														onClick={() => onAttach3DScan(order)}
														className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
													>
														<Box className="w-3.5 h-3.5 text-teal-500" />
														<span>Прикрепить 3D-скан (STL/PLY)</span>
													</button>
													<button
														type="button"
														onClick={() => onAttachBitePhoto(order)}
														className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
													>
														<Camera className="w-3.5 h-3.5 text-sky-500" />
														<span>Прикрепить фото прикуса</span>
													</button>
													<button
														type="button"
														onClick={() => onTechnicianComment(order)}
														className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
													>
														<MessageSquare className="w-3.5 h-3.5 text-amber-500" />
														<span>Комментарий технику</span>
													</button>
													<button
														type="button"
														onClick={() => onOpenPrintOrder(order)}
														className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
													>
														<Printer className="w-3.5 h-3.5 text-teal-600" />
														<span>Печать наряда в ЗТЛ</span>
													</button>
													<button
														type="button"
														onClick={() => onRepeatFitting(order)}
														className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-purple-600 dark:text-purple-400"
													>
														<RotateCcw className="w-3.5 h-3.5" />
														<span>Повторная примерка</span>
													</button>
													<button
														type="button"
														onClick={() => onReclamation(order)}
														className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-rose-600 dark:text-rose-400"
													>
														<AlertOctagon className="w-3.5 h-3.5" />
														<span>Рекламация (доработка 0 ₽)</span>
													</button>
													<button
														type="button"
														onClick={() => onOpenEditOrder(order)}
														className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
													>
														<ExternalLink className="w-3.5 h-3.5" />
														<span>Редактировать параметры</span>
													</button>
													<button
														type="button"
														onClick={() =>
															copyPortalLink(
																(order as unknown as { portalToken?: string })
																	.portalToken || order.id,
															)
														}
														className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
													>
														<Link className="w-3.5 h-3.5" />
														<span>Ссылка для техника</span>
													</button>
												</div>
											)}
										</div>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
