import React, { useState } from "react";
import { FlaskConical, Loader2, Plus } from "lucide-react";
import { LabOrdersPage } from "../../pages/LabOrdersPage";
import { useLabOrdersPanelLogic } from "./useLabOrdersPanelLogic";
import { LabOrdersQuickForm } from "./LabOrdersQuickForm";
import { LabOrderCardItem } from "./LabOrderCardItem";
import { LabOrdersPanelHeader } from "./LabOrdersPanelHeader";
import { LabOrdersModals } from "./LabOrdersModals";
import "./LabOrdersPanel.css";

export type { LabOrder } from "./labOrdersTypes";
import type { LabOrder } from "./labOrdersTypes";

export function LabOrdersPanel({ patientId }: { patientId?: string }) {
	if (!patientId) return <LabOrdersPage />;
	const logic = useLabOrdersPanelLogic(patientId);
	const [view3DScanOrder, setView3DScanOrder] = useState<LabOrder | null>(null);

	return (
		<div className="lab-orders-panel">
			<LabOrdersPanelHeader logic={logic} />

			{logic.showQuickForm && (
				<LabOrdersQuickForm
					selectedTeeth={logic.selectedTeeth}
					setSelectedTeeth={logic.setSelectedTeeth}
					restorationType={logic.restorationType}
					setRestorationType={logic.setRestorationType}
					material={logic.material}
					setMaterial={logic.setMaterial}
					shadeSystem={logic.shadeSystem}
					setShadeSystem={logic.setShadeSystem}
					colorVita={logic.colorVita}
					setColorVita={logic.setColorVita}
					stumpShade={logic.stumpShade}
					setStumpShade={logic.setStumpShade}
					fittingDate={logic.fittingDate}
					setFittingDate={logic.setFittingDate}
					dueDate={logic.dueDate}
					setDueDate={logic.setDueDate}
					clinicalNotes={logic.clinicalNotes}
					setClinicalNotes={logic.setClinicalNotes}
					calculatedMaterialCostKopecks={logic.calculatedMaterialCostKopecks}
					submitting={logic.submitting}
					onSubmit={logic.handleQuickSubmit}
					onCancel={() => logic.setShowQuickForm(false)}
					onOneClickCreate={() => void logic.handleOneClickCreate()}
				/>
			)}

			{logic.error && <div className="lab-order-warning">{logic.error}</div>}

			{logic.loading && logic.orders.length === 0 ? (
				<div className="py-6 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
					<Loader2 className="w-4 h-4 animate-spin text-[var(--teal)]" />
					Загрузка нарядов лаборатории...
				</div>
			) : logic.orders.length === 0 ? (
				<div className="p-8 text-center bg-[var(--paper-soft)] rounded-xl border border-dashed border-[var(--line)] flex flex-col items-center gap-3 my-2">
					<FlaskConical size={36} color="var(--teal, #0d9488)" />
					<div className="font-bold text-sm text-[var(--ink)]">Нет оформленных заказов в лабораторию</div>
					<div className="text-xs text-[var(--muted)] max-w-md">Оформите заказ на изготовление коронок или вкладок для этого пациента.</div>
					<button
						type="button"
						onClick={() => { logic.setSelectedOrderForEdit(null); logic.setIsOrderModalOpen(true); }}
						className="primary-button min-h-[40px] px-4 flex items-center gap-1.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
					>
						<Plus size={15} />
						<span>+ Заказ в лабораторию</span>
					</button>
				</div>
			) : (
				<div className="lab-orders-list">
					{logic.orders.map((order) => (
						<LabOrderCardItem
							key={order.id}
							order={order}
							openMenuOrderId={logic.openMenuOrderId}
							setOpenMenuOrderId={logic.setOpenMenuOrderId}
							cardMenuRef={logic.cardMenuRef}
							onStatusTransition={logic.handleStatusTransition}
							onOpenPrintOrder={logic.handleOpenPrintOrder}
							onOpenTrackingDrawer={logic.handleOpenTrackingDrawer}
							onScheduleAppointment={logic.handleScheduleAppointment}
							onEditOrder={(ord) => {
								logic.setSelectedOrderForEdit(ord as any);
								logic.setModalInitialTab("main");
								logic.setIsOrderModalOpen(true);
							}}
							onAttachBitePhoto={logic.handleAttachBitePhoto}
							onTechnicianComment={logic.handleTechnicianComment}
							onRepeatFitting={logic.handleRepeatFitting}
							onReclamation={logic.handleReclamation}
							onCopyPortalLink={logic.copyPortalLink}
							onDeleteOrder={logic.handleDeleteOrder}
							onView3DScan={(ord) => setView3DScanOrder(ord)}
						/>
					))}
				</div>
			)}

			<LabOrdersModals
				logic={logic}
				patientId={patientId}
				view3DScanOrder={view3DScanOrder}
				setView3DScanOrder={setView3DScanOrder}
			/>
		</div>
	);
}
