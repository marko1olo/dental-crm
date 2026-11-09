/**
 * @dental/web/components/orthodontics/OrthodonticsStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия ортодонтии и этапов лечения (Мандаты 8b, 8e, 8x, 8am).
 * Ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)): «✓ Зафиксировать активацию этапа».
 * Автономия врача (0 заблокированных кнопок), 1-клик пресеты активации,
 * контроль этапов элайнеров (шаг X из Y), замена дуг и эластиков, фотопротокол и ТРГ,
 * нативный мобильный Bottom Sheet Apple HIG (390×844) с тач-таргетами >= 44x44px.
 *
 * Sweet Spot: 400–480 строк (Мандат 8b/8zi).
 */

import React, { useState, useCallback, useMemo } from "react";
import { X, Check, Sparkles, Activity, Layers, ArrowRight, Copy, Clock, BookOpen, Smile, FileText, Camera } from "lucide-react";
import {
	APPLIANCES_CATALOG, ANGLE_CLASSES_CATALOG, ARCHWIRE_ALLOYS_SSOT, ARCHWIRE_SECTIONS_SSOT,
	ELASTICS_CATALOG, TRG_ANGLES_NORMS_SSOT, CHAIRSIDE_ACTIONS_CATALOG, ORTHO_ACTIVATION_PRESETS,
	ORTHO_PHOTO_SLOTS_SSOT, ORTHO_PATIENT_MEMO_SECTIONS, createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb, evaluateTrgAngleStatus, formatOrthoProtocolSoapEntry, getOrthoPatientMemoText,
	type ArchwireAlloy, type ArchwireSection, type OrthoProtocolState, type OrthoActivationPreset,
} from "./orthodonticsCatalogData";
if (typeof document !== "undefined") {
	import("./styles/orthodonticsStudio.css");
}

export interface OrthodonticsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialProtocol?: OrthoProtocolState;
	readonly onSaveProtocol?: (protocol: OrthoProtocolState, summarySoap: string) => void;
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
	patientName = "Смирнова Екатерина Андреевна",
	doctorName = "Д-р Соколов А. В.",
	visitId,
}) => {
	const [protocol, setProtocol] = useState<OrthoProtocolState>(() => {
		return initialProtocol ? { ...initialProtocol } : createDefaultOrthoProtocolState();
	});

	const [activeTab, setActiveTab] = useState<"brackets" | "aligners" | "photo_trg" | "diary">("brackets");
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	const skeletalClassInfo = useMemo(() => {
		const anbVal = protocol.trgValues.anb ?? 2.1;
		return calculateSkeletalClassFromAnb(anbVal);
	}, [protocol.trgValues.anb]);

	const soapSummary = useMemo(() => formatOrthoProtocolSoapEntry(protocol), [protocol]);
	const memoText = useMemo(() => getOrthoPatientMemoText(), []);

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
				updated.trgValues = { ...updated.trgValues, anb: 2.0 };
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

	const handleSaveProtocol = useCallback(() => {
		const updatedProtocol: OrthoProtocolState = { ...protocol, savedAt: new Date().toISOString() };
		onSaveProtocol?.(updatedProtocol, soapSummary);
		setFeedbackToast("✓ Активация этапа зафиксирована");
		setTimeout(() => {
			setFeedbackToast(null);
			onClose();
		}, 400);
	}, [protocol, soapSummary, onSaveProtocol, onClose]);

	const handleCopyText = useCallback((textToCopy: string, successMsg: string) => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(textToCopy);
			setFeedbackToast(successMsg);
			setTimeout(() => setFeedbackToast(null), 2000);
		}
	}, []);

	if (!isOpen) return null;

	const renderJawCard = (title: string, isUpper: boolean) => {
		const currentAlloy = isUpper ? protocol.upperAlloy : protocol.lowerAlloy;
		const currentSection = isUpper ? protocol.upperSection : protocol.lowerSection;
		const setAlloy = (a: ArchwireAlloy) => setProtocol((p) => (isUpper ? { ...p, upperAlloy: a } : { ...p, lowerAlloy: a }));
		const setSection = (s: ArchwireSection) => setProtocol((p) => (isUpper ? { ...p, upperSection: s } : { ...p, lowerSection: s }));

		return (
			<div className="ortho-card">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Layers className={`w-4 h-4 ${isUpper ? "text-[var(--teal,#0d9488)]" : "text-[var(--accent-glow,#38bdf8)]"}`} />
						<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">{title}</span>
					</div>
					{isUpper && (
						<button type="button" onClick={handleSyncUpperToLower} className="text-[11px] text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 font-medium min-h-[36px]">
							Копировать на НЧ <ArrowRight className="w-3 h-3" />
						</button>
					)}
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Сплав дуги:</span>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
						{ARCHWIRE_ALLOYS_SSOT.map((alloy) => (
							<button key={alloy.key} type="button" onClick={() => setAlloy(alloy.key)} className={`ortho-touch-button ${currentAlloy === alloy.key ? "selected" : ""}`}>
								{alloy.shortRu}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Сечение дуги:</span>
					<div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
						{ARCHWIRE_SECTIONS_SSOT.map((sec) => (
							<button key={sec.section} type="button" onClick={() => setSection(sec.section)} className={`ortho-touch-button ${currentSection === sec.section ? "selected" : ""}`}>
								{sec.dimensionRu}
							</button>
						))}
					</div>
				</div>
			</div>
		);
	};

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
					<div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
						<span className="text-[11px] font-semibold text-[var(--ink-muted)] shrink-0 flex items-center gap-1">
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" /> 1-клик шаблоны:
						</span>
						{ORTHO_ACTIVATION_PRESETS.map((preset) => (
							<button key={preset.id} type="button" onClick={() => handleApplyPreset(preset)} className="shrink-0 px-2.5 py-1 min-h-[32px] text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-all">
								{preset.title}
							</button>
						))}
					</div>
				</div>

				<div className="ortho-tabs-bar">
					<div className="flex items-center gap-1">
						<button type="button" onClick={() => setActiveTab("brackets")} className={`ortho-tab-btn ${activeTab === "brackets" ? "active" : ""}`}>
							<Layers className="w-3.5 h-3.5" /><span>Брекеты и дуги</span>
						</button>
						<button type="button" onClick={() => setActiveTab("aligners")} className={`ortho-tab-btn ${activeTab === "aligners" ? "active" : ""}`}>
							<Smile className="w-3.5 h-3.5" /><span>Элайнеры и капы</span>
						</button>
						<button type="button" onClick={() => setActiveTab("photo_trg")} className={`ortho-tab-btn ${activeTab === "photo_trg" ? "active" : ""}`}>
							<Camera className="w-3.5 h-3.5" /><span>Фото и ТРГ</span>
						</button>
						<button type="button" onClick={() => setActiveTab("diary")} className={`ortho-tab-btn ${activeTab === "diary" ? "active" : ""}`}>
							<FileText className="w-3.5 h-3.5" /><span>Дневник и памятка</span>
						</button>
					</div>
					{feedbackToast && (
						<div className="text-[11px] font-semibold text-[var(--teal,#0d9488)] px-2 py-0.5 rounded bg-[var(--teal-subtle,rgba(13,148,136,0.1))]">
							{feedbackToast}
						</div>
					)}
				</div>

				<div className="ortho-content-body">
					{activeTab === "brackets" && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{renderJawCard("Верхняя челюсть (ВЧ)", true)}
							{renderJawCard("Нижняя челюсть (НЧ)", false)}
							<div className="ortho-card">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Межчелюстные эластики</span>
									{protocol.selectedElasticId && (
										<button type="button" onClick={() => setProtocol((p) => ({ ...p, selectedElasticId: null }))} className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink)]">Снять тяги</button>
									)}
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{ELASTICS_CATALOG.map((elastic) => {
										const isSelected = protocol.selectedElasticId === elastic.id;
										return (
											<button key={elastic.id} type="button" onClick={() => setProtocol((p) => ({ ...p, selectedElasticId: isSelected ? null : elastic.id }))} className={`min-h-[44px] p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${isSelected ? "border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--ink)] shadow-sm" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
												<div className="flex items-center justify-between">
													<span className="text-xs font-bold">{elastic.classNameRu}</span>
													<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--line-subtle,#f1f5f9)]">{elastic.animalName}</span>
												</div>
												<div className="text-[11px] text-[var(--ink-muted)]">{elastic.forceOz} ({elastic.sizeInch})</div>
												<div className="text-[10px] text-[var(--teal,#0d9488)] font-medium">{elastic.hookSchemeRu}</div>
											</button>
										);
									})}
								</div>
							</div>
							<div className="ortho-card">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Манипуляции приёма в 1 клик</span>
								<div className="flex flex-wrap gap-1.5">
									{CHAIRSIDE_ACTIONS_CATALOG.map((action) => {
										const isChecked = protocol.selectedActionIds.includes(action.id);
										return (
											<button key={action.id} type="button" onClick={() => handleToggleAction(action.id)} className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border transition-all flex items-center gap-2 ${isChecked ? "border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] font-semibold shadow-sm" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
												<div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? "bg-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] text-white" : "border-[var(--line)] bg-[var(--paper)]"}`}>
													{isChecked && <Check className="w-3 h-3" />}
												</div>
												<span>{action.label}</span>
											</button>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{activeTab === "aligners" && (
						<div className="flex flex-col gap-4">
							<div className="ortho-card">
								<div className="flex items-center justify-between">
									<div>
										<h4 className="text-sm font-bold text-[var(--ink)]">Контроль этапов элайнеров</h4>
										<p className="text-xs text-[var(--ink-muted)]">Шаг {protocol.alignerTracking.currentStep} из {protocol.alignerTracking.totalSteps} (смена каждые {protocol.alignerTracking.wearDaysPerStep} дней)</p>
									</div>
									<button type="button" onClick={handleAdvanceAlignerStep} className="ortho-touch-button selected">
										+ Выдать следующий шаг
									</button>
								</div>
								<div className="ortho-aligner-progress-bar">
									<div className="ortho-aligner-progress-fill" style={{ width: `${Math.round((protocol.alignerTracking.currentStep / protocol.alignerTracking.totalSteps) * 100)}%` }} />
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
									<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col">
										<span className="text-[10px] text-[var(--ink-muted)]">Выдано комплектов</span>
										<span className="text-sm font-bold text-[var(--ink)]">{protocol.alignerTracking.issuedSetsCount} пары</span>
									</div>
									<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col">
										<span className="text-[10px] text-[var(--ink-muted)]">Плановая дата визита</span>
										<span className="text-sm font-bold text-[var(--ink)]">{protocol.alignerTracking.nextPlannedDate}</span>
									</div>
									<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col">
										<span className="text-[10px] text-[var(--ink-muted)]">Сепарация (IPR)</span>
										<span className="text-sm font-bold text-[var(--teal,#0d9488)]">{protocol.alignerTracking.iprCompleted ? "Выполнена ✓" : "Не требуется"}</span>
									</div>
									<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col">
										<span className="text-[10px] text-[var(--ink-muted)]">Аттачменты</span>
										<span className="text-sm font-bold text-[var(--teal,#0d9488)]">{protocol.alignerTracking.attachmentsVerified ? "В норме ✓" : "Требуется осмотр"}</span>
									</div>
								</div>
							</div>
							<div className="ortho-card">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Классификация прикуса по Энглю</span>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{ANGLE_CLASSES_CATALOG.map((ac) => {
										const isSelected = protocol.angleClass === ac.key;
										return (
											<button key={ac.key} type="button" onClick={() => setProtocol((p) => ({ ...p, angleClass: ac.key }))} className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 min-h-[44px] ${isSelected ? "border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--ink)] shadow-sm" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
												<div className="text-xs font-bold">{ac.titleRu}</div>
												<div className="text-[11px] text-[var(--ink-muted)] leading-relaxed">{ac.descriptionRu}</div>
											</button>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{activeTab === "photo_trg" && (
						<div className="flex flex-col gap-4">
							<div className="ortho-card">
								<div className="flex items-center justify-between">
									<div>
										<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Клинический фотопротокол</h4>
										<p className="text-[11px] text-[var(--ink-muted)]">5 стандартных проекций фиксации ортодонтического статуса</p>
									</div>
									<span className="text-xs font-semibold text-[var(--teal,#0d9488)]">✓ 6 из 6 зафиксировано</span>
								</div>
								<div className="ortho-photo-grid">
									{ORTHO_PHOTO_SLOTS_SSOT.map((slot) => {
										const isVerified = Boolean(protocol.photoStatuses[slot.id]);
										return (
											<div key={slot.id} onClick={() => handleTogglePhotoSlot(slot.id)} className={`ortho-photo-card cursor-pointer ${isVerified ? "verified" : ""}`}>
												<div className="flex items-center justify-between">
													<span className="text-xs font-bold text-[var(--ink)]">{slot.titleRu}</span>
													<span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isVerified ? "bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)]" : "bg-[var(--line-subtle,#f1f5f9)] text-[var(--ink-muted)]"}`}>
														{isVerified ? "Зафиксировано" : "Ожидает"}
													</span>
												</div>
												<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{slot.descriptionRu}</p>
											</div>
										);
									})}
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{TRG_ANGLES_NORMS_SSOT.map((norm) => {
									const currentVal = protocol.trgValues[norm.key] ?? norm.normDeg;
									const evaluation = evaluateTrgAngleStatus(norm.key, currentVal);
									return (
										<div key={norm.key} className="ortho-card">
											<div className="flex items-center justify-between">
												<span className="text-xs font-bold text-[var(--ink)]">{norm.symbol}</span>
												<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${evaluation.status === "normal" ? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)]" : "bg-[var(--warning-surface,rgba(245,158,11,0.1))] text-[var(--warning-ink,#f59e0b)]"}`}>
													{evaluation.badgeLabelRu}
												</span>
											</div>
											<div className="flex items-baseline gap-2">
												<span className="text-2xl font-extrabold text-[var(--ink)]">{currentVal}°</span>
												<span className="text-xs text-[var(--ink-muted)]">Норма: {norm.normDeg}° ± {norm.toleranceDeg}°</span>
											</div>
											<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{norm.interpretationRu}</p>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{activeTab === "diary" && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							<div className="ortho-card">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Дневник приёма (SOAP)</span>
									<button type="button" onClick={() => handleCopyText(soapSummary, "Дневник скопирован в буфер")} className="text-xs text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 font-semibold min-h-[36px]">
										<Copy className="w-3.5 h-3.5" /> В медкарту
									</button>
								</div>
								<pre className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{soapSummary}</pre>
							</div>

							<div className="ortho-card">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Памятка пациенту</span>
									<button type="button" onClick={() => handleCopyText(memoText, "Памятка скопирована")} className="text-xs text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 font-semibold min-h-[36px]">
										<BookOpen className="w-3.5 h-3.5" /> Копировать памятку
									</button>
								</div>
								<div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
									{ORTHO_PATIENT_MEMO_SECTIONS.map((sec) => (
										<div key={sec.id} className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
											<span className="text-xs font-bold text-[var(--ink)]">{sec.titleRu}</span>
											<span className="text-xs text-[var(--ink-muted)] leading-relaxed">{sec.textRu}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				<footer className="ortho-footer">
					<div className="text-xs text-[var(--ink-muted)] truncate hidden sm:flex items-center gap-2">
						<Activity className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>Ортодонтический приём: дуги, элайнеры, тяги и окклюзия</span>
					</div>
					<div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
						<button type="button" onClick={onClose} className="ortho-secondary-btn">
							Отмена
						</button>
						<button
							type="button"
							data-testid="save-ortho-protocol-button"
							onClick={handleSaveProtocol}
							style={{ backgroundColor: "var(--teal, #0d9488)" }}
							className="ortho-primary-cta w-full sm:w-auto"
						>
							<Check className="w-4 h-4 shrink-0" />
							<span>✓ Зафиксировать активацию этапа</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default OrthodonticsStudioModal;
