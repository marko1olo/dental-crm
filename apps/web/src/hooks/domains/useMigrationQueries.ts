import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";

export function useMigrationQueries(options?: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	auth?: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	clinicalMutationHeaders?: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	clinicalReadHeaders?: any;
}) {
	const auth = options?.auth;
	const clinicalMutationHeaders = options?.clinicalMutationHeaders;
	const clinicalReadHeaders = options?.clinicalReadHeaders;

	const getHeaders = (isMutation: boolean, extra?: Record<string, string>) => {
		if (auth) {
			return isMutation
				? auth.denteClinicalMutationHeaders(extra)
				: auth.denteClinicalReadHeaders(extra);
		}
		if (isMutation && clinicalMutationHeaders) {
			return clinicalMutationHeaders(extra);
		}
		if (!isMutation && clinicalReadHeaders) {
			return clinicalReadHeaders(extra);
		}
		return extra || {};
	};

	const uploadFile = async (file: File) => {
		return fetchWithHandling("/api/migration/upload", {
			method: "POST",
			headers: getHeaders(true, {
				"content-type": "application/octet-stream",
				"x-migration-file-name": encodeURIComponent(file.name),
			}),
			body: file,
		});
	};

	const mapColumns = async (runId: string, useLlm: boolean) => {
		return fetchWithHandling(`/api/migration/${runId}/map`, {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ allowLlm: useLlm }),
		});
	};

	const getStatus = async (runId: string) => {
		return fetchWithHandling(`/api/migration/${runId}`, {
			headers: getHeaders(false),
		});
	};

	const getReconciliation = async (runId: string) => {
		return fetchWithHandling(`/api/migration/${runId}/reconciliation`, {
			headers: getHeaders(false),
		});
	};

	const execute = async (runId: string, dryRun: boolean) => {
		return fetchWithHandling(`/api/migration/${runId}/execute`, {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ dryRun, sourceSystem: "legacy" }),
		});
	};

	const rollback = async (runId: string) => {
		return fetchWithHandling("/api/migration/rollback", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ runId, confirm: true }),
		});
	};

	const discover = async () => {
		return fetchWithHandling("/api/migration/discover", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ roots: [], maxDepth: 5, timeBudgetMs: 30000 }),
		});
	};

	const pickBrowserMigrationSource = () => {
		const el = document.querySelector<HTMLInputElement>(
			'[data-testid="browser-migration-folder-input"]',
		);
		if (el) el.click();
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const planMigrationDiscoveryCandidate = async (candidate: any) => {
		return fetchWithHandling("/api/imports/smart/local-source-workup", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ candidate }),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const previewMigrationDiscoveryCandidate = async (_candidate: any) => {};
	const previewMigrationAutopilotSources = async (
		_sourceFingerprint?: string | null,
	) => {};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const probeMigrationDiscoveryCandidate = async (candidate: any) => {
		return fetchWithHandling("/api/imports/smart/local-source-probe", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ candidate }),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const previewImport = async (payload?: any) => {
		return fetchWithHandling("/api/imports/patients/intake", {
			method: "POST",
			headers: getHeaders(false, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const previewSmartImport = async (payload?: any) => {
		return fetchWithHandling("/api/imports/smart/preview", {
			method: "POST",
			headers: getHeaders(false, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const commitImport = async (payload?: any) => {
		return fetchWithHandling("/api/imports/patients/commit", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const commitSmartImport = async (payload?: any) => {
		return fetchWithHandling("/api/imports/smart/commit", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const discoverMigrationSources = async () => {
		return fetchWithHandling("/api/imports/smart/local-source-discovery", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
		});
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const downloadMigrationHandoffReport = async (payload?: any) => {
		try {
			const res = await fetchWithHandling(
				"/api/imports/smart/migration-autopilot/report.csv",
				{
					method: "POST",
					headers: getHeaders(true, { "content-type": "application/json" }),
					body: JSON.stringify(payload ?? {}),
				},
			);
			if (!res.ok) throw new Error("Failed to download report");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "migration_autopilot_handoff.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			logger.error("downloadMigrationHandoffReport error", e);
		}
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const downloadSmartImportSafeHandoffReport = async (payload?: any) => {
		try {
			const res = await fetchWithHandling(
				"/api/imports/smart/report.safe.csv",
				{
					method: "POST",
					headers: getHeaders(true, { "content-type": "application/json" }),
					body: JSON.stringify(payload ?? {}),
				},
			);
			if (!res.ok) throw new Error("Failed to download safe report");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "smart_import_safe_handoff.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			logger.error("downloadSmartImportSafeHandoffReport error", e);
		}
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const downloadSmartImportReport = async (payload?: any) => {
		try {
			const res = await fetchWithHandling("/api/imports/smart/report.csv", {
				method: "POST",
				headers: getHeaders(true, { "content-type": "application/json" }),
				body: JSON.stringify(payload ?? {}),
			});
			if (!res.ok) throw new Error("Failed to download report");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "smart_import_report.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			logger.error("downloadSmartImportReport error", e);
		}
	};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const handleBrowserMigrationInputChange = async (_files: any) => {};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const ingestImportFile = async (_file: any) => {};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const addMigrationDiscoveryCandidateToSmartImport = (_candidate: any) => {};
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const runMigrationAutopilot = async (knownDiscovery?: any, options?: any) => {
		return fetchWithHandling("/api/imports/smart/migration-autopilot", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ knownDiscovery, options }),
		});
	};

	return {
		uploadFile,
		mapColumns,
		getStatus,
		getReconciliation,
		execute,
		rollback,
		discover,
		pickBrowserMigrationSource,
		planMigrationDiscoveryCandidate,
		previewMigrationDiscoveryCandidate,
		previewMigrationAutopilotSources,
		probeMigrationDiscoveryCandidate,
		previewImport,
		previewSmartImport,
		addMigrationDiscoveryCandidateToSmartImport,
		runMigrationAutopilot,
		commitImport,
		commitSmartImport,
		discoverMigrationSources,
		downloadMigrationHandoffReport,
		downloadSmartImportSafeHandoffReport,
		downloadSmartImportReport,
		handleBrowserMigrationInputChange,
		ingestImportFile,
	};
}
