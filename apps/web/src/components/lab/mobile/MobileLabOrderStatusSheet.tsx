import React, { useEffect } from "react";
import {
	AlertOctagon,
	Box,
	Check,
	CheckCircle2,
	ChevronRight,
	ExternalLink,
	Link,
	MessageSquare,
	Phone,
	Printer,
	RotateCcw,
	Sparkles,
	X,
} from "lucide-react";
import type { DentalLabOrderData } from "../labMath";
import { formatLabConstructionTitle } from "../../../pages/LabOrdersPage";
import { SHADE_SWATCH_MAP } from "../labMath";
import { money } from "../../../AppHelpers";

export interface MobileLabOrderStatusSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: DentalLabOrderData | null;
	readonly onStatusChange: (orderId: string, newStatus: string) => void;
	readonly onPrintOrder: (order: DentalLabOrderData) => void;
	readonly onTechnicianComment: (order: DentalLabOrderData) => void;
	readonly onAttachScan: (order: DentalLabOrderData) => void;
	readonly onReclamation: (order: DentalLabOrderData) => void;
	readonly copyPortalLink: (token?: string) => void;
}

export const MobileLabOrderStatusSheet: React.FC<MobileLabOrderStatusSheetProps> = React.memo(
	function MobileLabOrderStatusSheet({
		isOpen,
		onClose,
		order,
		onStatusChange,
		onPrintOrder,
		onTechnicianComment,
		onAttachScan,
		onReclamation,
		copyPortalLink,
	}) {
		useEffect(() => {
			if (isOpen) {
				document.body.style.overflow = "hidden";
			} else {
				document.body.style.overflow = "";
			}
			return () => {
				document.body.style.overflow = "";
			};
		}, [isOpen]);

		if (!isOpen || !order) return null;

		const orderNumDisplay =
			(order as any).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ");
		const toothDisplay = order.toothFdi
			? `Зуб ${order.toothFdi}`
			: order.selectedTeeth?.length
				? `Зуб ${order.selectedTeeth.join(", ")}`
				: "Челюсть";
		const constructionDisplay = formatLabConstructionTitle(
			order.constructionType,
			order.material ?? undefined,
		);
		const swatchBg =
			SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";
		const labNameDisplay =
			(order as any).labName || "Центральная CAD/CAM ЗТЛ";
		const techNameDisplay =
			(order as any).technicianName || "Дежурный зубной техник";
		const labPhoneDisplay =
			(order as any).labPhone || (order as any).patientPhone || "+7 (999) 450-23-11";

		const currentStatus = (order.status || "").toLowerCase();

		return (
			<div
				className="mobile-lab-sheet-backdrop"
				onClick={onClose}
				role="dialog"
				aria-modal="true"
				aria-label="Смена статуса наряда ЗТЛ"
				data-testid="mobile-lab-order-status-sheet"
			>
				<div
					className="mobile-lab-sheet-surface"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Tactile Grab Handle */}
					<div className="mobile-lab-drag-handle" />

					{/* Header */}
					<div className="mobile-lab-sheet-header">
						<div className="min-w-0 flex-1">
							<div className="mobile-lab-sheet-title truncate">
								{order.patientName || "Пациент"}
							</div>
							<div className="mobile-lab-sheet-subtitle flex items-center gap-2">
								<span className="font-mono font-bold text-[var(--teal,#0d9488)]">
									{orderNumDisplay}
								</span>
								<span>•</span>
								<span>{toothDisplay}</span>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="mobile-lab-sheet-close-btn mobile-lab-sheet-close"
							aria-label="Закрыть"
							data-testid="mobile-lab-sheet-close-btn"
						>
							<X size={18} />
						</button>
					</div>

					{/* Body Content */}
					<div className="mobile-lab-sheet-body">
						{/* Clinical Summary Chip */}
						<div className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
							<div className="flex items-center justify-between gap-2">
								<span className="text-xs font-bold text-[var(--ink)]">
									{constructionDisplay}
								</span>
								<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--line)] text-xs font-bold">
									<span
										className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
										style={{ backgroundColor: swatchBg }}
									/>
									<span>VITA {order.colorVita || "A2"}</span>
								</span>
							</div>

							{/* Lab Contact with 1-Tap Call */}
							<div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle)]">
								<div className="min-w-0 flex-1">
									<div className="text-xs font-bold text-[var(--ink)] truncate">
										{labNameDisplay}
									</div>
									<div className="text-[11px] text-[var(--muted)] truncate">
										{techNameDisplay}
									</div>
								</div>
								<a
									href={`tel:${labPhoneDisplay.replace(/[^\d+]/g, "")}`}
									className="mobile-lab-call-btn"
									title="Позвонить технику"
									data-testid="mobile-sheet-call-technician-btn"
								>
									<Phone size={18} />
								</a>
							</div>
						</div>

						{/* Primary Status Transition Section */}
						<div className="space-y-1.5">
							<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] px-1">
								Сменить статус наряда:
							</div>
							<div className="mobile-lab-status-grid">
								{/* 1. Принят в клинику */}
								<button
									type="button"
									onClick={() => {
										onStatusChange(order.id!, "ready_in_clinic");
										onClose();
									}}
									className={`mobile-lab-status-action-btn variant-ready ${
										currentStatus === "ready" ||
										currentStatus === "ready_in_clinic" ||
										currentStatus === "shipped"
											? "ring-2 ring-teal-500 font-black"
											: ""
									}`}
									data-testid="mobile-status-btn-ready-in-clinic"
								>
									<div className="flex items-center gap-2.5">
										<CheckCircle2 size={18} />
										<span>Принят в клинику</span>
									</div>
									<ChevronRight size={16} />
								</button>

								{/* 2. Передан на примерку */}
								<button
									type="button"
									onClick={() => {
										onStatusChange(order.id!, "fitting");
										onClose();
									}}
									className={`mobile-lab-status-action-btn variant-fitting ${
										currentStatus === "fitting" ||
										currentStatus === "try_in"
											? "ring-2 ring-purple-500 font-black"
											: ""
									}`}
									data-testid="mobile-status-btn-fitting"
								>
									<div className="flex items-center gap-2.5">
										<Sparkles size={18} />
										<span>Передан на примерку</span>
									</div>
									<ChevronRight size={16} />
								</button>

								{/* 3. Коррекция в ЗТЛ */}
								<button
									type="button"
									onClick={() => {
										onClose();
										onReclamation(order);
									}}
									className="mobile-lab-status-action-btn variant-correction"
									data-testid="mobile-status-btn-correction"
								>
									<div className="flex items-center gap-2.5">
										<RotateCcw size={18} />
										<span>Коррекция в ЗТЛ (Рекламация)</span>
									</div>
									<ChevronRight size={16} />
								</button>

								{/* 4. Зафиксирован в полости рта */}
								<button
									type="button"
									onClick={() => {
										onStatusChange(order.id!, "completed");
										onClose();
									}}
									className={`mobile-lab-status-action-btn variant-completed ${
										currentStatus === "completed"
											? "ring-2 ring-emerald-500 font-black"
											: ""
									}`}
									data-testid="mobile-status-btn-completed"
								>
									<div className="flex items-center gap-2.5">
										<Check size={18} />
										<span>Зафиксирован в полости рта</span>
									</div>
									<ChevronRight size={16} />
								</button>
							</div>
						</div>

						{/* Secondary Operations */}
						<div className="mobile-lab-secondary-actions">
							<button
								type="button"
								onClick={() => {
									onClose();
									onPrintOrder(order);
								}}
								className="mobile-lab-secondary-btn"
								data-testid="mobile-sheet-print-btn"
							>
								<Printer size={16} className="text-teal-600 dark:text-teal-400" />
								<span>Печать наряда ЗТЛ (Бланк)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onClose();
									onTechnicianComment(order);
								}}
								className="mobile-lab-secondary-btn"
								data-testid="mobile-sheet-comment-btn"
							>
								<MessageSquare size={16} className="text-amber-500" />
								<span>Комментарий технику</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onClose();
									onAttachScan(order);
								}}
								className="mobile-lab-secondary-btn"
								data-testid="mobile-sheet-scan-btn"
							>
								<Box size={16} className="text-sky-500" />
								<span>Прикрепить 3D-скан (STL / PLY)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onClose();
									copyPortalLink((order as any).portalToken || order.id);
								}}
								className="mobile-lab-secondary-btn"
								data-testid="mobile-sheet-portal-link-btn"
							>
								<Link size={16} className="text-[var(--muted)]" />
								<span>Ссылка на веб-портал техника</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	},
);
