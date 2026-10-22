import { calculateSmsCostKopecks, formatSmsCostRu } from "../deliveryReportNotice.js";
import type { CampaignPreview } from "./types.js";

export function CampaignPreviewPanel({
	previewFor, preview, previewError, openPreview, closePreview,
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
						Не удалось посчитать получателей: {previewError}. Пока не посчитано, запускать рассылку не стоит — неизвестно, сколько человек её получит и сколько это будет стоить.
					</p>
					<button className="secondary-button" type="button" onClick={() => void openPreview(previewFor)}>
						Посчитать ещё раз
					</button>
				</>
			) : preview === null ? (
				<>
					<div className="ops-skeleton" aria-hidden="true">
						<span className="ops-skeleton__line" />
						<span className="ops-skeleton__line" />
					</div>
					<p className="ops-hint" role="status" aria-live="polite">Считаем получателей…</p>
				</>
			) : (
				<>
					<p className="ops-hint">
						Условия: {preview.criteria.length > 0 ? preview.criteria.join("; ") : "без ограничений"}.
					</p>
					<ul className="ops-metrics">
						<li className="ops-metric">
							<span className="ops-metric__value">{preview.audience.matched}</span>
							<span className="ops-metric__label">подошло по условиям</span>
						</li>
						<li className={`ops-metric ${preview.audience.deliverable > 0 ? "ops-metric--primary" : "ops-metric--danger"}`}>
							<span className="ops-metric__value">{preview.audience.deliverable}</span>
							<span className="ops-metric__label">получат сообщение</span>
						</li>
						<li className="ops-metric">
							<span className="ops-metric__value">{preview.cost.billableUnits}</span>
							<span className="ops-metric__label">
								{preview.cost.segmentsPerMessage === null ? "сообщений к отправке" : "сегментов к оплате"}
							</span>
						</li>
						{preview.cost.segmentsPerMessage !== null && (
							<li className="ops-metric" data-testid="campaign-cost-estimate">
								<span className="ops-metric__value">
									{formatSmsCostRu(calculateSmsCostKopecks(preview.cost.segmentsPerMessage, preview.audience.deliverable))}
								</span>
								<span className="ops-metric__label">расчётная стоимость (SMS)</span>
							</li>
						)}
					</ul>
					<ul>
						{(preview?.audience?.excluded?.no_consent ?? 0) > 0 && <li>без согласия: {preview?.audience?.excluded?.no_consent}</li>}
						{(preview?.audience?.excluded?.no_contact ?? 0) > 0 && <li>без пригодного контакта: {preview?.audience?.excluded?.no_contact}</li>}
						{(preview?.audience?.excluded?.excluded_by_criteria ?? 0) > 0 && <li>не подошли по условиям: {preview?.audience?.excluded?.excluded_by_criteria}</li>}
					</ul>
					<p className="ops-hint">{preview?.cost?.note}</p>
					{preview?.sampleText && (
						<>
							<span className="ops-preview__title">Как увидит пациент</span>
							<p className="ops-preview__text">{preview.sampleText}</p>
						</>
					)}
					{(preview?.audience?.notes ?? []).map((note) => <p className="ops-hint" key={note}>{note}</p>)}
					{(preview?.problems ?? []).length > 0 && (
						<p className="ops-notice ops-notice--error" role="alert">{(preview?.problems ?? []).join(" ")}</p>
					)}
					{(preview?.audience?.candidates ?? []).length > 0 && (
						<p className="ops-hint">
							Например: {(preview?.audience?.candidates ?? []).map((c) => c?.fullName ?? "").join(", ")}
						</p>
					)}
				</>
			)}
			<button className="secondary-button" type="button" onClick={closePreview}>
				Закрыть предпросмотр
			</button>
		</div>
	);
}
