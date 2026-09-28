import React from "react";
import {
	AlertOctagon,
	Box,
	Calendar,
	CalendarCheck,
	Camera,
	FileText,
	Layers,
	Link,
	MessageSquare,
	MoreHorizontal,
	Printer,
	RotateCcw,
} from "lucide-react";
import { money } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import type { DentalLabOrderData } from "./DentalLabOrderModal";
import { formatLabOrderTeethOrJaw, isJawWideConstruction } from "./labMath";
import { is3DScanUrl } from "./LabAttachScanModal";

export interface LabOrderCardProps {
	order: DentalLabOrderData;
	openMenuOrderId: string | null;
	setOpenMenuOrderId: React.Dispatch<React.SetStateAction<string | null>>;
	handleOpenPrintOrder: (order: DentalLabOrderData) => void;
	handleOpenTracking: (order: DentalLabOrderData) => void;
	handleAttach3DScan: (order: DentalLabOrderData) => void;
	handleAttachBitePhoto: (order: DentalLabOrderData) => void;
	handleTechnicianComment: (order: DentalLabOrderData) => void;
	handleRepeatFitting: (order: DentalLabOrderData) => void;
	handleReclamation: (order: DentalLabOrderData) => void;
	handleOpenEditOrder: (order: DentalLabOrderData) => void;
	copyPortalLink: (token?: string) => void;
	getStatusBadge: (status?: string) => React.ReactNode;
	handleOpenReadyInClinicPrompt?: ((order: DentalLabOrderData) => void) | undefined;
}

export function LabOrderCard({
	order,
	openMenuOrderId,
	setOpenMenuOrderId,
	handleOpenPrintOrder,
	handleOpenTracking,
	handleAttach3DScan,
	handleAttachBitePhoto,
	handleTechnicianComment,
	handleRepeatFitting,
	handleReclamation,
	handleOpenEditOrder,
	copyPortalLink,
	getStatusBadge,
	handleOpenReadyInClinicPrompt,
}: LabOrderCardProps) {
	return (
		<div
			className="lab-order-card bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: "1px 220px",
				contain: "content",
			}}
		>
			<div className="space-y-3">
				{/* Card Top */}
				<div className="flex items-start justify-between gap-2 min-w-0">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<span
							className={`min-h-[36px] px-2.5 py-1 rounded-xl font-extrabold text-xs flex items-center justify-center text-center shrink-0 ${
								order.jawScope ||
								isJawWideConstruction(order.constructionType) ||
								Boolean(
									order.toothFdi &&
										(order.toothFdi.includes("челюст") ||
											order.toothFdi.includes("В/Ч") ||
											order.toothFdi.includes("Н/Ч")),
								)
									? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
									: "bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 font-mono"
							}`}
							title={order.toothFdi || "Челюсть / Зубы"}
						>
							{formatLabOrderTeethOrJaw(order)}
						</span>
						<div className="min-w-0 flex-1">
							<h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 truncate">
								{order.patientName || "Пациент"}
							</h3>
							<span className="text-xs text-[var(--muted)] block truncate">
								Врач: {order.doctorName || "Не указан"}
							</span>
						</div>
					</div>

					<div className="shrink-0">{getStatusBadge(order.status)}</div>
				</div>

				{/* Tech Details */}
				<div className="p-2.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] text-xs space-y-1 text-[var(--ink)]">
					<div className="flex justify-between">
						<span className="text-[var(--muted)]">Материал:</span>
						<span className="font-semibold">{order.material || "Цирконий"}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-[var(--muted)]">Цвет VITA:</span>
						<span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
							{order.colorVita || "A2"}
						</span>
					</div>
					{order.dueDate && (
						<div className="flex justify-between text-[var(--muted)]">
							<span>Срок сдачи:</span>
							<span>{new Date(order.dueDate).toLocaleDateString("ru-RU")}</span>
						</div>
					)}
				</div>

				{/* Notes preview */}
				{order.clinicalNotes && (
					<p className="text-xs text-[var(--muted)] italic line-clamp-2 m-0">
						{order.clinicalNotes}
					</p>
				)}

				{/* Attached 3D-Scan or Photo badge */}
				{order.attachedImageUrl && (
					<div className="flex items-center gap-1.5 pt-0.5">
						{is3DScanUrl(order.attachedImageUrl) ? (
							<span
								className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/25 text-[11px] font-bold flex items-center gap-1 font-mono truncate"
								title={`Прикреплен 3D-скан: ${order.attachedImageUrl}`}
							>
								<Box className="w-3 h-3 text-teal-500 shrink-0" />
								<span>3D-скан: {order.attachedImageUrl.split("/").pop()}</span>
							</span>
						) : (
							<span
								className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 text-[11px] font-bold flex items-center gap-1 truncate"
								title={`Прикреплено фото: ${order.attachedImageUrl}`}
							>
								<Camera className="w-3 h-3 text-sky-500 shrink-0" />
								<span>Фото: {order.attachedImageUrl.split("/").pop()}</span>
							</span>
						)}
					</div>
				)}
			</div>

			{/* Card Bottom: Financials & Strictly <= 2 Direct Action Buttons + "..." (Miller's Law / Mandates 8d item 3, 8p) */}
			<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
				<div>
					<span className="text-[11px] text-[var(--muted)] block">Себестоимость:</span>
					<span className="text-sm font-black text-[var(--ink)] font-mono">
						{order.priceRub != null ? money(order.priceRub) : "—"}
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					{/* ПРЯМОЕ ДЕЙСТВИЕ 1: Если работа готова в клинике — 1-клик «Запись / SMS», иначе «Печать ЗТЛ-1» */}
					{handleOpenReadyInClinicPrompt && (order.status === "ready" || order.status === "ready_in_clinic" || order.status === "shipped" || order.status === "delivered" || order.status === "received") ? (
						<button
							type="button"
							onClick={() => handleOpenReadyInClinicPrompt(order)}
							className="min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
							title="Работа готова в клинике! Записать пациента на примерку / фиксацию и отправить SMS / WhatsApp"
							data-testid={`lab-order-ready-schedule-btn-${order.id}`}
						>
							<CalendarCheck className="w-3.5 h-3.5" />
							<span>Запись / SMS</span>
						</button>
					) : (
						<button
							type="button"
							onClick={() => handleOpenPrintOrder(order)}
							className="min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 rounded-xl bg-[var(--teal)] text-[var(--on-teal,#ffffff)] hover:opacity-90 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
							title="Распечатать официальный наряд ЗТЛ-1 (ГОСТ / СтАР)"
							data-testid={`lab-order-print-ztl1-btn-${order.id}`}
						>
							<Printer className="w-3.5 h-3.5" />
							<span>Печать ЗТЛ-1</span>
						</button>
					)}

					{/* ПРЯМОЕ ДЕЙСТВИЕ 2: Сменить этап/статус (или Печать ЗТЛ-1 если первое действие занято Записью) */}
					{handleOpenReadyInClinicPrompt && (order.status === "ready" || order.status === "ready_in_clinic" || order.status === "shipped" || order.status === "delivered" || order.status === "received") ? (
						<button
							type="button"
							onClick={() => handleOpenPrintOrder(order)}
							className="min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
							title="Распечатать официальный наряд ЗТЛ-1 (ГОСТ / СтАР)"
							data-testid={`lab-order-print-ztl1-btn-${order.id}`}
						>
							<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
							<span>Печать ЗТЛ-1</span>
						</button>
					) : (
						<button
							type="button"
							onClick={() => handleOpenTracking(order)}
							className="min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
							title="Сменить этап или статус изготовления работы в ЗТЛ"
							data-testid={`lab-order-stage-status-btn-${order.id}`}
						>
							<Layers className="w-3.5 h-3.5 text-indigo-500" />
							<span>Этап/статус</span>
						</button>
					)}

					{/* ВТОРИЧНЫЕ ДЕЙСТВИЯ: Меню "..." (MoreHorizontal) */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setOpenMenuOrderId((prev) => prev === order.id ? null : (order.id || null))}
							className="w-11 sm:w-8 h-11 sm:h-8 min-w-[44px] sm:min-w-[32px] min-h-[44px] sm:min-h-[32px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
							aria-label="Вторичные действия с нарядом ЗТЛ"
							aria-expanded={openMenuOrderId === order.id}
							title="Вторичные действия: фото прикуса, комментарий технику, повторная примерка, рекламация"
						>
							<MoreHorizontal className="w-4 h-4" />
						</button>

						{openMenuOrderId === order.id && (
							<div className="absolute right-0 bottom-full mb-1 z-50 w-56 p-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl shadow-lg flex flex-col gap-1 text-xs">
								{handleOpenReadyInClinicPrompt && (
									<button
										type="button"
										onClick={() => {
											setOpenMenuOrderId(null);
											handleOpenReadyInClinicPrompt(order);
										}}
										className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-2 cursor-pointer"
										data-testid={`lab-order-menu-ready-schedule-btn-${order.id}`}
									>
										<CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
										<span>Запись на примерку / SMS</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										handleOpenTracking(order);
									}}
									className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
								>
									<Layers className="w-3.5 h-3.5 text-indigo-500" />
									<span>Сменить этап/статус</span>
								</button>
								<button
									type="button"
									onClick={() => handleAttach3DScan(order)}
									className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-teal-700 dark:text-teal-300 inline-flex items-center gap-2 cursor-pointer"
									data-testid={`lab-order-attach-scan-btn-${order.id}`}
								>
									<Box className="w-3.5 h-3.5 text-teal-500" />
									<span>Прикрепить 3D-скан (STL/PLY)</span>
								</button>
								<button
									type="button"
									onClick={() => handleAttachBitePhoto(order)}
									className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
									data-testid={`lab-order-attach-photo-btn-${order.id}`}
								>
									<Camera className="w-3.5 h-3.5 text-sky-500" />
									<span>Прикрепить фото прикуса</span>
								</button>
								<button
									type="button"
									onClick={() => handleTechnicianComment(order)}
									className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
								>
									<MessageSquare className="w-3.5 h-3.5 text-amber-500" />
									<span>Комментарий технику</span>
								</button>
								<button
									type="button"
									onClick={() => handleRepeatFitting(order)}
									className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-purple-700 dark:text-purple-300 inline-flex items-center gap-2 cursor-pointer"
								>
									<RotateCcw className="w-3.5 h-3.5 text-purple-500" />
									<span>Повторная примерка</span>
								</button>
								<button
									type="button"
									onClick={() => handleReclamation(order)}
									className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-2 cursor-pointer"
								>
									<AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
									<span>Рекламация (0 ₽)</span>
								</button>
								{order.dueDate && (
									<button
										type="button"
										onClick={() => {
											setOpenMenuOrderId(null);
											window.location.hash = "#schedule";
											const d = new Date(order.dueDate!).toLocaleDateString("ru-RU");
											showToast(`Переход в расписание на дату готовности: ${d} (зуб ${order.toothFdi || ""})`, "success");
										}}
										className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
									>
										<Calendar className="w-3.5 h-3.5 text-teal-500" />
										<span>Запланировать прием</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										handleOpenEditOrder(order);
									}}
									className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
								>
									<FileText className="w-3.5 h-3.5 text-indigo-500" />
									<span>Подробные параметры</span>
								</button>
								{order.secureToken && (
									<button
										type="button"
										onClick={() => {
											setOpenMenuOrderId(null);
											copyPortalLink(order.secureToken!);
										}}
										className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
									>
										<Link className="w-3.5 h-3.5 text-emerald-500" />
										<span>Копировать ссылку ЗТЛ</span>
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
