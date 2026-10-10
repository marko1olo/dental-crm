import {
	calculateSmsCostKopecks,
	formatSmsCostRu,
} from "../deliveryReportNotice.js";
import {
	type CampaignPreview,
	type CampaignProgress,
	outboxStatusLabels,
} from "./types.js";

export type CampaignStatsProps = {
	progressFor: string | null;
	progress: CampaignProgress | null;
	progressError: string | null;
	progressLoading: boolean;
	isCampaignRunning: boolean;
	loadProgress: (campaignId: string) => Promise<void>;
	closeProgress: () => void;
	previewFor: string | null;
	preview: CampaignPreview | null;
	previewError: string | null;
	openPreview: (campaignId: string) => Promise<void>;
	closePreview: () => void;
};

export function CampaignProgressPanel({
	progressFor,
	progress,
	progressError,
	progressLoading,
	isCampaignRunning,
	loadProgress,
	closeProgress,
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
			{progressLoading && !progress ? (
				<p className="ops-hint" role="status" aria-live="polite">
					Считаем сообщения рассылки…
				</p>
			) : null}
			{progressError ? (
				<>
					<p className="ops-notice ops-notice--error" role="alert">
						Не удалось получить ход рассылки: {progressError}
					</p>
					<button
						className="secondary-button"
						type="button"
						data-testid="campaign-progress-retry"
						onClick={() => void loadProgress(progressFor)}
					>
						Повторить
					</button>
				</>
			) : null}
			{progress ? (
				<>
					<ul
						className="ops-metrics"
						data-testid="campaign-progress-metrics"
					>
						<li className="ops-metric ops-metric--primary">
							<span className="ops-metric__value">{progress.total}</span>
							<span className="ops-metric__label">всего в очереди</span>
						</li>
						{(
							[
								["sent", "ops-metric--primary"],
								["delivered", "ops-metric--primary"],
								["queued", ""],
								["sending", ""],
								["failed", "ops-metric--danger"],
								["cancelled", ""],
								["suppressed", ""],
							] as const
						).map(([status, cls]) => {
							const count = progress.byStatus[status] ?? 0;
							if (count <= 0) return null;
							return (
								<li
									className={`ops-metric ${cls}`.trim()}
									key={status}
									data-testid={`campaign-progress-${status}`}
								>
									<span className="ops-metric__value">{count}</span>
									<span className="ops-metric__label">
										{outboxStatusLabels[status] ?? status}
									</span>
								</li>
							);
						})}
					</ul>
					{progress.total === 0 ? (
						<p className="ops-hint">
							Сообщений этой рассылки в очереди пока нет — либо она ещё не
							запускалась, либо все строки уже сняты.
						</p>
					) : null}
					{(progress.byStatus.failed ?? 0) > 0 ? (
						<p className="ops-notice ops-notice--error" role="alert">
							Не удалось отправить: {progress.byStatus.failed}. Откройте
							журнал доставки и повторите отказные по одной, либо проверьте
							шлюз.
						</p>
					) : null}
					{isCampaignRunning ? (
						<p className="ops-hint" role="status" aria-live="polite">
							Рассылка выполняется — цифры обновляются сами каждые несколько
							секунд.
						</p>
					) : null}
				</>
			) : null}
			<div className="ops-toolbar">
				<button
					className="secondary-button"
					type="button"
					data-testid="campaign-progress-refresh"
					disabled={progressLoading}
					onClick={() => void loadProgress(progressFor)}
				>
					Обновить
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={closeProgress}
				>
					Закрыть ход
				</button>
			</div>
		</div>
	);
}

export function CampaignPreviewPanel({
	previewFor,
	preview,
	previewError,
	openPreview,
	closePreview,
}: {
	previewFor: string;
	preview: CampaignPreview | null;
	previewError: string | null;
	openPreview: (campaignId: string) => Promise<void>;
	closePreview: () => void;
}) {
	return (
		<div className="ops-preview">
			<h3 className="ops-section-title">Предпросмотр</h3>
			{previewError !== null ? (
				<>
					<p className="ops-notice ops-notice--error" role="alert">
						Не удалось посчитать получателей: {previewError}. Пока не
						посчитано, запускать рассылку не стоит — неизвестно, сколько
						человек её получит и сколько это будет стоить.
					</p>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void openPreview(previewFor)}
					>
						Посчитать ещё раз
					</button>
				</>
			) : preview === null ? (
				<>
					<div className="ops-skeleton" aria-hidden="true">
						<span className="ops-skeleton__line" />
						<span className="ops-skeleton__line" />
					</div>
					<p className="ops-hint" role="status" aria-live="polite">
						Считаем получателей…
					</p>
				</>
			) : (
				<>
					<p className="ops-hint">
						Условия:{" "}
						{preview.criteria.length > 0
							? preview.criteria.join("; ")
							: "без ограничений"}
						.
					</p>
					<ul className="ops-metrics">
						<li className="ops-metric">
							<span className="ops-metric__value">
								{preview.audience.matched}
							</span>
							<span className="ops-metric__label">подошло по условиям</span>
						</li>
						<li
							className={`ops-metric ${preview.audience.deliverable > 0 ? "ops-metric--primary" : "ops-metric--danger"}`}
						>
							<span className="ops-metric__value">
								{preview.audience.deliverable}
							</span>
							<span className="ops-metric__label">получат сообщение</span>
						</li>
						<li className="ops-metric">
							<span className="ops-metric__value">
								{preview.cost.billableUnits}
							</span>
							<span className="ops-metric__label">
								{preview.cost.segmentsPerMessage === null
									? "сообщений к отправке"
									: "сегментов к оплате"}
							</span>
						</li>
						{preview.cost.segmentsPerMessage !== null ? (
							<li className="ops-metric" data-testid="campaign-cost-estimate">
								<span className="ops-metric__value">
									{formatSmsCostRu(
										calculateSmsCostKopecks(
											preview.cost.segmentsPerMessage,
											preview.audience.deliverable,
										),
									)}
								</span>
								<span className="ops-metric__label">
									расчётная стоимость (SMS)
								</span>
							</li>
						) : null}
					</ul>
					<ul>
						{(preview?.audience?.excluded?.no_consent ?? 0) > 0 ? (
							<li>
								без согласия: {preview?.audience?.excluded?.no_consent}
							</li>
						) : null}
						{(preview?.audience?.excluded?.no_contact ?? 0) > 0 ? (
							<li>
								без пригодного контакта:{" "}
								{preview?.audience?.excluded?.no_contact}
							</li>
						) : null}
						{(preview?.audience?.excluded?.excluded_by_criteria ?? 0) >
						0 ? (
							<li>
								не подошли по условиям:{" "}
								{preview?.audience?.excluded?.excluded_by_criteria}
							</li>
						) : null}
					</ul>
					<p className="ops-hint">{preview?.cost?.note}</p>
					{preview?.sampleText ? (
						<>
							<span className="ops-preview__title">Как увидит пациент</span>
							<p className="ops-preview__text">{preview.sampleText}</p>
						</>
					) : null}
					{(preview?.audience?.notes ?? []).map((note) => (
						<p className="ops-hint" key={note}>
							{note}
						</p>
					))}
					{(preview?.problems ?? []).length > 0 ? (
						<p className="ops-notice ops-notice--error" role="alert">
							{(preview?.problems ?? []).join(" ")}
						</p>
					) : null}
					{(preview?.audience?.candidates ?? []).length > 0 ? (
						<p className="ops-hint">
							Например:{" "}
							{(preview?.audience?.candidates ?? [])
								.map((candidate) => candidate?.fullName ?? "")
								.join(", ")}
						</p>
					) : null}
				</>
			)}
			<button
				className="secondary-button"
				type="button"
				onClick={closePreview}
			>
				Закрыть предпросмотр
			</button>
		</div>
	);
}

export function CampaignStats({
	progressFor,
	progress,
	progressError,
	progressLoading,
	isCampaignRunning,
	loadProgress,
	closeProgress,
	previewFor,
	preview,
	previewError,
	openPreview,
	closePreview,
}: CampaignStatsProps) {
	return (
		<>
			{progressFor ? (
				<CampaignProgressPanel
					progressFor={progressFor}
					progress={progress}
					progressError={progressError}
					progressLoading={progressLoading}
					isCampaignRunning={isCampaignRunning}
					loadProgress={loadProgress}
					closeProgress={closeProgress}
				/>
			) : null}
			{previewFor ? (
				<CampaignPreviewPanel
					previewFor={previewFor}
					preview={preview}
					previewError={previewError}
					openPreview={openPreview}
					closePreview={closePreview}
				/>
			) : null}
		</>
	);
}

export default CampaignStats;
