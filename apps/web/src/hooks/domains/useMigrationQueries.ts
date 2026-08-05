import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function useMigrationQueries() {
  const { auth, clinicalMutationHeaders, clinicalReadHeaders } = useAppLogicContext();

  const getHeaders = (isMutation: boolean, extra?: Record<string, string>) => {
    if (auth) {
      return isMutation
        ? auth.denteClinicalMutationHeaders(extra)
        : auth.denteClinicalReadHeaders(extra);
    }
    return isMutation ? clinicalMutationHeaders(extra) : clinicalReadHeaders(extra);
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
      body: JSON.stringify({ allowLlm: useLlm })
    });
  };

  const getStatus = async (runId: string) => {
    return fetch(`/api/migration/${runId}`, { headers: getHeaders(false) });
  };

  const getReconciliation = async (runId: string) => {
    return fetch(`/api/migration/${runId}/reconciliation`, { headers: getHeaders(false) });
  };

  const execute = async (runId: string, dryRun: boolean) => {
    return fetch(`/api/migration/${runId}/execute`, {
      method: "POST",
      headers: getHeaders(true, { "content-type": "application/json" }),
      body: JSON.stringify({ dryRun, sourceSystem: "legacy" })
    });
  };

  const rollback = async (runId: string) => {
    return fetch("/api/migration/rollback", {
      method: "POST",
      headers: getHeaders(true, { "content-type": "application/json" }),
      body: JSON.stringify({ runId, confirm: true })
    });
  };

  const discover = async () => {
    return fetch("/api/migration/discover", {
      method: "POST",
      headers: getHeaders(true, { "content-type": "application/json" }),
      body: JSON.stringify({ roots: [], maxDepth: 5, timeBudgetMs: 30000 })
    });
  };

  return { uploadFile, mapColumns, getStatus, getReconciliation, execute, rollback, discover };
}
