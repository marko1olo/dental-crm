/**
 * Рассылки: составление, предпросмотр, запуск.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ПАНЕЛЬ И ЧТО В НЕЙ ГЛАВНОЕ
 * Отправить сообщение группе пациентов было нельзя, а «Рассылки» из перечня
 * возможностей закрывались виджетами, читавшими пустые таблицы.
 *
 * Ключевое здесь — обязательный предпросмотр перед запуском. Он показывает не
 * только «сколько подошло», но и сколько отсеяно и почему (нет контакта, нет
 * согласия на рекламу), а также стоимость: для SMS это сегменты, умноженные на
 * получателей. Иначе «отправлено 12 из 400» выясняется уже после отправки, а
 * счёт от оператора — в конце месяца.
 */

import { useCallback, useEffect, useState } from "react";

type CampaignCriteria = {
	status?: "active" | "archived";
	lastVisitBefore?: string;
	neverVisited?: boolean;
	hasFutureAppointment?: boolean;
	debtAtLeastRub?: number;
	birthdayWithinDays?: number;
};

type CampaignItem = {
	id: string;
	title: string;
	channel: string;
	scope: string;
	status: string;
	criteria: CampaignCriteria;
	scheduledAt: string | null;
	launchedAt: string | null;
	completedAt: string | null;
	createdAt: string;
};

type TemplateOption = { id: string; title: string; channel: string; intent: string; isActive: boolean };

type CampaignPreview = {
	criteria: string[];
	audience: {
		matched: number;
		deliverable: number;
		excluded: { no_contact: number; no_consent: number; excluded_by_criteria: number };
		candidates: { patientId: string; fullName: string }[];
		notes: string[];
	};
	cost: { recipients: number; segmentsPerMessage: number | null; billableUnits: number; note: string };
	sampleText: string | null;
	problems: string[];
};

const campaignStatusLabels: Record<string, string> = {
	draft: "Черновик",
	scheduled: "Запланирована",
	running: "Выполняется",
	completed: "Завершена",
	cancelled: "Отменена"
};

const channelLabels: Record<string, string> = {
	sms: "SMS",
	email: "Почта",
	whatsapp: "WhatsApp",
	telegram: "Телеграм"
};

async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as unknown;
	if (!response.ok) {
		const message =
			payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

function formatMoment(value: string | null): string {
	if (!value) return "—";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? "—"
		: parsed.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function CampaignPanel() {
	const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
	const [templates, setTemplates] = useState<TemplateOption[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const [title, setTitle] = useState("");
	const [templateId, setTemplateId] = useState("");
	const [scope, setScope] = useState<"service" | "marketing">("marketing");
	const [monthsSinceVisit, setMonthsSinceVisit] = useState("6");
	const [excludeBooked, setExcludeBooked] = useState(true);

	const [previewFor, setPreviewFor] = useState<string | null>(null);
	const [preview, setPreview] = useState<CampaignPreview | null>(null);

	const load = useCallback(async () => {
		setLoadError(null);
		try {
			const [campaignResponse, templateResponse] = await Promise.all([
				fetch("/api/communications/campaigns"),
				fetch("/api/communications/templates")
			]);
			const campaignData = await readJson<{ campaigns: CampaignItem[] }>(campaignResponse);
			const templateData = await readJson<{ templates: TemplateOption[] }>(templateResponse);
			setCampaigns(campaignData.campaigns);
			setTemplates(templateData.templates.filter((template) => template.isActive));
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : String(error));
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	function buildCriteria(): CampaignCriteria {
		const criteria: CampaignCriteria = { status: "active" };
		const months = Number.parseInt(monthsSinceVisit, 10);
		if (Number.isFinite(months) && months > 0) {
			const cutoff = new Date();
			cutoff.setMonth(cutoff.getMonth() - months);
			criteria.lastVisitBefore = cutoff.toISOString();
		}
		// Не звать тех, кто уже записан: такое сообщение вызывает звонок
		// «я же записан» и тратит время администратора.
		if (excludeBooked) criteria.hasFutureAppointment = false;
		return criteria;
	}

	async function createCampaign() {
		setBusy(true);
		setNotice(null);
		try {
			const response = await fetch("/api/communications/campaigns", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ title, templateId, scope, criteria: buildCriteria() })
			});
			const data = await readJson<{ campaign: CampaignItem }>(response);
			setNotice("Рассылка создана. Проверьте предпросмотр перед запуском.");
			setTitle("");
			await load();
			// Сразу открыть предпросмотр: запускать вслепую не нужно.
			await openPreview(data.campaign.id);
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}

	async function openPreview(campaignId: string) {
		setPreviewFor(campaignId);
		setPreview(null);
		try {
			const response = await fetch(`/api/communications/campaigns/${campaignId}/preview`);
			setPreview(await readJson<CampaignPreview>(response));
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		}
	}

	async function campaignAction(campaignId: string, action: "launch" | "cancel") {
		setBusy(true);
		setNotice(null);
		try {
			const response = await fetch(`/api/communications/campaigns/${campaignId}/${action}`, { method: "POST" });
			const data = await readJson<{ queued?: number; alreadyQueued?: number; cancelledMessages?: number }>(response);
			setNotice(
				action === "launch"
					? `Поставлено в очередь: ${data.queued ?? 0}. Уже стояли: ${data.alreadyQueued ?? 0}. ` +
							"Отправка идёт через общую очередь и подчиняется тихим часам."
					: `Снято с очереди: ${data.cancelledMessages ?? 0}. Уже отправленное осталось в журнале.`
			);
			await load();
			if (previewFor === campaignId) await openPreview(campaignId);
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}

	if (loadError) {
		return (
			<section className="panel ops-panel" data-testid="campaign-panel">
				<div className="panel-heading">
					<h2>Рассылки</h2>
				</div>
				<p className="ops-notice ops-notice--error" role="alert">Не удалось получить рассылки: {loadError}</p>
				<button className="secondary-button" type="button" onClick={() => void load()}>
					Повторить
				</button>
			</section>
		);
	}

	return (
		<section className="panel ops-panel" data-testid="campaign-panel">
			<div className="panel-heading">
				<h2>Рассылки</h2>
			</div>

			{notice ? (
				<p className="ops-notice" role="status" aria-live="polite">
					{notice}
				</p>
			) : null}

			{campaigns.length === 0 ? (
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
						{campaigns.map((campaign) => (
							<tr key={campaign.id}>
								<td className="ops-strong" data-label="Название">
									{campaign.title}
								</td>
								<td data-label="Канал">{channelLabels[campaign.channel] ?? campaign.channel}</td>
								<td data-label="Вид">
									{campaign.scope === "marketing" ? (
										// Рекламная требует согласия — это должно быть заметно.
										<span className="ops-state ops-state--warn">Рекламная</span>
									) : (
										<span className="ops-state ops-state--info">Сервисная</span>
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
									<button className="secondary-button" type="button" onClick={() => void openPreview(campaign.id)}>
										Предпросмотр
									</button>
									{campaign.status === "draft" || campaign.status === "scheduled" || campaign.status === "running" ? (
										<>
											<button
												className="primary-button"
												type="button"
												disabled={busy}
												onClick={() => void campaignAction(campaign.id, "launch")}
											>
												Запустить
											</button>
											<button
												className="secondary-button"
												type="button"
												disabled={busy}
												onClick={() => void campaignAction(campaign.id, "cancel")}
											>
												Отменить
											</button>
										</>
									) : null}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				</div>
			)}

			{previewFor ? (
				<div className="ops-preview">
					<h3 className="ops-section-title">Предпросмотр</h3>
					{preview === null ? (
						<div className="ops-skeleton" aria-hidden="true">
							<span className="ops-skeleton__line" />
							<span className="ops-skeleton__line" />
						</div>
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
							</ul>
							{/* Отсев с причинами: «отправлено 12 из 400» иначе выглядит как ошибка. */}
							<ul>
								{preview.audience.excluded.no_consent > 0 ? (
									<li>без согласия: {preview.audience.excluded.no_consent}</li>
								) : null}
								{preview.audience.excluded.no_contact > 0 ? (
									<li>без пригодного контакта: {preview.audience.excluded.no_contact}</li>
								) : null}
								{preview.audience.excluded.excluded_by_criteria > 0 ? (
									<li>не подошли по условиям: {preview.audience.excluded.excluded_by_criteria}</li>
								) : null}
							</ul>
							<p className="ops-hint">{preview.cost.note}</p>
							{preview.sampleText ? (
								<>
									<span className="ops-preview__title">Как увидит пациент</span>
									<p className="ops-preview__text">{preview.sampleText}</p>
								</>
							) : null}
							{preview.audience.notes.map((note) => (
								<p className="ops-hint" key={note}>
									{note}
								</p>
							))}
							{preview.problems.length > 0 ? (
								<p className="ops-notice ops-notice--error" role="alert">
									{preview.problems.join(" ")}
								</p>
							) : null}
							{preview.audience.candidates.length > 0 ? (
								<p className="ops-hint">
									Например: {preview.audience.candidates.map((candidate) => candidate.fullName).join(", ")}
								</p>
							) : null}
						</>
					)}
					<button className="secondary-button" type="button" onClick={() => setPreviewFor(null)}>
						Закрыть предпросмотр
					</button>
				</div>
			) : null}

			<h3 className="ops-section-title">Новая рассылка</h3>
			{templates.length === 0 ? (
				<p className="ops-empty">Нет активных шаблонов — сначала создайте шаблон для нужного канала.</p>
			) : (
				<div className="ops-toolbar">
					<span className="ops-field ops-field--grow">
					<label htmlFor="campaign-title">Название</label>
					<input
						id="campaign-title"
						type="text"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="Приглашение на осмотр"
					/>

					</span>
					<span className="ops-field">
					<label htmlFor="campaign-template">Шаблон</label>
					<select id="campaign-template" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
						<option value="">Выберите шаблон</option>
						{templates.map((template) => (
							<option key={template.id} value={template.id}>
								{template.title} · {channelLabels[template.channel] ?? template.channel}
							</option>
						))}
					</select>

					</span>
					<span className="ops-field">
					<label htmlFor="campaign-scope">Вид</label>
					<select
						id="campaign-scope"
						value={scope}
						onChange={(event) => setScope(event.target.value as "service" | "marketing")}
					>
						<option value="marketing">Рекламная — нужно согласие пациента</option>
						<option value="service">Сервисная — в рамках договора</option>
					</select>

					</span>
					<span className="ops-field">
					<label htmlFor="campaign-months">Не был, месяцев</label>
					<input
						id="campaign-months"
						type="number"
						min={0}
						max={120}
						value={monthsSinceVisit}
						onChange={(event) => setMonthsSinceVisit(event.target.value)}
					/>

					</span>
					<label className="ops-checkbox" htmlFor="campaign-exclude-booked">
						<input
							id="campaign-exclude-booked"
							type="checkbox"
							checked={excludeBooked}
							onChange={(event) => setExcludeBooked(event.target.checked)}
						/>{" "}
						Не писать тем, кто уже записан
					</label>

					<button
						className="primary-button"
						type="button"
						disabled={busy || !title.trim() || !templateId}
						onClick={() => void createCampaign()}
					>
						Создать и посмотреть получателей
					</button>
				</div>
			)}
		</section>
	);
}

export default CampaignPanel;
