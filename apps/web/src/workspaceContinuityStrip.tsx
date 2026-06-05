type WorkspaceContinuityStripProps = {
  browserContinuityCritical: boolean;
  browserWarnings: string[];
  isOnline: boolean;
  isPendingVisitSyncing: boolean;
  onCheckDevice: () => void;
  onFlushSpeech: () => void;
  onFlushVisit: () => void;
  pendingSpeechChunkCount: number;
  pendingVisitSaveCount: number;
};

const workspaceContinuityOfflineGuidanceId = "workspace-continuity-offline-guidance";

export function WorkspaceContinuityStrip({
  browserContinuityCritical,
  browserWarnings,
  isOnline,
  isPendingVisitSyncing,
  onCheckDevice,
  onFlushSpeech,
  onFlushVisit,
  pendingSpeechChunkCount,
  pendingVisitSaveCount
}: WorkspaceContinuityStripProps) {
  const visible = !isOnline || pendingVisitSaveCount > 0 || pendingSpeechChunkCount > 0 || browserContinuityCritical;
  if (!visible) return null;

  const title = !isOnline
    ? "Работа без сети"
    : pendingVisitSaveCount || pendingSpeechChunkCount
      ? "Есть очередь синхронизации"
      : "Проверьте локальное хранение";
  const detail = !isOnline
    ? "Можно продолжать прием: черновики и аудио остаются на этом устройстве, отправка пойдет после подключения."
    : pendingVisitSaveCount || pendingSpeechChunkCount
      ? `Ожидает отправки: ${pendingVisitSaveCount ? `${pendingVisitSaveCount} сохранение приема` : "приемы синхронизированы"}; ${
          pendingSpeechChunkCount ? `${pendingSpeechChunkCount} аудио` : "аудио синхронизировано"
        }.`
      : browserWarnings.slice(0, 2).join(", ") || "Проверьте, что браузер не очищает локальные черновики.";

  return (
    <section className={`workspace-continuity-strip ${!isOnline ? "offline" : "queued"}`} role="status" aria-live="polite">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        {!isOnline ? (
          <small id={workspaceContinuityOfflineGuidanceId}>
            Кнопки отправки станут доступны после подключения. Пока не закрывайте вкладку, если идет прием или запись диктовки.
          </small>
        ) : null}
      </div>
      <div className="workspace-continuity-actions">
        {pendingVisitSaveCount ? (
          <button
            className="secondary-button"
            type="button"
            onClick={onFlushVisit}
            disabled={!isOnline || isPendingVisitSyncing}
            aria-describedby={!isOnline ? workspaceContinuityOfflineGuidanceId : undefined}
          >
            {isPendingVisitSyncing ? "Отправляю приемы" : "Отправить приемы"}
          </button>
        ) : null}
        {pendingSpeechChunkCount ? (
          <button
            className="secondary-button"
            type="button"
            onClick={onFlushSpeech}
            disabled={!isOnline}
            aria-describedby={!isOnline ? workspaceContinuityOfflineGuidanceId : undefined}
          >
            Отправить аудио
          </button>
        ) : null}
        <button className="secondary-button" type="button" onClick={onCheckDevice}>
          Проверить это устройство
        </button>
      </div>
    </section>
  );
}
