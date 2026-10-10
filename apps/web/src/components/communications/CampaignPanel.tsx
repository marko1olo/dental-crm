/**
 * @file CampaignPanel.tsx
 * @description Canonical thin facade for CampaignPanel (Wave 20 Decomposed Module).
 * Re-exports CampaignPanel and its associated domain types from ./campaignPanel/index.js.
 */

export { CampaignPanel, default } from "./campaignPanel/index.js";
export * from "./campaignPanel/types.js";
export * from "./campaignPanel/useCampaignPanel.js";
export * from "./campaignPanel/CampaignList.js";
export * from "./campaignPanel/CampaignEditor.js";
export * from "./campaignPanel/CampaignAudienceFilter.js";
export * from "./campaignPanel/CampaignStats.js";
