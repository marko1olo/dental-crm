import React from "react";
import { Clock } from "lucide-react";
import { QueueBillboardView } from "../queue/QueueBillboardView";
import { TodayQueueHeader } from "./todayQueue/TodayQueueHeader";
import { TodayQueueToolbar } from "./todayQueue/TodayQueueToolbar";
import { TodayQueueItemCard } from "./todayQueue/TodayQueueItemCard";
import { useTodayQueueState } from "./todayQueue/useTodayQueueState";
import type { TodayQueueBoardProps } from "./todayQueue/todayQueueTypes";

export type { TodayQueueBoardProps };

export const TodayQueueBoard: React.FC<TodayQueueBoardProps> = (props) => {
  const {
    appointments = [], targetDateKey, onOpenAppointment, onOpenVisit,
    onOpenPayment, staffList = [], chairsList = [], className = "",
  } = props;

  const {
    activeTab, setActiveTab, doctorFilter, setDoctorFilter, chairFilter, setChairFilter,
    searchQuery, setSearchQuery, inFlightActionId, showLobbyBillboard, setShowLobbyBillboard,
    queueResult, displayedItems, handleActionClick,
  } = useTodayQueueState(props);

  return (
    <section
      className={`today-queue-board flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-[var(--ink)] shadow-2xs ${className}`.trim()}
      data-testid="today-queue-board"
      aria-label="Табло оперативной очереди пациентов смены"
    >
      <TodayQueueHeader summary={queueResult.summary} />
      <TodayQueueToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={queueResult.counts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        doctorFilter={doctorFilter}
        setDoctorFilter={setDoctorFilter}
        chairFilter={chairFilter}
        setChairFilter={setChairFilter}
        staffList={staffList}
        chairsList={chairsList}
        setShowLobbyBillboard={setShowLobbyBillboard}
      />
      <div className="flex flex-col gap-2" role="region" aria-label="Список пациентов в очереди">
        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] py-8 text-center text-xs text-[var(--muted)]">
            <Clock size={24} className="mb-1 text-[var(--muted)] opacity-60" />
            <p className="font-semibold">
              {activeTab === "waiting" ? "В холле пока никто не ожидает"
                : activeTab === "in_chair" ? "В креслах сейчас нет активных пациентов"
                : activeTab === "checkout" ? "Пациентов, ожидающих расчета, нет"
                : activeTab === "completed" ? "Завершенных приемов пока нет"
                : "Записей на выбранный период не найдено"}
            </p>
          </div>
        ) : (
          displayedItems.map((item) => (
            <TodayQueueItemCard
              key={item.id}
              item={item}
              inFlightActionId={inFlightActionId}
              onOpenAppointment={onOpenAppointment}
              onOpenVisit={onOpenVisit}
              onOpenPayment={onOpenPayment}
              handleActionClick={handleActionClick}
            />
          ))
        )}
      </div>
      {showLobbyBillboard && (
        <QueueBillboardView
          appointments={appointments}
          onClose={() => setShowLobbyBillboard(false)}
        />
      )}
    </section>
  );
};
