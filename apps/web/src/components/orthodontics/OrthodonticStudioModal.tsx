/**
 * @dental/web/components/orthodontics/OrthodonticStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия ортодонтии и протокол визита (Мандаты 8b, 8e, 8x, 8am).
 * Ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)), автономия врача (кнопка сохранения НИКОГДА не disabled),
 * 1-клик пресеты этапов активации, выбор аппаратуры, классификация прикуса по Энглю,
 * нативный мобильный Bottom Sheet Apple HIG (390×844) с сенсорным минимумом >= 44×44px и 0px горизонтального скролла.
 *
 * Sweet Spot: 380–480 строк.
 */

import React, { useState, useCallback, useMemo } from "react";
import { X, Check, Sparkles, Activity, Layers, ArrowRight, Copy, Clock, BookOpen, Smile, FileText } from "lucide-react";
import {
	APPLIANCES_CATALOG,
	ANGLE_CLASSES_CATALOG,
	ARCHWIRE_ALLOYS_SSOT,
	ARCHWIRE_SECTIONS_SSOT,
	ELASTICS_CATALOG,
	TRG_ANGLES_NORMS_SSOT,
	CHAIRSIDE_ACTIONS_CATALOG,
	ORTHO_ACTIVATION_PRESETS,
	ORTHO_PATIENT_MEMO_SECTIONS,
	createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb,
	evaluateTrgAngleStatus,
	formatOrthoProtocolSoapEntry,
	getOrthoPatientMemoText,
	type ArchwireAlloy,
	type ArchwireSection,
	type OrthoProtocolState,
	type OrthoActivationPreset,
} from "./orthodonticsCatalogData";

export interface OrthodonticStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialProtocol?: OrthoProtocolState;
	readonly onSaveProtocol?: (protocol: OrthoProtocolState, summarySoap: string) => void;
	readonly patientName?: string;
	readonly doctorName?: string;
	readonly visitId?: string;
}

export const OrthodonticStudioModal: React.FC<OrthodonticStudioModalProps> = ({
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

	const [activeTab, setActiveTab] = useState<"activation" | "bite" | "memo" | "soap">("activation");
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	const skeletalClassInfo = useMemo(() => {
		const anbVal = protocol.trgValues.anb ?? 2.1;
		return calculateSkeletalClassFromAnb(anbVal);
	}, [protocol.trgValues.anb]);

	const soapSummary = useMemo(() => formatOrthoProtocolSoapEntry(protocol), [protocol]);
	const memoText = useMemo(() => getOrthoPatientMemoText(), []);

	const handleApplyPreset = useCallback((preset: OrthoActivationPreset) => {
		setProtocol((prev) => ({
			...prev,
			upperAlloy: preset.upperAlloy,
			upperSection: preset.upperSection,
			lowerAlloy: preset.lowerAlloy,
			lowerSection: preset.lowerSection,
			selectedElasticId: preset.elasticId,
			selectedActionIds: [...preset.actionIds],
			nextVisitWeeks: preset.nextVisitWeeks,
		}));
		setFeedbackToast(`Применён: «${preset.title}»`);
		setTimeout(() => setFeedbackToast(null), 2200);
	}, []);

	const handleToggleAction = useCallback((actionId: string) => {
		setProtocol((prev) => {
			const exists = prev.selectedActionIds.includes(actionId);
			const nextActions = exists ? prev.selectedActionIds.filter((id) => id !== actionId) : [...prev.selectedActionIds, actionId];
			return { ...prev, selectedActionIds: nextActions };
		});
	}, []);

	const handleSyncUpperToLower = useCallback(() => {
		setProtocol((prev) => ({ ...prev, lowerAlloy: prev.upperAlloy, lowerSection: prev.upperSection }));
		setFeedbackToast("Параметры дуги ВЧ скопированы на НЧ");
		setTimeout(() => setFeedbackToast(null), 2000);
	}, []);

	const handleSaveProtocol = useCallback(() => {
		const updatedProtocol: OrthoProtocolState = { ...protocol, savedAt: new Date().toISOString() };
		onSaveProtocol?.(updatedProtocol, soapSummary);
		setFeedbackToast("✓ Приём ортодонта зафиксирован");
		setTimeout(() => {
			setFeedbackToast(null);
			onClose();
		}, 450);
	}, [protocol, soapSummary, onSaveProtocol, onClose]);

	const handleCopyText = useCallback((textToCopy: string, successMsg: string) => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(textToCopy);
			setFeedbackToast(successMsg);
			setTimeout(() => setFeedbackToast(null), 2000);
		}
	}, []);

	if (!isOpen) return null;

	const renderJawSelector = (title: string, isUpper: boolean) => {
		const currentAlloy = isUpper ? protocol.upperAlloy : protocol.lowerAlloy;
		const currentSection = isUpper ? protocol.upperSection : protocol.lowerSection;
		const setAlloy = (a: ArchwireAlloy) => setProtocol((p) => (isUpper ? { ...p, upperAlloy: a } : { ...p, lowerAlloy: a }));
		const setSection = (s: ArchwireSection) => setProtocol((p) => (isUpper ? { ...p, upperSection: s } : { ...p, lowerSection: s }));

		return (
			<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-3">
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
							<button key={alloy.key} type="button" onClick={() => setAlloy(alloy.key)} className={`min-h-[44px] px-2 py-1 text-xs font-semibold rounded-lg border transition-all text-center flex items-center justify-center ${currentAlloy === alloy.key ? "border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] shadow-sm" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
								{alloy.shortRu}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Размер сечения:</span>
					<div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
						{ARCHWIRE_SECTIONS_SSOT.map((sec) => (
							<button key={sec.section} type="button" onClick={() => setSection(sec.section)} className={`min-h-[44px] px-2 py-1 text-xs font-medium rounded-lg border transition-all text-center flex items-center justify-center ${currentSection === sec.section ? "border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] font-bold shadow-sm" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
								{sec.dimensionRu}
							</button>
						))}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" data-testid="orthodontic-studio-modal">
			<div className="w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[88vh] bg-[var(--paper-strong)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink)]">
				<div className="w-full flex justify-center pt-2 pb-1 sm:hidden">
					<div className="w-9 h-1 rounded-full bg-[var(--line)]" />
				</div>

				<header className="px-4 py-3 bg-[var(--paper-strong)] border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-line,rgba(13,148,136,0.2))]">
							<Activity className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h2 className="text-sm sm:text-base font-bold tracking-tight text-[var(--ink)] truncate">
									<span className="sm:hidden">Ортодонтическая студия</span>
									<span className="hidden sm:inline">Ортодонтический протокол приёма</span>
								</h2>
								<span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border border-[var(--teal-line,rgba(13,148,136,0.2))]">
									SSOT
								</span>
							</div>
							<p className="text-xs text-[var(--ink-muted)] truncate">
								<span className="sm:hidden">{patientName}</span>
								<span className="hidden sm:inline">{patientName} · {doctorName} {visitId ? `· #${visitId}` : ""}</span>
							</p>
						</div>
					</div>
					<button type="button" onClick={onClose} aria-label="Закрыть студию" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors">
						<X className="w-5 h-5" />
					</button>
				</header>

				<div className="px-4 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] shrink-0 flex flex-col gap-2">
					<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
						<div className="flex items-center gap-2">
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
							<span className="px-2 py-1 rounded-lg bg-[var(--line-subtle)] text-[var(--ink-muted)] font-medium">Месяц {protocol.currentMonth} из {protocol.totalMonths}</span>
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
							<button key={preset.id} type="button" onClick={() => handleApplyPreset(preset)} className="shrink-0 px-2.5 py-1 min-h-[32px] text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-all active:scale-95">
								{preset.title}
							</button>
						))}
					</div>
				</div>

				<div className="px-4 pt-2 bg-[var(--paper-strong)] border-b border-[var(--line)] shrink-0 flex items-center justify-between">
					<div className="flex items-center gap-1">
						<button type="button" onClick={() => setActiveTab("activation")} className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors min-h-[40px] flex items-center gap-1.5 ${activeTab === "activation" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)]" : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
							<Layers className="w-3.5 h-3.5" /><span>Дуги и тяги</span>
						</button>
						<button type="button" onClick={() => setActiveTab("bite")} className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors min-h-[40px] flex items-center gap-1.5 ${activeTab === "bite" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)]" : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
							<Smile className="w-3.5 h-3.5" /><span>Прикус и ТРГ</span>
						</button>
						<button type="button" onClick={() => setActiveTab("memo")} className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors min-h-[40px] flex items-center gap-1.5 ${activeTab === "memo" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)]" : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
							<BookOpen className="w-3.5 h-3.5" /><span>Памятка пациенту</span>
						</button>
						<button type="button" onClick={() => setActiveTab("soap")} className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors min-h-[40px] flex items-center gap-1.5 ${activeTab === "soap" ? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)]" : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
							<FileText className="w-3.5 h-3.5" /><span>Дневник приёма</span>
						</button>
					</div>
					{feedbackToast && (
						<div className="text-[11px] font-semibold text-[var(--teal,#0d9488)] px-2 py-0.5 rounded bg-[var(--teal-subtle,rgba(13,148,136,0.1))]">
							{feedbackToast}
						</div>
					)}
				</div>

				<div className="flex-1 overflow-y-auto p-3.5 sm:p-5 flex flex-col gap-4">
					{activeTab === "activation" && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{renderJawSelector("Верхняя челюсть (ВЧ)", true)}
							{renderJawSelector("Нижняя челюсть (НЧ)", false)}

							<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-3">
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
													<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--line-subtle)]">{elastic.animalName}</span>
												</div>
												<div className="text-[11px] text-[var(--ink-muted)]">{elastic.forceOz} ({elastic.sizeInch})</div>
												<div className="text-[10px] text-[var(--teal,#0d9488)] font-medium">{elastic.hookSchemeRu}</div>
											</button>
										);
									})}
								</div>
							</div>

							<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-3">
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

					{activeTab === "bite" && (
						<div className="flex flex-col gap-4">
							<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2.5">
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

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{TRG_ANGLES_NORMS_SSOT.map((norm) => {
									const currentVal = protocol.trgValues[norm.key] ?? norm.normDeg;
									const evaluation = evaluateTrgAngleStatus(norm.key, currentVal);
									return (
										<div key={norm.key} className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
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

					{activeTab === "memo" && (
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Памятка для пациента по уходу за аппаратурой</span>
								<button type="button" onClick={() => handleCopyText(memoText, "Памятка скопирована")} className="text-xs text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 font-semibold min-h-[36px]">
									<Copy className="w-3.5 h-3.5" /> Копировать текст памятки
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{ORTHO_PATIENT_MEMO_SECTIONS.map((sec) => (
									<div key={sec.id} className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1.5">
										<h4 className="text-xs font-bold text-[var(--ink)]">{sec.titleRu}</h4>
										<p className="text-xs text-[var(--ink-muted)] leading-relaxed">{sec.textRu}</p>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "soap" && (
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Клинический протокол приёма (SOAP)</span>
								<button type="button" onClick={() => handleCopyText(soapSummary, "Дневник скопирован в буфер")} className="text-xs text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 font-semibold min-h-[36px]">
									<Copy className="w-3.5 h-3.5" /> Копировать в медицинскую карту
								</button>
							</div>
							<pre className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] whitespace-pre-wrap leading-relaxed">{soapSummary}</pre>
						</div>
					)}
				</div>

				{/* Нижняя панель действий (Apple HIG Floating Bottom Bar): РОВНО 1 PRIMARY CTA КНОПКА #0d9488 */}
				<footer className="px-3.5 py-3 sm:px-5 sm:py-3.5 bg-[var(--paper-strong)] border-t border-[var(--line)] flex items-center justify-between shrink-0 gap-3">
					<div className="text-xs text-[var(--ink-muted)] truncate hidden sm:flex items-center gap-2">
						<Activity className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>Ортодонтический приём: фиксация дуг, тяг и окклюзии</span>
					</div>

					<div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
						<button type="button" onClick={onClose} className="min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-subtle)] transition-colors">
							Отмена
						</button>

						{/* РОДНАЯ И ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 (Мандаты 8am, 8e) */}
						<button
							type="button"
							data-testid="save-ortho-protocol-button"
							onClick={handleSaveProtocol}
							className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-md hover:opacity-95 active:scale-95 transition-all"
							style={{ backgroundColor: "var(--teal, #0d9488)" }}
						>
							<Check className="w-4 h-4 shrink-0" />
							<span className="sm:hidden">Зафиксировать приём</span>
							<span className="hidden sm:inline">Зафиксировать ортодонтический приём</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default OrthodonticStudioModal;
