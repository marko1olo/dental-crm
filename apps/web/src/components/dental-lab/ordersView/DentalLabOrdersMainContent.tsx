import React, { lazy, Suspense } from "react";
import { AlertCircle, FlaskConical, Loader2, Plus, X } from "lucide-react";
import type { DentalLabOrderData } from "../../lab/DentalLabOrderModal";
import { DentalLabCourierDispatchBar } from "../DentalLabCourierDispatchBar";
import { DentalLabStageTrackingTimeline } from "../DentalLabStageTrackingTimeline";
import { LabOrdersFilterBar } from "./LabOrdersFilterBar";
import { LabOrdersSegmentedNav } from "./LabOrdersSegmentedNav";
import { LabOrdersTable } from "./LabOrdersTable";
import { LabOrderCardsGrid } from "./LabOrderCard";
import { LabOrderDetailsDrawer } from "./LabOrderDetailsDrawer";
import { CANONICAL_STAGE_FILTERS, getStatusBadge } from "./constants";
import type { useDentalLabOrders } from "./useDentalLabOrders";

const DentalLabOrdersKanbanBoard = lazy(() =>
	import("../../lab/DentalLabOrdersKanbanBoard").then((module) => ({
		default: module.DentalLabOrdersKanbanBoard,
	})),
);

export interface DentalLabOrdersMainContentProps {
	readonly logic: ReturnType<typeof useDentalLabOrders>;
}

export function DentalLabOrdersMainContent({
	logic,
}: DentalLabOrdersMainContentProps): React.JSX.Element {
	const {
		orders,
		isLoading,
		error,
		fetchOrders,
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		doctorFilter,
		setDoctorFilter,
		viewMode,
		setViewMode,
		isCourierBarOpen,
		setIsCourierBarOpen,
		selectedTimelineOrderId,
		setSelectedTimelineOrderId,
		selectedTimelineOrder,
		stageCounts,
		filteredOrders,
		metrics,
		doctorsList,
		kanbanOrdersByStage,
		kanbanStageLimits,
		setKanbanStageLimits,
		kanbanActiveMenuId,
		setKanbanActiveMenuId,
		openMenuOrderId,
		setOpenMenuOrderId,
		promptState,
		setPromptState,
		isScanModalOpen,
		setIsScanModalOpen,
		scanAttachOrder,
		scanAttachType,
		isWorkOrderModalOpen,
		setIsWorkOrderModalOpen,
		selectedOrderForEdit,
		modalInitialTab,
		isPriceMatrixModalOpen,
		setIsPriceMatrixModalOpen,
		isTrackerModalOpen,
		setIsTrackerModalOpen,
		isTrackingDrawerOpen,
		setIsTrackingDrawerOpen,
		selectedOrderForTracking,
		isReadyInClinicModalOpen,
		setIsReadyInClinicModalOpen,
		readyInClinicOrder,
		view3DScanOrder,
		setView3DScanOrder,
		isHubModalOpen,
		setIsHubModalOpen,
		handleView3DScan,
		handleStatusChange,
		handleOpenReadyInClinicPrompt,
		copyPortalLink,
		handleOpenNewOrder,
		handleOpenEditOrder,
		handleOpenPrintOrder,
		handleOpenTracking,
		handlePayFromCashbox,
		handleMarkInstalled,
		handleAttach3DScan,
		handleAttachBitePhoto,
		handleSaveAttachedFile,
		handleTechnicianComment,
		handleRepeatFitting,
		handleReclamation,
		handleCreateOrderFromPriceMatrix,
	} = logic;

	return (
		<main
			className="w-full max-w-full space-y-2.5 overflow-hidden"
			data-testid="dental-lab-orders-view"
		>
			{/* ─── ТУЛБАР ЗТЛ: СТРОГО 1 СТРОКА 32-36PX (МАНДАТЫ 8d п. 2, 8p) ─── */}
			<LabOrdersFilterBar
				metrics={metrics}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				doctorFilter={doctorFilter}
				onDoctorFilterChange={setDoctorFilter}
				doctorsList={doctorsList}
				isCourierBarOpen={isCourierBarOpen}
				onToggleCourierBar={() => setIsCourierBarOpen((prev) => !prev)}
				onOpenPriceMatrix={() => setIsPriceMatrixModalOpen(true)}
				onOpenTrackerModal={() => setIsTrackerModalOpen(true)}
				onOpenHubModal={() => setIsHubModalOpen(true)}
				onRefresh={() => void fetchOrders()}
				isLoading={isLoading}
				onOpenNewOrder={handleOpenNewOrder}
			/>

			{/* ─── КУРЬЕРСКАЯ ПАНЕЛЬ ЛОГИСТИКИ ЗТЛ ─── */}
			{isCourierBarOpen && (
				<DentalLabCourierDispatchBar
					orders={orders}
					onDispatchUpdated={() => void fetchOrders()}
					onSelectOrderForPrint={handleOpenPrintOrder}
				/>
			)}

			{/* ─── ТАЙМЛАЙН ВЫБРАННОГО НАРЯДА (ЕСЛИ ВЫБРАН) ─── */}
			{selectedTimelineOrder && (
				<div className="relative">
					<DentalLabStageTrackingTimeline
						order={selectedTimelineOrder}
						onAdvanceStage={async (id, nextStage) => {
							await handleStatusChange(id, nextStage);
						}}
					/>
					<button
						type="button"
						onClick={() => setSelectedTimelineOrderId(null)}
						className="absolute top-2 right-2 p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded-md hover:bg-[var(--line)]"
						title="Закрыть таймлайн"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* ─── APPLE HIG SEGMENTED BAR: 5 ЭТАПОВ И ВИД (ТАБЛИЦА/КАРТОЧКИ) ─── */}
			<LabOrdersSegmentedNav
				canonicalFilters={CANONICAL_STAGE_FILTERS}
				statusFilter={statusFilter}
				onStatusFilterChange={setStatusFilter}
				stageCounts={stageCounts}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
			/>

			{/* ─── ОСНОВНОЙ РЕЕСТР: ТАБЛИЦА / КАРТОЧКИ / КАНБАН ─── */}
			{isLoading ? (
				<div className="p-12 text-center text-[var(--muted)] flex items-center justify-center gap-2">
					<Loader2 className="w-5 h-5 animate-spin text-teal-600" />
					<span>Загрузка нарядов лаборатории...</span>
				</div>
			) : error ? (
				<div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-rose-700 dark:text-rose-300 flex items-center gap-3">
					<AlertCircle className="w-5 h-5 shrink-0" />
					<div>
						<div className="font-bold">Не удалось загрузить наряды ЗТЛ</div>
						<div className="text-xs">{error}</div>
					</div>
				</div>
			) : filteredOrders.length === 0 ? (
				<div className="p-12 text-center bg-[var(--paper)] rounded-2xl border border-dashed border-[var(--line)] text-[var(--muted)] text-xs space-y-3">
					<FlaskConical className="w-10 h-10 mx-auto text-teal-600 dark:text-teal-400" />
					<p
						className="font-bold text-sm text-[var(--ink)]"
						data-testid="lab-orders-empty-state-title"
					>
						Нет нарядов в зуботехническую лабораторию
					</p>
					<p className="max-w-md mx-auto text-[var(--muted)]">
						Оформите новый заказ-наряд на коронки, элайнеры, бюгели или виниры с расцветкой VITA и
						расчетом удержания с врача.
					</p>
					<button
						type="button"
						onClick={handleOpenNewOrder}
						className="min-h-[44px] h-11 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold inline-flex items-center gap-2 shadow-2xs cursor-pointer transition-all active:scale-95 text-xs"
						data-testid="empty-state-add-first-lab-order-btn"
					>
						<Plus className="w-4 h-4" />
						<span>+ Создать наряд-заказ в лабораторию</span>
					</button>
				</div>
			) : viewMode === "kanban" ? (
				<div
					className="w-full max-w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs"
					data-testid="lab-orders-kanban-container"
				>
					<Suspense
						fallback={
							<div className="p-8 text-center text-xs text-[var(--muted)]">
								Загрузка канбан-доски ЗТЛ...
							</div>
						}
					>
						<DentalLabOrdersKanbanBoard
							ordersByStage={kanbanOrdersByStage}
							stageLimits={kanbanStageLimits}
							setStageLimits={setKanbanStageLimits}
							activeCardMenuOrderId={kanbanActiveMenuId}
							setActiveCardMenuOrderId={setKanbanActiveMenuId}
							onInspectOrder={(wfOrder) => {
								const orig = orders.find((o) => o.id === wfOrder.id);
								if (orig) handleOpenEditOrder(orig);
							}}
							onAdvanceStage={async (wfOrder) => {
								const nextStatus =
									wfOrder.currentStage === "draft"
										? "sent_to_lab"
										: wfOrder.currentStage === "sent_to_lab"
											? "fitting_scheduled"
											: "installed_completed";
								await handleStatusChange(wfOrder.id, nextStatus);
							}}
							onPrintBlank={(wfOrder) => {
								const orig = orders.find((o) => o.id === wfOrder.id);
								if (orig) handleOpenPrintOrder(orig);
							}}
							onAttachBitePhoto={(wfOrder) => {
								const orig = orders.find((o) => o.id === wfOrder.id);
								if (orig) handleAttachBitePhoto(orig);
							}}
							onTechnicianComment={(wfOrder) => {
								const orig = orders.find((o) => o.id === wfOrder.id);
								if (orig) handleTechnicianComment(orig);
							}}
							onRepeatFitting={(wfOrder) => {
								const orig = orders.find((o) => o.id === wfOrder.id);
								if (orig) handleRepeatFitting(orig);
							}}
							onRequestWarrantyRework={(wfOrder) => {
								const orig = orders.find((o) => o.id === wfOrder.id);
								if (orig) handleReclamation(orig);
							}}
						/>
					</Suspense>
				</div>
			) : viewMode === "table" ? (
				<LabOrdersTable
					orders={filteredOrders}
					openMenuOrderId={openMenuOrderId}
					setOpenMenuOrderId={setOpenMenuOrderId}
					onSelectTimelineOrder={(id) =>
						setSelectedTimelineOrderId((prev) => (prev === id ? null : id))
					}
					onOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt}
					onOpenPrintOrder={handleOpenPrintOrder}
					onOpenTracking={handleOpenTracking}
					onView3DScan={handleView3DScan}
					onPayFromCashbox={handlePayFromCashbox}
					onMarkInstalled={handleMarkInstalled}
					onAttach3DScan={handleAttach3DScan}
					onAttachBitePhoto={handleAttachBitePhoto}
					onTechnicianComment={handleTechnicianComment}
					onRepeatFitting={handleRepeatFitting}
					onReclamation={handleReclamation}
					onOpenEditOrder={handleOpenEditOrder}
					copyPortalLink={copyPortalLink}
					getStatusBadge={getStatusBadge}
				/>
			) : (
				<LabOrderCardsGrid
					orders={filteredOrders}
					openMenuOrderId={openMenuOrderId}
					setOpenMenuOrderId={setOpenMenuOrderId}
					handleOpenPrintOrder={handleOpenPrintOrder}
					handleOpenTracking={handleOpenTracking}
					handleAttach3DScan={handleAttach3DScan}
					handleAttachBitePhoto={handleAttachBitePhoto}
					handleTechnicianComment={handleTechnicianComment}
					handleRepeatFitting={handleRepeatFitting}
					handleReclamation={handleReclamation}
					handleOpenEditOrder={handleOpenEditOrder}
					copyPortalLink={copyPortalLink}
					getStatusBadge={getStatusBadge}
					handleOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt}
					handlePayFromCashbox={handlePayFromCashbox}
					handleMarkInstalled={handleMarkInstalled}
					handleView3DScan={handleView3DScan}
				/>
			)}

			{/* Модалки и шторки */}
			<LabOrderDetailsDrawer
				isWorkOrderModalOpen={isWorkOrderModalOpen}
				onCloseWorkOrderModal={() => setIsWorkOrderModalOpen(false)}
				selectedOrderForEdit={selectedOrderForEdit}
				modalInitialTab={modalInitialTab}
				onOrderSaved={() => void fetchOrders()}
				isPriceMatrixModalOpen={isPriceMatrixModalOpen}
				onClosePriceMatrixModal={() => setIsPriceMatrixModalOpen(false)}
				onSelectWorkType={handleCreateOrderFromPriceMatrix}
				isTrackingDrawerOpen={isTrackingDrawerOpen}
				onCloseTrackingDrawer={() => setIsTrackingDrawerOpen(false)}
				selectedOrderForTracking={selectedOrderForTracking}
				onStageUpdate={async (orderId, newStage) => {
					await handleStatusChange(orderId, newStage);
				}}
				promptState={promptState}
				onClosePromptState={() => setPromptState(null)}
				isScanModalOpen={isScanModalOpen}
				onCloseScanModal={() => setIsScanModalOpen(false)}
				scanAttachOrder={scanAttachOrder}
				scanAttachType={scanAttachType}
				onSaveAttachedFile={handleSaveAttachedFile}
				isTrackerModalOpen={isTrackerModalOpen}
				onCloseTrackerModal={() => setIsTrackerModalOpen(false)}
				isReadyInClinicModalOpen={isReadyInClinicModalOpen}
				onCloseReadyInClinicModal={() => setIsReadyInClinicModalOpen(false)}
				readyInClinicOrder={readyInClinicOrder}
				view3DScanOrder={view3DScanOrder}
				onClose3DScanViewer={() => setView3DScanOrder(null)}
				isHubModalOpen={isHubModalOpen}
				onCloseHubModal={() => setIsHubModalOpen(false)}
			/>
		</main>
	);
}
