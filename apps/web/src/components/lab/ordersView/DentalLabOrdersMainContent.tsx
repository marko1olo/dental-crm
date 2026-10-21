import React from "react";
import { X } from "lucide-react";
import { DentalLabStageTrackingTimeline } from "../DentalLabStageTrackingTimeline";
import { LabOrdersFilterBar } from "./LabOrdersFilterBar";
import { LabOrdersSegmentedNav } from "./LabOrdersSegmentedNav";
import { CANONICAL_STAGE_FILTERS } from "./constants";
import type { useDentalLabOrders } from "./useDentalLabOrders";
import { DentalLabOrdersViewSwitch } from "./DentalLabOrdersViewSwitch";
import { DentalLabOrdersDrawersContainer } from "./DentalLabOrdersDrawersContainer";

export interface DentalLabOrdersMainContentProps {
	readonly logic: ReturnType<typeof useDentalLabOrders>;
}

export function DentalLabOrdersMainContent({
	logic,
}: DentalLabOrdersMainContentProps): React.JSX.Element {
	const {
		isLoading, fetchOrders, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
		doctorFilter, setDoctorFilter, viewMode, setViewMode, selectedTimelineOrderId,
		setSelectedTimelineOrderId, selectedTimelineOrder, stageCounts, metrics, doctorsList,
		setIsPriceMatrixModalOpen, handleOpenNewOrder, handleStatusChange,
	} = logic;

	return (
		<main
			className="w-full max-w-full space-y-2.5 overflow-hidden"
			data-testid="dental-lab-orders-view"
		>
			<LabOrdersFilterBar
				metrics={metrics}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				doctorFilter={doctorFilter}
				onDoctorFilterChange={setDoctorFilter}
				doctorsList={doctorsList}
				onOpenPriceMatrix={() => setIsPriceMatrixModalOpen(true)}
				onRefresh={() => void fetchOrders()}
				isLoading={isLoading}
				onOpenNewOrder={handleOpenNewOrder}
			/>

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
						className="absolute top-2 right-2 p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
						title="Закрыть таймлайн"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			<LabOrdersSegmentedNav
				canonicalFilters={CANONICAL_STAGE_FILTERS}
				statusFilter={statusFilter}
				onStatusFilterChange={setStatusFilter}
				stageCounts={stageCounts}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
			/>

			<DentalLabOrdersViewSwitch logic={logic} />

			<DentalLabOrdersDrawersContainer logic={logic} />
		</main>
	);
}
