import React, { useCallback, useEffect, useState } from "react";
import type { AuditEvent } from "@dental/shared";
import { useAppLogicContext } from "./contexts/AppLogicContext";

type AuditLogsResponse = {
	logs?: AuditEvent[];
	message?: string;
	error?: string;
};

function formatMoment(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function humanizeAction(action: string): string {
	const map: Record<string, string> = {
		"visit.sign": "Подписание приёма",
		"visit.create": "Создание приёма",
		"visit.update": "Изменение приёма",
		"document.create": "Создание документа",
		"document.issue": "Выдача документа",
		"document.void": "Аннулирование документа",
		"clinical.override": "Клиническое переопределение",
		"patient.create": "Создание карты пациента",
		"patient.update": "Изменение карты пациента",
		"communication.complete": "Завершение коммуникации",
		"imaging.attach": "Прикрепление снимка",
		"chair.prepare": "Подготовка кресла",
		"telegram_outbound_sent": "Исходящее сообщение Telegram",
	};
	return map[action] ?? action;
}

function readServerMessage(body: unknown): string | null {
	if (!body || typeof body !== "object") return null;
	const record = body as { message?: unknown; error?: unknown };
	if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
	if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
	return null;
}

function loadFailureText(status: number, serverMessage: string | null): string {
	if (serverMessage && /[а-яё]/i.test(serverMessage)) return serverMessage;
	if (status === 401 || status === 403) {
		return "Нет прав смотреть журнал аудита: доступ закрыт или истёк вход в программу.";
	}
	if (status === 404) return "Раздел журнала аудита не отвечает.";
	if (status >= 500) return "Сбой на сервере клиники: журнал аудита не собран.";
	return `Программа не смогла получить журнал аудита (ответ ${status}).`;
}

/**
 * Живая лента GET /api/audit/logs — полная org-trail с фильтрами.
 * Dashboard.auditEvents — урезанный срез; эта панель ходит в настоящий API.
 * Мутации журнала запрещены (152-ФЗ) — только чтение и обновление списка.
 */
export const AuditLogsPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [logs, setLogs] = useState<AuditEvent[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [entityType, setEntityType] = useState("");
	const [entityId, setEntityId] = useState("");
	const [limit, setLimit] = useState(50);

	const load = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("limit", String(limit));
			const trimmedType = entityType.trim();
			const trimmedId = entityId.trim();
			if (trimmedType) params.set("entityType", trimmedType);
			if (trimmedId) params.set("entityId", trimmedId);

			let response: Response;
			try {
				const headers =
					auth && typeof auth.denteClinicalReadHeaders === "function"
						? auth.denteClinicalReadHeaders()
						: {};
				response = await fetch(`/api/audit/logs?${params.toString()}`, {
					headers,
				});
			} catch {
				setLogs(null);
				setError(
					"Сервер клиники не отвечает. Проверьте, что программа запущена и есть сеть.",
				);
				return;
			}

			const payload = (await response.json().catch(() => null)) as AuditLogsResponse | null;
			if (!response.ok) {
				setLogs(null);
				setError(loadFailureText(response.status, readServerMessage(payload)));
				return;
			}

			const list = Array.isArray(payload?.logs) ? payload!.logs! : [];
			setLogs(list);
		} finally {
			setLoading(false);
		}
	}, [auth, entityType, entityId, limit]);

	useEffect(() => {
		void load();
	}, [load]);

	const count = logs?.length ?? 0;

	return (
		<section
			className="panel ops-panel audit-logs-live-panel"
			data-testid="audit-logs-panel"
			aria-label="Журнал аудита — полная лента"
		>
			<div className="panel-heading">
				<h2>Журнал аудита (полная лента)</h2>
				{logs !== null ? (
					<span
						className={`status-pill ${count > 0 ? "status-arrived" : "status-planned"}`}
						data-testid="audit-logs-count"
					>
						{count}
					</span>
				) : null}
			</div>

			<p className="ops-hint">
				Полная лента событий организации из базы (GET /api/audit/logs). Журнал неизменяем по
				152-ФЗ: удаление и правка записей запрещены. Ниже — срез dashboard для быстрого
				обзора; здесь — живой запрос с фильтрами по типу и идентификатору сущности.
			</p>

			<div className="ops-notice" role="note" data-testid="audit-logs-immutable-notice">
				<p>
					Неизменяемость: попытки DELETE/PUT/PATCH к журналу отклоняются сервером (код
					AuditLogImmutable).
				</p>
			</div>

			<div className="ops-form" style={{ marginBottom: "1rem" }}>
				<div
					className="ops-actions"
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "0.75rem",
						alignItems: "flex-end",
					}}
				>
					<label className="ops-label" htmlFor="audit-logs-entity-type">
						Тип сущности
						<input
							id="audit-logs-entity-type"
							className="ops-input"
							type="text"
							value={entityType}
							onChange={(event) => setEntityType(event.target.value)}
							placeholder="например visit"
							data-testid="audit-logs-entity-type"
							disabled={loading}
						/>
					</label>
					<label className="ops-label" htmlFor="audit-logs-entity-id">
						ID сущности
						<input
							id="audit-logs-entity-id"
							className="ops-input"
							type="text"
							value={entityId}
							onChange={(event) => setEntityId(event.target.value)}
							placeholder="uuid"
							data-testid="audit-logs-entity-id"
							disabled={loading}
						/>
					</label>
					<label className="ops-label" htmlFor="audit-logs-limit">
						Лимит
						<select
							id="audit-logs-limit"
							className="ops-input"
							value={limit}
							onChange={(event) => setLimit(Number(event.target.value))}
							data-testid="audit-logs-limit"
							disabled={loading}
						>
							<option value={25}>25</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
							<option value={200}>200</option>
						</select>
					</label>
					<button
						className="primary-button"
						type="button"
						onClick={() => void load()}
						disabled={loading}
						data-testid="audit-logs-refresh"
						aria-busy={loading || undefined}
					>
						{loading ? "Загружаю…" : "Обновить журнал"}
					</button>
				</div>
			</div>

			{error ? (
				<div className="ops-notice ops-notice--error" role="alert" data-testid="audit-logs-error">
					<p>{error}</p>
					<p>
						Список ниже мог устареть. Если вход не протух, нажмите «Обновить журнал» или
						перезайдите в программу под сотрудником с правами администратора.
					</p>
					<button
						className="secondary-button"
						type="button"
						onClick={() => void load()}
						disabled={loading}
					>
						{loading ? "Загружаю…" : "Повторить запрос"}
					</button>
				</div>
			) : null}

			{logs === null && !error ? (
				<div className="ops-skeleton" aria-hidden="true" data-testid="audit-logs-skeleton">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{logs !== null && logs.length === 0 && !error ? (
				<article className="ops-empty" data-testid="audit-logs-empty">
					<p>
						По выбранным фильтрам записей нет. Снимите фильтры или дождитесь первого
						клинического действия в клинике — подписание приёма, выдача документа и
						другие операции появятся здесь.
					</p>
				</article>
			) : null}

			{logs !== null && logs.length > 0 ? (
				<div className="ops-list" data-testid="audit-logs-list" role="list">
					{logs.map((event) => (
						<article
							className="ops-row"
							key={event.id}
							role="listitem"
							data-testid="audit-logs-row"
							data-entity-type={event.entityType}
							data-action={event.action}
						>
							<div>
								<h3>{humanizeAction(event.action)}</h3>
								<p>
									{event.entityType}
									{" · "}
									<span title={event.entityId}>
										{event.entityId.length > 12
											? `${event.entityId.slice(0, 8)}…`
											: event.entityId}
									</span>
									{event.actorUserId
										? ` · сотрудник ${event.actorUserId.slice(0, 8)}…`
										: " · система"}
								</p>
								{event.reason ? <p>{event.reason}</p> : null}
							</div>
							<span>{formatMoment(event.createdAt)}</span>
						</article>
					))}
				</div>
			) : null}
		</section>
	);
};

export default AuditLogsPanel;
