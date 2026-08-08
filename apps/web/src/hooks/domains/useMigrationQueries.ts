
export function useMigrationQueries(options?: {
	auth?: any;
	clinicalMutationHeaders?: any;
	clinicalReadHeaders?: any;
}) {
	let auth = options?.auth;
	let clinicalMutationHeaders = options?.clinicalMutationHeaders;
	let clinicalReadHeaders = options?.clinicalReadHeaders;


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
		return fetch("/api/migration/upload", {
			method: "POST",
			headers: getHeaders(true, {
				"content-type": "application/octet-stream",
				"x-migration-file-name": encodeURIComponent(file.name),
			}),
			body: file,
		});
	};

	const mapColumns = async (runId: string, useLlm: boolean) => {
		return fetch(`/api/migration/${runId}/map`, {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ allowLlm: useLlm }),
		});
	};

	const getStatus = async (runId: string) => {
		return fetch(`/api/migration/${runId}`, { headers: getHeaders(false) });
	};

	const getReconciliation = async (runId: string) => {
		return fetch(`/api/migration/${runId}/reconciliation`, {
			headers: getHeaders(false),
		});
	};

	const execute = async (runId: string, dryRun: boolean) => {
		return fetch(`/api/migration/${runId}/execute`, {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ dryRun, sourceSystem: "legacy" }),
		});
	};

	const rollback = async (runId: string) => {
		return fetch("/api/migration/rollback", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ runId, confirm: true }),
		});
	};

	const discover = async () => {
		return fetch("/api/migration/discover", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ roots: [], maxDepth: 5, timeBudgetMs: 30000 }),
		});
	};

	const pickBrowserMigrationSource = async () => {};
	const planMigrationDiscoveryCandidate = async (candidate: any) => {
		return fetch("/api/imports/smart/local-source-workup", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ candidate }),
		});
	};
	const previewMigrationDiscoveryCandidate = async (candidate: any) => {};
	const previewMigrationAutopilotSources = async (sourceFingerprint?: string | null) => {};
	const probeMigrationDiscoveryCandidate = async (candidate: any) => {
		return fetch("/api/imports/smart/local-source-probe", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ candidate }),
		});
	};
	const previewImport = async (payload?: any) => {
		return fetch("/api/imports/patients/intake", {
			method: "POST",
			headers: getHeaders(false, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const previewSmartImport = async (payload?: any) => {
		return fetch("/api/imports/smart/preview", {
			method: "POST",
			headers: getHeaders(false, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const commitImport = async (payload?: any) => {
		return fetch("/api/imports/patients/commit", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const commitSmartImport = async (payload?: any) => {
		return fetch("/api/imports/smart/commit", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const discoverMigrationSources = async () => {
		return fetch("/api/imports/smart/local-source-discovery", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
		});
	};
	const downloadMigrationHandoffReport = async () => {};
	const downloadSmartImportSafeHandoffReport = async () => {};
	const downloadSmartImportReport = async () => {};
	const handleBrowserMigrationInputChange = async (_files: any) => {};
	const ingestImportFile = async (_file: any) => {};
	const addMigrationDiscoveryCandidateToSmartImport = (_candidate: any) => {};
	const runMigrationAutopilot = async (_knownDiscovery?: any, _options?: any) => {};

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
