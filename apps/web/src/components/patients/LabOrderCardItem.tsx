import type React from "react";
import {
	AlertOctagon,
	Box,
	Calendar,
	Camera,
	Check,
	Clock,
	FlaskConical,
	Layers,
	Link,
	MessageSquare,
	MoreHorizontal,
	Printer,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { money } from "../../AppHelpers";
import {
	type CanonicalLabOrderStatus,
	CANONICAL_LAB_STATUSES,
	mapToCanonicalStatus,
} from "../lab/labMath";
import { is3DScanUrl } from "../lab/LabAttachScanModal";
import type { LabOrder } from "./LabOrdersPanel";

export interface LabOrderCardItemProps {
	order: LabOrder;
	openMenuOrderId: string | null;
	setOpenMenuOrderId: (id: string | null | ((prev: string | null) => string | null)) => void;
	cardMenuRef: React.RefObject<HTMLDivElement | null>;
	onStatusTransition: (orderId: string, targetStatus: CanonicalLabOrderStatus) => void;
	onOpenPrintOrder: (order: LabOrder) => void;
	onOpenTrackingDrawer: (order: LabOrder) => void;
	onScheduleAppointment: (order: LabOrder) => void;
	onEditOrder: (order: LabOrder) => void;
	onAttachBitePhoto: (order: LabOrder) => void;
	onTechnicianComment: (order: LabOrder) => void;
	onRepeatFitting: (order: LabOrder) => void;
	onReclamation: (order: LabOrder) => void;
	onCopyPortalLink: (token: string) => void;
	onDeleteOrder: (id: string) => void;
	onView3DScan?: (order: LabOrder) => void;
}

export const LabOrderCardItem: React.FC<LabOrderCardItemProps> = ({
	order,
	openMenuOrderId,
	setOpenMenuOrderId,
	cardMenuRef,
	onStatusTransition,
	onOpenPrintOrder,
	onOpenTrackingDrawer,
	onScheduleAppointment,
	onEditOrder,
	onAttachBitePhoto,
	onTechnicianComment,
	onRepeatFitting,
	onReclamation,
	onCopyPortalLink,
	onDeleteOrder,
	onView3DScan,
}) => {
	const canonicalStatus = mapToCanonicalStatus(order.status);
	const isMenuOpen = openMenuOrderId === order.id;

	return (
		<div className="lab-order-card">
			{/* Card Top Row */}
			<div className="lab-order-main-row">
				<div className="lab-order-info-group">
					<div className="fdi-badge-compact">
						Зуб {order.toothFdi || "—"}
					</div>
					<div className="lab-order-title-block">
						<strong>{order.patientName || "Пациент"}</strong>
						<div className="lab-order-spec-line">
							<span className="lab-order-spec-chip">{order.material || "Цирконий"}</span>
							<span>·</span>
							<span>
								Цвет VITA: <strong className="text-[var(--teal)]">{order.colorVita || "A2"}</strong>
							</span>
							{order.doctorName && (
								<>
									<span>·</span>
									<span>Врач: {order.doctorName}</span>
								</>
							)}
							{order.dueDate && (
								<>
									<span>·</span>
									<span className="text-[var(--ink)] font-semibold flex items-center gap-1">
										<Calendar className="w-3 h-3 text-[var(--teal)]" />
										Срок: {new Date(order.dueDate).toLocaleDateString("ru-RU")}
									</span>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Cost */}
				<div className="lab-card-financials">
					<span>Себестоимость:</span>
					<span className="lab-card-price">
						{order.priceRub != null ? money(order.priceRub) : "—"}
					</span>
				</div>
			</div>

			{/* Compact 1-Line 4-Status Progression Strip */}
			<div className="lab-status-strip-1line" role="group" aria-label="Статус наряда ЗТЛ">
				{CANONICAL_LAB_STATUSES.map((st) => {
					const isActive = canonicalStatus === st.id;
					return (
						<button
							key={st.id}
							type="button"
							onClick={() => onStatusTransition(order.id, st.id)}
							className={`lab-status-step ${isActive ? `is-active status-${st.id}` : ""}`}
							title={`Переключить статус на: ${st.label}`}
						>
							{isActive && <Check className="w-3 h-3" />}
							<span>{st.shortLabel}</span>
						</button>
					);
				})}
			</div>

			{/* Clinical Notes (if present) */}
			{order.clinicalNotes && (
				<p className="text-xs text-[var(--muted)] italic line-clamp-1 m-0">
					«{order.clinicalNotes}»
				</p>
			)}

			{/* Attached 3D-Scan Badge */}
			{order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl) && (
				<div className="flex items-center gap-1.5 pt-0.5">
					<button
						type="button"
						onClick={() => onView3DScan?.(order)}
						className="px-2 py-0.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 font-mono truncate cursor-pointer transition-colors active:scale-95 text-left"
						data-testid={`lab-order-card-view-scan-btn-${order.id}`}
						title={`Открыть 3D-скан: ${order.attachedImageUrl}`}
					>
						<Box className="w-3.5 h-3.5 text-teal-500 shrink-0" />
						<span className="truncate">3D: {order.attachedImageUrl.split("/").pop()}</span>
					</button>
				</div>
			)}

			{/* Card Bottom 32px Action Toolbar */}
			<div className="lab-card-footer">
				<div className="flex items-center gap-1 text-xs text-[var(--muted)]">
					<Clock className="w-3 h-3" />
					<span>Создан: {new Date(order.createdAt).toLocaleDateString("ru-RU")}</span>
				</div>

				<div className="lab-card-actions">
					<button
						type="button"
						onClick={() => onOpenPrintOrder(order)}
						className="lab-btn-32 is-primary"
						title="Распечатать бланк заказа для лаборатории"
					>
						<Printer className="w-3.5 h-3.5" />
						<span>Печать заказа</span>
					</button>

					<button
						type="button"
						onClick={() => onOpenTrackingDrawer(order)}
						className="lab-btn-32"
						title="Сменить этап/статус и открыть трекинг заказа"
					>
						<Layers className="w-3.5 h-3.5 text-indigo-500" />
						<span>Этап/статус</span>
					</button>

					<div
						className="relative inline-flex"
						ref={isMenuOpen ? cardMenuRef : null}
					>
						<button
							type="button"
							onClick={() =>
								setOpenMenuOrderId((prev) =>
									prev === order.id ? null : order.id,
								)
							}
							className="lab-btn-32 !px-2"
							title="Дополнительные действия"
							aria-label="Меню действий"
							aria-haspopup="menu"
							aria-expanded={isMenuOpen}
						>
							<MoreHorizontal className="w-3.5 h-3.5" />
						</button>

						{isMenuOpen && (
							<div
								className="absolute right-0 bottom-full mb-1 w-56 p-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] shadow-xl z-50 flex flex-col gap-1 text-xs text-[var(--ink,#0f172a)] backdrop-blur-md"
								role="menu"
								aria-label="Меню действий наряда"
							>
								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										onScheduleAppointment(order);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
									role="menuitem"
								>
									<Calendar className="w-3.5 h-3.5 text-amber-500" />
									<span>Запланировать прием</span>
								</button>

								{order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl) && (
									<button
										type="button"
										onClick={() => {
											setOpenMenuOrderId(null);
											onView3DScan?.(order);
										}}
										className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold transition-colors cursor-pointer"
										role="menuitem"
										data-testid={`lab-order-card-menu-view-scan-btn-${order.id}`}
									>
										<Box className="w-3.5 h-3.5 text-teal-500" />
										<span>Открыть 3D-скан (STL/PLY)</span>
									</button>
								)}

								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										onEditOrder(order);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
									role="menuitem"
								>
									<FlaskConical className="w-3.5 h-3.5 text-[var(--teal)]" />
									<span>Детали наряда</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										onAttachBitePhoto(order);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
									role="menuitem"
								>
									<Camera className="w-3.5 h-3.5 text-sky-500" />
									<span>Прикрепить фото прикуса</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										onTechnicianComment(order);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
									role="menuitem"
								>
									<MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
									<span>Комментарий технику</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										onRepeatFitting(order);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
									role="menuitem"
								>
									<RotateCcw className="w-3.5 h-3.5 text-purple-500" />
									<span>Повторная примерка</span>
								</button>

								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										onReclamation(order);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
									role="menuitem"
								>
									<AlertOctagon className="w-3.5 h-3.5" />
									<span>Рекламация / брак</span>
								</button>

								{order.secureToken && (
									<button
										type="button"
										onClick={() => {
											setOpenMenuOrderId(null);
											onCopyPortalLink(order.secureToken);
										}}
										className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
										role="menuitem"
									>
										<Link className="w-3.5 h-3.5 text-sky-500" />
										<span>Ссылка технику</span>
									</button>
								)}

								<div className="h-[1px] bg-[var(--line,#e2e8f0)] my-0.5" />

								<button
									type="button"
									onClick={() => {
										setOpenMenuOrderId(null);
										onDeleteOrder(order.id);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-semibold"
									role="menuitem"
								>
									<Trash2 className="w-3.5 h-3.5" />
									<span>Удалить наряд</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
