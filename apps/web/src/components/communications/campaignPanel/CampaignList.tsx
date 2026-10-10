import {
	type Notice,
	formatMoment,
} from "../deliveryReportNotice.js";
import {
	type CampaignItem,
	campaignStatusLabels,
	channelLabels,
} from "./types.js";

export type CampaignListProps = {
	campaigns: CampaignItem[];
	busy: boolean;
	notice: Notice | null;
	openPreview: (campaignId: string) => Promise<void>;
	loadProgress: (campaignId: string) => Promise<void>;
	campaignAction: (
		campaignId: string,
		action: "launch" | "cancel",
	) => Promise<void>;
};

export function CampaignList({
	campaigns,
	busy,
	notice,
	openPreview,
	loadProgress,
	campaignAction,
}: CampaignListProps) {
	return (
		<>
			{notice ? (
				notice.kind === "fail" ? (
					<p className="ops-notice ops-notice--error" role="alert">
						{notice.text}
					</p>
				) : (
					<p className="ops-notice" role="status" aria-live="polite">
						{notice.text}
					</p>
				)
			) : null}

			{(campaigns || []).length === 0 ? (
				<p className="ops-empty">Рассылок пока нет.</p>
			) : (
				<div className="ops-table-wrap">
					<table className="ops-table">
						<thead>
							<tr>
								<th scope="col">Название</th>
								<th scope="col">Канал</th>
								<th scope="col">Вид</th>
								<th scope="col">Состояние</th>
								<th scope="col">Запущена</th>
								<th scope="col">Действие</th>
							</tr>
						</thead>
						<tbody>
							{(campaigns || []).map((campaign) => (
								<tr key={campaign.id}>
									<td className="ops-strong" data-label="Название">
										{campaign.title}
									</td>
									<td data-label="Канал">
										{channelLabels[campaign.channel] ?? campaign.channel}
									</td>
									<td data-label="Вид">
										{campaign.scope === "marketing" ? (
											<span className="ops-state ops-state--warn">
												Рекламная
											</span>
										) : (
											<span className="ops-state ops-state--info">
												Сервисная
											</span>
										)}
									</td>
									<td data-label="Состояние">
										<span
											className={`ops-state ops-state--${
												campaign.status === "completed"
													? "ok"
													: campaign.status === "running"
														? "info"
														: campaign.status === "cancelled"
															? "bad"
															: "muted"
											}`}
										>
											{campaignStatusLabels[campaign.status] ?? campaign.status}
										</span>
									</td>
									<td className="ops-time" data-label="Запущена">
										{formatMoment(campaign.launchedAt)}
									</td>
									<td data-label="Действие">
										<button
											className="secondary-button"
											type="button"
											onClick={() => void openPreview(campaign.id)}
										>
											Предпросмотр
										</button>
										{campaign.status === "draft" ||
										campaign.status === "scheduled" ? (
											<>
												<button
													className="primary-button"
													type="button"
													disabled={busy}
													onClick={() =>
														void campaignAction(campaign.id, "launch")
													}
												>
													Запустить
												</button>
												<button
													className="secondary-button"
													type="button"
													disabled={busy}
													onClick={() =>
														void campaignAction(campaign.id, "cancel")
													}
												>
													Отменить
												</button>
											</>
										) : campaign.status === "running" ? (
											<>
												<button
													className="secondary-button"
													type="button"
													data-testid={`campaign-progress-btn-${campaign.id}`}
													onClick={() => void loadProgress(campaign.id)}
												>
													Ход отправки
												</button>
												<button
													className="primary-button"
													type="button"
													disabled={busy}
													onClick={() =>
														void campaignAction(campaign.id, "cancel")
													}
												>
													Остановить
												</button>
											</>
										) : campaign.status === "completed" ||
											campaign.status === "cancelled" ? (
											<button
												className="secondary-button"
												type="button"
												data-testid={`campaign-progress-btn-${campaign.id}`}
												onClick={() => void loadProgress(campaign.id)}
											>
												Ход отправки
											</button>
										) : null}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</>
	);
}

export default CampaignList;
