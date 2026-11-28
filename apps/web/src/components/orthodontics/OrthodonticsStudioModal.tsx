/**
 * @dental/web/components/orthodontics/OrthodonticsStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия ортодонтии и этапов лечения (Мандаты 8b, 8e, 8x, 8am).
 * Ровно ОДНА Primary CTA кнопка (var(--primary)): «✓ Зафиксировать активацию этапа».
 * Автономия врача (0 заблокированных кнопок), готовые клинические пресеты активации,
 * контроль этапов элайнеров (шаг X из Y), замена дуг и эластиков, фотопротокол и ТРГ,
 * нативный мобильный Bottom Sheet Apple HIG (390×844) с тач-таргетами >= 44x44px.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense } from "react";
import { X, Check, Sparkles, Activity, Layers, Clock, Smile, FileText, Camera, Calculator } from "lucide-react";
import {
	APPLIANCES_CATALOG, ORTHO_ACTIVATION_PRESETS, createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb, formatOrthoProtocolSoapEntry, getOrthoPatientMemoText,
	type OrthoProtocolState, type OrthoActivationPreset, ELASTICS_CATALOG,
} from "./orthodonticsCatalogData";
import { formatOrthodonticPatientMemo } from "./orthodonticPatientMemo";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "./CephalometricCanvas";
import { OrthodonticsTabsContent } from "./OrthodonticsTabsContent";
import { useOrthodonticsStudioHydration } from "./useOrthodonticsStudioHydration";
import { saveOrthodonticProtocolToApi } from "./orthodonticsStudioPersistence";
import type { CephalometricSavedStudy } from "./cephalometricPersistence";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { showToast } from "../GlobalToast";

export { formatOrthodonticPatientMemo, type OrthodonticPatientMemoParams } from "./orthodonticPatientMemo";

if (typeof document !== "undefined") {
	import("./styles/orthodonticsStudio.css");
}

const ClinicalPhotoProtocolModal = lazyWithRetry(() =>
	import("../photography/ClinicalPhotoProtocolModal").then((m) => ({ default: m.ClinicalPhotoProtocolModal })),
);
const CephalometricAnalysisModal = lazyWithRetry(() =>
	import("./CephAnalysisModal").then((m) => ({ default: m.CephalometricAnalysisModal })),
);

export interface OrthodonticsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialProtocol?: OrthoProtocolState | undefined;
	readonly onSaveProtocol?: ((protocol: OrthoProtocolState, summarySoap: string) => void | Promise<void>) | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly totalSetupCostKopecks?: bigint | undefined;
}

export const OrthodonticsStudioModal: React.FC<OrthodonticsStudioModalProps> = ({
	isOpen,
	onClose,
	initialProtocol,
	onSaveProtocol,
	patientName: propPatientName,
	patientId,
	doctorName: propDoctorName,
	clinicName: propClinicName,
	visitId,
	treatmentPlanId,
	totalSetupCostKopecks,
}) => {
	const isDemo = isDemoShowcaseMode();
	const patientName = (propPatientName && propPatientName.trim()) || (isDemo ? "Смирнова Екатерина Андреевна" : "Пациент не выбран");
	const doctorName = (propDoctorName && propDoctorName.trim()) || (isDemo ? "Д-р Соколов А. В." : "Лечащий врач");
	const resolvedClinicName = (propClinicName && propClinicName.trim()) || (isDemo ? "Стоматологическая клиника DENTE" : "Стоматологическая клиника");

	const [protocol, setProtocol] = useState<OrthoProtocolState>(() => {
		return initialProtocol ? { ...initialProtocol } : createDefaultOrthoProtocolState();
	});

	const [activeTab, setActiveTab] = useState<"brackets" | "aligners" | "photo_trg" | "biometrics" | "diary">("brackets");
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
	const [selectedElasticSize, setSelectedElasticSize] = useState<string>("3/16 Medium");
	const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const isSavingRef = useRef<boolean>(false);
	const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

	const clearAllTimers = useCallback(() => {
		for (const timer of timersRef.current) {
			clearTimeout(timer);
		}
		timersRef.current.clear();
	}, []);

	const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
		const timer = setTimeout(() => {
			timersRef.current.delete(timer);
			fn();
		}, ms);
		timersRef.current.add(timer);
	}, []);

	useEffect(() => () => clearAllTimers(), [clearAllTimers]);

	// Zero-Leak Draft (Мандаты 8d/8zq, 8bn): сброс локального черновика при закрытии модалки
	const handleClose = useCallback(() => {
		clearAllTimers();
		setFeedbackToast(null);
		setProtocol(createDefaultOrthoProtocolState());
		onClose();
	}, [clearAllTimers, onClose]);

	useEffect(() => {
		if (!isOpen) {
			clearAllTimers();
			setProtocol(initialProtocol ? { ...initialProtocol } : createDefaultOrthoProtocolState());
		}
	}, [isOpen, initialProtocol, clearAllTimers]);

	// Честная гидратация данных пациента из базы PostgreSQL 18 и ТРГ-синхронизация
	const { cephStudy, setCephStudy } = useOrthodonticsStudioHydration(patientId, setProtocol);

	const skeletalClassInfo = useMemo(() => {
		const anbVal = protocol.trgValues?.anb ?? 2.1;
		return calculateSkeletalClassFromAnb(anbVal);
	}, [protocol.trgValues?.anb]);

	const soapSummary = useMemo(() => formatOrthoProtocolSoapEntry(protocol), [protocol]);
	const memoText = useMemo(() => {
		const elastic = ELASTICS_CATALOG.find((e) => e.id === protocol.selectedElasticId);
		const isPlate = protocol.applianceCategory === "plate";
		return formatOrthodonticPatientMemo({
			clinicName: resolvedClinicName,
			doctorName,
			patientName,
			bracketSystem: protocol.applianceName,
			archwireMaterial: isPlate ? undefined : `${protocol.upperAlloy.toUpperCase()} (ВЧ) / ${protocol.lowerAlloy.toUpperCase()} (НЧ)`,
			archwireSection: isPlate ? undefined : `${protocol.upperSection} (ВЧ) / ${protocol.lowerSection} (НЧ)`,
			targetArch: "both",
			elasticScheme: elastic ? `${elastic.classNameRu} (${elastic.animalName})` : undefined,
			elasticSize: selectedElasticSize,
			isAligners: protocol.applianceCategory === "aligners",
			isPlate,
			currentAligner: protocol.alignerTracking.currentStep || 1,
			totalAligners: protocol.alignerTracking.totalSteps || 24,
			notes: protocol.clinicalNotes || protocol.notes,
		});
	}, [resolvedClinicName, doctorName, patientName, protocol, selectedElasticSize]);

	const handleApplyPreset = useCallback((preset: OrthoActivationPreset) => {
		setProtocol((prev) => {
			const updated = {
				...prev,
				upperAlloy: preset.upperAlloy,
				upperSection: preset.upperSection,
				lowerAlloy: preset.lowerAlloy,
				lowerSection: preset.lowerSection,
				selectedElasticId: preset.elasticId,
				selectedActionIds: [...preset.actionIds],
				nextVisitWeeks: preset.nextVisitWeeks,
			};
			if (preset.id === "class_1_norm") {
				updated.angleClass = "class_1";
				updated.trgValues = { ...(updated.trgValues || {}), anb: 2.0 };
			} else if (preset.id === "aligners_28d") {
				updated.applianceCategory = "aligners";
				updated.alignerTracking = { ...updated.alignerTracking, issuedSetsCount: 2, wearDaysPerStep: 14 };
				setActiveTab("aligners");
			} else if (preset.id === "wire_niti_014") {
				updated.applianceCategory = "brackets";
				setActiveTab("brackets");
			}
			return updated;
		});
		setFeedbackToast(`Применён: «${preset.title}»`);
		scheduleTimeout(() => setFeedbackToast(null), 2200);
	}, [scheduleTimeout]);

	const handleToggleAction = useCallback((actionId: string) => {
		setProtocol((prev) => {
			const exists = prev.selectedActionIds.includes(actionId);
			const next = exists ? prev.selectedActionIds.filter((id) => id !== actionId) : [...prev.selectedActionIds, actionId];
			return { ...prev, selectedActionIds: next };
		});
	}, []);

	const handleSyncUpperToLower = useCallback(() => {
		setProtocol((prev) => ({ ...prev, lowerAlloy: prev.upperAlloy, lowerSection: prev.upperSection }));
		setFeedbackToast("Параметры дуги ВЧ скопированы на НЧ");
		scheduleTimeout(() => setFeedbackToast(null), 2000);
	}, [scheduleTimeout]);

	const handleAdvanceAlignerStep = useCallback(() => {
		setProtocol((prev) => {
			const nextStep = Math.min(prev.alignerTracking.currentStep + 1, prev.alignerTracking.totalSteps);
			return { ...prev, alignerTracking: { ...prev.alignerTracking, currentStep: nextStep } };
		});
		setFeedbackToast("✓ Выдан следующий комплект кап");
		scheduleTimeout(() => setFeedbackToast(null), 2000);
	}, [scheduleTimeout]);

	const handleTogglePhotoSlot = useCallback((slotId: string) => {
		setProtocol((prev) => ({
			...prev,
			photoStatuses: { ...prev.photoStatuses, [slotId]: !prev.photoStatuses[slotId] },
		}));
	}, []);

	const handleSaveProtocol = useCallback(async () => {
		if (isSavingRef.current) return;
		isSavingRef.current = true;
		setIsSaving(true);
		try {
			const saved = await saveOrthodonticProtocolToApi({
				protocol,
				soapSummary,
				skeletalClass: skeletalClassInfo.skeletalClass,
				patientId,
				visitId,
				treatmentPlanId: treatmentPlanId ?? protocol.treatmentPlanId,
				onSaveProtocol,
			});
			if (!saved) {
				return;
			}

			setFeedbackToast("✓ Активация этапа зафиксирована");
			scheduleTimeout(() => {
				setFeedbackToast(null);
				setProtocol(createDefaultOrthoProtocolState());
				onClose();
			}, 400);
		} finally {
			isSavingRef.current = false;
			setIsSaving(false);
		}
	}, [protocol, soapSummary, skeletalClassInfo.skeletalClass, patientId, visitId, treatmentPlanId, onSaveProtocol, onClose, scheduleTimeout]);

	const handleCopyText = useCallback((textToCopy: string, successMsg: string) => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(textToCopy);
			setFeedbackToast(successMsg);
			scheduleTimeout(() => setFeedbackToast(null), 2000);
		}
	}, [scheduleTimeout]);

	if (!isOpen) return null;

	return (
		<>
		<div className="ortho-studio-backdrop" role="dialog" aria-modal="true" data-testid="orthodontic-studio-modal">
			<div className="ortho-studio-modal">
				<div className="ortho-drag-handle-wrapper">
					<div className="ortho-drag-handle" />
				</div>
				<header className="ortho-header">
					<div className="flex items-center gap-3 min-w-0">
						<div className="ortho-header-icon">
							<Activity className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h2 className="text-sm sm:text-base font-bold tracking-tight text-[var(--ink)] truncate">
									<span>Ортодонтическая студия</span>
								</h2>
							</div>
							<p className="text-xs text-[var(--ink-muted)] truncate">
								<span className="sm:hidden">{patientName}</span>
								<span className="hidden sm:inline">{patientName} · {doctorName} {visitId ? `· #${visitId}` : ""}</span>
							</p>
						</div>
					</div>
					<button type="button" onClick={handleClose} aria-label="Закрыть студию" className="ortho-close-btn">
						<X className="w-5 h-5" />
					</button>
				</header>

				<div className="ortho-subbar">
					<div className="flex flex-wrap items-center justify-between gap-2 text-xs min-w-0">
						<div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
							<select
								value={protocol.applianceId}
								onChange={(e) => {
									const item = APPLIANCES_CATALOG.find((a) => a.id === e.target.value);
									if (item) setProtocol((p) => ({ ...p, applianceId: item.id, applianceCategory: item.category, applianceName: item.name }));
								}}
								className="w-full sm:w-auto max-w-full min-w-0 h-8 px-2 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer"
							>
								{APPLIANCES_CATALOG.map((app) => (<option key={app.id} value={app.id}>{app.name}</option>))}
							</select>
							<span className="px-2 py-1 rounded-lg bg-[var(--paper-soft)] text-[var(--ink-muted)] font-medium">Месяц {protocol.currentMonth} из {protocol.totalMonths}</span>
							<span className="px-2 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] font-semibold">{skeletalClassInfo.skeletalClass} класс</span>
						</div>
						<div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
							<Clock className="w-3.5 h-3.5" />
							<span>Следующий визит через {protocol.nextVisitWeeks} нед.</span>
						</div>
					</div>
					<div className="ortho-presets-scroll">
						<span className="text-[11px] font-semibold text-[var(--ink-muted)] shrink-0 flex items-center gap-1">
							<Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" /> Шаблоны:
						</span>
						{ORTHO_ACTIVATION_PRESETS.map((preset) => (
							<button key={preset.id} type="button" onClick={() => handleApplyPreset(preset)} className="shrink-0 whitespace-nowrap px-2.5 py-1 min-h-[30px] text-[11px] sm:text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all cursor-pointer">
								{preset.title}
							</button>
						))}
					</div>
				</div>

				<div className="ortho-tabs-bar">
					<div className="ortho-tabs-scroll">
						<button type="button" onClick={() => setActiveTab("brackets")} className={`ortho-tab-btn ${activeTab === "brackets" ? "active" : ""}`}>
							<Layers className="w-3.5 h-3.5 shrink-0" />
							<span>
								<span className="sm:hidden">Дуги</span>
								<span className="hidden sm:inline">Брекеты и дуги</span>
							</span>
						</button>
						<button type="button" onClick={() => setActiveTab("aligners")} className={`ortho-tab-btn ${activeTab === "aligners" ? "active" : ""}`}>
							<Smile className="w-3.5 h-3.5 shrink-0" />
							<span>
								<span className="sm:hidden">Каппы</span>
								<span className="hidden sm:inline">Элайнеры и капы</span>
							</span>
						</button>
						<button type="button" onClick={() => setActiveTab("photo_trg")} className={`ortho-tab-btn ${activeTab === "photo_trg" ? "active" : ""}`}>
							<Camera className="w-3.5 h-3.5 shrink-0" />
							<span>
								<span className="sm:hidden">ТРГ</span>
								<span className="hidden sm:inline">Фото и ТРГ</span>
							</span>
						</button>
						<button type="button" onClick={() => setActiveTab("biometrics")} className={`ortho-tab-btn ${activeTab === "biometrics" ? "active" : ""}`}>
							<Calculator className="w-3.5 h-3.5 shrink-0" />
							<span>
								<span className="sm:hidden">Индексы</span>
								<span className="hidden sm:inline">Биометрия</span>
							</span>
						</button>
						<button type="button" onClick={() => setActiveTab("diary")} className={`ortho-tab-btn ${activeTab === "diary" ? "active" : ""}`}>
							<FileText className="w-3.5 h-3.5 shrink-0" />
							<span>
								<span className="sm:hidden">ЭМК</span>
								<span className="hidden sm:inline">Дневник и памятка</span>
							</span>
						</button>
					</div>
					{feedbackToast && (
						<div className="text-[11px] font-semibold text-[var(--primary)] px-2 py-0.5 rounded bg-[var(--primary)]/10 shrink-0">
							{feedbackToast}
						</div>
					)}
				</div>

				<OrthodonticsTabsContent
					activeTab={activeTab}
					protocol={protocol}
					setProtocol={setProtocol}
					selectedElasticSize={selectedElasticSize}
					setSelectedElasticSize={setSelectedElasticSize}
					handleToggleAction={handleToggleAction}
					handleSyncUpperToLower={handleSyncUpperToLower}
					handleAdvanceAlignerStep={handleAdvanceAlignerStep}
					handleTogglePhotoSlot={handleTogglePhotoSlot}
					handleCopyText={handleCopyText}
					soapSummary={soapSummary}
					memoText={memoText}
					onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
					onOpenCephModal={() => setIsCephModalOpen(true)}
					totalSetupCostKopecks={totalSetupCostKopecks}
					cephStudy={cephStudy}
					onUpdateCephStudy={setCephStudy}
				/>

				<footer className="ortho-footer">
					<div className="text-xs text-[var(--ink-muted)] truncate hidden sm:flex items-center gap-2">
						<Activity className="w-4 h-4 text-[var(--primary)]" />
						<span>Ортодонтический приём: дуги, элайнеры, тяги и окклюзия</span>
					</div>
					<div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 w-full sm:w-auto justify-end">
						<button type="button" onClick={handleClose} className="ortho-secondary-btn w-full sm:w-auto">
							Отмена
						</button>
						<button
							type="button"
							data-testid="save-ortho-protocol-button"
							aria-busy={isSaving}
							onClick={handleSaveProtocol}
							className="ortho-primary-cta w-full sm:w-auto"
						>
							<Check className="w-4 h-4 shrink-0" />
							<span>{isSaving ? "Сохранение..." : "Зафиксировать активацию этапа"}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
		{isPhotoModalOpen && (
			<Suspense fallback={null}>
				<ClinicalPhotoProtocolModal
					key={patientId || "photo_protocol"}
					isOpen={true}
					onClose={() => setIsPhotoModalOpen(false)}
					patientId={patientId || ""}
					patientName={patientName}
					doctorName={doctorName}
					clinicName={resolvedClinicName}
					initialPresetId="orthodontic_8"
					onSaveProtocol={(slots) => {
						const slotKeys = Object.keys(slots);
						if (slotKeys.length > 0) {
							setProtocol((prev) => {
								const updatedStatuses = { ...prev.photoStatuses };
								slotKeys.forEach((slotId) => {
									if (slots[slotId]?.imageUrl) {
										updatedStatuses[slotId] = true;
									}
								});
								return { ...prev, photoStatuses: updatedStatuses };
							});
							showToast("✓ Фотопротокол сохранён в ортодонтическую карту", "success");
						}
					}}
					onPhotoSaved={(res) => {
						const record = res as { slotId?: string } | undefined;
						const slotId = record?.slotId;
						if (slotId) {
							setProtocol((prev) => ({
								...prev,
								photoStatuses: { ...prev.photoStatuses, [slotId]: true },
							}));
						}
					}}
				/>
			</Suspense>
		)}
		{isCephModalOpen && (
			<Suspense fallback={null}>
				<CephalometricAnalysisModal
					key={patientId || "ceph_modal"}
					isOpen={true}
					onClose={() => setIsCephModalOpen(false)}
					patientId={patientId || ""}
					patientName={patientName}
					initialImageUrl={cephStudy?.imageUrl ?? (isDemo ? SAMPLE_TRG_CEPHALOGRAM_URL : undefined)}
					onApplyAnalysis={({ trgValues }) => {
						setProtocol((prev) => ({
							...prev,
							trgValues: {
								...(prev.trgValues || {}),
								...trgValues,
							},
						}));
						showToast("✓ Углы ТРГ применены в ортодонтический протокол", "success");
					}}
				/>
			</Suspense>
		)}
		</>
	);
};

export default OrthodonticsStudioModal;
