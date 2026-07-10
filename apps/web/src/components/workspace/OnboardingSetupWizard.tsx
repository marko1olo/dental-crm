/**
 * OnboardingSetupWizard
 * Full-screen Glassmorphic onboarding with preset cards, interactive
 * feature comparison table, slide-down custom config, and animated handoff
 * to the main dashboard.
 *
 * Triggered when organization.onboardingCompleted === false
 */
import { useState, useCallback } from "react";
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  Wrench,
  Building2,
  Baby,
  BrainCircuit,
  Scissors,
  Layers,
  HeartHandshake,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import {
  applyWorkspacePreset,
  saveWorkspaceFlags,
  useWorkspaceProfileStore,
  type WorkspaceFeatureFlags,
} from "../../hooks/useWorkspaceProfile";

// ──────────────────────────────────────────────────────────────────────────────
// Preset catalogue
// ──────────────────────────────────────────────────────────────────────────────
interface PresetCard {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;       // HSL color
  description: string;
  flags: Partial<WorkspaceFeatureFlags>;
  seedNote: string;     // what gets auto-seeded
}

const PRESET_CARDS: PresetCard[] = [
  {
    id: "solo_therapist",
    label: "Частный терапевт",
    subtitle: "1 кресло · без ассистента",
    icon: <User size={28} />,
    accent: "hsl(210 80% 60%)",
    description: "Ультра-минималистичный блокнот. Одна колонка расписания, мгновенная подпись карты в один клик — без черновиков и лабораторных вкладок.",
    flags: { hasAssistants: false, hasMultipleChairs: false, hasDentalLab: false, hasInsuranceCoPay: false, hasInstallments: true },
    seedNote: "3 пациента с кариесом и пломбами (МКБ-10), терапевтический прайс",
  },
  {
    id: "prosthodontist",
    label: "Ортопедический кабинет",
    subtitle: "Коронки · мосты · виниры",
    icon: <Wrench size={28} />,
    accent: "hsl(262 80% 65%)",
    description: "Максимальный фокус на зуботехнические заказы. Гостевой портал лаборатории, рассрочки, статусы доставки коронок в расписании в реальном времени.",
    flags: { hasAssistants: true, hasMultipleChairs: false, hasDentalLab: true, hasInsuranceCoPay: false, hasInstallments: true },
    seedNote: "2 пациента с протезированием, заказы в лабораторию со статусами",
  },
  {
    id: "pediatric",
    label: "Детская стоматология",
    subtitle: "Педиатрия · ДМС",
    icon: <Baby size={28} />,
    accent: "hsl(340 75% 62%)",
    description: "ДМС-расщепление для страховых полисов детей. Без лаборатории. Ассистент и несколько кресел для очереди юных пациентов.",
    flags: { hasAssistants: true, hasMultipleChairs: true, hasDentalLab: false, hasInsuranceCoPay: true, hasInstallments: false },
    seedNote: "Педиатрические шаблоны визитов, страховой прайс",
  },
  {
    id: "orthodontic",
    label: "Ортодонтический кабинет",
    subtitle: "Брекеты · элайнеры",
    icon: <BrainCircuit size={28} />,
    accent: "hsl(160 70% 50%)",
    description: "Заказ ретейнеров и элайнеров в лаборатории. Рассрочка на долгий курс лечения. ДМС для корпоративных клиентов.",
    flags: { hasAssistants: true, hasMultipleChairs: false, hasDentalLab: true, hasInsuranceCoPay: true, hasInstallments: true },
    seedNote: "Ортодонтические шаблоны, заказы ретейнеров",
  },
  {
    id: "surgery_center",
    label: "Хирургический центр",
    subtitle: "Удаления · операции",
    icon: <Scissors size={28} />,
    accent: "hsl(0 72% 58%)",
    description: "Несколько операционных кресел, ассистенты, ДМС. Лаборатория не нужна — фокус на хирургических манипуляциях.",
    flags: { hasAssistants: true, hasMultipleChairs: true, hasDentalLab: false, hasInsuranceCoPay: true, hasInstallments: true },
    seedNote: "Хирургические шаблоны визитов, страховой прайс",
  },
  {
    id: "implant_center",
    label: "Имплантационный центр",
    subtitle: "All-on-4 · одиночные · синус-лифт",
    icon: <Layers size={28} />,
    accent: "hsl(40 85% 55%)",
    description: "Полный Enterprise-стек. Лаборатория для абатментов и коронок, рассрочки на крупные суммы, ДМС, несколько кресел.",
    flags: { hasAssistants: true, hasMultipleChairs: true, hasDentalLab: true, hasInsuranceCoPay: true, hasInstallments: true },
    seedNote: "Имплантологические шаблоны, ортопедические заказы",
  },
  {
    id: "family_clinic",
    label: "Семейная клиника",
    subtitle: "Все возрасты · все специальности",
    icon: <HeartHandshake size={28} />,
    accent: "hsl(310 70% 60%)",
    description: "Полный спектр: терапия, ортопедия, ортодонтия, детский приём. Все модули включены. Идеально для клиники 3–10 врачей.",
    flags: { hasAssistants: true, hasMultipleChairs: true, hasDentalLab: true, hasInsuranceCoPay: true, hasInstallments: true },
    seedNote: "Демо-пациенты по всем специализациям",
  },
  {
    id: "enterprise",
    label: "Сеть клиник",
    subtitle: "Мультифилиальность · BI-аналитика",
    icon: <Building2 size={28} />,
    accent: "hsl(225 70% 60%)",
    description: "Максимальный Enterprise-набор. Все модули, BI-аналитика по сети, полная мультитенантность, ЕГИСЗ, детализированные отчёты.",
    flags: { hasAssistants: true, hasMultipleChairs: true, hasDentalLab: true, hasInsuranceCoPay: true, hasInstallments: true },
    seedNote: "Полный Enterprise-набор демо-данных",
  },
  {
    id: "custom",
    label: "Своя конфигурация",
    subtitle: "Выбери сам",
    icon: <SlidersHorizontal size={28} />,
    accent: "hsl(0 0% 60%)",
    description: "Собери идеальный рабочий кабинет вручную — включи только то, что действительно нужно именно тебе.",
    flags: {},
    seedNote: "",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Feature comparison table row
// ──────────────────────────────────────────────────────────────────────────────
const FLAG_ROWS: { key: keyof WorkspaceFeatureFlags; label: string }[] = [
  { key: "hasMultipleChairs", label: "Несколько кресел" },
  { key: "hasAssistants", label: "Ассистенты / черновики" },
  { key: "hasDentalLab", label: "Зуботехническая лаборатория" },
  { key: "hasInsuranceCoPay", label: "ДМС / страховое со-платёж" },
  { key: "hasInstallments", label: "Рассрочка платежей" },
];

// ──────────────────────────────────────────────────────────────────────────────
// Custom toggle switches for manual setup
// ──────────────────────────────────────────────────────────────────────────────
function InlineToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          background: checked ? "hsl(160 70% 50%)" : "rgba(255,255,255,.12)",
          border: "1.5px solid rgba(255,255,255,.15)",
          position: "relative",
          transition: "background .25s",
          flexShrink: 0,
          cursor: "pointer",
          boxShadow: checked ? "0 0 8px 1px hsl(160 70% 50% / 0.4)" : "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,.3)",
            transition: "left .22s cubic-bezier(.4,0,.2,1)",
            left: checked ? 20 : 2,
          }}
        />
      </div>
      <span style={{ fontSize: 14, opacity: 0.85 }}>{label}</span>
    </label>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
interface OnboardingSetupWizardProps {
  onComplete: () => void;
  isDark?: boolean;
}

export function OnboardingSetupWizard({ onComplete, isDark = true }: OnboardingSetupWizardProps) {
  const store = useWorkspaceProfileStore();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [customFlags, setCustomFlags] = useState<Partial<WorkspaceFeatureFlags>>({
    hasAssistants: true,
    hasMultipleChairs: true,
    hasDentalLab: true,
    hasInsuranceCoPay: true,
    hasInstallments: true,
  });
  const [customExpanded, setCustomExpanded] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [numberOfChairs, setNumberOfChairs] = useState<number>(4);
  const [pediatricMode, setPediatricMode] = useState<boolean>(false);

  const previewPreset = hoveredPreset ?? selectedPreset;
  const previewCard = PRESET_CARDS.find((p) => p.id === previewPreset);

  const handleSelectPreset = useCallback(
    (id: string) => {
      setSelectedPreset(id);
      if (id === "custom") {
        setCustomExpanded(true);
      } else {
        setCustomExpanded(false);
      }
    },
    []
  );

  const handleLaunch = useCallback(async () => {
    if (!selectedPreset) return;
    setLaunching(true);
    try {
      if (selectedPreset === "custom") {
        await saveWorkspaceFlags({ ...customFlags, workspacePreset: "custom", hasPediatricMode: pediatricMode });
        store.hydrate({
          ...(customFlags as WorkspaceFeatureFlags),
          workspacePreset: "custom",
          hasPediatricMode: pediatricMode,
          onboardingCompleted: true,
        });
      } else {
        const extraData: { numberOfChairs?: number; hasPediatricMode?: boolean } = { hasPediatricMode: pediatricMode };
        if (selectedPreset === "enterprise") extraData.numberOfChairs = numberOfChairs;
        await applyWorkspacePreset(selectedPreset, extraData);
      }
      // Mark onboarding as done server-side
      await fetch("/api/workspace/onboarding/complete", { method: "POST" });
    } catch (e) {
      console.error("[Onboarding] launch error:", e);
    }

    // Fade out animation then call onComplete
    setFadeOut(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  }, [selectedPreset, customFlags, onComplete, store]);

  const bg = isDark
    ? "radial-gradient(ellipse at 30% 20%, hsl(240 30% 15%), hsl(230 25% 8%) 70%)"
    : "radial-gradient(ellipse at 30% 20%, hsl(210 60% 95%), hsl(220 40% 88%) 70%)";

  const cardBg = isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)";
  const textColor = isDark ? "#e8eaf0" : "#1a1d2e";
  const mutedColor = isDark ? "rgba(255,255,255,.45)" : "rgba(0,0,0,.45)";
  const borderBase = isDark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)";

  return (
    <div
      id="onboarding-setup-wizard"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: bg,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 16px 80px",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity .45s ease",
        color: textColor,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40, maxWidth: 600 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 18px",
            borderRadius: 20,
            background: "rgba(160 130 255 / .12)",
            border: "1px solid rgba(160 130 255 / .3)",
            marginBottom: 20,
            fontSize: 13,
            color: "hsl(262 80% 75%)",
          }}
        >
          <Sparkles size={14} />
          Добро пожаловать в DENTE
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(24px,4vw,38px)", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Настройте рабочее пространство
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: mutedColor, lineHeight: 1.6 }}>
          Выберите профиль клиники — интерфейс автоматически подстроится под ваши задачи.<br />
          Изменить можно в любой момент в Настройках.
        </p>
      </div>

      {/* Preset grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 1100,
          marginBottom: 32,
        }}
      >
        {PRESET_CARDS.map((card) => {
          const isSelected = selectedPreset === card.id;
          return (
            <div
              key={card.id}
              id={`preset-card-${card.id}`}
              onMouseEnter={() => setHoveredPreset(card.id)}
              onMouseLeave={() => setHoveredPreset(null)}
              onClick={() => handleSelectPreset(card.id)}
              style={{
                background: cardBg,
                backdropFilter: "blur(16px)",
                borderRadius: 18,
                border: `2px solid ${isSelected ? card.accent : borderBase}`,
                padding: "22px 20px",
                cursor: "pointer",
                transition: "border-color .25s, transform .2s, box-shadow .25s",
                transform: isSelected ? "translateY(-3px)" : "none",
                boxShadow: isSelected ? `0 8px 30px ${card.accent}33` : "none",
                position: "relative",
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: card.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={13} color="#fff" strokeWidth={3} />
                </div>
              )}

              {/* Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: `${card.accent}20`,
                  color: card.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                {card.icon}
              </div>

              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{card.label}</div>
              <div style={{ fontSize: 12, color: card.accent, marginBottom: 10, fontWeight: 500 }}>
                {card.subtitle}
              </div>
              <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.55 }}>{card.description}</div>

              {/* Seed note */}
              {card.seedNote && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: isDark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)",
                    fontSize: 11,
                    color: mutedColor,
                    borderLeft: `3px solid ${card.accent}`,
                  }}
                >
                  📦 {card.seedNote}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom slide-down config */}
      {selectedPreset === "custom" && (
        <div
          style={{
            width: "100%",
            maxWidth: 600,
            marginBottom: 24,
            background: cardBg,
            backdropFilter: "blur(16px)",
            borderRadius: 18,
            border: `1.5px solid ${borderBase}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              borderBottom: customExpanded ? `1px solid ${borderBase}` : "none",
            }}
            onClick={() => setCustomExpanded((v) => !v)}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>Ручная настройка модулей</span>
            {customExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {customExpanded && (
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
              {FLAG_ROWS.map((row) => (
                <InlineToggle
                  key={row.key}
                  label={row.label}
                  checked={(customFlags[row.key] as boolean) ?? true}
                  onChange={(v) => setCustomFlags((f) => ({ ...f, [row.key]: v }))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feature comparison panel for hovered/selected preset */}
      {previewCard && previewCard.id !== "custom" && (
        <div
          style={{
            width: "100%",
            maxWidth: 600,
            marginBottom: 24,
            background: cardBg,
            backdropFilter: "blur(16px)",
            borderRadius: 18,
            border: `1.5px solid ${borderBase}`,
            padding: "20px 24px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, opacity: 0.7 }}>
            Что изменится в интерфейсе:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {FLAG_ROWS.map((row) => {
              const on = (previewCard.flags as Record<string, boolean>)[row.key] !== false;
              return (
                <div
                  key={row.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    color: on ? textColor : mutedColor,
                  }}
                >
                  {on ? (
                    <Check size={16} style={{ color: "hsl(145 70% 55%)", flexShrink: 0 }} strokeWidth={2.5} />
                  ) : (
                    <X size={16} style={{ color: "hsl(0 70% 55%)", flexShrink: 0 }} strokeWidth={2.5} />
                  )}
                  {row.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedPreset && (
        <div style={{ width: "100%", maxWidth: 600, marginBottom: 24, padding: "20px", background: cardBg, borderRadius: 18, border: `1.5px solid ${borderBase}` }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Дополнительные настройки</div>
          {selectedPreset === "enterprise" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 14 }}>Количество кресел (2-8)</span>
              <input 
                type="number" 
                min={2} max={8} 
                value={numberOfChairs}
                onChange={(e) => setNumberOfChairs(parseInt(e.target.value) || 2)}
                style={{
                  width: 60, padding: "6px 10px", borderRadius: 8, border: `1px solid ${borderBase}`,
                  background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: textColor
                }}
              />
            </div>
          )}
          <InlineToggle
            label="Детская стоматология (Pediatric Mode)"
            checked={pediatricMode}
            onChange={setPediatricMode}
          />
        </div>
      )}

      {/* Launch button */}
      {selectedPreset && (
        <button
          id="onboarding-launch-button"
          onClick={handleLaunch}
          disabled={launching}
          style={{
            padding: "16px 56px",
            borderRadius: 16,
            border: "none",
            background:
              PRESET_CARDS.find((p) => p.id === selectedPreset)?.accent || "hsl(262 80% 65%)",
            color: "#fff",
            fontSize: 17,
            fontWeight: 700,
            cursor: launching ? "not-allowed" : "pointer",
            opacity: launching ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 8px 30px rgba(0,0,0,.35)",
            transition: "opacity .2s, transform .2s",
          }}
        >
          {launching ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          {launching ? "Настраиваем систему..." : "Запустить DENTE"}
        </button>
      )}

      {!selectedPreset && (
        <p style={{ fontSize: 14, color: mutedColor }}>← Выберите профиль клиники выше</p>
      )}
    </div>
  );
}
