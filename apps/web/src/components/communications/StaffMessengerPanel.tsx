/**
 * @file StaffMessengerPanel.tsx
 * @description Canonical thin facade for StaffMessengerPanel (Wave 21 Monolith Decomposition).
 * Preserves high-contrast styles, CSS theme tokens, and delegates to ./staffMessenger/index.js.
 * Enforces Mandate 8b & Mandate 8e: Doctor & Staff Autonomy.
 */

import "./staffMessenger.css";

// Re-export canonical component and preserved styling contracts (e.g. staff-chat-channel-btn)
export { StaffMessengerPanel, default } from "./staffMessenger/index.js";
export * from "./staffMessenger/types.js";
export * from "./staffMessenger/useStaffMessenger.js";
export * from "./staffMessenger/StaffChatSidebar.js";
export * from "./staffMessenger/StaffChatHeader.js";
export * from "./staffMessenger/StaffChatThread.js";
export * from "./staffMessenger/StaffChatInput.js";
