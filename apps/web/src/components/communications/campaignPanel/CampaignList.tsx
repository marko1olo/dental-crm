import { type Notice } from "../deliveryReportNotice.js";
import { CampaignRow } from "./CampaignRow.js";
import { type CampaignItem } from "./types.js";

export type CampaignListProps = {
	campaigns: CampaignItem[];
	busy: boolean;
	notice: Notice | null;
	openPreview: (campaignId: string) => Promise<void>;
	loadProgress: (campaignId: string) => Promise<void>;
	campaignAction: (campaignId: string, action: "launch" | "cancel") => Promise<void>;
};

export function CampaignList({
	campaigns, busy, notice, openPreview, loadProgress, campaignAction,
}: CampaignListProps) {
	return (
		<>
			{notice && (
				notice.kind === "fail" ? (
					<p className="ops-notice ops-notice--error" role="alert">{notice.text}</p>
				) : (
					<p className="ops-notice" role="status" aria-live="polite">{notice.text}</p>
				)
			)}

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
								<CampaignRow
									key={campaign.id} campaign={campaign} busy={busy}
									openPreview={openPreview} loadProgress={loadProgress} campaignAction={campaignAction}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</>
	);
}

export default CampaignList;
