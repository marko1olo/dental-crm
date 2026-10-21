import React from "react";
import { CheckCircle2, Layers, MoreHorizontal, Printer } from "lucide-react";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import { LabOrderCardDropdownMenu } from "./LabOrderCardDropdownMenu";

export interface LabOrderCardActionsProps {
	order: DentalLabOrderData;
	openMenuOrderId: string | null;
	setOpenMenuOrderId: React.Dispatch<React.SetStateAction<string | null>> | ((id: string | null) => void);
	handleOpenPrintOrder: (order: DentalLabOrderData) => void;
	handleOpenTracking: (order: DentalLabOrderData) => void;
	handleAttach3DScan: (order: DentalLabOrderData) => void;
	handleAttachBitePhoto: (order: DentalLabOrderData) => void;
	handleTechnicianComment: (order: DentalLabOrderData) => void;
	handleRepeatFitting: (order: DentalLabOrderData) => void;
	handleReclamation: (order: DentalLabOrderData) => void;
	handleOpenEditOrder: (order: DentalLabOrderData) => void;
	copyPortalLink: (token?: string) => void;
	handleOpenReadyInClinicPrompt?: (order: DentalLabOrderData) => void;
	handlePayFromCashbox?: (order: DentalLabOrderData) => void;
	handleMarkInstalled?: (order: DentalLabOrderData) => void;
	handleView3DScan?: (order: DentalLabOrderData) => void;
}

export function LabOrderCardActions({
	order, openMenuOrderId, setOpenMenuOrderId, handleOpenPrintOrder, handleOpenTracking,
	handleAttach3DScan, handleAttachBitePhoto, handleTechnicianComment, handleRepeatFitting,
	handleReclamation, handleOpenEditOrder, copyPortalLink, handleOpenReadyInClinicPrompt,
	handlePayFromCashbox, handleMarkInstalled, handleView3DScan,
}: LabOrderCardActionsProps): React.JSX.Element {
	const isMenuOpen = openMenuOrderId === order.id;
	const isReadyInClinicCandidate =
		handleOpenReadyInClinicPrompt &&
		(order.status === "sent" || order.status === "sent_to_lab" || order.status === "in_progress");

	return (
		<div className="flex items-center gap-2 pt-2 border-t border-[var(--line-subtle)]">
			{isReadyInClinicCandidate ? (
				<button
					type="button"
					onClick={() => handleOpenReadyInClinicPrompt(order)}
					className="primary-button flex-1 min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
					title="Конструкция доставлена курьером в клинику"
					data-testid={`lab-order-ready-in-clinic-btn-${order.id}`}
				>
					<CheckCircle2 className="w-3.5 h-3.5" />
					<span>Готов в клинике</span>
				</button>
			) : order.status === "ready" || order.status === "ready_in_clinic" ? (
				<button
					type="button"
					onClick={() => handleOpenPrintOrder(order)}
					className="secondary-button flex-1 min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
					title="Распечатать наряд в лабораторию"
					data-testid={`lab-order-print-ztl1-btn-${order.id}`}
				>
					<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Печать наряда</span>
				</button>
			) : (
				<button
					type="button"
					onClick={() => handleOpenTracking(order)}
					className="secondary-button flex-1 min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
					title="Сменить этап или статус изготовления"
					data-testid={`lab-order-stage-status-btn-${order.id}`}
				>
					<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Этап/статус</span>
				</button>
			)}

			{/* Вторичные действия: Меню "..." */}
			<div className="relative">
				<button
					type="button"
					onClick={() => setOpenMenuOrderId(isMenuOpen ? null : (order.id || null))}
					className="icon-button w-11 sm:w-8 h-11 sm:h-8 min-w-[44px] sm:min-w-[32px] min-h-[44px] sm:min-h-[32px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
					aria-label="Вторичные действия с нарядом ЗТЛ"
					aria-expanded={isMenuOpen}
				>
					<MoreHorizontal className="w-4 h-4" />
				</button>

				{isMenuOpen && (
					<LabOrderCardDropdownMenu
						order={order} handleOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt}
						handlePayFromCashbox={handlePayFromCashbox} handleMarkInstalled={handleMarkInstalled}
						handleOpenTracking={handleOpenTracking} handleView3DScan={handleView3DScan}
						handleAttach3DScan={handleAttach3DScan} handleAttachBitePhoto={handleAttachBitePhoto}
						handleTechnicianComment={handleTechnicianComment} handleRepeatFitting={handleRepeatFitting}
						handleReclamation={handleReclamation} handleOpenEditOrder={handleOpenEditOrder}
						copyPortalLink={copyPortalLink} onCloseMenu={() => setOpenMenuOrderId(null)}
					/>
				)}
			</div>
		</div>
	);
}
