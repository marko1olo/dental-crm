/**
 * apps/web/src/components/settings/MigrationWizard.tsx
 *
 * Главный мастер переноса базы данных пациентов из старых систем (IDENT, DentalPRO, Инфодент, StomX, Excel).
 *
 * Декомпозирован в модули apps/web/src/components/settings/migration/
 * Mandate 8b: Строго <= 800 строк на любой файл (текущий размер ~240 строк).
 * Mandate 8d: Ноль мультяшных эмодзи.
 * Mandate 8e / 8n: Zero Dead-Ends (свобода отмены, надежная валидация, защита от зависаний).
 */

import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	AUTHED_API_FILE_FAILURE,
	downloadAuthedApiFile,
} from "../../lib/authedApiFile";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import "./MigrationWizard.css";
import { MigrationDiscoveryPanel } from "./migration/MigrationDiscoveryPanel";
import { MigrationMappingPanel } from "./migration/MigrationMappingPanel";
import { MigrationReportPanel } from "./migration/MigrationReportPanel";
import { MigrationRunningPanel } from "./migration/MigrationRunningPanel";
import { MigrationSourcePanel } from "./migration/MigrationSourcePanel";
import {
	type DiscoveryResponse,
	type MapResponse,
	readResponse,
	type ReconciliationResponse,
	type RunStatus,
	type UploadResponse,
	type WizardStep,
} from "./migration/migrationTypes";

/**
 * Кнопка скачивания акта сверки через защищённый fetch с токеном.
 * Должна находиться в MigrationWizard.tsx для гарантии проверяемости
 * в protectedApiFilesReachTheBrowser.test.ts.
 */
export function ReconciliationActDownloadButton(props: { runId: string }) {
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
						showToast(
							actionFailureToast(
								"Ошибка скачивания файла",
								(error as { status?: number })?.status ?? null,
							),
							"error",
						);
						setFailure(
							error instanceof Error ? error.message : AUTHED_API_FILE_FAILURE,
						);
					} finally {
						setBusy(false);
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
	const pollAttemptsRef = useRef<number>(0);

	/*
	 * Клинические заголовки авторизации (requireClinicalReadContext / requireClinicalMutationContext).
	 * Передаются со всеми запросами миграции.
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

	/** Останавливает опрос при уходе со страницы */
	useEffect(() => {
		return () => {
			if (pollTimerRef.current !== null) {
				window.clearInterval(pollTimerRef.current);
				pollTimerRef.current = null;
			}
		};
	}, []);

	const resetError = useCallback(() => setError(null), []);

	// -------------------------------------------------------------------
	// Шаг 2: сопоставление колонок
	// -------------------------------------------------------------------
	const runMapping = useCallback(
		async (runId: string, useLlm: boolean) => {
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
				showToast(
					actionFailureToast(
						"Ошибка выполнения сопоставления",
						(caught as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError({
					code: "NetworkError",
					message:
						caught instanceof Error
							? caught.message
							: "Сопоставление колонок не выполнено.",
				});
			} finally {
				setBusy(false);
			}
		},
		[clinicalMutationHeaders],
	);

	// -------------------------------------------------------------------
	// Шаг 1: загрузка файла
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
				await runMapping(result.data.runId, allowLlm);
			} catch (caught) {
				showToast(
					actionFailureToast(
						"Ошибка отправки файла",
						(caught as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError({
					code: "NetworkError",
					message:
						caught instanceof Error ? caught.message : "Файл не отправлен.",
				});
			} finally {
				setBusy(false);
			}
		},
		[allowLlm, clinicalMutationHeaders, runMapping],
	);

	// -------------------------------------------------------------------
	// Шаг 3: опрос статуса и завершение
	// -------------------------------------------------------------------
	const pollStatus = useCallback(
		async (runId: string) => {
			const auth = authRef.current;
			const headers =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: clinicalReadHeaders();
			try {
				const response = await fetch(`/api/migration/${runId}`, { headers });
				const result = await readResponse<RunStatus>(response);
				if (!result.ok) return null;
				setStatus(result.data);
				return result.data;
			} catch {
				return null;
			}
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
			try {
				const response = await fetch(`/api/migration/${runId}/reconciliation`, {
					headers,
				});
				const result = await readResponse<ReconciliationResponse>(response);
				if (result.ok) {
					setReport(result.data);
					setStep("report");
				}
			} catch (e) {
				console.error("[migration] failed to load report:", e);
			}
		},
		[clinicalReadHeaders],
	);

	const stopPolling = useCallback(() => {
		if (pollTimerRef.current !== null) {
			window.clearInterval(pollTimerRef.current);
			pollTimerRef.current = null;
		}
		pollAttemptsRef.current = 0;
	}, []);

	const startRun = useCallback(
		async (dryRun: boolean) => {
			if (!upload) return;
			setBusy(true);
			setError(null);
			setReport(null);
			setLastRunWasDry(dryRun);
			pollAttemptsRef.current = 0;

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
				stopPolling();

				pollTimerRef.current = window.setInterval(() => {
					void (async () => {
						pollAttemptsRef.current += 1;
						// Защита от вечного зависания (Zero Dead-Ends: макс 180 секунд опроса)
						if (pollAttemptsRef.current > 180) {
							stopPolling();
							setBusy(false);
							setError({
								code: "PollTimeout",
								message:
									"Превышено время ожидания ответа сервера. Прогон может выполняться в фоне.",
							});
							return;
						}

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
							stopPolling();
							setBusy(false);
							await loadReport(upload.runId);
						}
					})();
				}, 1000);
			} catch (caught) {
				showToast(
					actionFailureToast(
						"Ошибка запуска прогона",
						(caught as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError({
					code: "NetworkError",
					message:
						caught instanceof Error ? caught.message : "Прогон не запущен.",
				});
				setBusy(false);
			}
		},
		[upload, pollStatus, loadReport, clinicalMutationHeaders, stopPolling],
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
							{index < currentIndex ? <Check size={12} /> : index + 1}
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
						<X size={16} />
					</button>
				</div>
			)}

			{discovery !== null && (
				<MigrationDiscoveryPanel
					discovery={discovery}
					onClose={() => setDiscovery(null)}
				/>
			)}

			{step === "source" && (
				<MigrationSourcePanel
					busy={busy}
					allowLlm={allowLlm}
					onAllowLlmChange={setAllowLlm}
					fileInputRef={fileInputRef}
					onFile={(file) => void handleFile(file)}
				/>
			)}

			{step === "mapping" && upload !== null && (
				<MigrationMappingPanel
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
				<MigrationRunningPanel
					status={status}
					dryRun={lastRunWasDry}
					onCancel={() => {
						stopPolling();
						setBusy(false);
						setStep("mapping");
					}}
				/>
			)}

			{step === "report" && report !== null && status !== null && (
				<MigrationReportPanel
					report={report}
					status={status}
					dryRun={lastRunWasDry}
					runId={upload?.runId ?? ""}
					busy={busy}
					downloadButton={
						<ReconciliationActDownloadButton runId={upload?.runId ?? ""} />
					}
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
