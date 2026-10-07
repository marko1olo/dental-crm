import React from "react";
import { Calendar, Plus } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { WaitlistBookingCard } from "./WaitlistBookingCard";
import { WaitlistPatientFilterBar } from "./WaitlistPatientFilterBar";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";
import type { WaitlistPatientEntry } from "./waitlistMatchScoring";

export interface WaitlistListTabProps {
	filteredList: WaitlistPatientEntry[];
	searchQuery: string;
	onSearchChange: (query: string) => void;
	selectedPriorityFilter: string;
	onPriorityFilterChange: (priority: string) => void;
	isLoading: boolean;
	totalItemsCount: number;
	contactedPatients: Set<string>;
	bookingPatientId: string | null;
	activeTargetSlot: TargetSlotInfo | null;
	activeMenuPatientId: string | null;
	onToggleMenu: (id: string | null) => void;
	onBookPatient: (patient: WaitlistPatientEntry) => void;
	onSendWhatsApp: (patient: WaitlistPatientEntry) => void;
	onCopySms: (patient: WaitlistPatientEntry) => void;
	onSendTelegram: (patient: WaitlistPatientEntry) => void;
	onDelete: (id: string) => void;
	onOpenAddTab: () => void;
}

export const WaitlistListTab: React.FC<WaitlistListTabProps> = ({
	filteredList,
	searchQuery,
	onSearchChange,
	selectedPriorityFilter,
	onPriorityFilterChange,
	isLoading,
	totalItemsCount,
	contactedPatients,
	bookingPatientId,
	activeTargetSlot,
	activeMenuPatientId,
	onToggleMenu,
	onBookPatient,
	onSendWhatsApp,
	onCopySms,
	onSendTelegram,
	onDelete,
	onOpenAddTab,
}) => {
	return (
		<div className="space-y-3" data-testid="list-tab-content">
			<WaitlistPatientFilterBar
				searchQuery={searchQuery}
				onSearchChange={onSearchChange}
				selectedPriorityFilter={selectedPriorityFilter}
				onPriorityFilterChange={onPriorityFilterChange}
			/>

			{isLoading && totalItemsCount === 0 ? (
				<div className="text-center py-8 text-[var(--muted)] text-sm">
					Загрузка листа ожидания...
				</div>
			) : filteredList.length === 0 ? (
				<EmptyState
					icon={<Calendar size={28} />}
					title={
						searchQuery || selectedPriorityFilter !== "all"
							? "Ничего не найдено по фильтрам"
							: "В листе ожидания нет записей"
					}
					description={
						searchQuery || selectedPriorityFilter !== "all"
							? "Попробуйте изменить запрос или сбросить фильтр приоритета."
							: "Поставьте пациента в очередь ожидания при отмене или нехватке времени."
					}
					glass={false}
					action={
						<button
							type="button"
							onClick={() => {
								if (searchQuery || selectedPriorityFilter !== "all") {
									onSearchChange("");
									onPriorityFilterChange("all");
								} else {
									onOpenAddTab();
								}
							}}
							className="h-8 px-3 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 active:scale-95 transition-all shadow-xs cursor-pointer pointer-coarse:min-h-[44px]"
							data-testid="list-empty-add-btn"
						>
							<Plus className="w-3.5 h-3.5 shrink-0" />
							<span>
								{searchQuery || selectedPriorityFilter !== "all"
									? "Сбросить фильтры"
									: "+ Добавить в лист ожидания"}
							</span>
						</button>
					}
				/>
			) : (
				<div className="space-y-2.5">
					{filteredList.map((item) => (
						<WaitlistBookingCard
							key={item.id}
							patient={item}
							isContacted={contactedPatients.has(item.id)}
							isBooking={bookingPatientId === item.id}
							activeTargetSlot={activeTargetSlot}
							activeMenuId={activeMenuPatientId}
							onToggleMenu={onToggleMenu}
							onBookPatient={onBookPatient}
							onSendWhatsApp={onSendWhatsApp}
							onCopySms={onCopySms}
							onSendTelegram={onSendTelegram}
							onDelete={onDelete}
							isMatchMode={false}
						/>
					))}
				</div>
			)}
		</div>
	);
};
