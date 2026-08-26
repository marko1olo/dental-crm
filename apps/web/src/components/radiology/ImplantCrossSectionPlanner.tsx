import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Compass,
  Copy,
  Crown,
  FileText,
  Layers,
  Maximize2,
  Play,
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
  auditAlveolarBoneContainment,
  auditMandibularNerveSafety,
  calculateApexCoordinates,
  findImplantSpec,
  performCbctPlanningAudit,
  STANDARD_IMPLANT_CATALOG,
  type AlveolarRidgeEnvelope,
  type ComprehensiveCbctPlanAudit,
  type CrossSectionImplantPose,
  type ImplantBrandKey,
  type MandibularCanalCrossSection,
  type VirtualImplantSpec,
} from "./implantSafetyEngine";
import "./implantCrossSectionPlanner.css";

export interface ImplantCrossSectionPlannerProps {
  readonly toothFdi?: number;
  readonly patientName?: string;
  readonly initialBrand?: ImplantBrandKey;
  readonly initialDiameterMm?: number;
  readonly initialLengthMm?: number;
  readonly onPlanApproved?: (audit: ComprehensiveCbctPlanAudit) => void;
  readonly onClose?: () => void;
}

const SCALE_PX_PER_MM = 10.0;

export const ImplantCrossSectionPlanner: React.FC<ImplantCrossSectionPlannerProps> = ({
  toothFdi = 46,
  patientName = "Иванов И.И.",
  initialBrand = "osstem",
  initialDiameterMm = 4.0,
  initialLengthMm = 10.0,
  onPlanApproved,
  onClose,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<ImplantBrandKey>(initialBrand);
  const [diameterMm, setDiameterMm] = useState<number>(initialDiameterMm);
  const [lengthMm, setLengthMm] = useState<number>(initialLengthMm);
  const [entryX, setEntryX] = useState<number>(14.0);
  const [entryY, setEntryY] = useState<number>(5.0);
  const [angulationDeg, setAngulationDeg] = useState<number>(0);

  const [coronalHU, setCoronalHU] = useState<number>(1150);
  const [trabecularHU, setTrabecularHU] = useState<number>(850);
  const [apicalHU, setApicalHU] = useState<number>(950);

  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"viewport" | "misch" | "diary">("viewport");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const canal: MandibularCanalCrossSection = useMemo(() => ({
    center: { x: 14.0, y: 26.5 },
    radiusMm: 1.5,
    safetyMarginMm: 2.0,
  }), []);

  const envelope: AlveolarRidgeEnvelope = useMemo(() => ({
    crestPoint: { x: 14.0, y: 4.5 },
    basePoint: { x: 14.0, y: 32.0 },
    buccalCrestPoint: { x: 8.5, y: 5.0 },
    lingualCrestPoint: { x: 19.5, y: 5.0 },
    ridgeWidthMm: 11.0,
    ridgeHeightMm: 27.5,
  }), []);

  const currentSpec: VirtualImplantSpec = useMemo(() => {
    return findImplantSpec(selectedBrand, diameterMm, lengthMm);
  }, [selectedBrand, diameterMm, lengthMm]);

  const implantPose: CrossSectionImplantPose = useMemo(() => ({
    entryPoint: { x: entryX, y: entryY },
    angulationDeg,
    implantSpec: currentSpec,
  }), [entryX, entryY, angulationDeg, currentSpec]);

  const huSampling: HUZoneSampling = useMemo(() => {
    return computeHUZoneProfile(coronalHU, trabecularHU, apicalHU);
  }, [coronalHU, trabecularHU, apicalHU]);

  const boneQuality: MischClassificationResult = useMemo(() => {
    return analyzeMischBoneQuality(huSampling, diameterMm);
  }, [huSampling, diameterMm]);

  const audit: ComprehensiveCbctPlanAudit = useMemo(() => {
    return performCbctPlanningAudit({
      toothFdi,
      implantPose,
      canal,
      envelope,
      huSampling,
      patientName,
    });
  }, [toothFdi, implantPose, canal, envelope, huSampling, patientName]);

  const drillSteps = useMemo(() => {
    return generateMischDrillSequence(boneQuality.mischClass, diameterMm, lengthMm);
  }, [boneQuality.mischClass, diameterMm, lengthMm]);

  useEffect(() => {
    if (audit.nerveSafety.shouldTriggerAudioAlarm && isAudioEnabled) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } catch (e) {
        // AudioContext ignored in unsupported environments
      }
    }
  }, [audit.nerveSafety.shouldTriggerAudioAlarm, isAudioEnabled]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyDiary = () => {
    navigator.clipboard.writeText(audit.form043DiaryText);
    showToast("✅ Протокол операции скопирован в буфер для Формы 043/у!");
  };

  const handleAddToTreatmentPlan = () => {
    if (onPlanApproved) {
      onPlanApproved(audit);
    }
    showToast("✅ Установка " + currentSpec.brandName + " " + currentSpec.lineName + " добавлена в план лечения!");
  };

  const handleResetCenter = () => {
    setEntryX(envelope.crestPoint.x);
    setEntryY(envelope.crestPoint.y);
    setAngulationDeg(0);
  };

  const viewW = 280;
  const viewH = 360;
  const pxEntryX = entryX * SCALE_PX_PER_MM;
  const pxEntryY = entryY * SCALE_PX_PER_MM;
  const pxApexX = audit.apexPoint.x * SCALE_PX_PER_MM;
  const pxApexY = audit.apexPoint.y * SCALE_PX_PER_MM;

  const pxCanalX = canal.center.x * SCALE_PX_PER_MM;
  const pxCanalY = canal.center.y * SCALE_PX_PER_MM;
  const pxCanalR = canal.radiusMm * SCALE_PX_PER_MM;
  const pxSafetyR = (canal.radiusMm + canal.safetyMarginMm) * SCALE_PX_PER_MM;

  const statusColor = audit.nerveSafety.isDangerous
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
            </div>
            <p className="text-xs text-[var(--muted)]">
              Пациент: {patientName} • Виртуальная примерка имплантата с коридором безопасности 2.0 мм
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`chip-button ${isAudioEnabled ? "active" : ""}`}
            title="Звуковой сигнал опасности при сближении с нервом < 1.0 мм"
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>Звук тревоги</span>
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
      <div className={`nerve-alarm-banner ${audit.nerveSafety.safetyStatus}`}>
        <div className="flex items-center gap-2">
          {audit.nerveSafety.isDangerous ? (
            <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce" />
          ) : audit.nerveSafety.isWarning ? (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          )}
          <span>{audit.nerveSafety.clinicalMessageRu}</span>
        </div>
        <div className="text-xs font-bold px-2.5 py-1 rounded-md bg-white/70 backdrop-blur-sm shadow-sm">
          Дистанция: {audit.nerveSafety.netClearanceToCanalWallMm.toFixed(1)} мм
        </div>
      </div>

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
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--muted)] flex items-center gap-1.5">
              <Layers size={14} /> Кросс-секционный срез КЛКТ (масштаб 1:1)
            </span>
            <button
              type="button"
              onClick={handleResetCenter}
              className="text-xs font-semibold text-[var(--teal)] hover:underline flex items-center gap-1"
            >
              <RotateCw size={12} /> Центрировать
            </button>
          </div>

          <div className="cbct-slice-canvas-wrapper">
            <svg className="cbct-svg-viewport" viewBox={`0 0 ${viewW} ${viewH}`}>
              <defs>
                <pattern id="boneGrain" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="0.8" fill="#1e293b" />
                  <circle cx="6" cy="6" r="0.8" fill="#1e293b" />
                </pattern>
                <radialGradient id="nerveGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </radialGradient>
              </defs>

              {/* Alveolar Bone Contour */}
              <path
                d="M 50,50 Q 80,45 140,45 Q 200,45 230,50 L 220,320 Q 140,335 60,320 Z"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="2"
              />
              <path
                d="M 50,50 Q 80,45 140,45 Q 200,45 230,50 L 220,320 Q 140,335 60,320 Z"
                fill="url(#boneGrain)"
                opacity="0.6"
              />

              {/* Alveolar Crest Line */}
              <line x1="40" y1="45" x2="240" y2="45" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
              <text x="45" y="40" fill="#64748b" fontSize="9" fontWeight="bold">Крестальный гребень</text>

              {/* Mandibular Canal 2.0 mm Safety Corridor Halo */}
              <circle
                cx={pxCanalX}
                cy={pxCanalY}
                r={pxSafetyR}
                fill="url(#nerveGlow)"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text x={pxCanalX + pxSafetyR + 4} y={pxCanalY - 4} fill="#f59e0b" fontSize="8" fontWeight="bold">
                Зона безопасности 2.0 мм
              </text>

              {/* Mandibular Canal Core */}
              <circle
                cx={pxCanalX}
                cy={pxCanalY}
                r={pxCanalR}
                fill="#dc2626"
                stroke="#f87171"
                strokeWidth="2"
              />
              <text x={pxCanalX} y={pxCanalY + 3} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                IAN
              </text>

              {/* Distance Line from Apex to Nerve */}
              <line
                x1={pxApexX}
                y1={pxApexY}
                x2={audit.nerveSafety.closestNervePoint.x * SCALE_PX_PER_MM}
                y2={audit.nerveSafety.closestNervePoint.y * SCALE_PX_PER_MM}
                stroke={statusColor}
                strokeWidth="2"
                strokeDasharray="3 2"
              />

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

              {/* Live Clearance Tag Box */}
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
            </svg>
          </div>

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
                    {[3.5, 4.0, 4.3, 4.5, 5.0].map((d) => (
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
                    {[8.0, 10.0, 11.5, 13.0].map((l) => (
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
            <div className="planner-section-card">
              <div className="flex items-center justify-between">
                <span className="section-title">
                  <Activity size={16} className="text-[var(--teal)]" /> Оценка плотности кости (Misch)
                </span>
                <span className={`misch-badge-pill ${boneQuality.mischClass}`}>
                  Класс {boneQuality.mischClass}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <div className="range-slider-row">
                  <div className="slider-label-bar">
                    <span>Кортикальный гребень (Coronal 20%)</span>
                    <span>{coronalHU} HU</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="1800"
                    step="50"
                    value={coronalHU}
                    onChange={(e) => setCoronalHU(parseInt(e.target.value, 10))}
                    className="planner-range-input"
                  />
                </div>

                <div className="range-slider-row">
                  <div className="slider-label-bar">
                    <span>Губчатый слой (Trabecular 60%)</span>
                    <span>{trabecularHU} HU</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1400"
                    step="50"
                    value={trabecularHU}
                    onChange={(e) => setTrabecularHU(parseInt(e.target.value, 10))}
                    className="planner-range-input"
                  />
                </div>

                <div className="range-slider-row">
                  <div className="slider-label-bar">
                    <span>Апикальная опора (Apical 20%)</span>
                    <span>{apicalHU} HU</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="1600"
                    step="50"
                    value={apicalHU}
                    onChange={(e) => setApicalHU(parseInt(e.target.value, 10))}
                    className="planner-range-input"
                  />
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold text-[var(--ink)] block mb-1.5">
                  Хирургический протокол сверления:
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
              disabled={audit.nerveSafety.isDangerous}
              className="action-btn-primary flex-1"
              data-testid="add-implant-to-plan-btn"
            >
              <Award size={16} />
              <span>Добавить в план лечения ({audit.treatmentPlanItem.priceFormattedRu})</span>
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