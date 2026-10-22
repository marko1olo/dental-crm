import React, { useState, useCallback } from "react";
import { FlaskConical, Plus, CheckCircle2 } from "lucide-react";
import type { DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";
import { DentalLabOrdersKanbanBoard } from "./DentalLabOrdersKanbanBoard";
import { DentalLabOrdersFilterBar } from "./DentalLabOrdersFilterBar";
import { DentalLabCreateOrderModal } from "./DentalLabCreateOrderModal";
import { DentalLabOrderDetailsModal, type ActionPromptState } from "./DentalLabOrderDetailsModal";
import { DentalLabReadyInClinicModal, type ReadyInClinicLabOrder } from "./DentalLabReadyInClinicModal";
import { IntraoralScan3DViewerModal } from "../radiology/IntraoralScan3DViewerModal";
import { DentalLabHubHeader } from "./hub/DentalLabHubHeader";
import { DentalLabHubAlerts } from "./hub/DentalLabHubAlerts";
import { useDentalLabHubData } from "./hub/useDentalLabHubData";
import { useDentalLabHubActions } from "./hub/useDentalLabHubActions";
if (typeof document !== "undefined") {
	void import("./dentalLab.css");
}

export interface DentalLabOrdersHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrders?: readonly DentalLabWorkflowOrder[] | undefined;
	readonly onSaveOrder?: ((order: DentalLabWorkflowOrder) => void) | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
}

const SAMPLE_LABS = ["CAD/CAM Центр Дентал-Мастер", "ArtDent Премиум Лаб", "ZirconLab Pro", "Центральная ЗТЛ"] as const;

// Live API Contract & Delegation (hub/useDentalLabHubData & hub/useDentalLabHubActions):
// - GET/POST /api/clinical/lab-orders & /api/dental-lab/orders
// - Authorization: denteAdminSecretRequestHeaders()

export const DentalLabOrdersHubModal: React.FC<DentalLabOrdersHubModalProps> = ({
	isOpen, onClose, initialOrders, onSaveOrder, currentDoctorName,
	currentPatientName, currentPatientId, currentToothNumber, treatmentPlanAgeDays, isPlanExpired,
}) => {
	const data = useDentalLabHubData({ isOpen, initialOrders, currentPatientId, currentPatientName, currentDoctorName });
	const [toast, setToast] = useState<string | null>(null);
	const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); }, []);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [inspecting, setInspecting] = useState<DentalLabWorkflowOrder | null>(null);
	const [warrantyOrder, setWarrantyOrder] = useState<DentalLabWorkflowOrder | null>(null);
	const [actionPrompt, setActionPrompt] = useState<ActionPromptState | null>(null);
	const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
	const [stageLimits, setStageLimits] = useState<Record<string, number>>({});
	const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
	const [readyOrder, setReadyOrder] = useState<ReadyInClinicLabOrder | null>(null);
	const [view3DOrder, setView3DOrder] = useState<DentalLabWorkflowOrder | null>(null);

	const handleOpenReady = useCallback((ord: DentalLabWorkflowOrder) => {
		setReadyOrder({
			id: ord.id, orderNumber: ord.orderNumber, patientId: ord.patientId,
			patientName: ord.patientName, doctorName: ord.doctorName,
			toothFdi: Array.isArray(ord.selectedTeeth) ? ord.selectedTeeth.join(", ") : undefined,
			material: ord.materialName, colorVita: ord.shadeCode, constructionType: ord.workTypeId,
		});
		setIsReadyModalOpen(true);
	}, []);

	const actions = useDentalLabHubActions(data.setOrders, onSaveOrder, showToast, handleOpenReady);
	if (!isOpen) return null;

	return (
		<div className="ztl-modal-overlay">
			<div className="ztl-modal-container">
				{toast && <div className="ztl-toast" role="status"><CheckCircle2 size={16} /><span>{toast}</span></div>}
				<DentalLabHubHeader
					totalOrdersCount={data.orders.length} delayedCount={data.delayedOrders.length}
					totalLabCostRub={data.totalLabCostRub} totalPatientPriceRub={data.totalPatientPriceRub}
					onExportCsv={() => actions.handleExportCsv(data.filteredOrders)}
					onOpenCreateModal={() => setIsCreateOpen(true)} onClose={onClose}
				/>
				<DentalLabHubAlerts
					delayedCount={data.delayedOrders.length} onlyDelayedFilter={data.onlyDelayedFilter}
					onToggleDelayedFilter={() => data.setOnlyDelayedFilter((p) => !p)}
					treatmentPlanAgeDays={treatmentPlanAgeDays} isPlanExpired={isPlanExpired}
				/>
				{data.orders.length > 0 && (
					<DentalLabOrdersFilterBar
						searchQuery={data.searchQuery} setSearchQuery={data.setSearchQuery}
						selectedLab={data.selectedLab} setSelectedLab={data.setSelectedLab}
						selectedWorkType={data.selectedWorkType} setSelectedWorkType={data.setSelectedWorkType}
						selectedStage={data.selectedStage} setSelectedStage={data.setSelectedStage}
						selectedDateRange={data.selectedDateRange} setSelectedDateRange={data.setSelectedDateRange}
						onlyDelayedFilter={data.onlyDelayedFilter} setOnlyDelayedFilter={data.setOnlyDelayedFilter}
						delayedCount={data.delayedOrders.length} sampleLabs={SAMPLE_LABS}
					/>
				)}
				{data.orders.length === 0 ? (
					<main className="ztl-empty-state" role="status">
						<div className="ztl-empty-icon-wrap"><FlaskConical size={36} /></div>
						<h3 className="ztl-empty-title">Нет нарядов в зуботехническую лабораторию</h3>
						<p className="ztl-empty-desc">Оформите первый заказ на изготовление коронок или протезов.</p>
						<button type="button" className="border border-teal-600 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg px-3 py-2 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer text-xs" onClick={() => setIsCreateOpen(true)} data-testid="hub-empty-create-lab-order-btn">
							<Plus size={14} /><span>+ Создать наряд-заказ в лабораторию</span>
						</button>
					</main>
				) : (
					<DentalLabOrdersKanbanBoard
						ordersByStage={data.ordersByStage} stageLimits={stageLimits} setStageLimits={setStageLimits}
						activeCardMenuOrderId={activeMenuId} setActiveCardMenuOrderId={setActiveMenuId}
						onInspectOrder={setInspecting} onAdvanceStage={actions.handleAdvanceStage}
						onPrintBlank={actions.handlePrintBlank} onAttachBitePhoto={(o) => setActionPrompt({ order: o, type: "bite_photo", title: "Фото прикуса", label: "URL снимка:", placeholder: "https://..." })}
						onTechnicianComment={(o) => setActionPrompt({ order: o, type: "technician_comment", title: "Комментарий технику", label: "Указания:", placeholder: "Особенности..." })}
						onRepeatFitting={(o) => actions.handleAdvanceStage({ ...o, currentStage: "fitting_scheduled" })}
						onRequestWarrantyRework={setWarrantyOrder}
					/>
				)}
				<DentalLabCreateOrderModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreateOrder={actions.handleCreateOrder} sampleLabs={SAMPLE_LABS} currentDoctorName={currentDoctorName} currentPatientName={currentPatientName} currentPatientId={currentPatientId} currentToothNumber={currentToothNumber} />
				<DentalLabOrderDetailsModal inspectingOrder={inspecting} onCloseInspect={() => setInspecting(null)} onPrintBlank={actions.handlePrintBlank} onAdvanceTechStage={actions.handleAdvanceTechStage} onOpenWarrantyRework={(o) => { setInspecting(null); setWarrantyOrder(o); }} onView3DScan={setView3DOrder} warrantyReworkOrder={warrantyOrder} onCloseWarrantyRework={() => setWarrantyOrder(null)} onWarrantyReworkSubmit={actions.handleWarrantyReworkSubmit} actionPrompt={actionPrompt} onCloseActionPrompt={() => setActionPrompt(null)} onActionPromptSubmit={() => setActionPrompt(null)} />
				<DentalLabReadyInClinicModal isOpen={isReadyModalOpen} onClose={() => setIsReadyModalOpen(false)} order={readyOrder} />
				<IntraoralScan3DViewerModal isOpen={Boolean(view3DOrder)} onClose={() => setView3DOrder(null)} modelUrl="/models/mandible_scan_16.stl" title="3D-скан ЗТЛ" patientName={view3DOrder?.patientName} modelFormat="stl" />
			</div>
		</div>
	);
};
