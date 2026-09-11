import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  Compass,
  Copy,
  Crown,
  FileText,
  Layers,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  analyzeMischBoneQuality,
  computeHUZoneProfile,
  generateMischDrillSequence,
  type HUZoneSampling,
  type MischClassificationResult,
} from "./boneDensityMischMath";
import {
  classifyMischBoneDensity,
  evaluateNerveClearance,
  type MischBoneAssessment,
  type LandmarkSafetyClearance,
} from "@dental/shared";
import {
  createEmptyCbctVolume,
  type CbctVoxelVolume,
} from "./cbctMprMath";
import {
  type DentalArchCurve,
  type CrossSectionSliceData,
  buildDentalArchCurve,
  DEFAULT_MANDIBULAR_ARCH_ANCHORS,
  generateCrossSectionSlices,
} from "./dentalCurveEngine";
import {
  auditAlveolarBoneContainment,
  auditMandibularNerveSafety,
  calculateApexCoordinates,
  calculateImplant3DWorldPose,
  findImplantSpec,
  performCbctPlanningAudit,
  playNerveSafetyAudioAlarm,
  sampleCrossSectionHUProfile,
  STANDARD_IMPLANT_CATALOG,
  SURGEON_IMPLANT_PRESETS,
  type AlveolarRidgeEnvelope,
  type ComprehensiveCbctPlanAudit,
  type CrossSectionImplantPose,
  type ImplantBrandKey,
  type MandibularCanalCrossSection,
  type SurgeonImplantPreset,
  type VirtualImplantSpec,
} from "./implantSafetyEngine";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import "./implantCrossSectionPlanner.css";

export interface ImplantCrossSectionPlannerProps {
  readonly toothFdi?: number;
  readonly patientName?: string;
  readonly initialBrand?: ImplantBrandKey;
  readonly initialDiameterMm?: number;
  readonly initialLengthMm?: number;
  readonly volume?: CbctVoxelVolume | null;
  readonly archCurve?: DentalArchCurve | null;
  readonly canal?: MandibularCanalCrossSection | null;
  readonly envelope?: AlveolarRidgeEnvelope | null;
  readonly onPlanApproved?: (audit: ComprehensiveCbctPlanAudit) => void;
  readonly onClose?: () => void;
}

const SCALE_PX_PER_MM = 10.0;

export const ImplantCrossSectionPlanner: React.FC<ImplantCrossSectionPlannerProps> = ({
  toothFdi = 46,
  patientName = "Пациент",
  initialBrand = "osstem",
  initialDiameterMm = 4.0,
  initialLengthMm = 10.0,
  volume = null,
  archCurve = null,
  canal = null,
  envelope = null,
  onPlanApproved,
  onClose,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>(initialBrand);
  const [diameterMm, setDiameterMm] = useState<number>(initialDiameterMm);
  const [lengthMm, setLengthMm] = useState<number>(initialLengthMm);
  const [entryX, setEntryX] = useState<number>(14.0);
  const [entryY, setEntryY] = useState<number>(5.0);
  const [angulationDeg, setAngulationDeg] = useState<number>(0);

  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return SoundFeedbackService.getInstance().isEnabled();
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<"viewport" | "misch" | "diary">("viewport");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const crossSectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check if a real CBCT voxel volume is loaded (Zero-Mocks / Mandate 8k)
  const hasRealVolume = Boolean(
    volume && volume.data && !volume.isDisposed && volume.dimensions.width > 0,
  );

  const effectiveArch = useMemo(() => {
    return archCurve ?? buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
  }, [archCurve]);

  const crossSectionSlice: CrossSectionSliceData | null = useMemo(() => {
    if (!hasRealVolume || !volume || !effectiveArch) return null;
    const slices = generateCrossSectionSlices(volume, effectiveArch, 1.5, 0.0, {
      windowWidth: 4400,
      windowLevel: 1300,
      widthMm: 28.0,
      heightMm: 36.0,
      invert: false,
    });
    const toothStr = toothFdi.toString();
    return (
      slices.find((s) => s.nearestToothFdi === toothStr) ??
      slices[Math.floor(slices.length / 2)] ??
      slices[0] ??
      null
    );
  }, [hasRealVolume, volume, effectiveArch, toothFdi]);

  useEffect(() => {
    if (!crossSectionCanvasRef.current || !crossSectionSlice) return;
    const canvas = crossSectionCanvasRef.current;
    canvas.width = crossSectionSlice.widthPx;
    canvas.height = crossSectionSlice.heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.createImageData(crossSectionSlice.widthPx, crossSectionSlice.heightPx);
    imgData.data.set(crossSectionSlice.pixelData);
    ctx.putImageData(imgData, 0, 0);
  }, [crossSectionSlice]);

  const activeCanal: MandibularCanalCrossSection | null = hasRealVolume ? (canal ?? null) : null;
  const activeEnvelope: AlveolarRidgeEnvelope | null = hasRealVolume ? (envelope ?? null) : null;

  const currentSpec: VirtualImplantSpec = useMemo(() => {
    return findImplantSpec(selectedBrand, diameterMm, lengthMm);
  }, [selectedBrand, diameterMm, lengthMm]);

  const implantPose: CrossSectionImplantPose = useMemo(() => ({
    entryPoint: { x: entryX, y: entryY },
    angulationDeg,
    implantSpec: currentSpec,
    targetToothFdi: toothFdi,
  }), [entryX, entryY, angulationDeg, currentSpec, toothFdi]);

  const implant3DWorld = useMemo(() => {
    if (!hasRealVolume || !crossSectionSlice) return null;
    return calculateImplant3DWorldPose(
      implantPose,
      crossSectionSlice.centerPointMm,
      crossSectionSlice.normalVector2D,
      crossSectionSlice.heightMm,
      4.0,
    );
  }, [hasRealVolume, crossSectionSlice, implantPose]);

  const huSampling: HUZoneSampling = useMemo(() => {
    if (!hasRealVolume || !volume) {
      return {
        coronalCrestalHU: 0,
        trabecularCoreHU: 0,
        apicalBaseHU: 0,
        overallMeanHU: 0,
        status: "unmeasured",
      };
    }
    return sampleCrossSectionHUProfile(volume, implantPose, implant3DWorld);
  }, [hasRealVolume, volume, implantPose, implant3DWorld]);

  const boneQuality: MischClassificationResult = useMemo(() => {
    return analyzeMischBoneQuality(huSampling, diameterMm);
  }, [huSampling, diameterMm]);

  // Carl Misch D1-D5 Bone Assessment from @dental/shared
  const mischAssessment: MischBoneAssessment = useMemo(() => {
    return classifyMischBoneDensity(huSampling.overallMeanHU);
  }, [huSampling.overallMeanHU]);

  const audit: ComprehensiveCbctPlanAudit = useMemo(() => {
    return performCbctPlanningAudit({
      toothFdi,
      implantPose,
      canal: activeCanal,
      envelope: activeEnvelope,
      huSampling,
      patientName,
    });
  }, [toothFdi, implantPose, activeCanal, activeEnvelope, huSampling, patientName]);

  // Evaluate 3D clearance to IAN nerve from @dental/shared
  const sharedNerveClearance: LandmarkSafetyClearance = useMemo(() => {
    if (!activeCanal) {
      return {
        landmarkType: "nerve",
        landmarkNameRu: "Нижнечелюстной канал (IAN)",
        centerlineDistanceMm: 0,
        surfaceClearanceMm: 999,
        thresholdMm: 2.0,
        status: "safe",
        clinicalRecommendationRu: "Канал не сегментирован",
      };
    }
    const entryVec: [number, number, number] = [entryX, entryY, 0];
    const apexVec: [number, number, number] = [audit.apexPoint.x, audit.apexPoint.y, 0];
    const canalCenterVec: [number, number, number] = [activeCanal.center.x, activeCanal.center.y, 0];
    return evaluateNerveClearance(entryVec, apexVec, diameterMm, [canalCenterVec], activeCanal.radiusMm);
  }, [activeCanal, entryX, entryY, audit.apexPoint, diameterMm]);

  // Mandatory red alert if clearance to IAN nerve is < 2.0 mm (corridor safety standard)
  const isNerveCorridorBreached = Boolean(
    hasRealVolume &&
      activeCanal &&
      (audit.nerveSafety.netClearanceToCanalWallMm < 2.0 ||
        sharedNerveClearance.surfaceClearanceMm < 2.0),
  );

  const drillSteps = useMemo(() => {
    return generateMischDrillSequence(boneQuality.mischClass, diameterMm, lengthMm);
  }, [boneQuality.mischClass, diameterMm, lengthMm]);

  useEffect(() => {
    if (hasRealVolume && (audit.nerveSafety.shouldTriggerAudioAlarm || isNerveCorridorBreached) && isAudioEnabled) {
      playNerveSafetyAudioAlarm(isNerveCorridorBreached ? "danger" : audit.nerveSafety.safetyStatus, isAudioEnabled);
    }
  }, [hasRealVolume, audit.nerveSafety.shouldTriggerAudioAlarm, isNerveCorridorBreached, audit.nerveSafety.safetyStatus, isAudioEnabled]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyDiary = () => {
    navigator.clipboard.writeText(audit.form043DiaryText);
    showToast("Протокол операции скопирован в буфер для Формы 043/у.");
  };

  const handleAddToTreatmentPlan = () => {
    if (onPlanApproved) {
      onPlanApproved(audit);
    }
    showToast("Установка " + currentSpec.brandName + " " + currentSpec.lineName + " добавлена в план лечения.");
  };

  const handleResetCenter = () => {
    setEntryX(activeEnvelope?.crestPoint.x ?? 14.0);
    setEntryY(activeEnvelope?.crestPoint.y ?? 5.0);
    setAngulationDeg(0);
  };

  const handleApplySurgeonPreset = (preset: SurgeonImplantPreset) => {
    setSelectedBrand(preset.brand);
    setDiameterMm(preset.diameterMm);
    setLengthMm(preset.lengthMm);
    setEntryX(activeEnvelope?.crestPoint.x ?? 14.0);
    setEntryY(activeEnvelope?.crestPoint.y ?? 5.0);
    setAngulationDeg(0);
    showToast(`Выбран имплантат: ${preset.title} (центрирован по гребню)`);
  };

  const viewW = 280;
  const viewH = 360;
  const pxEntryX = entryX * SCALE_PX_PER_MM;
  const pxEntryY = entryY * SCALE_PX_PER_MM;
  const pxApexX = audit.apexPoint.x * SCALE_PX_PER_MM;
  const pxApexY = audit.apexPoint.y * SCALE_PX_PER_MM;

  const statusColor = isNerveCorridorBreached
    ? "#ef4444"
    : audit.nerveSafety.isWarning
      ? "#f59e0b"
      : "#10b981";

  return (
    <div className="implant-cross-section-planner" data-testid="implant-cross-section-planner">
      {/* HEADER PANEL */}
      <div className="planner-header-panel">
        <div className="planner-title-group">
          <div className="w-10 h-10 rounded-xl bg-[var(--teal,rgba(13,148,136,0.12))] flex items-center justify-center text-[var(--teal,#0d9488)]">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--ink)]">
                КЛКТ Кросс-секция & Контроль нерва (IAN)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--teal,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]">
                FDI #{toothFdi}
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1"
                style={{
                  backgroundColor: hasRealVolume ? mischAssessment.bgBadgeHex : "var(--line)",
                  borderColor: hasRealVolume ? mischAssessment.borderBadgeHex : "var(--line)",
                  color: hasRealVolume ? mischAssessment.colorHex : "var(--muted)",
                }}
                data-testid="header-misch-badge"
                title={mischAssessment.clinicalDescriptionRu}
              >
                <Activity size={12} />
                <span>{hasRealVolume ? `Кость: ${mischAssessment.mischClass}` : "Кость: Misch N/A"}</span>
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Пациент: {patientName} • Виртуальная примерка имплантата с коридором безопасности 2.0 мм
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !isAudioEnabled;
              setIsAudioEnabled(next);
              try {
                SoundFeedbackService.getInstance().setEnabled(next);
              } catch {}
            }}
            className={`chip-button ${isAudioEnabled ? "active" : ""}`}
            title="Звуковой сигнал опасности при сближении с нервом < 1.0 мм (по умолчанию выключен)"
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isAudioEnabled ? "Звук включен" : "Звук выключен"}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="chip-button"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* NERVE SAFETY BANNER */}
      {!hasRealVolume ? (
        <div className="nerve-alarm-banner unmeasured" data-testid="cbct-unmeasured-banner">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-400 shrink-0" />
            <span className="text-xs text-[var(--muted)]">
              Загрузите КЛКТ для измерения плотности кости и расстояния до IAN
            </span>
          </div>
          <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--paper-strong)]/85 text-[var(--muted)] border border-[var(--line)]">
            КЛКТ не загружена
          </div>
        </div>
      ) : (
        <div
          className={`nerve-alarm-banner ${isNerveCorridorBreached ? "danger" : "safe"}`}
          data-testid="nerve-safety-corridor-banner"
        >
          <div className="flex items-center gap-2">
            {isNerveCorridorBreached ? (
              <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            )}
            <span className={isNerveCorridorBreached ? "text-red-700 dark:text-red-300 font-bold" : ""}>
              {isNerveCorridorBreached
                ? `ТРЕВОГА БЕЗОПАСНОСТИ IAN: Зазор до нижнечелюстного нерва ${Math.min(audit.nerveSafety.netClearanceToCanalWallMm, sharedNerveClearance.surfaceClearanceMm).toFixed(1)} мм (< 2.0 мм порога). Риск парестезии!`
                : audit.nerveSafety.clinicalMessageRu}
            </span>
          </div>
          <div
            className={`text-xs font-bold px-2.5 py-1 rounded-md border backdrop-blur-sm shadow-sm ${
              isNerveCorridorBreached
                ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50"
                : "bg-[var(--paper-strong)]/85 text-[var(--ink)] border-[var(--line)]"
            }`}
            data-testid="nerve-clearance-indicator"
          >
            Дистанция: {Math.min(audit.nerveSafety.netClearanceToCanalWallMm, sharedNerveClearance.surfaceClearanceMm).toFixed(1)} мм (норма &ge; 2.0 мм)
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN 2-COLUMN WORKSPACE */}
      <div className="planner-grid-layout">
        {/* LEFT: CBCT CROSS-SECTION VIEWPORT */}
        <div className="planner-viewport-card">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[var(--muted)] flex items-center gap-1.5 whitespace-nowrap">
              <Layers size={14} /> Кросс-секционный срез КЛКТ (масштаб 1:1)
            </span>
            <button
              type="button"
              onClick={handleResetCenter}
              className="text-xs font-semibold text-[var(--teal,#0d9488)] hover:opacity-80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] transition-all min-h-[44px] min-w-[44px]"
            >
              <RotateCw size={12} />
              <span>Центрировать</span>
            </button>
          </div>

          {!hasRealVolume ? (
            <div
              className="cbct-slice-canvas-wrapper relative w-full h-[360px] bg-slate-950/90 rounded-xl overflow-hidden flex flex-col items-center justify-center p-6 text-center border border-[var(--line)]"
              data-testid="cbct-empty-state"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <Layers className="w-7 h-7 text-teal-400/80" />
              </div>
              <h4 className="text-sm font-bold text-slate-200 mb-1.5">
                Загрузите КЛКТ для измерения плотности кости и расстояния до IAN
              </h4>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Анатомический кросс-секционный срез, положение нижнечелюстного канала (IAN) и денситометрия HU рассчитываются по реальному исследованию пациента.
              </p>
            </div>
          ) : (
            <div className="cbct-slice-canvas-wrapper relative w-full h-[360px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
              {/* 1. Real Transversal CBCT Voxel Slice Canvas */}
              <canvas
                ref={crossSectionCanvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                data-testid="cbct-cross-section-voxel-canvas"
              />

              {/* 2. Interactive SVG Overlay on Real Slice */}
              <svg className="cbct-svg-viewport absolute inset-0 w-full h-full" viewBox={`0 0 ${viewW} ${viewH}`}>
                {/* Real Mandibular Canal if segmented */}
                {activeCanal && (
                  <>
                    <circle
                      cx={activeCanal.center.x * SCALE_PX_PER_MM}
                      cy={activeCanal.center.y * SCALE_PX_PER_MM}
                      r={(activeCanal.radiusMm + activeCanal.safetyMarginMm) * SCALE_PX_PER_MM}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={activeCanal.center.x * SCALE_PX_PER_MM}
                      cy={activeCanal.center.y * SCALE_PX_PER_MM}
                      r={activeCanal.radiusMm * SCALE_PX_PER_MM}
                      fill="#dc2626"
                      stroke="#f87171"
                      strokeWidth="2"
                    />
                    <text
                      x={activeCanal.center.x * SCALE_PX_PER_MM}
                      y={activeCanal.center.y * SCALE_PX_PER_MM + 3}
                      fill="#ffffff"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      IAN
                    </text>
                    <line
                      x1={pxApexX}
                      y1={pxApexY}
                      x2={audit.nerveSafety.closestNervePoint.x * SCALE_PX_PER_MM}
                      y2={audit.nerveSafety.closestNervePoint.y * SCALE_PX_PER_MM}
                      stroke={statusColor}
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                  </>
                )}

                {/* Virtual Implant Body */}
                <g transform={`rotate(${angulationDeg}, ${pxEntryX}, ${pxEntryY})`}>
                  <rect
                    x={pxEntryX - (diameterMm * SCALE_PX_PER_MM) / 2}
                    y={pxEntryY}
                    width={diameterMm * SCALE_PX_PER_MM}
                    height={lengthMm * SCALE_PX_PER_MM}
                    rx={3}
                    fill={statusColor}
                    fillOpacity="0.85"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  {[0.25, 0.5, 0.75].map((factor, idx) => (
                    <line
                      key={idx}
                      x1={pxEntryX - (diameterMm * SCALE_PX_PER_MM) / 2}
                      y1={pxEntryY + lengthMm * SCALE_PX_PER_MM * factor}
                      x2={pxEntryX + (diameterMm * SCALE_PX_PER_MM) / 2}
                      y2={pxEntryY + lengthMm * SCALE_PX_PER_MM * factor}
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeOpacity="0.6"
                    />
                  ))}
                  <rect
                    x={pxEntryX - (diameterMm * SCALE_PX_PER_MM) / 2 - 1}
                    y={pxEntryY - 3}
                    width={diameterMm * SCALE_PX_PER_MM + 2}
                    height={3}
                    fill="#94a3b8"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>

                {/* Apex Tracking Dot */}
                <circle cx={pxApexX} cy={pxApexY} r="3.5" fill="#ffffff" stroke={statusColor} strokeWidth="2" />
                {/* Entry Point Handle */}
                <circle cx={pxEntryX} cy={pxEntryY} r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />

                {/* Live Clearance Tag Box if Canal is segmented */}
                {activeCanal && (
                  <>
                    <rect
                      x={pxApexX - 35}
                      y={pxApexY + 8}
                      width="70"
                      height="18"
                      rx="4"
                      fill="#0f172a"
                      fillOpacity="0.9"
                      stroke={statusColor}
                      strokeWidth="1"
                    />
                    <text
                      x={pxApexX}
                      y={pxApexY + 20}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {audit.nerveSafety.netClearanceToCanalWallMm.toFixed(1)} мм до IAN
                    </text>
                  </>
                )}
              </svg>
            </div>
          )}

          {/* Navigation Mode Tabs */}
          <div className="chip-selector-group pt-1">
            <button
              type="button"
              onClick={() => setActiveTab("viewport")}
              className={`chip-button ${activeTab === "viewport" ? "active" : ""}`}
            >
              <Sliders size={14} /> Параметры имплантата
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("misch")}
              className={`chip-button ${activeTab === "misch" ? "active" : ""}`}
            >
              <Activity size={14} /> Плотность кости (Misch HU)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("diary")}
              className={`chip-button ${activeTab === "diary" ? "active" : ""}`}
            >
              <FileText size={14} /> Протокол Формы 043/у
            </button>
          </div>
        </div>

        {/* RIGHT: CONTROL PANELS & TELEMETRY */}
        <div className="planner-controls-panel">
          {activeTab === "viewport" && (
            <>
              {/* 1-CLICK CLINICAL SURGEON PRESETS (Mandate 8e: Fast Implantology Workflow) */}
              <div className="planner-section-card border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10">
                <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
                  <span className="section-title text-amber-800 dark:text-amber-200">
                    <Zap size={16} className="text-amber-500 shrink-0" />
                    <span>Экспресс 1-клик пресеты хирурга</span>
                  </span>
                  <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-300/80">
                    Авто-центрирование по гребню
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {SURGEON_IMPLANT_PRESETS.map((preset) => {
                    const isCurrent =
                      selectedBrand === preset.brand &&
                      Math.abs(diameterMm - preset.diameterMm) < 0.15 &&
                      Math.abs(lengthMm - preset.lengthMm) < 0.15;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplySurgeonPreset(preset)}
                        className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isCurrent
                            ? "bg-[var(--teal-surface,#f0fdfa)] border-[var(--teal,#0d9488)] ring-2 ring-[var(--teal-soft,#99f6e4)] shadow-xs"
                            : "bg-[var(--paper)] border-[var(--line)] hover:border-amber-400 hover:bg-amber-500/10"
                        }`}
                        title={preset.clinicalIndicationRu}
                        data-testid={`implant-preset-${preset.id}`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-[var(--ink)]">
                          <span className="flex items-center gap-1"><Zap size={13} className="text-amber-500 shrink-0" /> {preset.shortLabel}</span>
                          {isCurrent && <CheckCircle2 size={14} className="text-[var(--teal,#0d9488)] shrink-0" />}
                        </div>
                        <span className="text-[10px] text-[var(--muted)] leading-tight mt-1 truncate">
                          {preset.clinicalIndicationRu}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="planner-section-card">
                <span className="section-title">
                  <Crown size={16} className="text-[var(--teal)]" /> Выбор системы и размеров
                </span>

                <div className="chip-selector-group">
                  {(["straumann", "nobel_biocare", "osstem", "dentium"] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBrand(b)}
                      className={`chip-button ${selectedBrand === b ? "active" : ""}`}
                    >
                      {b === "straumann" ? "Straumann" : b === "nobel_biocare" ? "Nobel Biocare" : b === "osstem" ? "Osstem" : "Dentium"}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-xs font-semibold text-[var(--muted)]">Диаметр (Ø мм):</span>
                  <div className="chip-selector-group">
                    {[3.5, 4.0, 4.1, 4.3, 4.5, 5.0].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDiameterMm(d)}
                        className={`chip-button ${diameterMm === d ? "active" : ""}`}
                      >
                        Ø {d.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-xs font-semibold text-[var(--muted)]">Длина (L мм):</span>
                  <div className="chip-selector-group">
                    {[8.0, 8.5, 10.0, 11.5, 13.0].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLengthMm(l)}
                        className={`chip-button ${lengthMm === l ? "active" : ""}`}
                      >
                        {l.toFixed(1)} мм
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="planner-section-card">
                <span className="section-title">
                  <Compass size={16} className="text-[var(--teal)]" /> Позиционирование и наклон оси
                </span>

                <div className="range-slider-row">
                  <div className="slider-label-bar">
                    <span>Позиция X на гребне</span>
                    <span>{entryX.toFixed(1)} мм</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="20"
                    step="0.5"
                    value={entryX}
                    onChange={(e) => setEntryX(parseFloat(e.target.value))}
                    className="planner-range-input"
                  />
                </div>

                <div className="range-slider-row">
                  <div className="slider-label-bar">
                    <span>Угол наклона оси (Tilt)</span>
                    <span>{angulationDeg > 0 ? `+${angulationDeg}°` : `${angulationDeg}°`}</span>
                  </div>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="1"
                    value={angulationDeg}
                    onChange={(e) => setAngulationDeg(parseInt(e.target.value, 10))}
                    className="planner-range-input"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "misch" && (
            <div className="planner-section-card" data-testid="misch-density-card">
              <div className="flex items-center justify-between">
                <span className="section-title">
                  <Activity size={16} className="text-[var(--teal)]" />
                  {hasRealVolume ? "Измеренная плотность кости (Misch HU)" : "Оценка плотности кости (Misch)"}
                </span>
                <span
                  className={`misch-badge-pill ${mischAssessment.mischClass}`}
                  style={{
                    backgroundColor: hasRealVolume ? mischAssessment.bgBadgeHex : undefined,
                    borderColor: hasRealVolume ? mischAssessment.borderBadgeHex : undefined,
                    color: hasRealVolume ? mischAssessment.colorHex : undefined,
                  }}
                  data-testid="misch-classification-badge"
                >
                  {hasRealVolume ? `Класс ${mischAssessment.mischClass} (${mischAssessment.densityRangeRu})` : "Не измерена"}
                </span>
              </div>

              {!hasRealVolume ? (
                <div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-center my-2">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                  <div className="text-xs font-bold text-[var(--ink)]">
                    Загрузите КЛКТ для измерения плотности кости и расстояния до IAN
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed max-w-sm mx-auto">
                    Значения плотности ткани (HU) рассчитываются автоматически по 3D вокселям томограммы. Ручной ввод и аркадные ползунки отключены в соответствии со стандартами клинической достоверности (Мандат 8k).
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--ink)]">Кортикальный гребень (Coronal 20%)</div>
                      <div className="text-[11px] text-[var(--muted)]">Плотность кортикальной пластинки</div>
                    </div>
                    <div className="text-sm font-bold font-mono text-[var(--teal,#0d9488)]">
                      {huSampling.coronalCrestalHU} HU
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--ink)]">Губчатый слой (Trabecular 60%)</div>
                      <div className="text-[11px] text-[var(--muted)]">Центральное трабекулярное ложе</div>
                    </div>
                    <div className="text-sm font-bold font-mono text-[var(--teal,#0d9488)]">
                      {huSampling.trabecularCoreHU} HU
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[var(--ink)]">Апикальная опора (Apical 20%)</div>
                      <div className="text-[11px] text-[var(--muted)]">Апикальная фиксация в кости</div>
                    </div>
                    <div className="text-sm font-bold font-mono text-[var(--teal,#0d9488)]">
                      {huSampling.apicalBaseHU} HU
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--teal-surface,#f0fdfa)] border border-[var(--teal,#0d9488)]/30 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--ink)]">Средняя плотность ложа</div>
                      <div className="text-[11px] text-[var(--muted)]">{mischAssessment.classNameRu}</div>
                    </div>
                    <div className="text-base font-extrabold font-mono text-[var(--teal,#0d9488)]">
                      {huSampling.overallMeanHU} HU
                    </div>
                  </div>
                </div>
              )}

              {/* Surgical preparation protocol per Carl Misch D1–D5 classification */}
              <div
                className="p-3 rounded-xl border mt-2"
                style={{
                  borderColor: hasRealVolume ? mischAssessment.borderBadgeHex : "var(--line)",
                  backgroundColor: hasRealVolume ? mischAssessment.bgBadgeHex : "var(--paper)",
                }}
                data-testid="misch-surgical-protocol-card"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-bold" style={{ color: hasRealVolume ? mischAssessment.colorHex : "var(--ink)" }}>
                    {hasRealVolume ? mischAssessment.classNameRu : "Классификация Misch (D1–D5)"}
                  </div>
                  <div
                    className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border"
                    style={{
                      color: hasRealVolume ? mischAssessment.colorHex : "var(--muted)",
                      borderColor: hasRealVolume ? mischAssessment.borderBadgeHex : "var(--line)",
                      backgroundColor: "var(--paper)",
                    }}
                  >
                    Торк: {mischAssessment.recommendedTorqueNcm.min}–{mischAssessment.recommendedTorqueNcm.max} Н·см (цель {mischAssessment.recommendedTorqueNcm.target} Н·см)
                  </div>
                </div>
                <div className="text-[11px] text-[var(--muted)] mt-1">
                  Тактильное ощущение: {mischAssessment.tactileFeelRu} • Остеоинтеграция: {mischAssessment.healingMonths.mandible} мес. (н/ч) / {mischAssessment.healingMonths.maxilla} мес. (в/ч)
                </div>
                <div className="text-[11px] text-[var(--ink)] mt-2 leading-relaxed bg-[var(--paper-strong)] p-2.5 rounded-lg border border-[var(--line)]">
                  <span className="font-semibold text-[var(--ink)]">Хирургический протокол остеотомии: </span>
                  {mischAssessment.surgicalPreparationProtocolRu}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold text-[var(--ink)] block mb-1.5">
                  {hasRealVolume ? "Хирургический протокол сверления:" : "Базовый протокол сверления (по умолчанию):"}
                </span>
                <div className="drilling-step-list">
                  {drillSteps.map((s) => (
                    <div key={s.stepNumber} className="drilling-step-item">
                      <div className="step-num-badge">{s.stepNumber}</div>
                      <div className="flex-1">
                        <div className="font-bold text-[var(--ink)]">{s.drillName}</div>
                        <div className="text-[var(--muted)] text-[11px]">{s.depthGuideRu} • {s.targetRpm} RPM</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "diary" && (
            <div className="planner-section-card">
              <span className="section-title">
                <FileText size={16} className="text-[var(--teal)]" /> Протокол операции (Форма 043/у)
              </span>
              <pre className="p-3 bg-[var(--paper,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-lg text-[11px] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {audit.form043DiaryText}
              </pre>
            </div>
          )}

          {/* ACTION BUTTONS (TIER 1 / 0-CLICK) */}
          <div className="planner-actions-bar">
            <button
              type="button"
              onClick={handleAddToTreatmentPlan}
              className="action-btn-primary flex-1"
              data-testid="add-implant-to-plan-btn"
              title={
                audit.nerveSafety.isDangerous
                  ? "Внимание: клиренс до нижнечелюстного канала < 1.0 мм. Добавить в план по клиническому решению врача (Мандат 8e)"
                  : undefined
              }
            >
              <Award size={16} />
              <span>
                {audit.nerveSafety.isDangerous
                  ? `Добавить по решению врача (${audit.treatmentPlanItem.priceFormattedRu})`
                  : `Добавить в план лечения (${audit.treatmentPlanItem.priceFormattedRu})`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyDiary}
              className="action-btn-secondary"
              data-testid="copy-diary-btn"
            >
              <Copy size={16} />
              <span>Копировать Форму 043/у</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};