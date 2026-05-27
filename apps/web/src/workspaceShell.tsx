import type { StaffRole } from "@dental/shared";
import {
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  Plus,
  ReceiptText,
  Sparkles,
  Stethoscope,
  Users
} from "lucide-react";

export const appViews = ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "communications", "settings"] as const;
export type AppView = (typeof appViews)[number];

export const viewLabels: Record<AppView, string> = {
  shift: "Смена",
  schedule: "Записи",
  patients: "Пациенты",
  imaging: "Снимки",
  visit: "Прием",
  documents: "Документы",
  finance: "Оплаты",
  communications: "Связь",
  settings: "Настройки"
};

function SidebarIcon({ section }: { section: AppView }) {
  if (section === "schedule") return <CalendarDays aria-hidden="true" />;
  if (section === "patients") return <Users aria-hidden="true" />;
  if (section === "imaging") return <ImageIcon aria-hidden="true" />;
  if (section === "visit") return <ClipboardList aria-hidden="true" />;
  if (section === "documents") return <FileText aria-hidden="true" />;
  if (section === "finance") return <CreditCard aria-hidden="true" />;
  if (section === "communications") return <MessageSquare aria-hidden="true" />;
  if (section === "settings") return <Database aria-hidden="true" />;
  return <Sparkles aria-hidden="true" />;
}

export function ActionIcon({ section }: { section: AppView }) {
  if (section === "schedule") return <CalendarClock aria-hidden="true" />;
  if (section === "patients") return <Users aria-hidden="true" />;
  if (section === "imaging") return <ImageIcon aria-hidden="true" />;
  if (section === "visit") return <ClipboardCheck aria-hidden="true" />;
  if (section === "documents") return <FileCheck2 aria-hidden="true" />;
  if (section === "finance") return <ReceiptText aria-hidden="true" />;
  if (section === "communications") return <MessageSquare aria-hidden="true" />;
  if (section === "settings") return <Database aria-hidden="true" />;
  return <Sparkles aria-hidden="true" />;
}

export function WorkspaceSidebar({ currentView }: { currentView: AppView }) {
  return (
    <aside className="sidebar" aria-label="Навигация">
      <div className="brand-mark">
        <Stethoscope aria-hidden="true" />
        <span>DENTE</span>
      </div>
      <nav>
        {appViews.map((view) => (
          <a className={`nav-item ${currentView === view ? "active" : ""}`} href={`#${view}`} key={view}>
            <SidebarIcon section={view} /> <span className="nav-label">{viewLabels[view]}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

type WorkspaceTopbarProps = {
  clinicName: string;
  onGoToDictation: () => void;
  onGoToSchedule: () => void;
  onGoToVisit: () => void;
  onReopenOnboarding: () => void;
  onRoleChange: (role: StaffRole) => void;
  roleFocusOrder: StaffRole[];
  selectedWorkspaceRole: StaffRole;
  showAdministrationTopActions: boolean;
  showDoctorVisitShortcut: boolean;
  staffRoleLabels: Record<StaffRole, string>;
  todayIso: string;
};

export function WorkspaceTopbar({
  clinicName,
  onGoToDictation,
  onGoToSchedule,
  onGoToVisit,
  onReopenOnboarding,
  onRoleChange,
  roleFocusOrder,
  selectedWorkspaceRole,
  showAdministrationTopActions,
  showDoctorVisitShortcut,
  staffRoleLabels,
  todayIso
}: WorkspaceTopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{todayIso}</p>
        <h1>{clinicName}</h1>
        <details className="workspace-role-switcher" aria-label="Рабочий режим">
          <summary>
            <span>Роль</span>
            <strong>{staffRoleLabels[selectedWorkspaceRole]}</strong>
          </summary>
          <div className="role-switcher-options">
            {roleFocusOrder.map((role) => (
              <button
                className={selectedWorkspaceRole === role ? "active" : ""}
                key={role}
                type="button"
                onClick={(event) => {
                  onRoleChange(role);
                  event.currentTarget.closest("details")?.removeAttribute("open");
                }}
              >
                {staffRoleLabels[role]}
              </button>
            ))}
          </div>
        </details>
      </div>
      <div className="top-actions">
        {showAdministrationTopActions ? (
          <a className="icon-button" href="#settings" title="Настройки импорта и экспорта">
            <Database aria-hidden="true" />
          </a>
        ) : null}
        {showAdministrationTopActions ? (
          <button className="secondary-button compact-top-button" type="button" onClick={onReopenOnboarding}>
            <ClipboardCheck aria-hidden="true" /> Настроить
          </button>
        ) : null}
        {showDoctorVisitShortcut ? (
          <button className="secondary-button daily-top-button" type="button" onClick={onGoToVisit}>
            <ClipboardCheck aria-hidden="true" /> Прием
          </button>
        ) : null}
        <button
          aria-label="Открыть диктовку приема"
          className="icon-button top-dictation-button"
          type="button"
          title="Голосовая заметка"
          onClick={onGoToDictation}
        >
          <Mic aria-hidden="true" />
        </button>
        <button className="primary-button" type="button" onClick={onGoToSchedule}>
          <Plus aria-hidden="true" /> Запись
        </button>
      </div>
    </header>
  );
}
