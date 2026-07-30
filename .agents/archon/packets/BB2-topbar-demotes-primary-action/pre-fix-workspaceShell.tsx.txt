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
  Package,
  PackageSearch,
  Plus,
  ReceiptText,
  ScanLine,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
  Lock,
  ChevronsLeft} from "lucide-react";
import { WorkspaceActionsMount } from "./components/workspaceActions/WorkspaceActions";
import { RecentPatientHistoryWidget } from "./components/workspace/RecentPatientHistoryWidget";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { type ClinicMode, describeHiddenCapabilities, hasCapability, resolveClinicMode, staffRoleChoices } from "./lib/clinicCapabilities";
import { useWorkspaceProfile } from "./hooks/useWorkspaceProfile";
import { useThemeStore, type ThemeMode } from "./store/themeStore";
import { clinicModeLabels } from "./workspaceUiLabels";


/*
 * РЕЕСТР РАЗДЕЛОВ — ЕДИНСТВЕННЫЙ СПИСОК, ДЕЛАЮЩИЙ РАЗДЕЛ ДОСТИЖИМЫМ.
 *
 * Раздела нет, пока его нет здесь: AppHelpers.viewFromHash() сверяет первый
 * сегмент хеша именно с этим массивом и на незнакомом значении молча откатывает
 * на «Смену».
 *
 * Отсюда следует обратное правило, и оно стоило трёх готовых разделов. Склад
 * (1487 строк), журнал стерилизации и воронка обращений были дописаны целиком,
 * вместе с рабочими маршрутами сервера, — но в реестре их не было, в цепочке
 * отрисовки App.tsx тоже. Единственным файлом, который их упоминал, был
 * AppRouter.tsx, помеченный в собственной шапке как мёртвый и не импортированный
 * никем; он удалён. Открыть эти разделы не мог никто: ни по меню, ни по адресу.
 *
 * Связка «реестр → ветка в App.tsx → workspacePreload.ts» закрыта тестом
 * tests/panelsAreMounted.test.ts: запись здесь без ветки отрисовки валит сборку.
 */
export const appViews = ["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "analytics", "communications", "inventory", "scanner", "leads", "settings", "marketing"] as const;
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
  inventory: "Склад",
  scanner: "Стерилизация",
  leads: "Обращения",
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
  inventory: "материалы, остатки и сроки",
  scanner: "лотки и журнал автоклава",
  leads: "звонки и заявки до записи",
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
  inventory: Package,
  scanner: ScanLine,
  leads: UserPlus,
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
  inventory: PackageSearch,
  scanner: ScanLine,
  leads: UserPlus,
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

/**
 * ПРАВО ОТКРЫТЬ раздел. Именно это, а не видимость в меню: результат работает
 * охранником маршрута в useAppLogic (`if (!allowedViews.includes(currentView))`
 * — принудительный возврат на «Смену»). Поэтому режим клиники здесь сознательно
 * НЕ участвует: спрятать раздел в меню и запретить его открыть — разные вещи, а
 * запрет означал бы, что раздела больше нет.
 */
export function getFilteredAppViews(role: StaffRole): AppView[] {
  /*
   * Кому какие из трёх новых разделов открыты — по тому, кто этим занят в
   * кабинете, а не «всем на всякий случай»:
   *   склад — врач видит остаток и срок годности материала, которым лечит;
   *     ассистент ведёт приход и списание; администратор закупает;
   *   стерилизация — лотки готовит ассистент, он же ведёт журнал автоклава;
   *     врач связывает лоток с приёмом, поэтому раздел открыт и ему;
   *   обращения — звонки и заявки до записи ведёт администратор и управляющий.
   * Это не только меню: список работает охранником маршрута (см. шапку), и
   * забытый здесь раздел выбросит открывшего его на «Смену».
   */
  if (role === "doctor") {
    return ["shift", "schedule", "patients", "imaging", "visit", "documents", "analytics", "communications", "inventory", "scanner"];
  }
  if (role === "assistant") {
    return ["shift", "schedule", "patients", "imaging", "documents", "communications", "inventory", "scanner"];
  }
  if (role === "administrator") {
    return ["schedule", "patients", "documents", "finance", "analytics", "communications", "inventory", "leads", "settings"];
  }
  if (role === "manager") {
    return ["schedule", "patients", "finance", "analytics", "communications", "leads", "settings"];
  }
  if (role === "owner") {
    return Array.from(appViews);
  }
  return Array.from(appViews);
}

/**
 * ЧТО ПОКАЗАТЬ В МЕНЮ. Право роли, пересечённое с тем, что осмысленно при этом
 * размере клиники.
 *
 * Отдельный врач получал ту же рельсу из одиннадцати разделов, что и сеть
 * филиалов: режим клиники до этой правки не влиял на меню вообще — оно
 * фильтровалось только по роли. «Маркетинг/SEO» отсюда уходит по той же причине,
 * по которой у отдельного врача уже скрыты рассылки по базе: продвижением
 * занимается тот, у кого есть кому его поручить.
 *
 * Разделы лечения не трогаются: снимки, приём, документы, оплаты нужны врачу
 * ровно так же, как клинике. Прячется организационная обвязка, не клиника.
 *
 * Раздел остаётся доступным по адресу (#marketing) и возвращается в меню при
 * смене режима в настройках: это скрытие, а не удаление.
 */
/**
 * Какие разделы убирает выключенный модуль.
 *
 * ЗАЧЕМ. Признаки модулей до этой правки не влияли на меню вообще: они
 * фильтровали только вкладки настроек. Владелец выключал «Склад», видел
 * «Сохранено» — и раздел оставался на месте. Переключатель, который ничего не
 * переключает, хуже отсутствующего.
 *
 * Сопоставление намеренно узкое: убираем только те разделы, у которых признак
 * означает ровно «этого модуля у клиники нет». Разделы лечения — смена,
 * расписание, пациенты, снимки, приём, документы — не трогаются никаким
 * признаком: это и есть клиника.
 *
 * Признак читается только если он ЯВНО false. Пока набор не загрузился с
 * сервера, отнимать разделы нельзя — по той же причине, по которой этого не
 * делает неизвестный режим клиники.
 */
export function viewsHiddenByFeatureFlags(flags: {
  hasInventoryModule?: boolean;
  hasAnalyticsModule?: boolean;
  hasPayrollModule?: boolean;
  hasMarketingModule?: boolean;
}): AppView[] {
  const hidden: AppView[] = [];
  if (flags?.hasInventoryModule === false) hidden.push("inventory");
  if (flags?.hasAnalyticsModule === false) hidden.push("analytics");
  if (flags?.hasMarketingModule === false) hidden.push("marketing");
  return hidden;
}

export function getVisibleRailViews(role: StaffRole, mode: ClinicMode | null): AppView[] {
  const allowedByRole = getFilteredAppViews(role);
  if (hasCapability(mode, "marketingSection")) return allowedByRole;
  /*
   * «Обращения» уходят вместе с «Маркетингом» и по той же причине: воронка
   * заявок до записи — это работа привлечения. У отдельного врача обращение
   * приходит звонком и в ту же минуту становится записью; наполнять канбан из
   * пяти столбцов ему нечем, а пустая доска на рельсе — это лишний раздел.
   *
   * Своей возможности воронка намеренно не получает: правило то же самое, а два
   * имени для одного правила разъезжаются при первой же правке одного из них.
   * Раздел остаётся достижимым по адресу #leads и возвращается в меню при смене
   * режима в настройках — это скрытие, а не удаление.
   */
  return allowedByRole.filter((view) => view !== "marketing" && view !== "leads");
}

/**
 * Какие разделы у этой роли убрал именно режим клиники.
 *
 * ЗАЧЕМ. Раздел, исчезнувший без объяснения, читается как поломка: человек помнит,
 * что «Обращения» были, и ищет их в свёрнутом меню, в поиске, в настройках. Чтобы
 * сказать ему словами, что именно скрыто и как вернуть, нужен точный список, а не
 * общая фраза.
 *
 * Список ВЫЧИСЛЯЕТСЯ разностью двух функций выше, а не выписывается третьим
 * перечислением. Иначе следующее правило скрытия попало бы в одну из них и не
 * попало во вторую: подпись обещала бы одно, меню показывало другое.
 */
export function getRailViewsHiddenByMode(role: StaffRole, mode: ClinicMode | null): AppView[] {
  const visible = getVisibleRailViews(role, mode);
  return getFilteredAppViews(role).filter((view) => !visible.includes(view));
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
  /*
   * Режим читается из того же ответа сервера, по которому решают рассылки
   * (CommunicationsView) и отчёты руководителю (ManagerReportsPanel), — второго
   * источника правды не заводим. Вне провайдера контекст возвращает пустой
   * объект, режим оказывается null, и меню показывается целиком: пока режим не
   * известен, отнимать разделы нельзя.
   */
  const clinicMode = resolveClinicMode(useAppLogicContext()?.dashboard?.clinicSettings?.profile?.mode);
  /*
   * ВЫКЛЮЧЕННЫЙ МОДУЛЬ УБИРАЕТ РАЗДЕЛ ИЗ МЕНЮ.
   *
   * Раньше меню фильтровалось только по роли и размеру клиники, а признаки
   * модулей на него не влияли вообще. Владелец выключал «Склад» на вкладке
   * «Модули», видел «Сохранено» — и «Склад» оставался в меню. То есть
   * переключатели модулей ничего не переключали, а вся модульность держалась на
   * фильтрах вкладок настроек.
   *
   * Признаки берутся из того же хранилища, что и вкладки настроек
   * (useWorkspaceProfile) — второго источника правды не заводим. С сервера они
   * приходить начали только с миграции 0139: до неё GET отдавал константу со
   * всеми модулями включёнными, а POST не сохранял ничего.
   *
   * Скрытие, а не удаление: раздел остаётся достижимым по адресу и возвращается в
   * меню, как только модуль включат обратно.
   */
  const featureFlags = useWorkspaceProfile();
  const hiddenByModules = viewsHiddenByFeatureFlags(featureFlags);
  const allowedViews = getVisibleRailViews(role, clinicMode).filter(
    (view) => !hiddenByModules.includes(view),
  );

  /*
   * ПОЧЕМУ РАЗДЕЛОВ МЕНЬШЕ, ЧЕМ БЫЛО.
   *
   * Режим убирает разделы молча, и это отдельный дефект: подпись про скрытое
   * (`describeHiddenCapabilities`) в проекте была, но её не вызывал никто —
   * функция, весь смысл которой объяснить пропажу, лежала мёртвой. Человек видел
   * меню на два пункта короче и не имел ни слова о причине, ни пути назад.
   *
   * Строка появляется только когда режим действительно что-то убрал у ЭТОЙ роли:
   * у врача «Маркетинга» и «Обращений» нет и при режиме сети, значит и объяснять
   * ему нечего. У свёрнутого меню ширины под текст нет — там строки тоже нет,
   * подпись вернётся при разворачивании.
   *
   * Скрытое перечисляется по названиям разделов, которые человек только что
   * потерял из вида. Остальное, что упрощает режим (рассылки по базе, разрез
   * отчётов по врачам, занятость кресел), лежит внутри других разделов и в
   * рельсе не видно — оно уходит в подсказку и в текст для программы чтения с
   * экрана, чтобы короткая строка не превратилась в абзац.
   */
  const hiddenByMode = getRailViewsHiddenByMode(role, clinicMode);
  const modeTitle = clinicMode ? clinicModeLabels[clinicMode].title : null;
  const hiddenSectionNames = hiddenByMode.map((view) => viewLabels[view]).join(", ");
  const hiddenCapabilityNames = describeHiddenCapabilities(clinicMode).join(", ");
  const modeExplanation =
    modeTitle && hiddenByMode.length > 0
      ? `Режим «${modeTitle}» не показывает разделы: ${hiddenSectionNames}.${
          hiddenCapabilityNames ? ` Также упрощены: ${hiddenCapabilityNames}.` : ""
        } Разделы не удалены — они вернутся, если сменить режим в настройках клиники.`
      : null;

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
      {/*
        Утилиты назначены только тем свойствам, которых у <p> не задаёт ни один
        селектор проекта: перенос слов и max-width уже стоят глобально
        (styles/main.css:517-528, вне слоёв — они выиграли бы у утилит), поэтому
        повторять их здесь нечем. Цвет не задаётся вовсе: он наследуется, и
        строка работает во всех трёх темах без единого статичного значения.
        На узком экране рельса сужается до 76px (dente-redesign.css:606) —
        прозе там места нет, строка убирается вместе с подписями разделов.
      */}
      {modeExplanation && !collapsed ? (
        <p
          className="mt-[0.75rem] text-[0.6875rem] leading-[1.4] opacity-70 max-[1140px]:hidden"
          title={modeExplanation}
        >
          Режим «{modeTitle}» — скрыты разделы: {hiddenSectionNames}.{" "}
          <span className="sr-only">
            {hiddenCapabilityNames ? `Также упрощены: ${hiddenCapabilityNames}. ` : ""}
            Разделы не удалены, они вернутся при смене режима.
          </span>
          <a href="#settings" onPointerEnter={() => onViewIntent?.("settings")} onFocus={() => onViewIntent?.("settings")}>
            Изменить режим
          </a>
        </p>
      ) : null}
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

  /*
   * Порядок ролей приходит из AppHelpers (roleFocusOrder) и содержит все пять.
   * У отдельного врача ассистента, администратора и управляющего нет: три из
   * пяти кнопок предлагали переключиться на сотрудника, которого не существует.
   * Какие роли при режиме есть — решает таблица в lib/clinicCapabilities.ts.
   *
   * Берётся staffRoleChoices, а не visibleStaffRoles: роль хранится отдельно от
   * режима и выбирается в мастере настройки, поэтому «Управляющий», выбранный до
   * перехода на режим отдельного врача, оставался в заголовке рядом со списком,
   * где его нет, и ни одна кнопка не была подсвечена. Текущая роль остаётся в
   * списке всегда — иначе человек не видит, где он находится.
   */
  const clinicMode = resolveClinicMode(useAppLogicContext()?.dashboard?.clinicSettings?.profile?.mode);
  const availableRoles = staffRoleChoices(roleFocusOrder, clinicMode, selectedWorkspaceRole);

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
            {availableRoles.map((role) => (
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
        {/*
          ГРУППА ДЕЙСТВИЙ ПОМОЩНИКА (поиск, голос, справка) — ОДИН элемент, а не
          три новых соседа. Эти три кнопки раньше плавали в правом нижнем углу
          поверх страницы и накрывали её элементы: механизм «уступи кнопке под
          собой» был арифметически неисполним (обоснование и замеры —
          `components/workspaceActions/workspaceActionsPlacement.ts`), поэтому он
          удалён, а действия переехали в существующую фурнитуру.

          Место выбрано ПЕРВЫМ в строке намеренно. У топбара уже была
          зафиксированная беда: шесть несгруппированных кнопок без иерархии.
          Группа приходит сюда как одна сегментированная единица с общей рамкой
          и встаёт ДО кнопок клиники, поэтому инструменты помощника читаются
          отдельным блоком, а главное действие «Запись» остаётся последним и
          самым правым.

          Это ЕДИНСТВЕННАЯ точка монтажа группы на весь проект. На узком экране
          она сама вставляет свой контейнер в живую нижнюю навигацию и рисует в
          него портал, а этот якорь остаётся пустым и скрывается через `:empty`.
          Так `App.tsx` не нужно править ради второй точки монтажа.
        */}
        <WorkspaceActionsMount />

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
