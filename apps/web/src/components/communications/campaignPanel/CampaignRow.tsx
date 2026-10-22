import { formatMoment } from "../deliveryReportNotice.js";
import { type CampaignItem, campaignStatusLabels, channelLabels } from "./types.js";

export type CampaignRowProps = {
	campaign: CampaignItem;
	busy: boolean;
	openPreview: (campaignId: string) => Promise<void>;
	loadProgress: (campaignId: string) => Promise<void>;
	campaignAction: (campaignId: string, action: "launch" | "cancel") => Promise<void>;
};

export function CampaignRow({ campaign, busy, openPreview, loadProgress, campaignAction }: CampaignRowProps) {
	const statusClass = campaign.status === "completed" ? "ok" : campaign.status === "running" ? "info" : campaign.status === "cancelled" ? "bad" : "muted";

	return (
		<tr>
			<td className="ops-strong" data-label="Название">{campaign.title}</td>
			<td data-label="Канал">{channelLabels[campaign.channel] ?? campaign.channel}</td>
			<td data-label="Вид">
				<span className={`ops-state ops-state--${campaign.scope === "marketing" ? "warn" : "info"}`}>
					{campaign.scope === "marketing" ? "Рекламная" : "Сервисная"}
				</span>
			</td>
			<td data-label="Состояние">
				<span className={`ops-state ops-state--${statusClass}`}>
					{campaignStatusLabels[campaign.status] ?? campaign.status}
				</span>
			</td>
			<td className="ops-time" data-label="Запущена">{formatMoment(campaign.launchedAt)}</td>
			<td data-label="Действие">
				<button className="secondary-button" type="button" onClick={() => void openPreview(campaign.id)}>
					Предпросмотр
				</button>
				{campaign.status === "draft" || campaign.status === "scheduled" ? (
					<>
						<button className="primary-button" type="button" disabled={busy} onClick={() => void campaignAction(campaign.id, "launch")}>
							Запустить
						</button>
						<button className="secondary-button" type="button" disabled={busy} onClick={() => void campaignAction(campaign.id, "cancel")}>
							Отменить
						</button>
					</>
				) : campaign.status === "running" ? (
					<>
						<button className="secondary-button" type="button" data-testid={`campaign-progress-btn-${campaign.id}`} onClick={() => void loadProgress(campaign.id)}>
							Ход отправки
						</button>
						<button className="primary-button" type="button" disabled={busy} onClick={() => void campaignAction(campaign.id, "cancel")}>
							Остановить
						</button>
					</>
				) : campaign.status === "completed" || campaign.status === "cancelled" ? (
					<button className="secondary-button" type="button" data-testid={`campaign-progress-btn-${campaign.id}`} onClick={() => void loadProgress(campaign.id)}>
						Ход отправки
					</button>
				) : null}
			</td>
		</tr>
	);
}
