import { type CampaignProgress, outboxStatusLabels } from "./types.js";

export function CampaignProgressPanel({
	progressFor, progress, progressError, progressLoading, isCampaignRunning, loadProgress, closeProgress,
}: {
	progressFor: string;
	progress: CampaignProgress | null;
	progressError: string | null;
	progressLoading: boolean;
	isCampaignRunning: boolean;
	loadProgress: (campaignId: string) => Promise<void>;
	closeProgress: () => void;
}) {
	return (
		<div className="ops-preview" data-testid="campaign-progress-panel">
			<h3 className="ops-section-title">Ход отправки</h3>
			{progressLoading && !progress && (
				<p className="ops-hint" role="status" aria-live="polite">Считаем сообщения рассылки…</p>
			)}
			{progressError && (
				<>
					<p className="ops-notice ops-notice--error" role="alert">
						Не удалось получить ход рассылки: {progressError}
					</p>
					<button className="secondary-button" type="button" data-testid="campaign-progress-retry" onClick={() => void loadProgress(progressFor)}>
						Повторить
					</button>
				</>
			)}
			{progress && (
				<>
					<ul className="ops-metrics" data-testid="campaign-progress-metrics">
						<li className="ops-metric ops-metric--primary">
							<span className="ops-metric__value">{progress.total}</span>
							<span className="ops-metric__label">всего в очереди</span>
						</li>
						{(
							[
								["sent", "ops-metric--primary"], ["delivered", "ops-metric--primary"],
								["queued", ""], ["sending", ""], ["failed", "ops-metric--danger"],
								["cancelled", ""], ["suppressed", ""],
							] as const
						).map(([status, cls]) => {
							const count = progress.byStatus[status] ?? 0;
							if (count <= 0) return null;
							return (
								<li className={`ops-metric ${cls}`.trim()} key={status} data-testid={`campaign-progress-${status}`}>
									<span className="ops-metric__value">{count}</span>
									<span className="ops-metric__label">{outboxStatusLabels[status] ?? status}</span>
								</li>
							);
						})}
					</ul>
					{progress.total === 0 && (
						<p className="ops-hint">
							Сообщений этой рассылки в очереди пока нет — либо она ещё не запускалась, либо все строки уже сняты.
						</p>
					)}
					{(progress.byStatus.failed ?? 0) > 0 && (
						<p className="ops-notice ops-notice--error" role="alert">
							Не удалось отправить: {progress.byStatus.failed}. Откройте журнал доставки и повторите отказные по одной, либо проверьте шлюз.
						</p>
					)}
					{isCampaignRunning && (
						<p className="ops-hint" role="status" aria-live="polite">
							Рассылка выполняется — цифры обновляются сами каждые несколько секунд.
						</p>
					)}
				</>
			)}
			<div className="ops-toolbar">
				<button className="secondary-button" type="button" data-testid="campaign-progress-refresh" disabled={progressLoading} onClick={() => void loadProgress(progressFor)}>
					Обновить
				</button>
				<button className="secondary-button" type="button" onClick={closeProgress}>
					Закрыть ход
				</button>
			</div>
		</div>
	);
}
