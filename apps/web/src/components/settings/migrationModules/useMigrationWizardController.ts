/**
 * apps/web/src/components/settings/migrationModules/useMigrationWizardController.ts
 *
 * State and API orchestration hook for MigrationWizard.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import {
	autoDetectColumnMappings,
	buildMigrationPreviewAndDeduplication,
	parseCsvOrTsvText,
	readResponse,
	type DiscoveryResponse,
	type MapResponse,
	type MigrationFieldTarget,
	type ReconciliationResponse,
	type RunStatus,
	type UploadResponse,
	type WizardStep,
} from "./migrationWizardTypes";

export function useMigrationWizardController() {
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

	const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
	const [csvRows, setCsvRows] = useState<string[][]>([]);
	const [columnMap, setColumnMap] = useState<Record<string, MigrationFieldTarget>>(
		{},
	);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const pollTimerRef = useRef<number | null>(null);
	const pollAttemptsRef = useRef<number>(0);

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

	useEffect(() => {
		return () => {
			if (pollTimerRef.current !== null) {
				window.clearInterval(pollTimerRef.current);
				pollTimerRef.current = null;
			}
		};
	}, []);

	const resetError = useCallback(() => setError(null), []);

	const handleColumnTargetChange = useCallback(
		(header: string, target: MigrationFieldTarget) => {
			setColumnMap((prev) => ({ ...prev, [header]: target }));
		},
		[],
	);

	const previewResult = useMemo(
		() => buildMigrationPreviewAndDeduplication(csvRows, csvHeaders, columnMap),
		[csvRows, csvHeaders, columnMap],
	);

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

	const handleFile = useCallback(
		async (file: File) => {
			setBusy(true);
			setError(null);
			setMapping(null);
			setStatus(null);
			setReport(null);

			const lowerName = (file.name || "").toLowerCase();
			if (
				(lowerName.endsWith(".csv") ||
					lowerName.endsWith(".tsv") ||
					lowerName.endsWith(".txt")) &&
				typeof file.text === "function"
			) {
				try {
					const rawText = await file.text();
					const parsed = parseCsvOrTsvText(rawText);
					setCsvHeaders(parsed.headers);
					setCsvRows(parsed.rows);
					setColumnMap(autoDetectColumnMappings(parsed.headers));
				} catch {
					// Игнорируем ошибку локального предпросмотра, если файл бинарный
				}
			} else {
				setCsvHeaders([]);
				setCsvRows([]);
				setColumnMap({});
			}

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

	const resetToSource = useCallback(() => {
		setUpload(null);
		setMapping(null);
		setStatus(null);
		setReport(null);
		setCsvHeaders([]);
		setCsvRows([]);
		setColumnMap({});
		setStep("source");
	}, []);

	return {
		step,
		setStep,
		busy,
		setBusy,
		error,
		resetError,
		upload,
		mapping,
		status,
		report,
		discovery,
		setDiscovery,
		allowLlm,
		setAllowLlm,
		lastRunWasDry,
		fileInputRef,
		csvHeaders,
		columnMap,
		handleColumnTargetChange,
		previewResult,
		runMapping,
		handleFile,
		startRun,
		stopPolling,
		rollback,
		runDiscovery,
		resetToSource,
	};
}
