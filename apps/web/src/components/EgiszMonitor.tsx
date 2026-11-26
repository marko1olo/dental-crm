import {
	AlertTriangle,
	CheckCircle2,
	Info,
	RefreshCcw,
	ShieldCheck,
	ShieldOff,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import {
	classifyFailedHttpStatus,
	type EgiszEndpointOutcome,
	type EgiszIntegrationStatus,
	type EgiszTone,
	type EgiszVisitTransmission,
	readIntegrationStatus,
	readVisitTransmission,
	resolveEgiszPanelState,
} from "./integrations/egiszAvailability";

/**
 * ПАНЕЛЬ СОСТОЯНИЯ ОТЧЁТНОСТИ В ЕГИСЗ.
 *
 * ЧТО ЗДЕСЬ БЫЛО СЛОМАНО. Панель сообщала «Данные приема готовы к отправке» и держала
 * синюю кнопку «Отправить в ЕГИСЗ» включённой над маршрутами, которых на сервере нет:
 * GET /api/egisz/logs/:id и POST /api/egisz/send отвечают 404 (routes/egisz.ts объявляет
 * ровно четыре маршрута, и этих двух среди них нет). Причина — `if (res.ok)` без ветки
 * else: неуспешный ответ молча проглатывался, и начальное состояние «Pending» выдавалось
 * за готовность. Клиника, которая нажала кнопку и увидела спокойный экран, считала, что
 * отчиталась в Минздрав. Это юридический риск, а не косметика.
 * Второй дефект: `data.error || "Неизвестная ошибка"` — у 404 поле error равно "Not Found",
 * то есть непустое, поэтому русский запасной текст не подставлялся никогда и врач читал
 * «Ошибка: Not Found».
 *
 * ЧТО СДЕЛАНО. Панель больше не догадывается о состоянии — она спрашивает у сервера
 * единственный маршрут, который отвечает честно:
 * GET /api/clinical/egisz/integration-status (routes/egisz.ts:79) отдаёт
 * `configured`, `capabilities.remdTransmission` и имена незаданных переменных окружения.
 * Решение о том, что показать и можно ли отправлять, целиком принимает
 * resolveEgiszPanelState в ./integrations/egiszAvailability — здесь остаётся только
 * рисование. Отправка разрешена лишь когда сервер сам подтвердил, что она возможна.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. Ни транспорта в РЭМД, ни подписи УКЭП, ни модели согласия
 * пациента на передачу данных, ни сроков отчётности. Первых двух в проекте нет
 * (`capabilities` возвращает false), согласия на передачу в ЕГИСЗ в схеме не существует,
 * а сроки, установленные законом, из репозитория не проверяются — поэтому они не
 * называются. Задача этой панели — сказать правду о том, что произошло, а не изобразить
 * интеграцию.
 */

interface EgiszMonitorProps {
	patientId: string;
	visitId: string;
}

/** Внешний вид состояния. Тон приходит из чистого модуля, цвета живут здесь. */
const TONE_STYLES: Record<
	EgiszTone,
	{ readonly frame: string; readonly headline: string; readonly icon: string }
> = {
	neutral: {
		frame: "border-[var(--line)]",
		headline: "text-[var(--ink)]",
		icon: "text-[var(--ink-muted)]",
	},
	info: {
		frame: "border-[var(--info-border)]",
		headline: "text-[var(--ink)]",
		icon: "text-[var(--info-ink)]",
	},
	warning: {
		frame: "border-[var(--warning-line)]",
		headline: "text-[var(--warning-ink)]",
		icon: "text-[var(--warning-ink)]",
	},
	danger: {
		frame: "border-[var(--danger-line)]",
		headline: "text-[var(--danger-ink)]",
		icon: "text-[var(--danger-ink)]",
	},
	success: {
		frame: "border-[var(--success-line)]",
		headline: "text-[var(--success-ink)]",
		icon: "text-[var(--success-ink)]",
	},
};

export const EgiszMonitor: React.FC<EgiszMonitorProps> = ({
	patientId,
	visitId,
}) => {
	// `|| {}` убран: useAppLogicContext() либо отдаёт контекст, либо бросает
	// исключение (contexts/AppLogicContext.tsx) — пустой объект он больше не
	// выдумывает, и вторая ветка была недостижима. Проверка на сам `auth` ниже
	// остаётся: контекст может быть, а раздела авторизации в нём — нет.
	const appLogic = useAppLogicContext();
	const authContext = appLogic?.auth;

	const [statusOutcome, setStatusOutcome] =
		useState<EgiszEndpointOutcome<EgiszIntegrationStatus> | null>(null);
	const [journalOutcome, setJournalOutcome] =
		useState<EgiszEndpointOutcome<EgiszVisitTransmission | null> | null>(null);
	const [isSending, setIsSending] = useState(false);
	const [sendProblem, setSendProblem] = useState<string | null>(null);

	/**
	 * Одно правило для обоих запросов: res.ok проверяется ДО чтения тела. Именно
	 * чтение тела раньше проверки и вынесло английское "Not Found" на экран.
	 */
	const load = useCallback(async () => {
		setStatusOutcome(null);
		setJournalOutcome(null);
		setSendProblem(null);

		const headers = authContext ? authContext.denteClinicalReadHeaders() : {};

		const request = async <T,>(
			url: string,
			read: (raw: unknown) => EgiszEndpointOutcome<T>,
		): Promise<EgiszEndpointOutcome<T>> => {
			try {
				const res = await fetch(url, { headers });
				if (!res.ok) return classifyFailedHttpStatus(res.status);
				return read(await res.json());
			} catch {
				// Сеть или неразбираемый JSON. Состояние неизвестно — и так и будет
				// показано, вместо подстановки «готово к отправке».
				return { kind: "network" };
			}
		};

		const [status, journal] = await Promise.all([
			request("/api/clinical/egisz/integration-status", readIntegrationStatus),
			request(`/api/egisz/logs/${encodeURIComponent(patientId)}`, (raw) =>
				readVisitTransmission(raw, visitId),
			),
		]);

		setStatusOutcome(status);
		setJournalOutcome(journal);
	}, [authContext, patientId, visitId]);

	useEffect(() => {
		void load();
	}, [load]);

	const state = resolveEgiszPanelState({ statusOutcome, journalOutcome });
	const tone = TONE_STYLES[state.tone];
	const isLoading = state.kind === "loading";

	const handleSend = async () => {
		// Кнопка в этом состоянии выключена. Проверка повторена здесь сознательно:
		// отправка документа в государственную систему не должна зависеть от того,
		// что верстка нарисовала кнопку правильно.
		if (!state.canTransmit || isSending) return;

		setIsSending(true);
		setSendProblem(null);
		try {
			const res = await fetch("/api/egisz/send", {
				method: "POST",
				headers: authContext
					? authContext.denteClinicalMutationHeaders()
					: { "Content-Type": "application/json" },
				body: JSON.stringify({ patientId, visitId }),
			});
			if (!res.ok) {
				// Тело не читается. Русский текст выбирается по коду ответа, а серверное
				// поле error в интерфейс не попадает ни при каком коде.
				const problem = classifyFailedHttpStatus(res.status);
				setSendProblem(
					problem.kind === "missing"
						? "Отправка не выполнена: сервер программы не принимает выгрузку в ЕГИСЗ."
						: problem.kind === "unauthorized"
							? "Отправка не выполнена: права на выгрузку не подтверждены. Войдите в кабинет клиники заново."
							: "Отправка не выполнена: сервер программы ответил ошибкой. Документ в Минздрав не ушёл.",
				);
			}
		} catch {
			setSendProblem(
				"Отправка не выполнена: запрос не дошёл до сервера. Документ в Минздрав не ушёл.",
			);
		} finally {
			setIsSending(false);
			// Состояние перечитывается всегда: единственный источник правды о том,
			// ушёл документ или нет, — ответ сервера, а не факт нажатия кнопки.
			await load();
		}
	};

	const StateIcon =
		state.kind === "accepted"
			? ShieldCheck
			: state.tone === "danger"
				? AlertTriangle
				: state.kind === "unavailable"
					? ShieldOff
					: state.tone === "warning"
						? AlertTriangle
						: isLoading
							? RefreshCcw
							: Info;

	return (
		<div
			data-testid="egisz-monitor-panel"
			data-egisz-state={state.kind}
			className={`panel mt-4 p-4 rounded-xl bg-[var(--paper-strong)] border ${tone.frame} text-[var(--ink)] flex flex-col gap-3 shadow-sm`}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex items-start gap-3 min-w-0">
					<StateIcon
						size={24}
						className={`shrink-0 mt-0.5 ${tone.icon} ${isLoading ? "animate-spin" : ""}`}
						aria-hidden="true"
					/>
					<div className="min-w-0">
						<h3 className="m-0 text-sm font-semibold text-[var(--ink)] break-words">
							Отчётность в ЕГИСЗ (РЭМД)
						</h3>
						<p
							className={`mt-1 mb-0 text-sm font-medium break-words ${tone.headline}`}
						>
							{state.headline}
						</p>
						<p className="mt-1 mb-0 text-xs text-[var(--ink-muted)] break-words">
							{state.detail}
						</p>
					</div>
				</div>

				{/*
					Кнопки и причина запрета стоят рядом, а не в подсказке: причину,
					спрятанную в title, врач не увидит. §3.
				*/}
				<div className="flex flex-col items-stretch gap-1.5 sm:items-end sm:shrink-0">
					<div className="flex flex-wrap gap-2 sm:justify-end">
						{state.canRetryLoad && (
							<button
								type="button"
								onClick={() => void load()}
								disabled={isLoading || isSending}
								className="inline-flex items-center justify-center gap-2 text-xs h-9 px-3 rounded-lg font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] transition-colors"
							>
								<RefreshCcw size={14} className="text-current shrink-0" aria-hidden="true" />
								Проверить снова
							</button>
						)}
						<button
							type="button"
							onClick={handleSend}
							disabled={!state.canTransmit || isSending || isLoading}
							aria-disabled={!state.canTransmit || isSending || isLoading}
							className={`inline-flex items-center justify-center gap-2 text-xs h-9 px-4 rounded-lg font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
								state.kind === "failed"
									? "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"
									: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
							}`}
						>
							{isSending
								? "Отправляем…"
								: state.kind === "failed"
									? "Отправить заново"
									: "Отправить в ЕГИСЗ"}
							{state.kind === "accepted" && (
								<CheckCircle2 size={16} className="text-current shrink-0" aria-hidden="true" />
							)}
						</button>
					</div>
					{state.transmitBlockedReason && (
						<p className="m-0 text-xs text-[var(--ink-muted)] break-words sm:text-right sm:max-w-[16rem]">
							{state.transmitBlockedReason}
						</p>
					)}
				</div>
			</div>

			{/*
				Имена переменных окружения — технические идентификаторы, поэтому они
				стоят отдельным блоком и не вставляются внутрь русской фразы.
			*/}
			{state.missingConfiguration.length > 0 && (
				<div className="p-3 rounded-lg bg-[var(--warning-soft)] border border-[var(--warning-line)]">
					<p className="m-0 mb-1.5 text-xs font-semibold text-[var(--warning-ink)]">
						Не заданы настройки сервера:
					</p>
					<ul className="m-0 pl-4 flex flex-col gap-0.5">
						{state.missingConfiguration?.map((name) => (
							<li
								key={name}
								className="text-xs font-mono text-[var(--warning-ink)] break-all"
							>
								{name}
							</li>
						))}
					</ul>
				</div>
			)}

			{sendProblem && (
				<p
					data-testid="egisz-send-problem"
					className="m-0 p-3 rounded-lg text-xs font-medium bg-[var(--danger-soft)] border border-[var(--danger-line)] text-[var(--danger-ink)] break-words"
				>
					{sendProblem}
				</p>
			)}

			{state.transactionId && (
				<p className="m-0 text-xs text-[var(--ink-muted)] break-all">
					Номер транзакции:{" "}
					<span className="font-mono text-[var(--ink)]">
						{state.transactionId}
					</span>
				</p>
			)}

			{state.xmlPreview && (
				<div className="p-3 bg-[var(--paper-soft)] rounded-lg border border-[var(--line)]">
					<p className="m-0 mb-2 text-xs font-semibold text-[var(--ink-muted)]">
						Сгенерированный документ СЭМД (предпросмотр)
					</p>
					<pre className="m-0 text-xs text-[var(--ink)] overflow-x-auto whitespace-pre-wrap font-mono">
						{state.xmlPreview}
					</pre>
				</div>
			)}
		</div>
	);
};
