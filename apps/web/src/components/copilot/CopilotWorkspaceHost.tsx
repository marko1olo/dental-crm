/**
 * CopilotWorkspaceHost.tsx — Тонкий прозрачный фасад-реэкспорт к каноническому CopilotDrawer (Мандаты 8s, 8e).
 * Каноническим SSOT выдвижным интерфейсом копайлота является CopilotDrawer.tsx.
 * Запрещены параллельные клоны и захардкоженные симуляции сообщений (Мандат 8wy).
 */

import React from "react";
import { CopilotDrawer, type CopilotDrawerProps } from "./CopilotDrawer";
import { useCopilot } from "./useCopilot";
import type { CopilotDrawerTab } from "./drawer/drawerTypes";

export interface CopilotWorkspaceHostProps {
  isOpen: boolean;
  onClose: () => void;
  activeTooth?: number | null;
  patientId?: string | null;
  patientName?: string | null;
  initialTab?: "dialog" | "actions" | "chat" | "pending";
}

export const CopilotWorkspaceHost: React.FC<CopilotWorkspaceHostProps> = ({
  isOpen,
  onClose,
  initialTab = "dialog",
}) => {
  const copilot = useCopilot();

  const mappedTab: CopilotDrawerTab =
    initialTab === "actions" || initialTab === "pending" ? "pending" : "chat";

  if (!isOpen) return null;

  return (
    <CopilotDrawer
      isOpen={isOpen}
      messages={copilot.messages}
      busy={copilot.busy}
      phase={copilot.phase}
      pending={copilot.pending}
      nameCache={copilot.nameCache}
      nudges={copilot.nudges}
      proactiveAlerts={copilot.proactiveAlerts}
      whatsappHitLCards={copilot.whatsappHitLCards}
      activeTab={mappedTab}
      onTabChange={copilot.setActiveTab}
      onClose={onClose}
      onSend={copilot.send}
      onConfirm={copilot.confirm}
      onReset={copilot.reset}
      onDismissNudge={copilot.dismissNudge}
      onDismissProactiveAlert={copilot.dismissProactiveAlert}
      onApproveWhatsApp={copilot.approveWhatsAppCard}
      onRejectWhatsApp={copilot.rejectWhatsAppCard}
    />
  );
};

export default CopilotWorkspaceHost;
export { CopilotDrawer };
export type { CopilotDrawerProps };
