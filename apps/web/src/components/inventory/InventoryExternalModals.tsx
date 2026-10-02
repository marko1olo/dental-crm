import React, { lazy, Suspense } from "react";
import { showToast } from "../GlobalToast.js";
import type { InventoryItem } from "./useInventoryLogic.js";
import type { WarehouseInventoryAuditDocument } from "./warehouseInventoryEngine.js";
import { InventoryInboundInvoiceModal } from "../InventoryInboundInvoiceModal.js";

const WarehouseTransferModal = lazy(() =>
	import("./transfers/WarehouseTransferModal.js").then((module) => ({
		default: module.WarehouseTransferModal,
	})),
);
const ClinicalWriteoffModal = lazy(() =>
	import("./writeoff/ClinicalWriteoffModal.js").then((module) => ({
		default: module.ClinicalWriteoffModal,
	})),
);
const ProcedureMaterialDeductionModal = lazy(() =>
	import("./ProcedureMaterialDeductionModal.js").then((module) => ({
		default: module.ProcedureMaterialDeductionModal,
	})),
);
const WarehouseInventoryAuditModal = lazy(() =>
	import("./WarehouseInventoryAuditModal.js").then((module) => ({
		default: module.WarehouseInventoryAuditModal,
	})),
);
const MdlpDisposalQueueModal = lazy(() =>
	import("./mdlp/index.js").then((module) => ({
		default: module.MdlpDisposalQueueModal,
	})),
);
const WarehouseManagerModal = lazy(() =>
	import("./WarehouseManagerModal.js").then((module) => ({
		default: module.WarehouseManagerModal,
	})),
);
const MdlpScanningModal = lazy(() =>
	import("../mdlp/MdlpScanningModal.js").then((module) => ({
		default: module.MdlpScanningModal,
	})),
);
const NurseCarpuleDisposalModal = lazy(() =>
	import("./NurseCarpuleDisposalModal.js").then((module) => ({
		default: module.NurseCarpuleDisposalModal,
	})),
);
const AcceptanceWaybillsModal = lazy(() =>
	import("./AcceptanceWaybillsModal.js").then((module) => ({
		default: module.AcceptanceWaybillsModal,
	})),
);

export interface InventoryExternalModalsProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly auditInitialDoc: WarehouseInventoryAuditDocument;
	readonly isClinicalWriteoffOpen: boolean;
	readonly onCloseClinicalWriteoff: () => void;
	readonly isProcedureDeductionOpen: boolean;
	readonly onCloseProcedureDeduction: () => void;
	readonly isWarehouseTransferOpen: boolean;
	readonly onCloseWarehouseTransfer: () => void;
	readonly isInventoryAuditOpen: boolean;
	readonly onCloseInventoryAudit: () => void;
	readonly onOpenInventoryAudit?: () => void;
	readonly isMdlpDisposalOpen: boolean;
	readonly onCloseMdlpDisposal: () => void;
	readonly isWarehouseManagerOpen: boolean;
	readonly onCloseWarehouseManager: () => void;
	readonly isMdlpScanningOpen: boolean;
	readonly onCloseMdlpScanning: () => void;
	readonly isNurseCarpuleModalOpen: boolean;
	readonly onCloseNurseCarpuleModal: () => void;
	readonly isAcceptanceWaybillsOpen: boolean;
	readonly onCloseAcceptanceWaybills: () => void;
	readonly isInboundInvoiceModalOpen: boolean;
	readonly onCloseInboundInvoiceModal: () => void;
	readonly isDeductingMaterials: boolean;
	readonly setIsDeductingMaterials: (isDeducting: boolean) => void;
	readonly fetchItems: () => void;
	readonly getHeaders: (headers?: Record<string, string>) => Record<string, string>;
	readonly onQuickWriteoffCarpules: (params?: { carpulesCount?: number; drugName?: string }) => Promise<void>;
}

/**
 * Контейнер модальных окон складского учета (Мандаты 8b, 8d, 8e).
 * Изолирует lazy-загрузку тяжелых окон (МДЛП, ИНВ-3, ТОРГ-13, ТОРГ-12).
 */
export const InventoryExternalModals: React.FC<InventoryExternalModalsProps> = ({
	organizationId,
	items,
	auditInitialDoc,
	isClinicalWriteoffOpen,
	onCloseClinicalWriteoff,
	isProcedureDeductionOpen,
	onCloseProcedureDeduction,
	isWarehouseTransferOpen,
	onCloseWarehouseTransfer,
	isInventoryAuditOpen,
	onCloseInventoryAudit,
	onOpenInventoryAudit,
	isMdlpDisposalOpen,
	onCloseMdlpDisposal,
	isWarehouseManagerOpen,
	onCloseWarehouseManager,
	isMdlpScanningOpen,
	onCloseMdlpScanning,
	isNurseCarpuleModalOpen,
	onCloseNurseCarpuleModal,
	isAcceptanceWaybillsOpen,
	onCloseAcceptanceWaybills,
	isInboundInvoiceModalOpen,
	onCloseInboundInvoiceModal,
	isDeductingMaterials,
	setIsDeductingMaterials,
	fetchItems,
	getHeaders,
	onQuickWriteoffCarpules,
}) => {
	return (
		<>
			{/* Новая модалка приходной накладной поставщика */}
			{isInboundInvoiceModalOpen && (
				<InventoryInboundInvoiceModal
					isOpen={isInboundInvoiceModalOpen}
					onClose={onCloseInboundInvoiceModal}
					organizationId={organizationId}
					inventoryItems={items}
					onInvoicePosted={async () => {
						fetchItems();
					}}
					getHeaders={getHeaders}
				/>
			)}

			{isClinicalWriteoffOpen && (
				<Suspense fallback={null}>
					<ClinicalWriteoffModal
						isOpen={isClinicalWriteoffOpen}
						onClose={onCloseClinicalWriteoff}
						onConfirmWriteoff={async (doc) => {
							try {
								let deductedCount = 0;
								for (const line of doc.lines) {
									if (line.actualQuantity <= 0) continue;
									const matchingItem = items.find(
										(it) => it.name.toLowerCase() === line.nameRu.toLowerCase(),
									);
									if (matchingItem) {
										const res = await fetch(
											`/api/inventory/${organizationId}/${matchingItem.id}/stock`,
											{
												method: "PATCH",
												headers: getHeaders({ "Content-Type": "application/json" }),
												body: JSON.stringify({
													adjustment: -line.actualQuantity,
													allowOverdraft: true,
													reason: `Акт 804н ${doc.actNumber}: ${line.nameRu}`,
												}),
											},
										);
										if (res.ok) deductedCount++;
									}
								}
								showToast(
									`Акт списания 804н зарегистрирован (проведено ${deductedCount} поз., мягкий овердрафт разрешен)`,
									"success",
								);
							} catch (e) {
								console.error(e);
								showToast("Ошибка при фиксации акта списания", "error");
							} finally {
								onCloseClinicalWriteoff();
								fetchItems();
							}
						}}
					/>
				</Suspense>
			)}

			{isProcedureDeductionOpen && (
				<Suspense fallback={null}>
					<ProcedureMaterialDeductionModal
						isOpen={isProcedureDeductionOpen}
						onClose={onCloseProcedureDeduction}
						warehouseItems={items}
						isDeducting={isDeductingMaterials}
						onConfirmDeduction={async (lines, summary) => {
							try {
								setIsDeductingMaterials(true);
								const res = await fetch(`/api/inventory/${organizationId}/deduct`, {
									method: "POST",
									headers: getHeaders({ "Content-Type": "application/json" }),
									body: JSON.stringify({
										organizationId,
										items: lines
											.filter((line) => line.quantity > 0)
											.map((line) => ({
												inventoryItemId: line.inventoryItemId || undefined,
												name: line.materialName,
												quantity: line.quantity,
												allowOverdraft: true,
												reason: `Списание по техкарте: ${line.materialName} (${line.quantity} ${line.unit})`,
											})),
										reason: "Списание материалов по техкартам процедур (Мандат 8e)",
										allowOverdraft: true,
									}),
								});
								if (!res.ok) {
									const errData = await res.json().catch(() => ({}));
									throw new Error(errData.message || `Ошибка списания (${res.status})`);
								}
								showToast(
									`Списано материалов по техкартам: ${lines.length} поз. на сумму ${summary.totalCostFormatted} (мягкий овердрафт разрешен)`,
									"success",
								);
							} catch (e) {
								console.error(e);
								showToast(
									e instanceof Error ? e.message : "Ошибка при списании материалов",
									"error",
								);
							} finally {
								setIsDeductingMaterials(false);
								onCloseProcedureDeduction();
								fetchItems();
							}
						}}
					/>
				</Suspense>
			)}

			{isWarehouseTransferOpen && (
				<Suspense fallback={null}>
					<WarehouseTransferModal
						isOpen={isWarehouseTransferOpen}
						onClose={onCloseWarehouseTransfer}
						onDocumentSaved={async () => {
							onCloseWarehouseTransfer();
							fetchItems();
						}}
						onConfirmTransfer={async (doc) => {
							if (!doc || !doc.items || doc.items.length === 0) return;
							try {
								const headers = getHeaders({ "Content-Type": "application/json" });
								const deductItems = doc.items
									.filter(
										(line) =>
											(line.dispatchedQuantity ?? line.requestedQuantity ?? 0) >
											0,
									)
									.map((line) => {
										const matchingItem = items.find(
											(it) =>
												it.id === line.itemId ||
												it.name.trim().toLowerCase() ===
													line.nameRu.trim().toLowerCase(),
										);
										return {
											inventoryItemId: matchingItem?.id || line.itemId,
											name: line.nameRu,
											quantity:
												line.dispatchedQuantity > 0
													? line.dispatchedQuantity
													: line.requestedQuantity,
											allowOverdraft: true,
											reason: `Перемещение ТОРГ-13 №${doc.documentNumber} (${doc.sourceBranchId} → ${doc.targetBranchId})`,
											notes: doc.notes,
											lotNumber: line.batchNumber,
											expirationDate: line.expiryDate,
										};
									});

								if (deductItems.length > 0) {
									await fetch(`/api/inventory/${organizationId}/deduct`, {
										method: "POST",
										headers,
										body: JSON.stringify({
											items: deductItems,
											allowOverdraft: true,
											reason: `Перемещение ТОРГ-13 №${doc.documentNumber}`,
											notes: doc.notes,
										}),
									});
								}
							} catch (err) {
								console.error("Ошибка списания при перемещении со склада:", err);
							} finally {
								fetchItems();
							}
						}}
					/>
				</Suspense>
			)}

			{isInventoryAuditOpen && (
				<Suspense fallback={null}>
					<WarehouseInventoryAuditModal
						isOpen={isInventoryAuditOpen}
						onClose={onCloseInventoryAudit}
						initialDocument={auditInitialDoc}
						onApplyAudit={async (doc) => {
							try {
								const discrepancyItems = doc.items.filter(
									(it) => it.discrepancyQuantity !== 0,
								);
								if (discrepancyItems.length > 0) {
									const headers = getHeaders({
										"Content-Type": "application/json",
									});
									for (const it of discrepancyItems) {
										await fetch(
											`/api/inventory/${organizationId}/${it.itemId}/stock`,
											{
												method: "PATCH",
												headers,
												body: JSON.stringify({
													adjustment: it.discrepancyQuantity,
													reason: `Инвентаризация ${doc.documentNumber} (${it.discrepancyQuantity > 0 ? "излишек" : "недостача"})`,
													allowOverdraft: true,
												}),
											},
										);
									}
									showToast(
										`Инвентаризация утверждена: скорректировано ${discrepancyItems.length} позиций на складе`,
										"info",
									);
								} else {
									showToast(
										"Инвентаризация утверждена: расхождений по остаткам не выявлено",
										"info",
									);
								}
							} catch (err) {
								const message =
									err instanceof Error
										? err.message
										: "Не удалось провести списание/оприходование по инвентаризации";
								showToast(message, "error");
							} finally {
								onCloseInventoryAudit();
								fetchItems();
							}
						}}
						onDocumentSaved={() => {
							fetchItems();
						}}
					/>
				</Suspense>
			)}

			{isMdlpDisposalOpen && (
				<Suspense fallback={null}>
					<MdlpDisposalQueueModal
						isOpen={isMdlpDisposalOpen}
						onClose={onCloseMdlpDisposal}
						onConfirmDisposal={async () => {
							onCloseMdlpDisposal();
							fetchItems();
						}}
					/>
				</Suspense>
			)}

			{isWarehouseManagerOpen && (
				<Suspense fallback={null}>
					<WarehouseManagerModal
						isOpen={isWarehouseManagerOpen}
						onClose={onCloseWarehouseManager}
						onOpenInventoryAudit={() => {
							onCloseWarehouseManager();
							onOpenInventoryAudit?.();
						}}
						initialItems={items}
						onConfirmWriteoff={async (writeoffLines) => {
							try {
								const res = await fetch(`/api/inventory/${organizationId}/deduct`, {
									method: "POST",
									headers: getHeaders({ "Content-Type": "application/json" }),
									body: JSON.stringify({
										organizationId,
										items: (writeoffLines || []).map((line) => ({
											id: line.id,
											inventoryItemId: line.id,
											name: line.name,
											quantity: line.writeoffQuantity,
											unitCostRub: line.unitCostRub,
											allowOverdraft: true,
											reason: `Ручное списание: ${line.name}`,
										})),
										reason: "Ручное списание со склада (Мандат 8e, 8k)",
										allowOverdraft: true,
									}),
								});
								if (!res.ok) {
									const errData = await res.json().catch(() => ({}));
									throw new Error(errData.message || `Ошибка списания (${res.status})`);
								}
								showToast(
									`Списание материалов успешно проведено (${writeoffLines?.length ?? 0} поз.)`,
									"success",
								);
							} catch (e) {
								console.error(e);
								showToast(
									e instanceof Error ? e.message : "Не удалось провести списание материалов на сервере",
									"error",
								);
							} finally {
								onCloseWarehouseManager();
								fetchItems();
							}
						}}
					/>
				</Suspense>
			)}

			{isMdlpScanningOpen && (
				<Suspense fallback={null}>
					<MdlpScanningModal
						isOpen={isMdlpScanningOpen}
						onClose={onCloseMdlpScanning}
						initialMode="disposal_531"
					/>
				</Suspense>
			)}

			{isNurseCarpuleModalOpen && (
				<Suspense fallback={null}>
					<NurseCarpuleDisposalModal
						isOpen={isNurseCarpuleModalOpen}
						onClose={onCloseNurseCarpuleModal}
						currentStockAvailable={
							items.find((i) => /артикаин|убистезин|септонест|анесте/i.test(i.name))?.stockQuantity ?? 0
						}
						stockMap={
							items.reduce<Record<string, number>>((acc, it) => {
								if (it.id) acc[it.id] = Number(it.stockQuantity) || 0;
								if (it.name) acc[it.name.toLowerCase()] = Number(it.stockQuantity) || 0;
								if (it.sku) acc[it.sku.toLowerCase()] = Number(it.stockQuantity) || 0;
								return acc;
							}, {})
						}
						onDisposalConfirmed={async (details) => {
							await onQuickWriteoffCarpules({
								carpulesCount: details.carpulesCount,
								drugName: details.drugName,
							});
							onCloseNurseCarpuleModal();
							fetchItems();
						}}
					/>
				</Suspense>
			)}

			{isAcceptanceWaybillsOpen && (
				<Suspense fallback={null}>
					<AcceptanceWaybillsModal
						isOpen={isAcceptanceWaybillsOpen}
						onClose={onCloseAcceptanceWaybills}
						organizationId={organizationId}
						inventoryItems={items.map((it) => ({
							id: it.id,
							name: it.name,
							stockQuantity: Number(it.stockQuantity) || 0,
							unitCostRub: it.unitCostRub != null ? String(it.unitCostRub) : undefined,
							unit: it.unit || "уп",
						}))}
						onWaybillPosted={async () => {
							fetchItems();
						}}
					/>
				</Suspense>
			)}
		</>
	);
};

export default InventoryExternalModals;
