import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
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

import { useAppLogicContext } from "../../contexts/AppLogicContext";

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

type TemplateOption = {
	id: string;
	title: string;
	channel: string;
	intent: string;
	isActive: boolean;
};
type TemplateVariable = {
	key: string;
	label: string;
	example: string;
	phi: boolean;
};

type CampaignPreview = {
	criteria: string[];
	audience: {
		matched: number;
		deliverable: number;
		excluded: {
			no_contact: number;
			no_consent: number;
			excluded_by_criteria: number;
		};
		candidates: { patientId: string; fullName: string }[];
		notes: string[];
	};
	cost: {
		recipients: number;
		segmentsPerMessage: number | null;
		billableUnits: number;
		note: string;
	};
	sampleText: string | null;
	problems: string[];
};

/**
 * Ход рассылки после запуска: сколько сообщений в каком состоянии очереди.
 * БЕЗ ЭТОГО администратор видел только «Выполняется» / «Завершена» и кнопку
 * «Остановить» — сколько реально ушло, сколько зависло, сколько отказало,
 * узнать было нельзя, пока не открыть общий журнал и не фильтровать вручную.
 * API: GET /api/communications/campaigns/:campaignId/progress → byStatus + total.
 */
type CampaignProgress = {
	byStatus: Record<string, number>;
	total: number;
};

/** Подписи статусов очереди — те же, что в MessageDeliveryConsole. */
const outboxStatusLabels: Record<string, string> = {
	queued: "В очереди",
	sending: "Отправляется",
	sent: "Отправлено",
	delivered: "Доставлено",
	failed: "Не удалось",
	cancelled: "Снято",
	suppressed: "Задержано",
};

const campaignStatusLabels: Record<string, string> = {
	draft: "Черновик",
	scheduled: "Запланирована",
	running: "Выполняется",
	completed: "Завершена",
	cancelled: "Отменена",
};

const channelLabels: Record<string, string> = {
	sms: "SMS",
	email: "Почта",
	whatsapp: "WhatsApp",
	telegram: "Телеграм",
};

async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch((err) => {
		showToast(
			actionFailureToast(
				"Ошибка ответа сервера",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	})) as unknown;
	if (!response.ok) {
		const message =
			payload &&
			typeof payload === "object" &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

/**
 * ПОЧЕМУ У СООБЩЕНИЯ ЕСТЬ ВИД. БЫЛО СЛОМАНО: и «Рассылка создана», и отказ
 * сервера писались в одно поле notice и выводились одинаковой серой строкой с
 * role="status". Администратор нажимал «Запустить», получал «Сервер ответил 500»
 * таким же спокойным текстом, как подтверждение, и уходил в уверенности, что
 * рассылка пошла. Теперь отказ — красный блок с role="alert" и подсказкой.
 */
type Notice = { kind: "done" | "fail"; text: string };

/** Отказ: сначала понятная человеку подсказка, потом причина от сервера. */
function failNotice(error: unknown, hint: string): Notice {
	const reason = error instanceof Error ? error.message : String(error);
	return { kind: "fail", text: `${hint} Причина: ${reason}` };
}

function formatMoment(value: string | null): string {
	if (!value) return "—";
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? "—"
		: parsed.toLocaleString("ru-RU", {
				day: "2-digit",
				month: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			});
}

import { useCommunicationsQueries } from "../../hooks/domains/useCommunicationsQueries";

export function CampaignPanel() {
	const commQueries = useCommunicationsQueries();
	/*
	 * ПОЧЕМУ ЗДЕСЬ ЗАГОЛОВКИ, А НЕ ГОЛЫЙ fetch. БЫЛО СЛОМАНО НАСМЕРТЬ, но только у
	 * заказчика. Все адреса этой панели закрыты охраной `apps/api/src/accessGuard.ts`
	 * (`requireClinicalReadContext` / `requireClinicalMutationContext` в
	 * communicationsOutbox.ts) — без заголовка `x-dente-admin-secret` она отвечает 403
	 * даже при действительных токенах кабинета и сотрудника. На машине разработчика
	 * секрет в корневом `.env` закомментирован, зато включены лазейки
	 * DENTE_CLINICAL_ALLOW_UNGUARDED_READS/MUTATIONS, поэтому локально панель зелёная.
	 * Лазейки живут только пока NODE_ENV !== "production", то есть в настоящей клинике
	 * раздел «Рассылки» был мёртв целиком: вместо списка — «Не удалось получить
	 * рассылки: Сервер ответил 403», создать рассылку нельзя, предпросмотр не считался,
	 * «Запустить» и «Остановить» молча отказывали. Ни типы, ни тесты, ни глаза этого
	 * здесь не видели.
	 *
	 * `auth` берётся ТОЛЬКО из useAppLogicContext(): одноимённые функции, вывезенные из
	 * AppHelpers, сеансовый секрет сами НЕ подставляют — с ними код компилируется, гейт
	 * молчит, а клиника по-прежнему получает 403. Контекстные подставляют
	 * `clinicalAdminSecretSession` (hooks/domains/useAuthLogic.ts).
	 *
	 * Проверка на `auth` остаётся, но обоснование ей нужно другое, чем стояло здесь.
	 * БЫЛО: «useAppLogicContext() вне провайдера возвращает пустой объект
	 * (contexts/AppLogicContext.tsx:21)». Больше НЕ возвращает — вне провайдера хук
	 * бросает исключение, пустого объекта он не выдумывает. Проверка нужна потому, что
	 * провайдер может стоять, а раздела `auth` в его значении не быть, и панель не
	 * должна падать в изолированном показе из-за отсутствующей функции.
	 */
	const appLogic = useAppLogicContext();
	const _auth = appLogic?.auth;

	const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
	const [templates, setTemplates] = useState<TemplateOption[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [busy, setBusy] = useState(false);

	const [title, setTitle] = useState("");
	const [templateId, setTemplateId] = useState("");
	const [scope, setScope] = useState<"service" | "marketing">("marketing");
	const [monthsSinceVisit, setMonthsSinceVisit] = useState("6");
	const [excludeBooked, setExcludeBooked] = useState(true);

	const [previewFor, setPreviewFor] = useState<string | null>(null);
	const [preview, setPreview] = useState<CampaignPreview | null>(null);
	// Отдельная ошибка предпросмотра: см. openPreview — без неё на месте
	// предпросмотра навсегда оставалась полоса загрузки.
	const [previewError, setPreviewError] = useState<string | null>(null);

	/*
	 * Ход отправки по выбранной рассылке. Загружается вместе с предпросмотром
	 * и отдельно по кнопке «Ход отправки». Для running — автоопрос раз в 8 с,
	 * пока панель открыта: иначе «Выполняется» остаётся пустой табличкой.
	 */
	const [progressFor, setProgressFor] = useState<string | null>(null);
	const [progress, setProgress] = useState<CampaignProgress | null>(null);
	const [progressError, setProgressError] = useState<string | null>(null);
	const [progressLoading, setProgressLoading] = useState(false);

	const [variables, setVariables] = useState<TemplateVariable[]>([]);

	const load = useCallback(async () => {
		setLoadError(null);
		try {
			const [campaignResponse, templateResponse, variablesResponse] =
				await Promise.all([
					commQueries.getCampaigns(),
					commQueries.getCampaignsTemplates(),
					commQueries.getCampaignsVariables(),
				]);
			const campaignData = await readJson<{ campaigns: CampaignItem[] }>(
				campaignResponse,
			);
			const templateData = await readJson<{ templates: TemplateOption[] }>(
				templateResponse,
			);
			const variablesData = await readJson<{ variables: TemplateVariable[] }>(
				variablesResponse,
			);
			setCampaigns(campaignData.campaigns);
			setTemplates(
				templateData.templates.filter((template) => template.isActive),
			);
			setVariables(variablesData.variables ?? []);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setLoadError(error instanceof Error ? error.message : String(error));
		}
		// `auth` в зависимостях: секрет живёт в сеансе и появляется после разблокировки
		// раздела. Без него панель навсегда осталась бы с заголовками того первого
		// отрисовывания, когда секрета ещё не было, — то есть с 403 до перезагрузки страницы.
	}, [
		commQueries.getCampaigns,
		commQueries.getCampaignsVariables,
		commQueries.getCampaignsTemplates,
	]);

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
			const response = await commQueries.createCampaign({
				title,
				templateId,
				scope,
				criteria: buildCriteria(),
			});
			const data = await readJson<{ campaign: CampaignItem }>(response);
			setNotice({
				kind: "done",
				text: "Рассылка создана. Проверьте предпросмотр перед запуском.",
			});
			setTitle("");
			await load();
			// Сразу открыть предпросмотр: запускать вслепую не нужно.
			await openPreview(data.campaign.id);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			// Название специально НЕ очищается: оно очищается только при удаче, иначе
			// человек теряет набранное и заполняет форму заново.
			setNotice(
				failNotice(
					error,
					"Рассылка не создана, никому ничего не отправлено. Заполненное ниже не пропало — исправьте и нажмите ещё раз.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	/**
	 * БЫЛО СЛОМАНО: при отказе сервера предпросмотр оставался в состоянии
	 * загрузки НАВСЕГДА — preview так и был null, а на его месте крутилась полоса
	 * ops-skeleton с aria-hidden. Отличить «считаем получателей» от «не удалось
	 * посчитать» было нельзя, причина уходила в общую строку наверху панели, мимо
	 * глаз. Администратор либо ждал впустую, либо запускал рекламную рассылку не
	 * увидев, сколько людей её получит и сколько это стоит.
	 */
	async function openPreview(campaignId: string) {
		setPreviewFor(campaignId);
		setPreview(null);
		setPreviewError(null);
		try {
			const response = await commQueries.previewCampaign(campaignId);
			setPreview(await readJson<CampaignPreview>(response));
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setPreviewError(error instanceof Error ? error.message : String(error));
		}
		// Параллельно подтянуть ход: для draft total=0 — это нормально и честно.
		void loadProgress(campaignId);
	}

	/**
	 * GET /api/communications/campaigns/:id/progress — единственный способ увидеть
	 * «сколько ушло / сколько зависло» без ручного фильтра журнала очереди.
	 * Раньше маршрут жил на API, а веб его ни разу не вызывал.
	 */
	const loadProgress = useCallback(
		async (campaignId: string) => {
			setProgressFor(campaignId);
			setProgressLoading(true);
			setProgressError(null);
			try {
				const response = await commQueries.getCampaignProgress(campaignId);
				const data = await readJson<{
					byStatus?: Record<string, number>;
					total?: number;
				}>(response);
				setProgress({
					byStatus: data.byStatus ?? {},
					total: typeof data.total === "number" ? data.total : 0,
				});
			} catch (error) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				setProgress(null);
				setProgressError(
					error instanceof Error ? error.message : String(error),
				);
			} finally {
				setProgressLoading(false);
			}
		},
		[commQueries.getCampaignProgress],
	);

	// Пока рассылка «Выполняется» и открыт её ход — опрашивать, иначе цифры
	// застывают после первого запроса, а сообщения продолжают уходить.
	useEffect(() => {
		if (!progressFor) return;
		const row = campaigns.find((c) => c.id === progressFor);
		if (row?.status !== "running") return;
		const timer = window.setInterval(() => {
			void loadProgress(progressFor);
		}, 8000);
		return () => window.clearInterval(timer);
	}, [progressFor, campaigns, loadProgress]);

	async function campaignAction(
		campaignId: string,
		action: "launch" | "cancel",
	) {
		setBusy(true);
		setNotice(null);
		try {
			/*
			 * Заголовки здесь нужны ровно так же, хотя гейт check:guarded-headers этот
			 * вызов НЕ находит: у него в адресе две подстановки подряд, а гейт сверяет
			 * `/api/communications/campaigns/SEGMENT/SEGMENT` с `:campaignId/launch` и
			 * совпадения не видит (границы проверки названы в её шапке). Охрана же на
			 * сервере настоящая — requireClinicalMutationContext на launch и cancel
			 * (communicationsOutbox.ts:811 и :832). Без секрета «Запустить» и
			 * «Остановить» в клинике отказывали, то есть остановить идущую рекламную
			 * рассылку было нечем.
			 */
			const response = await commQueries.campaignAction(campaignId, action);
			const data = await readJson<{
				queued?: number;
				alreadyQueued?: number;
				cancelledMessages?: number;
			}>(response);
			setNotice({
				kind: "done",
				text:
					action === "launch"
						? `Поставлено в очередь: ${data.queued ?? 0}. Уже стояли: ${data.alreadyQueued ?? 0}. ` +
							"Отправка идёт через общую очередь и подчиняется тихим часам."
						: `Снято с очереди: ${data.cancelledMessages ?? 0}. Уже отправленное осталось в журнале.`,
			});
			await load();
			if (previewFor === campaignId) await openPreview(campaignId);
			else void loadProgress(campaignId);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setNotice(
				failNotice(
					error,
					action === "launch"
						? "Рассылка не запущена: в очередь ничего не поставлено, пациентам ничего не ушло. Проверьте предпросмотр и попробуйте ещё раз."
						: "Рассылка не остановлена — она продолжает отправляться. Попробуйте ещё раз.",
				),
			);
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
				<p className="ops-notice ops-notice--error" role="alert">
					Не удалось получить рассылки: {loadError}
				</p>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void load()}
				>
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
									<td data-label="Канал">
										{channelLabels[campaign.channel] ?? campaign.channel}
									</td>
									<td data-label="Вид">
										{campaign.scope === "marketing" ? (
											// Рекламная требует согласия — это должно быть заметно.
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
										{/*
										У ИДУЩЕЙ рассылки кнопки «Запустить» нет вовсе.
										Раньше она показывалась и при состоянии «Выполняется»,
										причём единственной залитой кнопкой в строке — то есть
										самой заметной. Один лишний щелчок пересобирал аудиторию
										и переписывал счётчики уже идущей рекламной рассылки.
										Пока рассылка идёт, осмысленное действие ровно одно —
										остановить, и оно теперь главное.
									*/}
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

			{progressFor ? (
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
							{campaigns.find((c) => c.id === progressFor)?.status ===
							"running" ? (
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
							onClick={() => {
								setProgressFor(null);
								setProgress(null);
								setProgressError(null);
							}}
						>
							Закрыть ход
						</button>
					</div>
				</div>
			) : null}

			{previewFor ? (
				<div className="ops-preview">
					<h3 className="ops-section-title">Предпросмотр</h3>
					{previewError !== null ? (
						/* Три состояния на месте предпросмотра: считаем — не удалось с
						   подсказкой и повтором — посчитано. Раньше отказ выглядел как
						   вечная загрузка. */
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
							{/* Полоса загрузки помечена aria-hidden — без этой строки человек с
							    чтением вслух не узнаёт, что идёт подсчёт. */}
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
							</ul>
							{/* Отсев с причинами: «отправлено 12 из 400» иначе выглядит как ошибка. */}
							<ul>
								{preview.audience.excluded.no_consent > 0 ? (
									<li>без согласия: {preview.audience.excluded.no_consent}</li>
								) : null}
								{preview.audience.excluded.no_contact > 0 ? (
									<li>
										без пригодного контакта:{" "}
										{preview.audience.excluded.no_contact}
									</li>
								) : null}
								{preview.audience.excluded.excluded_by_criteria > 0 ? (
									<li>
										не подошли по условиям:{" "}
										{preview.audience.excluded.excluded_by_criteria}
									</li>
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
									Например:{" "}
									{preview.audience.candidates
										.map((candidate) => candidate.fullName)
										.join(", ")}
								</p>
							) : null}
						</>
					)}
					<button
						className="secondary-button"
						type="button"
						onClick={() => setPreviewFor(null)}
					>
						Закрыть предпросмотр
					</button>
				</div>
			) : null}

			<h3 className="ops-section-title">Новая рассылка</h3>
			{templates.length === 0 ? (
				<p className="ops-empty">
					Нет активных шаблонов — сначала создайте шаблон для нужного канала.
				</p>
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
						<select
							id="campaign-template"
							value={templateId}
							onChange={(event) => setTemplateId(event.target.value)}
						>
							<option value="">Выберите шаблон</option>
							{templates.map((template) => (
								<option key={template.id} value={template.id}>
									{template.title} ·{" "}
									{channelLabels[template.channel] ?? template.channel}
								</option>
							))}
						</select>
					</span>
					<span className="ops-field">
						<label htmlFor="campaign-scope">Вид</label>
						<select
							id="campaign-scope"
							value={scope}
							onChange={(event) =>
								setScope(event.target.value as "service" | "marketing")
							}
						>
							<option value="marketing">
								Рекламная — нужно согласие пациента
							</option>
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

					{variables.length > 0 ? (
						<p className="ops-hint ops-variable-catalog__title">
							<strong>Доступные переменные шаблонов:</strong>{" "}
							{variables
								.map((variable) => `{${variable.key}} (${variable.label})`)
								.join(", ")}
						</p>
					) : null}
				</div>
			)}
		</section>
	);
}

export default CampaignPanel;
