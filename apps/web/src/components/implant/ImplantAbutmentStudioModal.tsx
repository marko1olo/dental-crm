import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Copy,
  Crown,
  FileText,
  Info,
  Layers,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import {
  analyzeEmergenceProfile,
  buildZtlWorkOrder,
  formatZtlWorkOrderToText,
  getToothEmergenceDefaults,
  type CrownMaterial,
  type EmergenceProfileShape,
  type FixationType,
} from "./implantEmergenceMath";
import {
  getRecommendedTorqueNcm,
  getScrewdriverType,
  getTiBasesByBrandAndPlatform,
  getTorqueSpecsByBrand,
  type ImplantTorqueBrand,
  type TiBaseCatalogItem,
} from "./implantTorqueCatalog";
import "./implantAbutmentStudio.css";

export interface ImplantAbutmentStudioModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialToothFdi?: number;
  readonly initialBrand?: ImplantTorqueBrand;
  readonly initialPlatformDiameterMm?: number;
  readonly onSaveWorkOrder?: (orderText: string) => void;
}

const BRAND_OPTIONS: { readonly id: ImplantTorqueBrand; readonly name: string; readonly line: string }[] = [
  { id: "straumann", name: "Straumann", line: "BLX / Bone Level (CrossFit)" },
  { id: "nobel_biocare", name: "Nobel Biocare", line: "NobelActive (Conical Connection)" },
  { id: "osstem", name: "Osstem", line: "TS III SA / CA (11° Morse Taper)" },
  { id: "dentium", name: "Dentium", line: "SuperLine (11° Conical Seal)" },
  { id: "astra_tech", name: "Astra Tech", line: "OsseoSpeed EV (Conical Seal)" },
  { id: "megagen", name: "MegaGen", line: "AnyRidge (5° Knife-Thread)" },
];

const PRESET_TEETH = [
  { fdi: 11, label: "#11 Центральный резец" },
  { fdi: 13, label: "#13 Клык" },
  { fdi: 14, label: "#14 Премоляр" },
  { fdi: 16, label: "#16 Верхний моляр" },
  { fdi: 21, label: "#21 Центральный резец" },
  { fdi: 46, label: "#46 Нижний моляр" },
];

const CROWN_MATERIALS: { readonly id: CrownMaterial; readonly label: string }[] = [
  { id: "zirconia_multilayer", label: "Диоксид циркония Multi-Layer (Эстетика)" },
  { id: "zirconia_monolithic", label: "Диоксид циркония Monolithic (Прочность)" },
  { id: "emax_cad", label: "Дисиликат лития E.max CAD" },
  { id: "cocr_ceramic", label: "Металлокерамика CoCr" },
  { id: "pmma_temporary", label: "PMMA временная коронка" },
  { id: "titanium_custom", label: "Индивидуальный Ti-абатмент" },
];

export function ImplantAbutmentStudioModal({
  isOpen,
  onClose,
  initialToothFdi = 11,
  initialBrand = "straumann",
  initialPlatformDiameterMm = 4.1,
  onSaveWorkOrder,
}: ImplantAbutmentStudioModalProps) {
  const [toothFdi, setToothFdi] = useState<number>(initialToothFdi);
  const [brand, setBrand] = useState<ImplantTorqueBrand>(initialBrand);
  const [fixationType, setFixationType] = useState<FixationType>("screw_retained");
  const [profileShape, setProfileShape] = useState<EmergenceProfileShape>("concave");
  const [crownMaterial, setCrownMaterial] = useState<CrownMaterial>("zirconia_multilayer");

  const toothDefaults = useMemo(() => getToothEmergenceDefaults(toothFdi), [toothFdi]);

  const [platformDiameterMm, setPlatformDiameterMm] = useState<number>(initialPlatformDiameterMm);
  const [crownMarginDiameterMm, setCrownMarginDiameterMm] = useState<number>(toothDefaults.defaultCervicalDiameterMm);
  const [gingivalCuffHeightMm, setGingivalCuffHeightMm] = useState<number>(toothDefaults.typicalMucosalThicknessMm);
  const [subgingivalMarginDepthMm, setSubgingivalMarginDepthMm] = useState<number>(1.5);
  const [screwChannelAngulationDeg, setScrewChannelAngulationDeg] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"visualizer" | "lab_order">("visualizer");

  const availableTiBases = useMemo(() => {
    return getTiBasesByBrandAndPlatform(brand, platformDiameterMm);
  }, [brand, platformDiameterMm]);

  const [selectedTiBaseId, setSelectedTiBaseId] = useState<string>(
    availableTiBases[0]?.id ?? "st-tb-rc-02",
  );

  const activeTiBase = useMemo(() => {
    return availableTiBases.find((item) => item.id === selectedTiBaseId) ?? availableTiBases[0] ?? null;
  }, [availableTiBases, selectedTiBaseId]);

  const analysis = useMemo(() => {
    return analyzeEmergenceProfile({
      toothNumberFdi: toothFdi,
      implantBrand: brand,
      implantLine: BRAND_OPTIONS.find((b) => b.id === brand)?.line ?? "Standard",
      platformDiameterMm,
      crownMarginDiameterMm,
      gingivalCuffHeightMm,
      profileShape,
      fixationType,
      subgingivalMarginDepthMm,
      screwChannelAngulationDeg,
      crownMaterial,
      abutmentPlatformDiameterMm: activeTiBase?.platformDiameterMm,
    });
  }, [
    toothFdi,
    brand,
    platformDiameterMm,
    crownMarginDiameterMm,
    gingivalCuffHeightMm,
    profileShape,
    fixationType,
    subgingivalMarginDepthMm,
    screwChannelAngulationDeg,
    crownMaterial,
    activeTiBase,
  ]);

  const torqueNcm = useMemo(() => {
    const isAsc = screwChannelAngulationDeg > 0;
    return getRecommendedTorqueNcm(
      brand,
      isAsc ? "angled_asc_ti_base" : "final_prosthetic_screw",
      platformDiameterMm,
    );
  }, [brand, screwChannelAngulationDeg, platformDiameterMm]);

  const screwdriver = useMemo(() => {
    const isAsc = screwChannelAngulationDeg > 0;
    return getScrewdriverType(brand, isAsc);
  }, [brand, screwChannelAngulationDeg]);

  const brandMeta = useMemo(() => getTorqueSpecsByBrand(brand), [brand]);

  const workOrder = useMemo(() => {
    return buildZtlWorkOrder({
      toothNumberFdi: toothFdi,
      implantBrand: brandMeta.brandName,
      implantLine: BRAND_OPTIONS.find((b) => b.id === brand)?.line ?? "Standard",
      platformDiameterMm,
      tiBaseArticle: activeTiBase?.article ?? "CUSTOM-TI-BASE",
      abutmentType: activeTiBase?.nameRu ?? "Индивидуальный Ti-Base",
      gingivalCuffHeightMm,
      chimneyPostHeightMm: activeTiBase?.chimneyPostHeightMm ?? 5.5,
      fixationType,
      crownMaterial,
      emergenceAngleDeg: analysis.emergenceAngleDeg,
      profileShape,
      recommendedTorqueNcm: torqueNcm,
      screwdriverType: screwdriver,
      screwChannelAngulationDeg,
      notes,
    });
  }, [
    toothFdi,
    brandMeta,
    brand,
    platformDiameterMm,
    activeTiBase,
    gingivalCuffHeightMm,
    fixationType,
    crownMaterial,
    analysis.emergenceAngleDeg,
    profileShape,
    torqueNcm,
    screwdriver,
    screwChannelAngulationDeg,
    notes,
  ]);

  const handleCopyWorkOrder = () => {
    const text = formatZtlWorkOrderToText(workOrder);
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (onSaveWorkOrder) {
      onSaveWorkOrder(text);
    }
  };

  const handlePrintOrder = () => {
    window.print();
  };

  const handleToothSelect = (fdi: number) => {
    setToothFdi(fdi);
    const defs = getToothEmergenceDefaults(fdi);
    setCrownMarginDiameterMm(defs.defaultCervicalDiameterMm);
    setGingivalCuffHeightMm(defs.typicalMucosalThicknessMm);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="implant-studio-overlay" role="dialog" aria-modal="true">
      <div className="implant-studio-container">
        <header className="implant-studio-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "0.5rem",
                background: "rgba(13, 148, 136, 0.15)",
                color: "var(--brand-500, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Crown size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Студия профиля прорезывания & Абатментов (Emergence Profile Studio)
                </h2>
                <span
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: 4,
                    background: "var(--surface, #f1f5f9)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  FDI #{toothFdi}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #64748b)" }}>
                Биомеханический расчет угла α, платформопереключения, момента затяжки и заказ-наряда ЗТЛ
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ display: "flex", background: "var(--surface, #e2e8f0)", padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                className={`implant-studio-btn ${activeTab === "visualizer" ? "active" : ""}`}
                style={{ minHeight: 38, padding: "0.4rem 0.8rem", fontSize: 13 }}
                onClick={() => setActiveTab("visualizer")}
              >
                <Compass size={16} />
                Визуализатор & Биомеханика
              </button>
              <button
                type="button"
                className={`implant-studio-btn ${activeTab === "lab_order" ? "active" : ""}`}
                style={{ minHeight: 38, padding: "0.4rem 0.8rem", fontSize: 13 }}
                onClick={() => setActiveTab("lab_order")}
              >
                <FileText size={16} />
                Заказ-наряд ЗТЛ
              </button>
            </div>

            <button
              type="button"
              className="implant-studio-btn"
              style={{ minHeight: 40, minWidth: 40, padding: 0 }}
              onClick={onClose}
              aria-label="Закрыть студию"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <main className="implant-studio-body">
          {/* LEFT COLUMN: 2D CROSS SECTION VISUALIZER & SLIDERS */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #64748b)" }}>
                ВЫБОР КЛИНИЧЕСКОЙ ПОЗИЦИИ (FDI ТАКСОНОМИЯ):
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {PRESET_TEETH.map((t) => (
                  <button
                    key={t.fdi}
                    type="button"
                    className={`implant-studio-btn ${toothFdi === t.fdi ? "active" : ""}`}
                    style={{ minHeight: 38, padding: "0.3rem 0.6rem", fontSize: 12 }}
                    onClick={() => handleToothSelect(t.fdi)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="implant-emergence-svg-card">
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                  color: "#94a3b8",
                  fontSize: 12,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Compass size={14} />
                  2D САГИТТАЛЬНЫЙ СРЕЗ ПРОФИЛЯ ПРОРЕЗЫВАНИЯ
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <span
                    className={`implant-telemetry-pill ${
                      analysis.angleRiskLevel === "safe"
                        ? "implant-telemetry-safe"
                        : analysis.angleRiskLevel === "warning"
                          ? "implant-telemetry-warning"
                          : "implant-telemetry-danger"
                    }`}
                  >
                    Угол α: {analysis.emergenceAngleDeg}°
                  </span>
                  <span
                    className={`implant-telemetry-pill ${
                      analysis.platformSwitchStatus === "optimal_switch"
                        ? "implant-telemetry-safe"
                        : "implant-telemetry-warning"
                    }`}
                  >
                    Switch: {analysis.platformSwitchMm > 0 ? "+" : ""}
                    {analysis.platformSwitchMm.toFixed(2)} мм
                  </span>
                </div>
              </div>

              <svg viewBox="0 0 400 320" style={{ width: "100%", height: 260, overflow: "visible" }}>
                <defs>
                  <linearGradient id="tiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#64748b" />
                    <stop offset="50%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                  <linearGradient id="gingivaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fda4af" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.6" />
                  </linearGradient>
                  <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="50%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                  </linearGradient>
                  <pattern id="studioGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  </pattern>
                </defs>

                <rect width="400" height="320" fill="url(#studioGrid)" />
                <line x1="200" y1="20" x2="200" y2="300" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="200" x2="360" y2="200" stroke="#ca8a04" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="50" y="195" fill="#ca8a04" fontSize="10" fontWeight="bold">
                  Крест кости (Alveolar Crest)
                </text>

                {(() => {
                  const halfPlat = (platformDiameterMm / 2) * 16;
                  const halfApex = (platformDiameterMm / 2) * 11;
                  return (
                    <polygon
                      points={`${200 - halfPlat},200 ${200 + halfPlat},200 ${200 + halfApex},295 ${200 - halfApex},295`}
                      fill="url(#tiGrad)"
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />
                  );
                })()}

                {(() => {
                  const cuffPx = gingivalCuffHeightMm * 18;
                  const marginY = 200 - cuffPx;
                  const halfPlat = (platformDiameterMm / 2) * 16;
                  const halfMargin = (crownMarginDiameterMm / 2) * 16;
                  const halfCrownTop = halfMargin * 0.95;

                  let leftCurve = `L ${200 - halfMargin},${marginY}`;
                  let rightCurve = `L ${200 + halfPlat},200`;
                  if (profileShape === "concave") {
                    leftCurve = `Q ${200 - halfPlat - 2},${marginY + cuffPx * 0.6} ${200 - halfMargin},${marginY}`;
                    rightCurve = `Q ${200 + halfPlat + 2},${marginY + cuffPx * 0.6} ${200 + halfPlat},200`;
                  } else if (profileShape === "convex") {
                    leftCurve = `Q ${200 - halfMargin + 2},${marginY + cuffPx * 0.3} ${200 - halfMargin},${marginY}`;
                    rightCurve = `Q ${200 + halfMargin - 2},${marginY + cuffPx * 0.3} ${200 + halfPlat},200`;
                  }

                  const angRad = (screwChannelAngulationDeg * Math.PI) / 180;
                  const screwTopX = 200 + Math.sin(angRad) * 150;
                  const screwTopY = 200 - Math.cos(angRad) * 150;
                  const angleColor = analysis.angleRiskLevel === "safe" ? "#10b981" : analysis.angleRiskLevel === "warning" ? "#f59e0b" : "#ef4444";

                  return (
                    <>
                      <path
                        d={`M 40,200 L 40,${marginY} Q ${200 - halfMargin - 15},${marginY} ${200 - halfMargin},${marginY} L ${200 - halfPlat},200 Z`}
                        fill="url(#gingivaGrad)"
                        stroke="#fb7185"
                        strokeWidth="1"
                      />
                      <path
                        d={`M 360,200 L 360,${marginY} Q ${200 + halfMargin + 15},${marginY} ${200 + halfMargin},${marginY} L ${200 + halfPlat},200 Z`}
                        fill="url(#gingivaGrad)"
                        stroke="#fb7185"
                        strokeWidth="1"
                      />
                      <line x1="40" y1={marginY} x2="360" y2={marginY} stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 2" />
                      <text x="50" y={marginY - 4} fill="#fb7185" fontSize="10" fontWeight="bold">
                        Десневой край ({gingivalCuffHeightMm.toFixed(1)} мм)
                      </text>
                      <polygon
                        points={`${200 - halfPlat + 3},200 ${200 + halfPlat - 3},200 ${200 + 14},${marginY - 30} ${200 - 14},${marginY - 30}`}
                        fill="#94a3b8"
                        stroke="#475569"
                        strokeWidth="1.5"
                      />
                      <path
                        d={`M ${200 - halfPlat},200 ${leftCurve} L ${200 - halfCrownTop},40 Q 200,30 ${200 + halfCrownTop},40 L ${200 + halfMargin},${marginY} ${rightCurve} Z`}
                        fill="url(#crownGrad)"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        opacity="0.9"
                      />
                      <line x1="200" y1="200" x2={screwTopX} y2={screwTopY} stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 3" />
                      {screwChannelAngulationDeg > 0 && (
                        <text x={screwTopX + 8} y={screwTopY + 4} fill="#38bdf8" fontSize="10" fontWeight="bold">
                          ASC {screwChannelAngulationDeg}°
                        </text>
                      )}
                      <line x1={200 - halfPlat} y1="200" x2={200 - halfPlat} y2={marginY} stroke={angleColor} strokeWidth="1" strokeDasharray="2 2" />
                      <line x1={200 - halfPlat} y1="200" x2={200 - halfMargin} y2={marginY} stroke={angleColor} strokeWidth="2" />
                      <text x={200 - halfMargin - 10} y={marginY + cuffPx / 2} fill={angleColor} fontSize="12" fontWeight="bold">
                        α={analysis.emergenceAngleDeg}°
                      </text>
                    </>
                  );
                })()}
              </svg>

              <div
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  background:
                    analysis.angleRiskLevel === "safe"
                      ? "rgba(16, 185, 129, 0.12)"
                      : analysis.angleRiskLevel === "warning"
                        ? "rgba(245, 158, 11, 0.12)"
                        : "rgba(239, 68, 68, 0.15)",
                  border: `1px solid ${
                    analysis.angleRiskLevel === "safe"
                      ? "#10b981"
                      : analysis.angleRiskLevel === "warning"
                        ? "#f59e0b"
                        : "#ef4444"
                  }`,
                  color: "#f8fafc",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {analysis.angleRiskLevel === "safe" ? (
                  <ShieldCheck size={18} color="#10b981" />
                ) : analysis.angleRiskLevel === "warning" ? (
                  <AlertTriangle size={18} color="#f59e0b" />
                ) : (
                  <ShieldAlert size={18} color="#ef4444" />
                )}
                <span>
                  {analysis.angleRiskLevel === "safe"
                    ? `Угол α (${analysis.emergenceAngleDeg}°) < 30°: Низкий риск резорбции и периимплантита (Katafuchi et al. 2017).`
                    : analysis.angleRiskLevel === "warning"
                      ? `Угол α (${analysis.emergenceAngleDeg}°) в зоне 30°-40°: умеренный риск, показан вогнутый профиль.`
                      : `Угол α (${analysis.emergenceAngleDeg}°) > 40°: Высокий риск резорбции кости и ретенции налета (${analysis.katafuchiRiskMultiplier}x риск)!`}
                </span>
              </div>
            </div>

            {/* Touch Sliders */}
            <div
              style={{
                background: "var(--surface, #f8fafc)",
                border: "1px solid var(--line, #e2e8f0)",
                borderRadius: "0.75rem",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                    <span>Диаметр платформы (D_plat):</span>
                    <span style={{ color: "var(--brand-500, #0d9488)" }}>{platformDiameterMm.toFixed(1)} мм</span>
                  </div>
                  <input
                    type="range"
                    className="implant-studio-slider"
                    min="3.0"
                    max="6.0"
                    step="0.1"
                    value={platformDiameterMm}
                    onChange={(e) => setPlatformDiameterMm(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                    <span>Диаметр шейки коронки (D_margin):</span>
                    <span style={{ color: "var(--brand-500, #0d9488)" }}>{crownMarginDiameterMm.toFixed(1)} мм</span>
                  </div>
                  <input
                    type="range"
                    className="implant-studio-slider"
                    min="4.0"
                    max="12.0"
                    step="0.1"
                    value={crownMarginDiameterMm}
                    onChange={(e) => setCrownMarginDiameterMm(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                    <span>Высота десневой манжеты (H_cuff):</span>
                    <span style={{ color: "var(--brand-500, #0d9488)" }}>{gingivalCuffHeightMm.toFixed(1)} мм</span>
                  </div>
                  <input
                    type="range"
                    className="implant-studio-slider"
                    min="0.5"
                    max="6.0"
                    step="0.5"
                    value={gingivalCuffHeightMm}
                    onChange={(e) => setGingivalCuffHeightMm(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                    <span>Угол шахты винта (ASC):</span>
                    <span style={{ color: screwChannelAngulationDeg > 25 ? "#ef4444" : "var(--brand-500, #0d9488)" }}>
                      {screwChannelAngulationDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    className="implant-studio-slider"
                    min="0"
                    max="30"
                    step="1"
                    value={screwChannelAngulationDeg}
                    onChange={(e) => setScrewChannelAngulationDeg(parseInt(e.target.value, 10))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #64748b)", display: "block", marginBottom: "0.35rem" }}>
                  ФОРМА ПОДДЕСНЕВОГО ПРОФИЛЯ ПРОРЕЗЫВАНИЯ:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  {(["concave", "straight", "convex"] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      className={`implant-studio-btn ${profileShape === shape ? "active" : ""}`}
                      style={{ minHeight: 44, fontSize: 13 }}
                      onClick={() => setProfileShape(shape)}
                    >
                      {shape === "concave" ? "Вогнутый (Concave)" : shape === "straight" ? "Прямой (Straight)" : "Выпуклый (Convex)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: TI-BASE, FIXATION, TORQUE & ZTL ORDER */}
          <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {activeTab === "visualizer" ? (
              <>
                <div
                  style={{
                    background: "var(--surface, #f8fafc)",
                    border: "1px solid var(--line, #e2e8f0)",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #64748b)" }}>
                    СИСТЕМА ИМПЛАНТАТОВ И ПРОИЗВОДИТЕЛЬ:
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                    {BRAND_OPTIONS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`implant-studio-btn ${brand === b.id ? "active" : ""}`}
                        style={{ minHeight: 44, justifyContent: "flex-start", fontSize: 13 }}
                        onClick={() => setBrand(b.id)}
                      >
                        <span style={{ fontWeight: 700 }}>{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--surface, #f8fafc)",
                    border: "1px solid var(--line, #e2e8f0)",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #64748b)" }}>
                    ТИП ФИКСАЦИИ ПРОТЕЗА:
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className={`implant-studio-btn ${fixationType === "screw_retained" ? "active" : ""}`}
                      style={{ minHeight: 44, fontSize: 12 }}
                      onClick={() => setFixationType("screw_retained")}
                    >
                      Винтовая (Screw)
                    </button>
                    <button
                      type="button"
                      className={`implant-studio-btn ${fixationType === "cement_retained" ? "active" : ""}`}
                      style={{ minHeight: 44, fontSize: 12 }}
                      onClick={() => setFixationType("cement_retained")}
                    >
                      Цементная (Cement)
                    </button>
                    <button
                      type="button"
                      className={`implant-studio-btn ${fixationType === "multi_unit" ? "active" : ""}`}
                      style={{ minHeight: 44, fontSize: 12 }}
                      onClick={() => setFixationType("multi_unit")}
                    >
                      Multi-Unit
                    </button>
                  </div>

                  {fixationType === "cement_retained" && gingivalCuffHeightMm > 1.0 && (
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "var(--ink, #0f172a)",
                        fontSize: 12,
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ color: "#dc2626" }}>ПРЕДУПРЕЖДЕНИЕ: РИСК ЦЕМЕНТНОГО ПЕРИИМПЛАНТИТА</strong>
                        <p style={{ margin: "0.25rem 0 0 0" }}>
                          Поддесневой уступ {gingivalCuffHeightMm.toFixed(1)} мм (&gt; 1.0 мм) препятствует полному удалению излишков цемента (Wilson 2009). Рекомендуется перейти на винтовую фиксацию или заказать индивидуальный абатмент с выносом уступа на уровень десны!
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(14, 116, 144, 0.08))",
                    border: "1px solid rgba(13, 148, 136, 0.3)",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, fontSize: 13 }}>
                      <Wrench size={16} color="var(--brand-500, #0d9488)" />
                      ПРОТОКОЛ ЗАТЯЖКИ ДИНАМОМЕТРИЧЕСКОГО КЛЮЧА
                    </span>
                    <span
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "9999px",
                        background: "var(--brand-500, #0d9488)",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {torqueNcm} N·cm
                    </span>
                  </div>

                  <div style={{ fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <div>
                      <span style={{ color: "var(--muted, #64748b)" }}>Тип отвертки:</span>
                      <div style={{ fontWeight: 600 }}>{screwdriver}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted, #64748b)" }}>Производитель:</span>
                      <div style={{ fontWeight: 600 }}>{brandMeta.brandName} ({brandMeta.countryRu})</div>
                    </div>
                  </div>

                  <p style={{ margin: "0.25rem 0 0 0", fontSize: 11, color: "var(--muted, #64748b)" }}>
                    {brandMeta.connectionSafetyNotes}
                  </p>
                </div>

                <div
                  style={{
                    background: "var(--surface, #f8fafc)",
                    border: "1px solid var(--line, #e2e8f0)",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #64748b)" }}>
                    КАТАЛОГ СОВМЕСТИМЫХ TI-BASE / АБАТМЕНТОВ ({availableTiBases.length} ПОЗИЦИЙ):
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 180, overflowY: "auto" }}>
                    {availableTiBases.map((tb) => (
                      <button
                        key={tb.id}
                        type="button"
                        className={`implant-studio-btn ${selectedTiBaseId === tb.id ? "active" : ""}`}
                        style={{
                          minHeight: 44,
                          justifyContent: "space-between",
                          fontSize: 12,
                          padding: "0.4rem 0.75rem",
                          textAlign: "left",
                        }}
                        onClick={() => setSelectedTiBaseId(tb.id)}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{tb.nameRu}</div>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>Арт: {tb.article} | Манжета {tb.gingivalCuffHeightMm} мм</div>
                        </div>
                        <span style={{ fontWeight: 800 }}>{(tb.priceKopecks / 100).toLocaleString("ru-RU")} ₽</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  background: "var(--surface, #f8fafc)",
                  border: "1px solid var(--line, #e2e8f0)",
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                      Спецификация заказ-наряда ЗТЛ #{workOrder.orderId}
                    </h3>
                    <span style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
                      {workOrder.toothNameRu} | {workOrder.implantBrand}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="implant-studio-btn implant-studio-btn-primary"
                      style={{ minHeight: 40, fontSize: 13 }}
                      onClick={handleCopyWorkOrder}
                    >
                      {copied ? <ClipboardCheck size={16} /> : <Copy size={16} />}
                      {copied ? "Скопировано!" : "Копировать наряд"}
                    </button>
                    <button
                      type="button"
                      className="implant-studio-btn"
                      style={{ minHeight: 40, fontSize: 13 }}
                      onClick={handlePrintOrder}
                    >
                      <Printer size={16} />
                      Печать
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #64748b)", display: "block", marginBottom: "0.35rem" }}>
                    МАТЕРИАЛ КАРКАСА / КОРОНКИ:
                  </label>
                  <select
                    style={{
                      width: "100%",
                      minHeight: 44,
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--line, #cbd5e1)",
                      background: "var(--paper, #ffffff)",
                      color: "var(--ink, #0f172a)",
                      fontSize: 14,
                    }}
                    value={crownMaterial}
                    onChange={(e) => setCrownMaterial(e.target.value as CrownMaterial)}
                  >
                    {CROWN_MATERIALS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #64748b)", display: "block", marginBottom: "0.35rem" }}>
                    ОСОБЫЕ УКАЗАНИЯ ДЛЯ ЗУБНОГО ТЕХНИКА:
                  </label>
                  <textarea
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid var(--line, #cbd5e1)",
                      background: "var(--paper, #ffffff)",
                      color: "var(--ink, #0f172a)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                    placeholder="Укажите цвет по шкале VITA, индивидуальные особенности окклюзии или требования к десневым амбразурам..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <pre
                  style={{
                    flex: 1,
                    minHeight: 160,
                    background: "#0f172a",
                    color: "#94a3b8",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                    lineHeight: 1.5,
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                  }}
                >
                  {formatZtlWorkOrderToText(workOrder)}
                </pre>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}