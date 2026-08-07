import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	AUTHED_API_FILE_FAILURE,
	downloadAuthedApiFile,
} from "../../lib/authedApiFile";
import "./MigrationWizard.css";

/**
 * Мастер переноса базы из старой системы.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ КОМПОНЕНТ
 * Рядом лежал LegacyMigrationStudio.tsx — две с половиной тысячи строк перевода
 * советов: чек-листы готовности, «bridge kit» и инструкции для оператора, потому
 * что за ними стоял маршрут, который ничего не переносит. Он удалён: его никто
 * не отрисовывал, а по составу он был строгим подмножеством смонтированной
 * вкладки импорта (разбор — в src/tests/panelsAreMounted.test.ts, рядом с местом,
 * где стояла его строка долга). Здесь мастер работает с настоящим движком: файл
 * заливается, колонки сопоставляются, прогон идёт в фоне, в конце выдаётся акт
 * сверки.
 *
 * ПОСЛЕДОВАТЕЛЬНОСТЬ ЭКРАНОВ ПОВТОРЯЕТ ФАЗЫ ДВИЖКА
 * Файл → карта соответствия → сухой прогон → боевой прогон → сверка. Каждый шаг
 * обратим, и ни один не пишет в боевые таблицы без явного действия оператора:
 * кнопка записи появляется только после сухого прогона.
 */

// ---------------------------------------------------------------------------
// Контракты ответов API. Описаны здесь, а не импортированы из @dental/shared,
// потому что маршруты отдают собранный ответ, а не отдельные схемы.
// ---------------------------------------------------------------------------

interface ApiError {
	error: { code: string; message: string; details: Record<string, unknown> };
}

interface UploadResponse {
	runId: string;
	sourceName: string;
	fileName: string;
	byteSize: number;
	source: {
		kind: string;
		detectedEncoding: string;
		encodingConfidence: number;
		delimiter: string | null;
		columns: string[];
		streamable: boolean;
		warnings: string[];
	};
	previousRunWithSameFile: { runId: string; uploadedAt: string } | null;
}

interface ColumnMapping {
	sourceColumn: string;
	targetField: string;
	decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
	confidence: number;
	rationale: string;
	sampleValues: string[];
}

interface MapResponse {
	runId: string;
	mapping: {
		vendorProfile: string | null;
		sourceTable: string;
		entityKind: string;
		columns: ColumnMapping[];
		unmappedColumns: string[];
		warnings: string[];
	};
	profile: {
		sourceKind: string;
		detectedEncoding: string;
		encodingConfidence: number;
		columns: string[];
		rowCount: number;
		sampleRows: Array<Record<string, string>>;
	};
	projectedReady: number;
	projectedQuarantine: number;
	qualityFindings: Array<{
		severity: "info" | "warning" | "blocker";
		message: string;
		affectedRows: number;
	}>;
	llm: { calls: number; rejectedSuggestions: number };
}

interface RunStatus {
	run: {
		runId: string;
		sourceName: string;
		status: string;
		phase: string | null;
		dryRun: boolean;
		detectedEncoding: string | null;
		progress: { total: number; done: number; percent: number };
		counters: {
			sourceRows: number;
			stagedRows: number;
			loadedRows: number;
			updatedRows: number;
			duplicateRows: number;
			quarantinedRows: number;
			skippedRows: number;
		};
		worker: { id: string | null; resumeCount: number };
		errorMessage: string | null;
	};
	staging: {
		total: number;
		ready: number;
		loaded: number;
		quarantined: number;
	};
}

interface ReconciliationResponse {
	balanced: boolean;
	checks: Array<{
		code: string;
		title: string;
		expected: number;
		actual: number;
		passed: boolean;
		detail: string;
	}>;
	entityBreakdown: Array<{
		entityKind: string;
		sourceRows: number;
		created: number;
		updated: number;
		duplicates: number;
		quarantined: number;
		skipped: number;
	}>;
	money: {
		sourceTotalRub: number | null;
		loadedTotalRub: number | null;
		quarantinedTotalRub: number | null;
	};
	quarantinePreview: Array<{
		id: string;
		reason: string;
		blocking: boolean;
		fieldPath: string | null;
		message: string;
		suggestedFix: string | null;
		sourceRowNumber: number | null;
	}>;
}

interface DiscoveryResponse {
	summary: { readable: number; needsExport: number };
	readySources: Array<{
		filePath: string;
		fileName: string;
		byteSize: number;
		format: string;
		version: string | null;
		details: string[];
	}>;
	needsExportSources: Array<{
		filePath: string;
		fileName: string;
		format: string;
		version: string | null;
		guidance: string | null;
	}>;
	imagingFolders: Array<{ directory: string; fileCount: number }>;
	scan: { filesScanned: number; elapsedMs: number; truncated: boolean };
	warnings: string[];
}

type WizardStep = "source" | "mapping" | "running" | "report";

/** Человеческие названия решений о колонке. */
const DECISION_TITLES: Record<ColumnMapping["decidedBy"], string> = {
	vendor_profile: "профиль системы",
	deterministic: "правило",
	llm: "нейросеть",
	manual: "вручную",
	inferred: "по содержимому",
};

const REASON_TITLES: Record<string, string> = {
	missing_required_field: "Нет обязательного поля",
	unparsable_value: "Значение не разобрано",
	encoding_damage: "Повреждена кодировка",
	broken_reference: "Ссылка в никуда",
	duplicate_conflict: "Дубль с расхождением",
	validation_failed: "Нарушено правило",
	ambiguous_mapping: "Неоднозначное сопоставление",
	low_confidence: "Низкая уверенность",
	target_write_failed: "База отклонила запись",
	row_too_large: "Строка слишком велика",
};

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} Б`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Разбирает ответ, различая конверт ошибки и полезную нагрузку. */
async function readResponse<T>(
	response: Response,
): Promise<
	{ ok: true; data: T } | { ok: false; message: string; code: string }
> {
	const text = await response.text();
	let parsed: unknown = null;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		return {
			ok: false,
			code: "BadResponse",
			message: `Сервер вернул не JSON (код ${response.status}).`,
		};
	}

	if (!response.ok) {
		const envelope = parsed as Partial<ApiError> | null;
		if (envelope?.error) {
			return {
				ok: false,
				code: envelope.error.code,
				message: envelope.error.message,
			};
		}
		return {
			ok: false,
			code: "HttpError",
			message: `Запрос не выполнен (код ${response.status}).`,
		};
	}

	return { ok: true, data: parsed as T };
}

export function MigrationWizard() {
	const [step, setStep] = useState<WizardStep>("source");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<{ code: string; message: string } | null>(
		null,
	);

	const [upload, setUpload] = useState<UploadResponse | null>(null);
	const [mapping, setMapping] = useState<MapResponse | null>(null);
	const [status, setStatus] = useState<RunStatus | null>(null);
	const [report, setReport] = useState<ReconciliationResponse | null>(null);
	const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
	const [allowLlm, setAllowLlm] = useState(true);
	const [lastRunWasDry, setLastRunWasDry] = useState(true);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const pollTimerRef = useRef<number | null>(null);

	/*
	 * Clinical headers for every migration route (requireClinicalReadContext /
	 * requireClinicalMutationContext). BYLO: bare fetch — only apiAuthFetch
	 * clinic/staff tokens. Without x-dente-admin-secret customer gets 403 while
	 * local unguarded env stays green. authRef keeps secret fresh across login
	 * without thrashing callback deps.
	 */
	const appLogic = useAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;

	const clinicalReadHeaders = useCallback(
		(extra?: Record<string, string>): Record<string, string> => {
			const auth = authRef.current;
			if (auth && typeof auth.denteClinicalReadHeaders === "function") {
				return auth.denteClinicalReadHeaders(extra ?? {});
			}
			return { ...(extra ?? {}) };
		},
		[],
	);

	const clinicalMutationHeaders = useCallback(
		(extra?: Record<string, string>): Record<string, string> => {
			const auth = authRef.current;
			if (auth && typeof auth.denteClinicalMutationHeaders === "function") {
				return auth.denteClinicalMutationHeaders(extra ?? {});
			}
			return { ...(extra ?? {}) };
		},
		[],
	);

	/** Останавливает опрос при уходе со страницы: иначе таймер живёт после размонтирования. */
	useEffect(() => {
		return () => {
			if (pollTimerRef.current !== null)
				window.clearInterval(pollTimerRef.current);
		};
	}, []);

	const resetError = useCallback(() => setError(null), []);

	// -------------------------------------------------------------------
	// Шаг 2: карта соответствия
	// -------------------------------------------------------------------
	async function runMapping(runId: string, useLlm: boolean) {
		setBusy(true);
		setError(null);
		try {
			const response = await fetch(`/api/migration/${runId}/map`, {
				method: "POST",
				headers: clinicalMutationHeaders({
					"content-type": "application/json",
				}),
				body: JSON.stringify({ allowLlm: useLlm }),
			});
			const result = await readResponse<MapResponse>(response);
			if (!result.ok) {
				setError({ code: result.code, message: result.message });
				return;
			}
			setMapping(result.data);
		} catch (caught) {
			showToast(actionFailureToast("Ошибка выполнения операции", (caught as { status?: number })?.status ?? null), "error");
			setError({
				code: "NetworkError",
				message:
					caught instanceof Error
						? caught.message
						: "Сопоставление не выполнено.",
			});
		} finally {
			setBusy(false);
		}
	}

	// -------------------------------------------------------------------
	// Шаг 1: заливка файла
	// -------------------------------------------------------------------
	const handleFile = useCallback(
		async (file: File) => {
			setBusy(true);
			setError(null);
			setMapping(null);
			setStatus(null);
			setReport(null);

			try {
				const response = await fetch("/api/migration/upload", {
					method: "POST",
					headers: clinicalMutationHeaders({
						"content-type": "application/octet-stream",
						// Кириллицу в заголовок класть нельзя: значения — ByteString.
						"x-migration-file-name": encodeURIComponent(file.name),
						"x-migration-source-name": encodeURIComponent(file.name),
					}),
					body: file,
				});

				const result = await readResponse<UploadResponse>(response);
				if (!result.ok) {
					setError({ code: result.code, message: result.message });
					return;
				}
				setUpload(result.data);
				setStep("mapping");
				// Сразу строим карту: оператору нечего делать на пустом экране.
				await runMapping(result.data.runId, allowLlm);
			} catch (caught) {
			showToast(actionFailureToast("Ошибка выполнения операции", (caught as { status?: number })?.status ?? null), "error");
				setError({
					code: "NetworkError",
					message:
						caught instanceof Error ? caught.message : "Файл не отправлен.",
				});
			} finally {
				setBusy(false);
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		},
		[allowLlm, clinicalMutationHeaders, runMapping],
	);

	// -------------------------------------------------------------------
	// Шаг 3: прогон и опрос состояния
	// -------------------------------------------------------------------
	const pollStatus = useCallback(
		async (runId: string) => {
			const auth = authRef.current;
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: clinicalReadHeaders();
			const response = await fetch(`/api/migration/${runId}`, { headers });
			const result = await readResponse<RunStatus>(response);
			if (!result.ok) return null;
			setStatus(result.data);
			return result.data;
		},
		[clinicalReadHeaders],
	);

	const loadReport = useCallback(
		async (runId: string) => {
			const auth = authRef.current;
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: clinicalReadHeaders();
			const response = await fetch(`/api/migration/${runId}/reconciliation`, {
				headers,
			});
			const result = await readResponse<ReconciliationResponse>(response);
			if (result.ok) {
				setReport(result.data);
				setStep("report");
			}
		},
		[clinicalReadHeaders],
	);

	const startRun = useCallback(
		async (dryRun: boolean) => {
			if (!upload) return;
			setBusy(true);
			setError(null);
			setReport(null);
			setLastRunWasDry(dryRun);

			try {
				const response = await fetch(`/api/migration/${upload.runId}/execute`, {
					method: "POST",
					headers: clinicalMutationHeaders({
						"content-type": "application/json",
					}),
					body: JSON.stringify({ dryRun, sourceSystem: "legacy" }),
				});
				const result = await readResponse<{
					accepted: boolean;
					status: string;
				}>(response);
				if (!result.ok) {
					setError({ code: result.code, message: result.message });
					setBusy(false);
					return;
				}

				setStep("running");

				/**
				 * Опрос состояния. Прогон идёт в фоне, и запрос выполнения вернул 202
				 * сразу — интерфейс обязан показывать прогресс, а не крутилку без
				 * содержания. Интервал в секунду: чаще не нужно, реже выглядит зависшим.
				 */
				if (pollTimerRef.current !== null)
					window.clearInterval(pollTimerRef.current);
				pollTimerRef.current = window.setInterval(() => {
					void (async () => {
						const state = await pollStatus(upload.runId);
						if (!state) return;
						const finished = [
							"completed",
							"completed_with_quarantine",
							"failed",
							"validated",
							"rolled_back",
						].includes(state.run.status);
						if (finished) {
							if (pollTimerRef.current !== null)
								window.clearInterval(pollTimerRef.current);
							pollTimerRef.current = null;
							setBusy(false);
							await loadReport(upload.runId);
						}
					})();
				}, 1000);
			} catch (caught) {
			showToast(actionFailureToast("Ошибка выполнения операции", (caught as { status?: number })?.status ?? null), "error");
				setError({
					code: "NetworkError",
					message:
						caught instanceof Error ? caught.message : "Прогон не запущен.",
				});
				setBusy(false);
			}
		},
		[upload, pollStatus, loadReport, clinicalMutationHeaders],
	);

	const rollback = useCallback(async () => {
		if (!upload) return;
		setBusy(true);
		setError(null);
		try {
			const auth = authRef.current;
			const headers =
				auth && typeof auth.denteClinicalMutationHeaders === "function"
					? auth.denteClinicalMutationHeaders({
							"content-type": "application/json",
						})
					: clinicalMutationHeaders({ "content-type": "application/json" });
			const response = await fetch("/api/migration/rollback", {
				method: "POST",
				headers,
				body: JSON.stringify({ runId: upload.runId, confirm: true }),
			});
			const result = await readResponse<{ message: string }>(response);
			if (!result.ok) {
				setError({ code: result.code, message: result.message });
				return;
			}
			await pollStatus(upload.runId);
			setReport(null);
			setStep("mapping");
		} finally {
			setBusy(false);
		}
	}, [upload, pollStatus, clinicalMutationHeaders]);

	// -------------------------------------------------------------------
	// Поиск баз на диске
	// -------------------------------------------------------------------
	const runDiscovery = useCallback(async () => {
		setBusy(true);
		setError(null);
		try {
			const auth = authRef.current;
			const headers =
				auth && typeof auth.denteClinicalMutationHeaders === "function"
					? auth.denteClinicalMutationHeaders({
							"content-type": "application/json",
						})
					: clinicalMutationHeaders({ "content-type": "application/json" });
			const response = await fetch("/api/migration/discover", {
				method: "POST",
				headers,
				body: JSON.stringify({ roots: [], maxDepth: 5, timeBudgetMs: 30000 }),
			});
			const result = await readResponse<DiscoveryResponse>(response);
			if (!result.ok) {
				setError({ code: result.code, message: result.message });
				return;
			}
			setDiscovery(result.data);
		} finally {
			setBusy(false);
		}
	}, [clinicalMutationHeaders]);

	// -------------------------------------------------------------------
	// Отрисовка
	// -------------------------------------------------------------------
	const steps: Array<{ id: WizardStep; label: string }> = [
		{ id: "source", label: "Источник" },
		{ id: "mapping", label: "Соответствие" },
		{ id: "running", label: "Перенос" },
		{ id: "report", label: "Акт сверки" },
	];
	const currentIndex = steps.findIndex((item) => item.id === step);

	return (
		<section className="migration-wizard">
			<header className="mw-head">
				<div>
					<h2 className="mw-title">Перенос базы из старой системы</h2>
					<p className="mw-subtitle">
						Файл читается целиком, каждая строка сохраняется дословно. В боевые
						таблицы ничего не пишется, пока вы не нажмёте «Перенести в базу».
					</p>
				</div>
				<button
					type="button"
					className="mw-btn mw-btn-ghost"
					onClick={() => void runDiscovery()}
					disabled={busy}
				>
					Найти базы на сервере
				</button>
			</header>

			<ol className="mw-steps" aria-label="Этапы переноса">
				{steps.map((item, index) => (
					<li
						key={item.id}
						className={`mw-step ${index === currentIndex ? "is-current" : ""} ${index < currentIndex ? "is-done" : ""}`}
					>
						<span className="mw-step-dot">
							{index < currentIndex ? "✓" : index + 1}
						</span>
						<span className="mw-step-label">{item.label}</span>
					</li>
				))}
			</ol>

			{error !== null && (
				<div className="mw-alert mw-alert-bad" role="alert">
					<strong>{error.message}</strong>
					<span className="mw-alert-code">{error.code}</span>
					<button
						type="button"
						className="mw-alert-close"
						onClick={resetError}
						aria-label="Закрыть"
					>
						×
					</button>
				</div>
			)}

			{discovery !== null && (
				<DiscoveryPanel
					discovery={discovery}
					onClose={() => setDiscovery(null)}
				/>
			)}

			{step === "source" && (
				<SourcePanel
					busy={busy}
					allowLlm={allowLlm}
					onAllowLlmChange={setAllowLlm}
					fileInputRef={fileInputRef}
					onFile={(file) => void handleFile(file)}
				/>
			)}

			{step === "mapping" && upload !== null && (
				<MappingPanel
					upload={upload}
					mapping={mapping}
					busy={busy}
					allowLlm={allowLlm}
					onAllowLlmChange={(value) => {
						setAllowLlm(value);
						void runMapping(upload.runId, value);
					}}
					onDryRun={() => void startRun(true)}
					onLiveRun={() => void startRun(false)}
					onRestart={() => {
						setUpload(null);
						setMapping(null);
						setStep("source");
					}}
				/>
			)}

			{step === "running" && (
				<RunningPanel status={status} dryRun={lastRunWasDry} />
			)}

			{step === "report" && report !== null && status !== null && (
				<ReportPanel
					report={report}
					status={status}
					dryRun={lastRunWasDry}
					runId={upload?.runId ?? ""}
					busy={busy}
					onLiveRun={() => void startRun(false)}
					onRollback={() => void rollback()}
					onRestart={() => {
						setUpload(null);
						setMapping(null);
						setStatus(null);
						setReport(null);
						setStep("source");
					}}
				/>
			)}
		</section>
	);
}

// ---------------------------------------------------------------------------

function SourcePanel(props: {
	busy: boolean;
	allowLlm: boolean;
	onAllowLlmChange: (value: boolean) => void;
	fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
	onFile: (file: File) => void;
}) {
	const [dragging, setDragging] = useState(false);

	return (
		<div className="mw-panel">
			<section
				aria-label="Зона загрузки файла"
				className={`mw-drop ${dragging ? "is-dragging" : ""}`}
				onDragOver={(event) => {
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(event) => {
					event.preventDefault();
					setDragging(false);
					const file = event.dataTransfer.files.item(0);
					if (file) props.onFile(file);
				}}
			>
				<div className="mw-drop-icon" aria-hidden="true">
					⤓
				</div>
				<p className="mw-drop-title">Перетащите файл выгрузки сюда</p>
				<p className="mw-drop-hint">
					DBF (FoxPro, dBASE, с memo-файлами), SQLite, CSV и TSV в любой
					кодировке, XLSX, JSON, XML
				</p>
				<button
					type="button"
					className="mw-btn mw-btn-primary"
					disabled={props.busy}
					onClick={() => props.fileInputRef.current?.click()}
				>
					{props.busy ? "Загрузка…" : "Выбрать файл"}
				</button>
				<input
					ref={props.fileInputRef}
					type="file"
					className="mw-file-input"
					onChange={(event) => {
						const file = event.target.files?.item(0);
						if (file) props.onFile(file);
						event.target.value = "";
					}}
				/>
			</section>

			<label className="mw-toggle">
				<input
					type="checkbox"
					checked={props.allowLlm}
					onChange={(event) => props.onAllowLlmChange(event.target.checked)}
				/>
				<span>
					Привлекать нейросеть к неопознанным колонкам
					<em className="mw-toggle-note">
						Модель получает только статистику колонки и маски вида «99.99.9999»
						— ни одного значения из карточек пациентов ей не передаётся.
					</em>
				</span>
			</label>

			<div className="mw-note">
				<strong>Закрытые форматы.</strong> Firebird (IDENT), MS SQL (DentalPRO),
				Access и 1С читать напрямую нельзя — это страничные форматы, привязанные
				к своему серверу. Нажмите «Найти базы на сервере»: движок опознает их и
				подскажет, чем открыть и что выгрузить.
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------

function MappingPanel(props: {
	upload: UploadResponse;
	mapping: MapResponse | null;
	busy: boolean;
	allowLlm: boolean;
	onAllowLlmChange: (value: boolean) => void;
	onDryRun: () => void;
	onLiveRun: () => void;
	onRestart: () => void;
}) {
	const { upload, mapping } = props;
	const blockers =
		mapping?.qualityFindings.filter((item) => item.severity === "blocker") ??
		[];

	return (
		<div className="mw-panel">
			<div className="mw-source-card">
				<div className="mw-source-main">
					<span className="mw-source-name">{upload.fileName}</span>
					<span className="mw-source-meta">
						{formatBytes(upload.byteSize)} · {upload.source.kind.toUpperCase()}{" "}
						· кодировка {upload.source.detectedEncoding}
						{upload.source.encodingConfidence < 0.8 && (
							<em className="mw-uncertain">
								{" "}
								(определена неуверенно — проверьте ФИО ниже)
							</em>
						)}
					</span>
				</div>
				<button
					type="button"
					className="mw-btn mw-btn-ghost"
					onClick={props.onRestart}
				>
					Другой файл
				</button>
			</div>

			{upload.previousRunWithSameFile !== null && (
				<div className="mw-alert mw-alert-info">
					Этот файл уже загружался{" "}
					{new Date(upload.previousRunWithSameFile.uploadedAt).toLocaleString(
						"ru-RU",
					)}
					. Повторный перенос не создаст дублей: уже перенесённые записи будут
					обновлены.
				</div>
			)}

			{props.busy && mapping === null && (
				<div className="mw-loading">Определяем колонки…</div>
			)}

			{mapping !== null && (
				<>
					<div className="mw-projection">
						<div className="mw-proj-item mw-proj-ok">
							<span className="mw-proj-value">{mapping.projectedReady}</span>
							<span className="mw-proj-label">перенесётся</span>
						</div>
						<div className="mw-proj-item mw-proj-warn">
							<span className="mw-proj-value">
								{mapping.projectedQuarantine}
							</span>
							<span className="mw-proj-label">в карантин</span>
						</div>
						<div className="mw-proj-item">
							<span className="mw-proj-value">
								{mapping.mapping.columns.length}
							</span>
							<span className="mw-proj-label">колонок сопоставлено</span>
						</div>
						{mapping.llm.calls > 0 && (
							<div className="mw-proj-item">
								<span className="mw-proj-value">
									{mapping.llm.rejectedSuggestions}
								</span>
								<span className="mw-proj-label">ответов модели отклонено</span>
							</div>
						)}
					</div>

					<table className="mw-mapping-table" aria-label="Соответствие колонок">
						<thead>
							<tr className="mw-mapping-row mw-mapping-head">
								<th scope="col">Колонка источника</th>
								<th scope="col">Поле карточки</th>
								<th scope="col">Решение</th>
								<th scope="col">Форма значений</th>
							</tr>
						</thead>
						<tbody>
							{mapping.mapping.columns.map((column) => (
								<tr className="mw-mapping-row" key={column.sourceColumn}>
									<td className="mw-col-source">{column.sourceColumn}</td>
									<td className="mw-col-target">{column.targetField}</td>
									<td>
										<span
											className={`mw-badge mw-badge-${column.decidedBy}`}
											title={column.rationale}
										>
											{DECISION_TITLES[column.decidedBy]}
										</span>
										<span className="mw-confidence">
											{Math.round(column.confidence * 100)}%
										</span>
									</td>
									{/* Маски, а не значения: настоящие ФИО и телефоны на экран не выводятся. */}
									<td className="mw-col-shapes">
										{column.sampleValues.join("  ")}
									</td>
								</tr>
							))}
						</tbody>
					</table>

					{mapping.mapping.unmappedColumns.length > 0 && (
						<div className="mw-alert mw-alert-warn">
							Не сопоставлены: {mapping.mapping.unmappedColumns.join(", ")}. Их
							содержимое сохранится в исходном виде, но в поля карточки не
							запишется.
						</div>
					)}

					{mapping.qualityFindings.length > 0 && (
						<details className="mw-findings" open={blockers.length > 0}>
							<summary>
								Замечания к источнику: {mapping.qualityFindings.length}
								{blockers.length > 0 && (
									<span className="mw-findings-bad">
										{" "}
										· {blockers.length} блокирующих
									</span>
								)}
							</summary>
							<ul>
								{mapping.qualityFindings.slice(0, 20).map((finding) => (
									<li
										key={`finding-${finding.severity}-${finding.message}`}
										className={`mw-finding mw-finding-${finding.severity}`}
									>
										{finding.message}
										{finding.affectedRows > 0 && (
											<span className="mw-finding-rows">
												{" "}
												— строк: {finding.affectedRows}
											</span>
										)}
									</li>
								))}
							</ul>
						</details>
					)}

					<div className="mw-actions">
						<button
							type="button"
							className="mw-btn mw-btn-primary"
							onClick={props.onDryRun}
							disabled={props.busy}
						>
							Сухой прогон
						</button>
						<span className="mw-actions-note">
							Сухой прогон проверяет всё до последней строки и ничего не
							записывает. Запись станет доступна после него.
						</span>
					</div>
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------

function RunningPanel(props: { status: RunStatus | null; dryRun: boolean }) {
	const percent = props.status?.run.progress.percent ?? 0;
	const phase =
		props.status?.run.phase ?? "Задача принята, ожидает исполнителя";

	return (
		<div className="mw-panel mw-running">
			<div
				className="mw-progress"
				role="progressbar"
				aria-valuenow={percent}
				aria-valuemin={0}
				aria-valuemax={100}
			>
				<div className="mw-progress-bar" style={{ width: `${percent}%` }} />
			</div>
			<p className="mw-running-phase">{phase}</p>
			<p className="mw-running-percent">{percent}%</p>

			{props.status !== null && (
				<div className="mw-running-counters">
					<span>уложено {props.status.run.counters.stagedRows}</span>
					<span>создано {props.status.run.counters.loadedRows}</span>
					<span>обновлено {props.status.run.counters.updatedRows}</span>
					<span>дублей {props.status.run.counters.duplicateRows}</span>
					<span>карантин {props.status.run.counters.quarantinedRows}</span>
				</div>
			)}

			{props.status !== null && props.status.run.worker.resumeCount > 0 && (
				<div className="mw-alert mw-alert-info">
					Прогон был прерван и возобновлён (
					{props.status.run.worker.resumeCount}). Продолжение идёт с тех строк,
					которые ещё не загружены — дублей не будет.
				</div>
			)}

			<p className="mw-running-note">
				{props.dryRun
					? "Идёт сухой прогон: боевые таблицы не изменяются."
					: "Идёт запись в базу. Окно можно закрыть — перенос продолжится на сервере."}
			</p>
		</div>
	);
}

// ---------------------------------------------------------------------------

function ReportPanel(props: {
	report: ReconciliationResponse;
	status: RunStatus;
	dryRun: boolean;
	runId: string;
	busy: boolean;
	onLiveRun: () => void;
	onRollback: () => void;
	onRestart: () => void;
}) {
	const { report, status } = props;

	return (
		<div className="mw-panel">
			<div className={`mw-verdict ${report.balanced ? "is-ok" : "is-bad"}`}>
				<span className="mw-verdict-mark" aria-hidden="true">
					{report.balanced ? "✓" : "!"}
				</span>
				<div>
					<strong>
						{report.balanced ? "Сверка сошлась" : "Сверка НЕ сошлась"}
					</strong>
					<p>
						{report.balanced
							? props.dryRun
								? "Проверены все строки. Расхождений нет — можно переносить в базу."
								: "Каждая строка источника учтена. Перенос завершён."
							: "Часть строк не учтена. Перенос нельзя считать завершённым — разберите расхождения ниже."}
					</p>
				</div>
			</div>

			{/*
        Сухой прогон и боевой считаются по-разному.

        В сухом прогоне в боевые таблицы не пишется ничего, поэтому «создано»
        всегда ноль, а все проверенные строки помечены пропущенными — так
        замыкается баланс сверки. Показывать оператору «0 создано, 120
        пропущено» после успешной проверки нельзя: это читается как провал,
        хотя на деле проверены и готовы к переносу все 120 строк.
      */}
			<div className="mw-counters">
				<Counter
					label="Строк в источнике"
					value={status.run.counters.sourceRows}
				/>
				{props.dryRun ? (
					<Counter
						label="Готовы к переносу"
						value={Math.max(
							0,
							status.run.counters.sourceRows -
								status.run.counters.quarantinedRows,
						)}
						tone="ok"
					/>
				) : (
					<>
						<Counter
							label="Создано"
							value={status.run.counters.loadedRows}
							tone="ok"
						/>
						<Counter
							label="Обновлено"
							value={status.run.counters.updatedRows}
						/>
						<Counter label="Дублей" value={status.run.counters.duplicateRows} />
					</>
				)}
				<Counter
					label="В карантине"
					value={status.run.counters.quarantinedRows}
					tone="warn"
				/>
				{!props.dryRun && (
					<Counter label="Пропущено" value={status.run.counters.skippedRows} />
				)}
			</div>

			<div className="mw-checks">
				{report.checks.map((check) => (
					<div
						className={`mw-check ${check.passed ? "is-ok" : "is-bad"}`}
						key={check.code}
					>
						<span className="mw-check-mark" aria-hidden="true">
							{check.passed ? "✓" : "✕"}
						</span>
						<div className="mw-check-body">
							<strong>{check.title}</strong>
							<span className="mw-check-numbers">
								ожидалось {check.expected}, получено {check.actual}
							</span>
							<p className="mw-check-detail">{check.detail}</p>
						</div>
					</div>
				))}
			</div>

			{report.quarantinePreview.length > 0 && (
				<details className="mw-quarantine" open>
					<summary>
						Карантин: {report.quarantinePreview.length} записей на разбор
					</summary>
					<ul>
						{report.quarantinePreview.slice(0, 25).map((item) => (
							<li key={item.id} className={item.blocking ? "is-blocking" : ""}>
								<span className="mw-q-reason">
									{REASON_TITLES[item.reason] ?? item.reason}
								</span>
								{item.sourceRowNumber !== null && (
									<span className="mw-q-row">
										строка {item.sourceRowNumber}
									</span>
								)}
								<span className="mw-q-message">{item.message}</span>
								{item.suggestedFix !== null && (
									<span className="mw-q-fix">{item.suggestedFix}</span>
								)}
							</li>
						))}
					</ul>
				</details>
			)}

			<div className="mw-actions">
				{props.dryRun && report.balanced && (
					<button
						type="button"
						className="mw-btn mw-btn-danger"
						onClick={props.onLiveRun}
						disabled={props.busy}
					>
						Перенести в базу
					</button>
				)}
				{!props.dryRun && (
					<button
						type="button"
						className="mw-btn mw-btn-ghost"
						onClick={props.onRollback}
						disabled={props.busy}
					>
						Откатить перенос
					</button>
				)}
				<ReconciliationActDownloadButton runId={props.runId} />
				<button
					type="button"
					className="mw-btn mw-btn-ghost"
					onClick={props.onRestart}
				>
					Перенести ещё файл
				</button>
			</div>
		</div>
	);
}

/**
 * Кнопка скачивания акта сверки.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Здесь стояла ссылка
 * `<a href="/api/migration/<прогон>/reconciliation.csv" download>`. По такой
 * ссылке запрос отправляет БРАУЗЕР, а не fetch, и заголовков у него нет:
 * подмена window.fetch из lib/apiAuthFetch.ts к разметке не относится. Маршрут
 * же закрыт requireClinicalReadContext (apps/api/src/routes/migrationRuns.ts:509-511)
 * и отвечал `401 AuthRequired`. То есть акт сверки — единственный документ, по
 * которому клиника проверяет, что перенос базы сошёлся по деньгам и по числу
 * карточек, — не скачивался ни разу, хотя сервер собирал его целиком, вместе с
 * BOM для русского Excel.
 */
function ReconciliationActDownloadButton(props: { runId: string }) {
	const [failure, setFailure] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	return (
		<>
			<button
				type="button"
				className="mw-btn mw-btn-ghost"
				disabled={busy}
				onClick={async () => {
					setFailure(null);
					setBusy(true);
					let objectUrl: string | null = null;
					try {
						objectUrl = await downloadAuthedApiFile(
							`/api/migration/${props.runId}/reconciliation.csv`,
							`акт-сверки-${props.runId}.csv`,
						);
					} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
						setFailure(
							error instanceof Error ? error.message : AUTHED_API_FILE_FAILURE,
						);
					} finally {
						setBusy(false);
						// Освобождается после клика: до него браузер файл ещё не забрал.
						if (objectUrl)
							window.setTimeout(
								() => URL.revokeObjectURL(objectUrl as string),
								60_000,
							);
					}
				}}
			>
				{busy ? "Готовим акт…" : "Скачать акт сверки"}
			</button>
			{failure !== null && <span className="mw-error">{failure}</span>}
		</>
	);
}

function Counter(props: {
	label: string;
	value: number;
	tone?: "ok" | "warn";
}) {
	return (
		<div className={`mw-counter ${props.tone ? `is-${props.tone}` : ""}`}>
			<span className="mw-counter-value">{props.value}</span>
			<span className="mw-counter-label">{props.label}</span>
		</div>
	);
}

// ---------------------------------------------------------------------------

function DiscoveryPanel(props: {
	discovery: DiscoveryResponse;
	onClose: () => void;
}) {
	const { discovery } = props;
	return (
		<div className="mw-discovery">
			<header>
				<strong>Найдено на сервере</strong>
				<span className="mw-discovery-meta">
					просмотрено {discovery.scan.filesScanned} файлов за{" "}
					{(discovery.scan.elapsedMs / 1000).toFixed(1)} с
				</span>
				<button
					type="button"
					className="mw-alert-close"
					onClick={props.onClose}
					aria-label="Закрыть"
				>
					×
				</button>
			</header>

			{discovery.readySources.length > 0 && (
				<section>
					<h4>Читаются сразу — {discovery.summary.readable}</h4>
					<ul className="mw-discovery-list">
						{discovery.readySources.slice(0, 10).map((source) => (
							<li key={source.filePath}>
								<span className="mw-d-name">{source.fileName}</span>
								<span className="mw-d-format">{source.format}</span>
								<span className="mw-d-path">{source.filePath}</span>
								{source.details.length > 0 && (
									<span className="mw-d-details">
										{source.details.join(" ")}
									</span>
								)}
							</li>
						))}
					</ul>
				</section>
			)}

			{discovery.needsExportSources.length > 0 && (
				<section>
					<h4>
						Требуют выгрузки из своей программы —{" "}
						{discovery.summary.needsExport}
					</h4>
					<ul className="mw-discovery-list">
						{discovery.needsExportSources.slice(0, 10).map((source) => (
							<li key={source.filePath}>
								<span className="mw-d-name">{source.fileName}</span>
								<span className="mw-d-format">
									{source.format}
									{source.version !== null && ` · ${source.version}`}
								</span>
								<span className="mw-d-path">{source.filePath}</span>
								{source.guidance !== null && (
									<span className="mw-d-guidance">{source.guidance}</span>
								)}
							</li>
						))}
					</ul>
				</section>
			)}

			{discovery.imagingFolders.length > 0 && (
				<section>
					<h4>Каталоги со снимками</h4>
					<ul className="mw-discovery-list">
						{discovery.imagingFolders.slice(0, 5).map((folder) => (
							<li key={folder.directory}>
								<span className="mw-d-name">
									{folder.fileCount} файлов DICOM
								</span>
								<span className="mw-d-path">{folder.directory}</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{discovery.warnings.map((warning) => (
				<p className="mw-discovery-warning" key={warning}>
					{warning}
				</p>
			))}
		</div>
	);
}
