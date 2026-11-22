import React from "react";
import { Award } from "lucide-react";
import { DentalLabStudioModal } from "../DentalLabStudioModal";
import type { DentalLabOrderData } from "../dentalLabDefinitions";
import type { LabPriceMatrixItem } from "../DentalLabPriceMatrixModal";
import { DentalLabPriceMatrixModal } from "../DentalLabPriceMatrixModal";
import { IntraoralScan3DViewerModal } from "../../radiology/IntraoralScan3DViewerModal";
import { LabTrackingDrawer } from "../LabTrackingDrawer";
import { LabAttachScanModal } from "../LabAttachScanModal";
import { DentalLabReadyInClinicModal, type ReadyInClinicLabOrder } from "../DentalLabReadyInClinicModal";
import { LabActionPromptModal, type LabPromptDialogState } from "../LabActionPromptModal";
import { OrthopedicPassportA4Modal, type ProstheticWarrantyPassport } from "../../orthopedics/OrthopedicPassportA4Modal";

export interface LabOrderDetailsDrawerProps {
	readonly isWorkOrderModalOpen?: boolean | undefined;
	readonly onCloseWorkOrderModal?: (() => void) | undefined;
	readonly selectedOrderForEdit: DentalLabOrderData | null;
	readonly modalInitialTab?: ("main" | "shades" | "stages" | "print") | undefined;
	readonly onOrderSaved: () => void;
	readonly isPriceMatrixModalOpen: boolean;
	readonly onClosePriceMatrixModal: () => void;
	readonly onSelectWorkType: (item: LabPriceMatrixItem) => void;
	readonly isTrackingDrawerOpen?: boolean | undefined;
	readonly onCloseTrackingDrawer?: (() => void) | undefined;
	readonly selectedOrderForTracking?: (DentalLabOrderData | null) | undefined;
	readonly onStageUpdate?: ((orderId: string, newStage: string) => Promise<void>) | undefined;
	readonly onFittingDateUpdate?: ((orderId: string, dates: { frameworkTrialDate?: string | undefined; ceramicTrialDate?: string | undefined; deliveryDate?: string | undefined }) => Promise<void> | void) | undefined;
	readonly promptState?: (LabPromptDialogState | null) | undefined;
	readonly onClosePromptState?: (() => void) | undefined;
	readonly isScanModalOpen?: boolean | undefined;
	readonly onCloseScanModal?: (() => void) | undefined;
	readonly scanAttachOrder?: (DentalLabOrderData | null) | undefined;
	readonly scanAttachType?: ("stl" | "ply" | "photo") | undefined;
	readonly onSaveAttachedFile?: ((url: string) => Promise<void>) | undefined;
	readonly isTrackerModalOpen?: boolean | undefined;
	readonly onCloseTrackerModal?: (() => void) | undefined;
	readonly isReadyInClinicModalOpen?: boolean | undefined;
	readonly onCloseReadyInClinicModal?: (() => void) | undefined;
	readonly readyInClinicOrder?: (ReadyInClinicLabOrder | null) | undefined;
	readonly view3DScanOrder: DentalLabOrderData | null;
	readonly onClose3DScanViewer: () => void;
	readonly isHubModalOpen?: boolean | undefined;
	readonly onCloseHubModal?: (() => void) | undefined;
	readonly isOrderDrawerOpen?: boolean | undefined;
	readonly onCloseOrderDrawer?: (() => void) | undefined;
	readonly isPassportModalOpen?: boolean | undefined;
	readonly onClosePassportModal?: (() => void) | undefined;
	readonly passportOrder?: (DentalLabOrderData | null) | undefined;
	readonly onOpenPassportModal?: ((order: DentalLabOrderData) => void) | undefined;
}

export function LabOrderDetailsDrawer({
	isWorkOrderModalOpen,
	onCloseWorkOrderModal,
	selectedOrderForEdit,
	modalInitialTab,
	onOrderSaved,
	isPriceMatrixModalOpen,
	onClosePriceMatrixModal,
	onSelectWorkType,
	isOrderDrawerOpen,
	onCloseOrderDrawer,
	view3DScanOrder,
	onClose3DScanViewer,
	isHubModalOpen,
	onCloseHubModal,
	isTrackingDrawerOpen,
	onCloseTrackingDrawer,
	selectedOrderForTracking,
	onStageUpdate,
	onFittingDateUpdate,
	promptState,
	onClosePromptState,
	isScanModalOpen,
	onCloseScanModal,
	scanAttachOrder,
	scanAttachType,
	onSaveAttachedFile,
	isTrackerModalOpen,
	onCloseTrackerModal,
	isReadyInClinicModalOpen,
	onCloseReadyInClinicModal,
	readyInClinicOrder,
	isPassportModalOpen,
	onClosePassportModal,
	passportOrder,
	onOpenPassportModal,
}: LabOrderDetailsDrawerProps): React.JSX.Element {
	const [internalPassportOpen, setInternalPassportOpen] = React.useState(false);
	const [internalPassportOrder, setInternalPassportOrder] = React.useState<DentalLabOrderData | null>(null);
	const [livePassport, setLivePassport] = React.useState<ProstheticWarrantyPassport | null>(null);

	const handleOpenPassport = React.useCallback(async (order: DentalLabOrderData) => {
		setInternalPassportOrder(order);
		setInternalPassportOpen(true);
		onOpenPassportModal?.(order);
		try {
			const res = await fetch(`/api/lab/orders/${encodeURIComponent(order.id || "")}/warranty-passport`);
			if (res.ok) {
				const data = (await res.json()) as { passport?: ProstheticWarrantyPassport };
				if (data?.passport) {
					setLivePassport(data.passport);
				}
			}
		} catch {
			// Fallback is used
		}
	}, [onOpenPassportModal]);

	const effectiveOrder = passportOrder ?? internalPassportOrder ?? selectedOrderForTracking ?? selectedOrderForEdit;
	const isEffectivePassportOpen = Boolean(isPassportModalOpen || internalPassportOpen);

	const isInstalled = Boolean(
		effectiveOrder && (
			effectiveOrder.status === "installed" ||
			effectiveOrder.status === "completed" ||
			effectiveOrder.isLockedInstalled ||
			effectiveOrder.currentStage === "delivered_completed" ||
			effectiveOrder.currentStage === "completed"
		)
	);

	const scanModelFormat = view3DScanOrder?.attachedImageUrl && /\.ply($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
		? "ply"
		: view3DScanOrder?.attachedImageUrl && /\.obj($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
			? "obj"
			: "stl";

	return (
		<>
			{isInstalled && (isOrderDrawerOpen || isWorkOrderModalOpen) && effectiveOrder && (
				<div className="fixed top-4 right-16 z-[100000]">
					<button
						type="button"
						onClick={() => void handleOpenPassport(effectiveOrder)}
						className="min-h-[36px] h-9 px-3.5 text-xs font-semibold rounded-lg border border-teal-500/40 bg-[var(--paper)] text-teal-700 dark:text-teal-300 hover:bg-[var(--paper-soft)] shadow-md inline-flex items-center gap-1.5 transition-colors cursor-pointer"
						data-testid="lab-order-installed-warranty-passport-btn"
					>
						<Award className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
						<span>Гарантийный паспорт</span>
					</button>
				</div>
			)}

			{(isOrderDrawerOpen || isWorkOrderModalOpen || isHubModalOpen) && (
				<DentalLabStudioModal
					key={selectedOrderForEdit?.id ? `edit-${selectedOrderForEdit.id}` : "new-lab-order"}
					isOpen={Boolean(isOrderDrawerOpen || isWorkOrderModalOpen || isHubModalOpen)}
					onClose={
						isHubModalOpen
							? (onCloseHubModal || (() => {}))
							: isOrderDrawerOpen
								? (onCloseOrderDrawer || (() => {}))
								: (onCloseWorkOrderModal || (() => {}))
					}
					initialOrder={isHubModalOpen ? null : selectedOrderForEdit}
					editingOrder={isHubModalOpen ? null : selectedOrderForEdit}
					treatmentPlanId={isHubModalOpen ? undefined : (selectedOrderForEdit?.treatmentPlanId ?? undefined)}
					stageNumber={isHubModalOpen ? undefined : (selectedOrderForEdit?.stageNumber ?? undefined)}
					stageTitle={isHubModalOpen ? undefined : (selectedOrderForEdit?.stageTitle ?? undefined)}
					stageId={isHubModalOpen ? undefined : (selectedOrderForEdit?.stageId ?? undefined)}
					patientId={isHubModalOpen ? undefined : (selectedOrderForEdit?.patientId ?? undefined)}
					patientName={isHubModalOpen ? undefined : (selectedOrderForEdit?.patientName ?? undefined)}
					doctorId={isHubModalOpen ? undefined : (selectedOrderForEdit?.doctorId ?? undefined)}
					doctorName={isHubModalOpen ? undefined : (selectedOrderForEdit?.doctorName ?? undefined)}
					currentToothNumber={isHubModalOpen ? undefined : (selectedOrderForEdit?.toothFdi ?? undefined)}
					initialToothFdi={isHubModalOpen ? undefined : (selectedOrderForEdit?.toothFdi ?? undefined)}
					initialTeeth={isHubModalOpen ? undefined : (selectedOrderForEdit?.selectedTeeth ?? selectedOrderForEdit?.teeth ?? undefined)}
					onSaveOrder={() => onOrderSaved()}
					onOrderSaved={onOrderSaved}
				/>
			)}

			<DentalLabPriceMatrixModal
				isOpen={isPriceMatrixModalOpen} onClose={onClosePriceMatrixModal} onSelectWorkType={onSelectWorkType}
			/>

			{view3DScanOrder && (
				<IntraoralScan3DViewerModal
					isOpen={Boolean(view3DScanOrder)} onClose={onClose3DScanViewer}
					modelUrl={view3DScanOrder.attachedImageUrl || undefined} modelFormat={scanModelFormat}
					patientName={view3DScanOrder.patientName}
					scanTitle={`3D-скан челюсти: ${view3DScanOrder.orderNumber || (view3DScanOrder.id ? `ЗТЛ-${view3DScanOrder.id.slice(0, 8).toUpperCase()}` : "Наряд")} (${view3DScanOrder.toothFdi ? `зуб ${view3DScanOrder.toothFdi}` : "челюсть"})`}
					toothCode={view3DScanOrder.toothFdi ?? undefined} orderId={view3DScanOrder.id}
				/>
			)}

			{(isTrackingDrawerOpen || isTrackerModalOpen) && selectedOrderForTracking && (
				<LabTrackingDrawer
					isOpen={Boolean(isTrackingDrawerOpen || isTrackerModalOpen)}
					onClose={onCloseTrackingDrawer || onCloseTrackerModal || (() => {})}
					order={selectedOrderForTracking}
					onStageUpdate={onStageUpdate}
					onFittingDateUpdate={onFittingDateUpdate ?? (async (orderId, dates: { frameworkTrialDate?: string | undefined; ceramicTrialDate?: string | undefined; deliveryDate?: string | undefined }) => {
						const res = await fetch(`/api/lab/orders/${encodeURIComponent(orderId)}/status`, {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								frameworkTrialDate: dates.frameworkTrialDate ?? null,
								ceramicTrialDate: dates.ceramicTrialDate ?? null,
								deliveryDate: dates.deliveryDate ?? null,
							}),
						});
						if (!res.ok) {
							const err = await res.json().catch(() => ({}));
							throw new Error(err.message || "Ошибка обновления дат примерки");
						}
					})}
					onOpenWarrantyPassport={handleOpenPassport}
				/>
			)}

			{isScanModalOpen && scanAttachOrder && (
				<LabAttachScanModal
					isOpen={Boolean(isScanModalOpen)}
					onClose={onCloseScanModal || (() => {})}
					order={scanAttachOrder}
					initialType={scanAttachType ?? "stl"}
					onSave={onSaveAttachedFile || (async () => {})}
				/>
			)}

			{isReadyInClinicModalOpen && readyInClinicOrder && (
				<DentalLabReadyInClinicModal
					isOpen={Boolean(isReadyInClinicModalOpen)}
					onClose={onCloseReadyInClinicModal || (() => {})}
					order={readyInClinicOrder}
				/>
			)}

			{promptState && (
				<LabActionPromptModal
					state={promptState}
					onClose={onClosePromptState || (() => {})}
				/>
			)}

			{isEffectivePassportOpen && effectiveOrder && (
				<OrthopedicPassportA4Modal
					isOpen={isEffectivePassportOpen}
					onClose={() => {
						setInternalPassportOpen(false);
						setLivePassport(null);
						onClosePassportModal?.();
					}}
					passport={livePassport || {
						orderNumber: String(effectiveOrder.orderNumber || (effectiveOrder.id ? `ЗТЛ-${effectiveOrder.id.slice(0, 8).toUpperCase()}` : "Б/Н")),
						batchCode: `LOT-${new Date().getFullYear()}-${effectiveOrder.id ? effectiveOrder.id.slice(0, 4).toUpperCase() : "8841"}`,
						patientFullName: effectiveOrder.patientName || "Пациент",
						clinicName: "Стоматологическая клиника «DENTE»",
						doctorFullName: effectiveOrder.doctorName || "Лечащий врач",
						technicianLabName: effectiveOrder.labName || "Цифровая зуботехническая лаборатория CAD/CAM",
						toothFdi: effectiveOrder.toothFdi || "—",
						restorationType: effectiveOrder.constructionType || "Ортопедическая конструкция",
						frameworkMaterial: effectiveOrder.material || "Диоксид циркония",
						shade: effectiveOrder.colorVita || "A2",
						shadeStump: effectiveOrder.shadeStump ?? null,
						cementationProtocol: "Адгезивный протокол двойного отверждения (композитный цемент)",
						warrantyYears: 2,
						fixationDate: new Date().toISOString().slice(0, 10),
						expirationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
						gostStandard: "ГОСТ Р 51087-97 / ГОСТ 31576-2012 / Клинические рекомендации СтАР",
						sanpinDisinfectionMark: "СанПиН 3.3686-21: Оттиски, прикусные блоки и конструкции дезинфицированы",
					}}
				/>
			)}
		</>
	);
}
