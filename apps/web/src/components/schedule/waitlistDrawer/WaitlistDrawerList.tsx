import React from "react";
import { Calendar, Plus } from "lucide-react";
import { EmptyState } from "../../EmptyState";
import { PanelLoadFailure } from "../../PanelLoadFailure";
import { WaitlistCandidateCard } from "../WaitlistCandidateCard";
import {
  WAITLIST_SUBJECT,
  type useWaitlistDrawerOperations,
} from "../useWaitlistDrawerOperations";
import type { TargetSlotInfo } from "../waitlistCancellationEngine";
import type { useWaitlistDrawerController } from "./useWaitlistDrawerController";

export interface WaitlistDrawerListProps {
  ops: ReturnType<typeof useWaitlistDrawerOperations>;
  ctrl: ReturnType<typeof useWaitlistDrawerController>;
  targetSlot?: TargetSlotInfo | null;
  updateNewAppointmentDraft?: (key: any, value: any) => void;
  focusNewAppointmentEditor?: () => void;
  onClose: () => void;
}

export function WaitlistDrawerList({
  ops,
  ctrl,
  targetSlot,
  updateNewAppointmentDraft,
  focusNewAppointmentEditor,
  onClose,
}: WaitlistDrawerListProps) {
  const {
    filteredCandidates,
    searchQuery,
    setSearchQuery,
    selectedUrgency,
    setSelectedUrgency,
    onlySameDoctor,
    setOnlySameDoctor,
    openMenuId,
    setOpenMenuId,
  } = ctrl;

  if (ops.loadFailureStatus !== undefined) {
    return (
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
        <PanelLoadFailure
          subject={WAITLIST_SUBJECT}
          status={ops.loadFailureStatus}
          onRetry={ops.fetchWaitlist}
        />
      </div>
    );
  }

  if (ops.isLoading && ops.items.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
        <div className="text-center py-8 text-[var(--muted)] text-sm">
          Загружаем лист ожидания…
        </div>
      </div>
    );
  }

  if (filteredCandidates.length === 0) {
    const isFiltered = Boolean(searchQuery || selectedUrgency !== "all" || onlySameDoctor);
    return (
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
        <EmptyState
          icon={<Calendar size={24} />}
          title={isFiltered ? "По выбранным фильтрам совпадений нет" : WAITLIST_SUBJECT.emptyTitle}
          description={
            isFiltered
              ? "Сбросьте фильтры или добавьте нового пациента в лист ожидания за 5 секунд."
              : WAITLIST_SUBJECT.emptyHint
          }
          glass={false}
          action={
            <button
              type="button"
              onClick={() => {
                if (isFiltered) {
                  setSearchQuery("");
                  setSelectedUrgency("all");
                  setOnlySameDoctor(false);
                } else {
                  ops.setIsAddFormOpen(true);
                }
              }}
              className="h-8 px-3 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] font-bold text-xs inline-flex items-center gap-1.5 hover:brightness-105 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isFiltered ? "Сбросить фильтры" : "+ Добавить в лист ожидания"}</span>
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
      <ul className="space-y-2.5 list-none m-0 p-0" data-testid="waitlist-candidates-list">
        {filteredCandidates.map(({ item, scoring }, idx) => {
          const isContacted = ops.contactedPatients.has(item.id);
          const isBooked = ops.bookedItemIds.has(item.id);
          const fallbackSlot = !targetSlot
            ? (item.preferredDoctorId
                ? ops.fallbackFreeSlots.find((s) => s.doctorId === item.preferredDoctorId)
                : null) ||
              ops.fallbackFreeSlots[0] ||
              null
            : null;

          return (
            <WaitlistCandidateCard
              key={item.id}
              item={item}
              scoring={scoring}
              idx={idx}
              targetSlot={targetSlot}
              fallbackSlot={fallbackSlot}
              isContacted={isContacted}
              isBooked={isBooked}
              loadingId={ops.loadingId}
              openMenuId={openMenuId}
              onToggleMenu={setOpenMenuId}
              onOneClickBookSlot={ops.handleOneClickBookSlot}
              onSendWhatsApp={ops.handleSendWhatsApp}
              onSendTelegram={ops.handleSendTelegram}
              onCopySms={ops.handleCopySms}
              onFulfill={ops.handleFulfill}
              onDelete={ops.handleDelete}
              onSelectForDraft={(it) => {
                updateNewAppointmentDraft?.("patientId", it.patientId);
                onClose();
                focusNewAppointmentEditor?.();
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}
