/**
 * @dental/web/components/orthodontics/OrthodonticsStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия ортодонтии и этапов лечения (Мандаты 8b, 8e, 8x, 8am).
 * Ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)): «✓ Зафиксировать активацию этапа».
 * Автономия врача (0 заблокированных кнопок), 1-клик пресеты активации,
 * контроль этапов элайнеров (шаг X из Y), замена дуг и эластиков, фотопротокол и ТРГ,
 * нативный мобильный Bottom Sheet Apple HIG (390×844) с тач-таргетами >= 44x44px.
 */

import React, { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { X, Check, Sparkles, Activity, Layers, Clock, Smile, FileText, Camera } from "lucide-react";
import {
	APPLIANCES_CATALOG, ORTHO_ACTIVATION_PRESETS, createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb, formatOrthoProtocolSoapEntry, getOrthoPatientMemoText,
	type OrthoProtocolState, type OrthoActivationPreset, ELASTICS_CATALOG,
} from "./orthodonticsCatalogData";
import { formatOrthodonticPatientMemo } from "./orthodonticPatientMemo";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "./CephalometricCanvas";
import { OrthodonticsTabsContent } from "./OrthodonticsTabsContent";
import { subscribeCephSyncChannel, getActiveCephStudy } from "./cephStudioSyncChannel";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { lazyWithRetry } from "../../lib/lazyWithRetry";

export { formatOrthodonticPatientMemo, type OrthodonticPatientMemoParams } from "./orthodonticPatientMemo";

if (typeof document !== "undefined") {
	import("./styles/orthodonticsStudio.css");
}

const ClinicalPhotoProtocolModal = lazyWithRetry(() =>
	import("../photography/ClinicalPhotoProtocolModal").then((m) => ({ default: m.ClinicalPhotoProtocolModal })),
);
const CephalometricAnalysisModal = lazyWithRetry(() =>
	import("../radiology/cephModal/CephalometricAnalysisModalUI").then((m) => ({ default: m.CephalometricAnalysisModal })),
);

export interface OrthodonticsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialProtocol?: OrthoProtocolState;
	readonly onSaveProtocol?: (protocol: OrthoProtocolState, summarySoap: string) => void | Promise<void>;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly clinicName?: string;
	readonly visitId?: string;
}

export const OrthodonticsStudioModal: React.FC<OrthodonticsStudioModalProps> = ({
	isOpen,
	onClose,
	initialProtocol,
	onSaveProtocol,
	patientName: propPatientName,
	patientId,
	doctorName: propDoctorName,
	visitId,
}) => {
	const isDemo = isDemoShowcaseMode();
	const patientName = (propPatientName && propPatientName.trim()) || (isDemo ? "Смирнова Екатерина Андреевна" : "Пациент");
	const doctorName = (propDoctorName && propDoctorName.trim()) || (isDemo ? "Д-р Соколов А. В." : "Лечащий врач");

	const [protocol, setProtocol] = useState<OrthoProtocolState>(() => {
		return initialProtocol ? { ...initialProtocol } : createDefaultOrthoProtocolState();
	});

	const [activeTab, setActiveTab] = useState<"brackets" | "aligners" | "photo_trg" | "diary">("brackets");
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
	const [selectedElasticSize, setSelectedElasticSize] = useState<string>("3/16 Medium");
	const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);

	// Честная гидратация данных пациента из базы PostgreSQL 18
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;
		const fetchProgress = async () => {
			try {
				const res = await fetch(`/api/orthodontics/${patientId}/progress`, {
					headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
				});
				if (res.ok) {
					const data = (await res.json()) as {
						currentAligner?: number;
						totalAligners?: number;
						currentStage?: number;
						archwire?: string;
						lastActionSummary?: string;
					};
					if (!isCancelled && data) {
						setProtocol((prev) => ({
							...prev,
							...(data.currentAligner
								? {
										alignerTracking: {
											...prev.alignerTracking,
											currentStep: data.currentAligner,
											totalSteps: data.totalAligners ?? prev.alignerTracking.totalSteps,
										},
								  }
								: {}),
							...(data.currentStage ? { currentMonth: data.currentStage } : {}),
						}));
					}
				}
			} catch (err) {
				if (!isCancelled) {
					console.warn("[OrthodonticsStudioModal] Failed to fetch ortho progress:", err);
				}
			}
		};
		fetchProgress();
		return () => {
			isCancelled = true;
		};
	}, [patientId]);

	const skeletalClassInfo = useMemo(() => {
		const anbVal = protocol.trgValues?.anb ?? 2.1;
		return calculateSkeletalClassFromAnb(anbVal);
	}, [protocol.trgValues?.anb]);

	// Честная гидратация ТРГ-анализа пациента из базы PostgreSQL 18 (DEF-ORTHO-03)
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;
		const fetchCephAnalysis = async () => {
			try {
				const res = await fetch(`/api/orthodontics/${patientId}/ceph-analysis`, {
					headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
				});
				if (res.ok) {
					const data = (await res.json()) as {
						study?: {
							analysis?: {
								sna?: number;
								snb?: number;
								anb?: number;
								u1NaDeg?: number;
								l1NbDeg?: number;
								fmaDeg?: number;
							};
						};
					};
					if (!isCancelled && data?.study?.analysis) {
						const ca = data.study.analysis;
						setProtocol((prev) => ({
							...prev,
							trgValues: {
								...(prev.trgValues || {}),
								...(typeof ca.sna === "number" ? { sna: ca.sna } : {}),
								...(typeof ca.snb === "number" ? { snb: ca.snb } : {}),
								...(typeof ca.anb === "number" ? { anb: ca.anb } : {}),
								...(typeof ca.u1NaDeg === "number" ? { u1_na: ca.u1NaDeg } : {}),
								...(typeof ca.l1NbDeg === "number" ? { l1_nb: ca.l1NbDeg } : {}),
								...(typeof ca.fmaDeg === "number" ? { fma: ca.fmaDeg } : {}),
							},
						}));
					}
				}
			} catch (err) {
				if (!isCancelled) {
					console.warn("[OrthodonticsStudioModal] Failed to fetch ceph analysis:", err);
				}
			}
		};
		fetchCephAnalysis();
		return () => {
			isCancelled = true;
		};
	}, [patientId]);

	// Реактивная синхронизация ТРГ через BroadcastChannel (DEF-1)
	useEffect(() => {
		const cachedStudy = getActiveCephStudy<{
			analysis?: { sna?: number; snb?: number; anb?: number; u1NaDeg?: number; l1NbDeg?: number; fmaDeg?: number };
			measurements?: Array<{ parameterKey?: string; parameter?: string; value: number | null }>;
		}>();
		if (cachedStudy) {
			const mList = cachedStudy.measurements;
			if (Array.isArray(mList) && mList.length > 0) {
				const vals: Record<string, number> = {};
				for (const m of mList) {
					const k = (m.parameterKey || m.parameter || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
					if (typeof m.value === "number") vals[k] = m.value;
				}
				if (Object.keys(vals).length > 0) {
					setProtocol((prev) => ({
						...prev,
						trgValues: { ...(prev.trgValues || {}), ...vals },
					}));
				}
			}
		}

		const unsubscribe = subscribeCephSyncChannel((msg) => {
			if (msg.type === "CEPH_STUDY_CACHED" || msg.type === "CEPH_ANALYSIS_UPDATED") {
				const study = msg.payload as {
					measurements?: Array<{ parameterKey?: string; parameter?: string; value: number | null }>;
					analysis?: { sna?: number; snb?: number; anb?: number; u1NaDeg?: number; l1NbDeg?: number; fmaDeg?: number };
				};
				const mList = study?.measurements;
				if (Array.isArray(mList) && mList.length > 0) {
					const vals: Record<string, number> = {};
					for (const m of mList) {
						const k = (m.parameterKey || m.parameter || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
						if (typeof m.value === "number") vals[k] = m.value;
					}
					if (Object.keys(vals).length > 0) {
						setProtocol((prev) => ({
							...prev,
							trgValues: { ...(prev.trgValues || {}), ...vals },
						}));
					}
				} else if (study?.analysis) {
					const ca = study.analysis;
					setProtocol((prev) => ({
						...prev,
						trgValues: {
							...(prev.trgValues || {}),
							...(typeof ca.sna === "number" ? { sna: ca.sna } : {}),
							...(typeof ca.snb === "number" ? { snb: ca.snb } : {}),
							...(typeof ca.anb === "number" ? { anb: ca.anb } : {}),
							...(typeof ca.u1NaDeg === "number" ? { u1_na: ca.u1NaDeg } : {}),
							...(typeof ca.l1NbDeg === "number" ? { l1_nb: ca.l1NbDeg } : {}),
							...(typeof ca.fmaDeg === "number" ? { fma: ca.fmaDeg } : {}),
						},
					}));
				}
			}
		});

		return () => {
			unsubscribe();
		};
	}, []);

	const soapSummary = useMemo(() => formatOrthoProtocolSoapEntry(protocol), [protocol]);
	const memoText = useMemo(() => {
		const elastic = ELASTICS_CATALOG.find((e) => e.id === protocol.selectedElasticId);
		const isPlate = protocol.applianceCategory === "plate";
		return formatOrthodonticPatientMemo({
			clinicName: "Стоматологическая клиника DENTE",
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
	}, [doctorName, patientName, protocol, selectedElasticSize]);

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
		setTimeout(() => setFeedbackToast(null), 2200);
	}, []);

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
		setTimeout(() => setFeedbackToast(null), 2000);
	}, []);

	const handleAdvanceAlignerStep = useCallback(() => {
		setProtocol((prev) => {
			const nextStep = Math.min(prev.alignerTracking.currentStep + 1, prev.alignerTracking.totalSteps);
			return { ...prev, alignerTracking: { ...prev.alignerTracking, currentStep: nextStep } };
		});
		setFeedbackToast("✓ Выдан следующий комплект кап");
		setTimeout(() => setFeedbackToast(null), 2000);
	}, []);

	const handleTogglePhotoSlot = useCallback((slotId: string) => {
		setProtocol((prev) => ({
			...prev,
			photoStatuses: { ...prev.photoStatuses, [slotId]: !prev.photoStatuses[slotId] },
		}));
	}, []);

	const handleSaveProtocol = useCallback(async () => {
		const updatedProtocol: OrthoProtocolState = { ...protocol, savedAt: new Date().toISOString() };

		if (onSaveProtocol) {
			try {
				await onSaveProtocol(updatedProtocol, soapSummary);
			} catch (err) {
				console.warn("[OrthodonticsStudioModal] onSaveProtocol error:", err);
			}
		}

		if (patientId) {
			try {
				if (protocol.applianceCategory === "aligners") {
					const alignerCount = protocol.alignerTracking.issuedSetsCount > 0
						? protocol.alignerTracking.issuedSetsCount
						: (protocol.alignerTracking.currentStep > 0 ? protocol.alignerTracking.currentStep : 1);
					await fetch(`/api/orthodontics/${patientId}/aligners/issue-set`, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							alignerCount,
							wearDaysPerAligner: protocol.alignerTracking.wearDaysPerStep || 14,
							totalAligners: protocol.alignerTracking.totalSteps || 24,
							note: `Выдача комплекта элайнеров (актуальный шаг ${protocol.alignerTracking.currentStep} из ${protocol.alignerTracking.totalSteps})`,
						}),
					});
				} else if (protocol.applianceCategory === "plate") {
					await fetch(`/api/orthodontics/${patientId}/stages/advance`, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							nextStage: Math.max(1, protocol.currentMonth || 1),
							stageTitle: `Активация аппарата / винта: ${protocol.applianceName}`,
							note: protocol.clinicalNotes || protocol.notes || "Контрольный осмотр и активация расширяющего винта пластинки",
						}),
					});
				} else {
					const materialMap: Record<string, "NiTi" | "CuNiTi" | "SS" | "TMA"> = {
						niti: "NiTi",
						cuniti: "CuNiTi",
						ss: "SS",
						tma: "TMA",
						NiTi: "NiTi",
						CuNiTi: "CuNiTi",
						SS: "SS",
						TMA: "TMA",
					};
					const upperMat = materialMap[protocol.upperAlloy] || "CuNiTi";
					const lowerMat = materialMap[protocol.lowerAlloy] || "CuNiTi";

					if (upperMat === lowerMat && protocol.upperSection === protocol.lowerSection) {
						await fetch(`/api/orthodontics/${patientId}/archwire-change`, {
							method: "POST",
							headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
							body: JSON.stringify({
								material: upperMat,
								section: protocol.upperSection,
								arch: "both",
								applianceCategory: "brackets",
								isWireChange: true,
								note: "Плановая смена ортодонтических дуг ВЧ + НЧ",
							}),
						});
					} else {
						// Сохраняем параметры обеих дуг: ВЧ и НЧ
						await fetch(`/api/orthodontics/${patientId}/archwire-change`, {
							method: "POST",
							headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
							body: JSON.stringify({
								material: upperMat,
								section: protocol.upperSection,
								arch: "upper",
								applianceCategory: "brackets",
								isWireChange: true,
								note: `Смена дуги ВЧ: ${upperMat} ${protocol.upperSection}`,
							}),
						});
						await fetch(`/api/orthodontics/${patientId}/archwire-change`, {
							method: "POST",
							headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
							body: JSON.stringify({
								material: lowerMat,
								section: protocol.lowerSection,
								arch: "lower",
								applianceCategory: "brackets",
								isWireChange: true,
								note: `Смена дуги НЧ: ${lowerMat} ${protocol.lowerSection}`,
							}),
						});
					}

					await fetch(`/api/orthodontics/${patientId}/ligatures-activate`, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							powerChain: protocol.selectedActionIds.includes("power_chain"),
							applianceCategory: "brackets",
							note: "Активация лигатур",
						}),
					});
				}

				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente:emr-entry-added", {
							detail: {
								patientId,
								type: "orthodontic_protocol",
								text: soapSummary,
								savedAt: new Date().toISOString(),
							},
						}),
					);
				}
				showToast("✓ Активация этапа успешно зафиксирована в ЭМК", "success");
			} catch (err) {
				console.warn("[OrthodonticsStudioModal] Save error:", err);
				showToast("Сетевой сбой при фиксации этапа. Данные сохранены локально.", "warning");
			}
		}

		setFeedbackToast("✓ Активация этапа зафиксирована");
		setTimeout(() => {
			setFeedbackToast(null);
			onClose();
		}, 400);
	}, [protocol, soapSummary, onSaveProtocol, patientId, onClose]);

	const handleCopyText = useCallback((textToCopy: string, successMsg: string) => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(textToCopy);
			setFeedbackToast(successMsg);
			setTimeout(() => setFeedbackToast(null), 2000);
		}
	}, []);

	if (!isOpen) return null;

	return (
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
					<button type="button" onClick={onClose} aria-label="Закрыть студию" className="ortho-close-btn">
						<X className="w-5 h-5" />
					</button>
				</header>

				<div className="ortho-subbar">
					<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
						<div className="flex items-center gap-2 flex-wrap">
							<select
								value={protocol.applianceId}
								onChange={(e) => {
									const item = APPLIANCES_CATALOG.find((a) => a.id === e.target.value);
									if (item) setProtocol((p) => ({ ...p, applianceId: item.id, applianceCategory: item.category, applianceName: item.name }));
								}}
								className="h-8 px-2 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer"
							>
								{APPLIANCES_CATALOG.map((app) => (<option key={app.id} value={app.id}>{app.name}</option>))}
							</select>
							<span className="px-2 py-1 rounded-lg bg-[var(--line-subtle,#f1f5f9)] text-[var(--ink-muted)] font-medium">Месяц {protocol.currentMonth} из {protocol.totalMonths}</span>
							<span className="px-2 py-1 rounded-lg bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] font-semibold">{skeletalClassInfo.skeletalClass} класс</span>
						</div>
						<div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
							<Clock className="w-3.5 h-3.5" />
							<span>Следующий визит через {protocol.nextVisitWeeks} нед.</span>
						</div>
					</div>
					<div className="flex items-center gap-1.5 flex-wrap py-0.5 max-w-full">
						<span className="text-[11px] font-semibold text-[var(--ink-muted)] shrink-0 flex items-center gap-1">
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" /> Клинические шаблоны:
						</span>
						{ORTHO_ACTIVATION_PRESETS.map((preset) => (
							<button key={preset.id} type="button" onClick={() => handleApplyPreset(preset)} className="shrink-0 whitespace-nowrap px-2.5 py-1 min-h-[30px] text-[11px] sm:text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-all cursor-pointer">
								{preset.title}
							</button>
						))}
					</div>
				</div>

				<div className="ortho-tabs-bar">
					<div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-1 w-full">
						<button type="button" onClick={() => setActiveTab("brackets")} className={`ortho-tab-btn ${activeTab === "brackets" ? "active" : ""}`}>
							<Layers className="w-3.5 h-3.5 shrink-0" /><span>Брекеты и дуги</span>
						</button>
						<button type="button" onClick={() => setActiveTab("aligners")} className={`ortho-tab-btn ${activeTab === "aligners" ? "active" : ""}`}>
							<Smile className="w-3.5 h-3.5 shrink-0" /><span>Элайнеры и капы</span>
						</button>
						<button type="button" onClick={() => setActiveTab("photo_trg")} className={`ortho-tab-btn ${activeTab === "photo_trg" ? "active" : ""}`}>
							<Camera className="w-3.5 h-3.5 shrink-0" /><span>Фото и ТРГ</span>
						</button>
						<button type="button" onClick={() => setActiveTab("diary")} className={`ortho-tab-btn ${activeTab === "diary" ? "active" : ""}`}>
							<FileText className="w-3.5 h-3.5 shrink-0" /><span>Дневник и памятка</span>
						</button>
					</div>
					{feedbackToast && (
						<div className="text-[11px] font-semibold text-[var(--teal,#0d9488)] px-2 py-0.5 rounded bg-[var(--teal-subtle,rgba(13,148,136,0.1))] shrink-0">
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
				/>

				<footer className="ortho-footer">
					<div className="text-xs text-[var(--ink-muted)] truncate hidden sm:flex items-center gap-2">
						<Activity className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>Ортодонтический приём: дуги, элайнеры, тяги и окклюзия</span>
					</div>
					<div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 w-full sm:w-auto justify-end">
						<button type="button" onClick={onClose} className="ortho-secondary-btn w-full sm:w-auto">
							Отмена
						</button>
						<button
							type="button"
							data-testid="save-ortho-protocol-button"
							onClick={handleSaveProtocol}
							style={{ backgroundColor: "var(--teal-fill, var(--teal, #0d9488))", color: "var(--on-teal, #ffffff)" }}
							className="ortho-primary-cta w-full sm:w-auto"
						>
							<Check className="w-4 h-4 shrink-0" />
							<span>Зафиксировать активацию этапа</span>
						</button>
					</div>
				</footer>
			</div>

			{isPhotoModalOpen && (
				<Suspense fallback={null}>
					<ClinicalPhotoProtocolModal
						isOpen={true}
						onClose={() => setIsPhotoModalOpen(false)}
						patientId={patientId || "pat-ortho-01"}
						patientName={patientName}
						doctorName={doctorName}
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
							if (record?.slotId) {
								setProtocol((prev) => ({
									...prev,
									photoStatuses: { ...prev.photoStatuses, [record.slotId!]: true },
								}));
							}
						}}
					/>
				</Suspense>
			)}

			{isCephModalOpen && (
				<Suspense fallback={null}>
					<CephalometricAnalysisModal
						isOpen={true}
						onClose={() => setIsCephModalOpen(false)}
						patientId={patientId || "pat-ortho-01"}
						patientName={patientName}
						initialImageUrl={SAMPLE_TRG_CEPHALOGRAM_URL}
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
		</div>
	);
};

export default OrthodonticsStudioModal;
