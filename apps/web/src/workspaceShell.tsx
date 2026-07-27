import type { StaffRole } from "@dental/shared";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Mic,
  Plus,
  ReceiptText,
  Stethoscope,
  TrendingUp,
  Users,
  Lock,
  ChevronsLeft} from "lucide-react";
import { RecentPatientHistoryWidget } from "./components/workspace/RecentPatientHistoryWidget";
import { useThemeStore, type ThemeMode } from "./store/themeStore";


export const appViews = ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "analytics", "communications", "settings", "marketing"] as const;
export type AppView = (typeof appViews)[number];

export const viewLabels: Record<AppView, string> = {
  shift: "Смена",
  schedule: "Записи",
  patients: "Пациенты",
  imaging: "Снимки",
  visit: "Прием",
  documents: "Документы",
  finance: "Оплаты",
  analytics: "Аналитика",
  communications: "Связь",
  settings: "Настройки",
  marketing: "Маркетинг/SEO"
};

export const viewHints: Record<AppView, string> = {
  shift: "что делать сейчас",
  schedule: "очередь, врачи и кресла",
  patients: "карточки и контакты",
  imaging: "рентген, КЛКТ и КТ",
  visit: "прием и диктовка",
  documents: "договоры и справки",
  finance: "оплаты и долги",
  analytics: "отчеты и воронки",
  communications: "сообщения и задачи",
  settings: "клиника, импорт и доступы",
  marketing: "продвижение и отзывы"
};

type WorkspaceViewIntentHandler = (view: AppView) => void;

/*
 * Раньше это были две цепочки if с общим `return <Sparkles/>` в конце. У «Смены»
 * и «Маркетинга» своей ветки не было вовсе, у «Аналитики» стояла та же искорка —
 * и в боковом меню на позициях 1, 8 и 11 подряд оказывались три одинаковых
 * значка. Подписей рядом нет, значит различить разделы нечем: администратор
 * запоминает не раздел, а номер позиции сверху.
 *
 * Теперь это исчерпывающие Record<AppView, LucideIcon>: ветку нельзя забыть —
 * без неё не собирается проект, а уникальность значков закрыта тестом
 * __tests__/workspaceShellNav.test.ts, чтобы три искорки не вернулись.
 */
export const sidebarIcons: Record<AppView, LucideIcon> = {
  shift: LayoutDashboard,
  schedule: CalendarDays,
  patients: Users,
  imaging: ImageIcon,
  visit: ClipboardList,
  documents: FileText,
  finance: CreditCard,
  analytics: BarChart3,
  communications: MessageSquare,
  settings: Database,
  marketing: Megaphone
};

/*
 * Второй набор — для кнопок действия. Он намеренно отличается от бокового меню:
 * там существительное («Записи» — календарь), здесь глагол («записать» — часы
 * со стрелкой). Это уже было в коде для schedule/visit/documents/finance,
 * поэтому shift/analytics/marketing дополнены в той же логике.
 */
export const actionIcons: Record<AppView, LucideIcon> = {
  shift: LayoutDashboard,
  schedule: CalendarClock,
  patients: Users,
  imaging: ImageIcon,
  visit: ClipboardCheck,
  documents: FileCheck2,
  finance: ReceiptText,
  analytics: TrendingUp,
  communications: MessageSquare,
  settings: Database,
  marketing: Megaphone
};

function SidebarIcon({ section }: { section: AppView }) {
  const Glyph = sidebarIcons[section];
  return <Glyph aria-hidden="true" />;
}

export function ActionIcon({ section }: { section: AppView }) {
  const Glyph = actionIcons[section];
  return <Glyph aria-hidden="true" />;
}

export function getFilteredAppViews(role: StaffRole): AppView[] {
  if (role === "doctor") {
    return ["shift", "schedule", "patients", "imaging", "visit", "documents", "analytics", "communications"];
  }
  if (role === "assistant") {
    return ["shift", "schedule", "patients", "imaging", "documents", "communications"];
  }
  if (role === "administrator") {
    return ["schedule", "patients", "documents", "finance", "analytics", "communications", "settings"];
  }
  if (role === "manager") {
    return ["schedule", "patients", "finance", "analytics", "communications", "settings"];
  }
  if (role === "owner") {
    return Array.from(appViews);
  }
  return Array.from(appViews);
}

export function WorkspaceSidebar({
  currentView,
  onViewIntent,
  role,
  collapsed,
  onToggleCollapsed
}: {
  currentView: AppView;
  onViewIntent?: WorkspaceViewIntentHandler;
  role: StaffRole;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const allowedViews = getFilteredAppViews(role);

  /*
   * Широкую подпись .nav-copy таблица стилей прячет в двух случаях:
   * при свернутом меню (dente-redesign.css:354, [data-collapsed="true"]) и на
   * узких экранах (dente-redesign.css:588, @media max-width 1140px). В обоих
   * рельса превращалась в столбик безымянных значков — ровно это и снято на
   * .dente-redesign-shots/desktop_light_patients.png. Свернутое состояние
   * запоминается в localStorage (App.tsx:945), то есть один случайный клик
   * оставлял администратора без подписей навсегда.
   *
   * Поэтому под значком показываем короткую подпись из того же viewLabels
   * ровно в этих двух случаях. Значок и подписи лежат в одной обертке, чтобы
   * у .nav-item был единственный ребенок: заданный в CSS зазор 11px между
   * детьми тогда не участвует в раскладке и вертикальный ритм задается здесь.
   *
   * Классы — утилиты Tailwind; они лежат в @layer utilities и по правилам
   * каскада проигрывают рукописному CSS проекта, поэтому назначаются только
   * свойствам, которых ни один селектор проекта у этих элементов не задает
   * (см. пояснение в styles/tailwind.css). Цвет наследуется от .nav-item,
   * то есть темы light/dark/night работают без единого статичного цвета.
   */
  const navSlotClass = collapsed
    ? "flex w-full min-w-0 flex-col items-center gap-[0.1875rem] text-center"
    : "flex w-full min-w-0 items-center gap-[0.6875rem] max-[1140px]:flex-col max-[1140px]:gap-[0.1875rem] max-[1140px]:text-center";
  const navCaptionClass = collapsed
    ? "block max-w-full text-[0.625rem] font-semibold leading-[1.15] break-words"
    : "hidden max-w-full text-[0.625rem] font-semibold leading-[1.15] break-words max-[1140px]:block";

  return (
    <aside className="sidebar" data-collapsed={collapsed}>
      <div className="brand-mark">
        <Stethoscope aria-hidden="true" />
        <span>DENTE</span>
      </div>
      {/*
        Имя ориентира переехало с <aside> на <nav>: программа чтения с экрана
        объявляла «Навигация» на дополнительном блоке, а сам список разделов
        оставался безымянным ориентиром. Двух подписей не заводим.
      */}
      <nav aria-label="Навигация">
        {appViews.map((view) =>
          allowedViews.includes(view) ? (
            <a
              className={`nav-item ${currentView === view ? "active" : ""}`}
              href={`#${view}`}
              key={view}
              aria-current={currentView === view ? "page" : undefined}
              aria-label={`${viewLabels[view]}: ${viewHints[view]}`}
              title={`${viewLabels[view]}: ${viewHints[view]}`}
              onPointerEnter={() => onViewIntent?.(view)}
              onFocus={() => onViewIntent?.(view)}
              onTouchStart={() => onViewIntent?.(view)}
            >
              <span className={navSlotClass}>
                <SidebarIcon section={view} />
                <span className="nav-copy">
                  <span className="nav-label">{viewLabels[view]}</span>
                  <small>{viewHints[view]}</small>
                </span>
                <span className={navCaptionClass}>{viewLabels[view]}</span>
              </span>
            </a>
          ) : null
        )}
      </nav>
      <div className="sidebar-footer">
        <ThemeSwitcher />
        <button
          className="icon-button sidebar-collapse-button"
          type="button"
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          aria-pressed={collapsed}
          onClick={onToggleCollapsed}
        >
          <ChevronsLeft aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

function ThemeSwitcher() {
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  /*
   * Подписи были «День», «Тьма», «Ночь»: чем «Тьма» отличается от «Ночи», по
   * экрану понять нельзя. Темы при этом разные по-настоящему — у dark холодная
   * серо-синяя палитра, у night тёплая коричневая (см. dente-redesign.css). Так
   * и подписываем, а подробное объяснение уходит в подсказку при наведении.
   */
  const options: Array<{ mode: ThemeMode; label: string; hint: string }> = [
    { mode: "light", label: "День", hint: "Светлая тема" },
    { mode: "dark", label: "Ночь", hint: "Тёмная тема в холодных серо-синих тонах" },
    { mode: "night", label: "Тепло", hint: "Тёмная тема в тёплых коричневых тонах — мягче для глаз вечером" }
  ];

  return (
    // В слове «интерфейса» предпоследняя буква была латинской c: подпись
    // выглядела верно, но программа чтения с экрана произносила её неправильно,
    // и поиск по тексту такую строку не находил.
    <div className="theme-switcher" aria-label="Тема интерфейса">
      {options.map((option) => (
        <button
          key={option.mode}
          type="button"
          aria-pressed={themeMode === option.mode}
          aria-label={option.hint}
          title={option.hint}
          onClick={() => setThemeMode(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

type WorkspaceTopbarProps = {
  clinicName: string;
  onGoToDictation: () => void;
  onGoToSchedule: () => void;
  onGoToVisit: () => void;
  onReopenOnboarding: () => void;
  onRoleChange: (role: StaffRole) => void;
  onViewIntent?: WorkspaceViewIntentHandler;
  roleFocusOrder: StaffRole[];
  selectedWorkspaceRole: StaffRole;
  showAdministrationTopActions: boolean;
  showDoctorVisitShortcut: boolean;
  staffRoleLabels: Record<StaffRole, string>;
  todayIso: string;
  onLockSession?: () => void;
};

export function WorkspaceTopbar({
  clinicName,
  onGoToDictation,
  onGoToSchedule,
  onGoToVisit,
  onReopenOnboarding,
  onRoleChange,
  onViewIntent,
  roleFocusOrder,
  selectedWorkspaceRole,
  showAdministrationTopActions,
  showDoctorVisitShortcut,
  staffRoleLabels,
  todayIso,
  onLockSession
}: WorkspaceTopbarProps) {
  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long"
  }).format(new Date(`${todayIso}T12:00:00`));

  return (
    <header className="topbar">
      <div className="topbar-context">
        <div className="topbar-clinic">
          <p className="eyebrow">{formattedDate.replace(" г.", "").replace(",", " ·")}</p>
          <h1>{clinicName}</h1>
        </div>
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
                aria-pressed={selectedWorkspaceRole === role}
                aria-label={`Рабочий режим: ${staffRoleLabels[role]}`}
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
        <RecentPatientHistoryWidget compactDropdown />
      </div>
      <div className="top-actions">

        {showAdministrationTopActions ? (
          <a
            className="icon-button"
            href="#settings"
            title="Настройки импорта и экспорта"
            aria-label="Настройки импорта и экспорта"
            onPointerEnter={() => onViewIntent?.("settings")}
            onFocus={() => onViewIntent?.("settings")}
            onTouchStart={() => onViewIntent?.("settings")}
          >
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
        {onLockSession ? (
          <button
            aria-label="Заблокировать сессию"
            className="icon-button top-lock-button"
            type="button"
            title="Заблокировать сессию"
            onClick={onLockSession}
          >
            <Lock aria-hidden="true" size={20} />
          </button>
        ) : null}
        <button
          className="primary-button"
          type="button"
          onPointerEnter={() => onViewIntent?.("schedule")}
          onFocus={() => onViewIntent?.("schedule")}
          onTouchStart={() => onViewIntent?.("schedule")}
          onClick={onGoToSchedule}
        >
          <Plus aria-hidden="true" /> Запись
        </button>
      </div>
    </header>
  );
}
