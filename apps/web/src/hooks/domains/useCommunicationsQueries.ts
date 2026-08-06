import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function useCommunicationsQueries() {
  const { auth } = useAppLogicContext();

  const getGatewayStatus = async () => fetch("/api/communications/gateway-status", { headers: auth?.denteClinicalReadHeaders() });
  const getTemplates = async () => fetch("/api/communications/templates", { headers: auth?.denteClinicalReadHeaders() });
  const getOutbox = async (query = "") => fetch(`/api/communications/outbox${query}`, { headers: auth?.denteClinicalReadHeaders() });
  const getSettings = async () => fetch("/api/communications/settings", { headers: auth?.denteClinicalReadHeaders() });
  const getVariables = async () => fetch("/api/communications/variables", { headers: auth?.denteClinicalReadHeaders() });

  const previewTemplate = async (templateId: string | null, payload: any) => fetch("/api/communications/templates/preview", {
    method: "POST",
    headers: auth?.denteClinicalMutationHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload)
  });

  const updateTemplate = async (editingId: string, payload: any) => fetch(`/api/communications/templates/${editingId}`, {
    method: "PATCH", // Fixed: server expects PATCH (communicationsOutbox.ts:276), not PUT
    headers: auth?.denteClinicalMutationHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload)
  });

  const createTemplate = async (payload: any) => fetch("/api/communications/templates", {
    method: "POST",
    headers: auth?.denteClinicalMutationHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload)
  });

  const outboxAction = async (outboxId: string, action: string) => fetch(`/api/communications/outbox/${outboxId}/${action}`, {
    method: "POST",
    headers: auth?.denteClinicalMutationHeaders()
  });

  const dispatchOutbox = async () => fetch("/api/communications/outbox/dispatch", {
    method: "POST",
    headers: auth?.denteClinicalMutationHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ batchSize: 25 })
  });

  const runReminders = async () => fetch("/api/communications/reminders/run", {
    method: "POST",
    headers: auth?.denteClinicalMutationHeaders()
  });

  const saveSettings = async (payload: any) => fetch("/api/communications/settings", {
    method: "PUT",
    headers: auth?.denteClinicalMutationHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload)
  });

  const addOutboxMessage = async (payload: any) => fetch("/api/communications/outbox", {
    method: "POST",
    headers: auth?.denteClinicalMutationHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload)
  });

  const getCampaigns = async (authObj?: any) => fetch("/api/communications/campaigns", { headers: (authObj || auth)?.denteClinicalReadHeaders() });
  const getCampaignsTemplates = async (authObj?: any) => fetch("/api/communications/templates", { headers: (authObj || auth)?.denteClinicalReadHeaders() });
  const getCampaignsVariables = async (authObj?: any) => fetch("/api/communications/variables", { headers: (authObj || auth)?.denteClinicalReadHeaders() });

  const createCampaign = async (payload: any, authObj?: any) => fetch("/api/communications/campaigns", {
    method: "POST",
    headers: (authObj || auth)?.denteClinicalMutationHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload)
  });

  const previewCampaign = async (campaignId: string, authObj?: any) => fetch(`/api/communications/campaigns/${campaignId}/preview`, { headers: (authObj || auth)?.denteClinicalReadHeaders() });
  const getCampaignProgress = async (campaignId: string, authObj?: any) => fetch(`/api/communications/campaigns/${campaignId}/progress`, { headers: (authObj || auth)?.denteClinicalReadHeaders() });

  const campaignAction = async (campaignId: string, action: string, authObj?: any) => fetch(`/api/communications/campaigns/${campaignId}/${action}`, {
    method: "POST",
    headers: (authObj || auth)?.denteClinicalMutationHeaders()
  });

  return {
    getGatewayStatus,
    getTemplates,
    getOutbox,
    getSettings,
    getVariables,
    previewTemplate,
    updateTemplate,
    createTemplate,
    outboxAction,
    dispatchOutbox,
    runReminders,
    saveSettings,
    addOutboxMessage,
    getCampaigns,
    getCampaignsTemplates,
    getCampaignsVariables,
    createCampaign,
    previewCampaign,
    getCampaignProgress,
    campaignAction
  };
}
