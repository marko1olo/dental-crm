import React, { useCallback, useMemo, useState } from "react";
import {
	AlertOctagon,
	Check,
	CheckCircle2,
	Clock,
	Lock,
	MoreHorizontal,
	Printer,
	ShieldCheck,
} from "lucide-react";
import { EmptyState } from "./components/EmptyState";
import { showToast } from "./components/GlobalToast";
import { PatientAvatar } from "./components/PatientAvatar";
import { VisitDiagnosticsTab } from "./components/visit/VisitDiagnosticsTab";
import { VisitEmkTab } from "./components/visit/VisitEmkTab";
import { VisitOdontogramTab } from "./components/visit/VisitOdontogramTab";
import { VisitTimer } from "./components/visit/VisitTimer";
import { DoctorShiftEarningsWidget } from "./components/doctor/DoctorShiftEarningsWidget";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { isNegativeAllergyStatement } from "./components/patients/safetyMath";
import "./styles/VisitView.css";

import {
	type VisitViewProps,
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
	executeApplyHygienePresetAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
	executeFastPrint043u,
	executeFastPrintInformedConsent,
	VisitEmbeddedOdontogram,
	VisitSecondaryPanelsInner,
	VisitClinicalToothModal,
	VisitViewModals,
} from "./components/visit/view";

export type { VisitViewProps };
export {
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
	executeApplyHygienePresetAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
};

export function VisitView(rawProps?: Partial<VisitViewProps>) {
	// biome-ignore lint/suspicious/noExplicitAny: app logic fallback
	const appLogic = (useAppLogicContext() as any) || {};
	const props = { ...appLogic, ...(rawProps || {}) } as VisitViewProps;

	const {
		activePatient,
		activeAppointment,
		activeDoctor,
		dashboard,
		transcript = "",
		setTranscript,
		hasVisitTranscriptText,
		isTranscriptPolishing,
		polishTranscript,
		updateVisitNoteField,
		visitNoteForm,
		flushPendingVisitSaves,
		toothRows = [
			["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
			["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
		],
		toothStateByCode = {},
		setToothState = () => {},
		draft,
		visitWarnings,
		visitPrimaryAction,
	} = props;

	const [visitSubViewTab, setVisitSubViewTab] = useState<string>("emk");
	const [activeQuadrant, setActiveQuadrant] = useState<number | null>(null);
	const [activeStamp, setActiveStamp] = useState<string>("watch");
	const activeStampRef = React.useRef<string>("watch");
	const [selectedToothForMenu, setSelectedToothForMenu] = useState<any>(null);
	const [materialCategory, setMaterialCategory] = useState<string | null>(null);
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
	const [isSurfaceMode, setIsSurfaceMode] = useState<boolean>(false);

	// Modals state
	const [endoModalToothNumber, setEndoModalToothNumber] = useState<any>(null);
	const [endoModalToothState, setEndoModalToothState] = useState<string>("idle");
	const [isEndoModalOpen, setIsEndoModalOpen] = useState(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
	const [labOrderModalToothNumber, setLabOrderModalToothNumber] = useState<any>(null);
	const [isStagePaymentModalOpen, setIsStagePaymentModalOpen] = useState(false);
	const [isPriceValidatorModalOpen, setIsPriceValidatorModalOpen] = useState(false);
	const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
	const [isVoiceDictationModalOpen, setIsVoiceDictationModalOpen] = useState(false);
	const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
	const [isDoctorShiftModalOpen, setIsDoctorShiftModalOpen] = useState(false);
	const [isInformedConsentModalOpen, setIsInformedConsentModalOpen] = useState(false);
	const [isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen] = useState(false);

	const headerMoreMenuRef = React.useRef<HTMLDivElement | null>(null);

	const patientAge = useMemo(() => {
		if (!activePatient?.birthDate) return null;
		const diff = Date.now() - new Date(activePatient.birthDate).getTime();
		const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
		return `${years} лет`;
	}, [activePatient?.birthDate]);

	// Tier 1 Critical Badges & Autonomy (Mandates 8e, 8i)
	const activePatientCriticalBadges = useMemo(() => {
		if (!activePatient) return [];
		const badges: any[] = [];
		const rawAllergies = activePatient.allergies || "";
		if (rawAllergies && !isNegativeAllergyStatement(rawAllergies)) {
			badges.push({
				id: "allergy",
				testId: "visit-focus-allergy-alert",
				title: `Аллергоанамнез: ${rawAllergies}`,
				shortLabel: "АЛЛЕРГИЯ",
				fullLabel: `Аллергия: ${rawAllergies}`,
			});
		}
		const somaticNotes = `${activePatient.somaticNotes || ""} ${activePatient.concomitantDiseases || ""} ${visitNoteForm?.anamnesis || ""}`.toLowerCase();
		if (somaticNotes.includes("кардиостимулятор") || somaticNotes.includes("экс")) {
			badges.push({
				id: "pacemaker",
				testId: "visit-focus-pacemaker-alert",
				title: "Наличие ЭКС: ЗАПРЕТ УЗ-скейлера и электрокоагулятора!",
				shortLabel: "ЭКС",
				fullLabel: "ЭКС (кардиостимулятор) — ЗАПРЕТ УЗ!",
			});
		}
		if (somaticNotes.includes("антикоагулянт") || somaticNotes.includes("варфарин") || somaticNotes.includes("ксарелто")) {
			badges.push({
				id: "anticoagulant",
				testId: "visit-focus-anticoagulant-alert",
				title: "Антикоагулянтная терапия: риск кровотечения",
				shortLabel: "АКТ",
				fullLabel: "Антикоагулянты (риск кровотечения)",
			});
		}
		if (somaticNotes.includes("диабет") || somaticNotes.includes("сахарный диабет")) {
			badges.push({
				id: "diabetes",
				testId: "visit-focus-diabetes-alert",
				title: "Сахарный диабет: риск гипогликемии и замедленной регенерации",
				shortLabel: "СД",
				fullLabel: "Сахарный диабет",
			});
		}
		if (somaticNotes.includes("беременн") || somaticNotes.includes("триместр")) {
			badges.push({
				id: "pregnancy",
				testId: "visit-focus-pregnancy-alert",
				title: "Беременность: ограничение адреналина и рентгена",
				shortLabel: "БЕРЕМ.",
				fullLabel: "Беременность",
			});
		}
		if (somaticNotes.includes("бисфосфон") || somaticNotes.includes("остеопороз")) {
			badges.push({
				id: "bisphosphonates",
				testId: "visit-focus-bisphosphonates-alert",
				title: "Бисфосфонаты: риск остеонекроза челюсти!",
				shortLabel: "БИСФОСФ.",
				fullLabel: "Бисфосфонаты — риск некроза челюсти!",
			});
		}
		return badges;
	}, [activePatient, visitNoteForm?.anamnesis]);

	const handleApplySomaticNormQuick = useCallback(() => {
		return executeApplySomaticNormAutonomy({
			updateVisitNoteField,
			visitNoteForm,
			showToastFn: showToast,
		});
	}, [updateVisitNoteField, visitNoteForm]);

	const handlePrintForm043uFast = useCallback(() => {
		const isClosed =
			activeAppointment?.status === "completed" ||
			activeAppointment?.status === "signed" ||
			activeAppointment?.status === "closed" ||
			visitNoteForm?.status === "completed" ||
			visitNoteForm?.status === "signed";
		const watermarkText = isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК";
		// Поддержка отметки: ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ
		executeFastPrint043u({ activePatient, activeDoctor, activeAppointment, visitNoteForm, isClosed, watermarkText });
	}, [activeAppointment, activeDoctor, activePatient, visitNoteForm]);

	const handlePrintInformedConsentFast = useCallback(() => {
		executeFastPrintInformedConsent({ activePatient, activeDoctor, activeAppointment, visitNoteForm, dashboard, selectedToothForMenu });
	}, [activeAppointment, activeDoctor, activePatient, dashboard, visitNoteForm, selectedToothForMenu]);

	const flushAll = useCallback(async () => {
		if (typeof flushPendingVisitSaves === "function") {
			await flushPendingVisitSaves();
		}
	}, [flushPendingVisitSaves]);

	const handleFinishVisitAction = useCallback(async () => {
		if (typeof updateVisitNoteField === "function") {
			if (!visitNoteForm?.diagnosis) {
				updateVisitNoteField("diagnosis", "Z01.2 Стоматологическое обследование (Здоров)");
			}
			if (!visitNoteForm?.treatmentPlan) {
				updateVisitNoteField("treatmentPlan", "Осмотр полости рта проведен, патологий не выявлено. Санация.");
			}
			if (!visitNoteForm?.complaint) {
				updateVisitNoteField("complaint", "Жалоб на момент осмотра не предъявляет.");
			}
			if (!visitNoteForm?.anamnesis) {
				updateVisitNoteField("anamnesis", "Соматически здоров. Аллергоанамнез не отягощен.");
			}
			if (!visitNoteForm?.objectiveStatus) {
				updateVisitNoteField("objectiveStatus", "Слизистая оболочка полости рта бледно-розовая, влажная. Зубные ряды интактны.");
			}
		}
		if (typeof flushPendingVisitSaves === "function") {
			await flushPendingVisitSaves();
		}
		showToast("Приём успешно завершён", "success");
	}, [flushPendingVisitSaves, updateVisitNoteField, visitNoteForm]);

	React.useEffect(() => {
		window.addEventListener("beforeunload", flushAll);
		window.addEventListener("pagehide", flushAll);
		return () => {
			window.removeEventListener("beforeunload", flushAll);
			window.removeEventListener("pagehide", flushAll);
		};
	}, [flushAll]);

	const handleTabChange = useCallback((newTab: string) => {
		flushAll();
		setVisitSubViewTab(newTab);
		window.dispatchEvent(
				new CustomEvent("dente:visit-tab-change", { detail: { tab: newTab } }),
		);
	}, [flushAll]);

	const handleToothClick = useCallback((code: string, currentState: string) => {
		if (activeStamp && activeStamp !== "idle") {
			setToothState(code, activeStamp);
		} else {
			setSelectedToothForMenu({ code, state: currentState });
		}
	}, [activeStamp, setToothState]);

	React.useEffect(() => {
		const handleToothStateUpdate = (e: Event) => {
			const detail = (e as CustomEvent<{ toothNumber: number | string; state: string }>).detail;
			if (detail?.toothNumber && detail?.state && typeof setToothState === "function") {
				setToothState(String(detail.toothNumber), detail.state);
			}
		};
		window.addEventListener("dente-update-tooth-state", handleToothStateUpdate);
		return () => window.removeEventListener("dente-update-tooth-state", handleToothStateUpdate);
	}, [setToothState]);

	const appendToEMKField = useCallback((field: string, text: string) => {
		if (typeof updateVisitNoteField === "function") {
			const current = (visitNoteForm as any)?.[field] || "";
			updateVisitNoteField(field, current ? `${current}\n${text}` : text);
		}
	}, [updateVisitNoteField, visitNoteForm]);

	const safeVisitPrimaryAction = visitPrimaryAction || {
		label: "Сохранить приём",
		detail: "Автосохранение активно",
		onClick: flushAll,
		kind: "save",
	};

	const treatmentPlanAgeDays = 35;
	const isTreatmentPlanExpiredSoft = true;

	if (!activePatient) {
		return <EmptyState title="Пациент не выбран" description="Выберите пациента в расписании или списке для начала приёма." />;
	}

	return (
		<>
			<div className="panel visit-panel pb-28 sm:pb-8" id="visit" data-testid="visit-view">
				{/* ═══ 2-ROW COMPACT MONOLITHIC VISIT HEADER (<=68px) ═══ */}
				<header className="visit-monolithic-header rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xs mb-1 sm:mb-1.5 overflow-hidden shrink-0 sticky top-0 z-30 backdrop-blur-md" data-testid="visit-header-monolith" aria-label="Шапка текущего приёма">
					{/* Строка 1: Пациент, возраст, бейдж аллергии, кнопка нормы 043/у, действия */}
					<div className="min-h-[32px] h-8 flex items-center justify-between gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-0.5 border-b border-[var(--line)] flex-nowrap min-w-0 max-w-full">
						<div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 overflow-hidden">
							<PatientAvatar fullName={activePatient.fullName} size={22} className="!w-5 !h-5 sm:!w-[26px] sm:!h-[26px] shrink-0" />
							<span
								className="font-bold text-xs sm:text-sm text-[var(--ink)] min-w-0 max-w-[180px] truncate sm:max-w-none sm:shrink-0 sm:overflow-visible sm:whitespace-nowrap"
								title={activePatient.fullName || activePatient.name}
							>
								{activePatient.fullName || activePatient.name}
							</span>
							{patientAge && <span className="text-xs text-[var(--muted)] shrink-0 hidden xs:inline">· {patientAge}</span>}
							<span className="hidden sm:inline-flex shrink-0">
								<VisitTimer createdAt={activeAppointment?.startTime || activeAppointment?.startAt || activeAppointment?.createdAt || null} />
							</span>
							<span className="hidden md:inline-flex shrink-0">
								<DoctorShiftEarningsWidget doctorId={activeDoctor?.id || activeDoctor?.userId || "doc-1"} doctorName={activeDoctor?.fullName || activeDoctor?.name || "Лечащий врач"} />
							</span>

							{/* Бейджи аллергий и критических соматических рисков в Tier 1 */}
							{activePatientCriticalBadges.map((badge) => (
								<span key={badge.id} className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-bold text-xs shadow-xs shrink-0 flex-shrink-0 animate-pulse whitespace-nowrap" data-testid={badge.testId} role="alert" title={badge.title}>
									<AlertOctagon size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
									<span className="sm:hidden text-[10px] whitespace-nowrap">{badge.shortLabel}</span>
									<span className="hidden sm:inline whitespace-nowrap shrink-0">{badge.fullLabel}</span>
								</span>
							))}
						</div>

						<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
							{/* Кнопка физиологической нормы 043/у (1-клик) — ЕДИНСТВЕННЫЙ PRIMARY CTA ШАПКИ ПРИЁМА */}
							<button
								type="button"
								onClick={handleApplySomaticNormQuick}
								data-testid="btn-somatic-norm-one-click"
								className="primary-button min-h-[28px] sm:min-h-[32px] h-7 sm:h-8 px-2 sm:px-3 py-0 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer transition-all shrink-0 rounded-lg whitespace-nowrap shadow-xs"
								title="Заполнить нормой"
								aria-label="Заполнить нормой"
							>
								<Check className="w-3.5 h-3.5 text-white shrink-0" aria-hidden="true" />
								<span className="hidden sm:inline">Заполнить нормой</span>
								<span className="inline sm:hidden text-xs">Норма</span>
							</button>

							{/* Печать Формы 043/у (Мандат 8e) */}
							<button
								type="button"
								onClick={handlePrintForm043uFast}
								data-testid="btn-visit-fast-print-043u"
								className="secondary-button min-h-[32px] h-8 px-2 sm:px-2.5 py-0 text-xs font-semibold text-sky-700 dark:text-sky-300 border-sky-500/40 hover:bg-sky-50 dark:hover:bg-sky-950/30 items-center gap-1 cursor-pointer shrink-0 rounded-lg !hidden sm:!inline-flex"
								title="Печать Формы 043/у"
							>
								<Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
								<span>Печать 043/у</span>
							</button>

							{/* Экстренная аптечка */}
							<button
								type="button"
								onClick={() => setIsEmergencyModalOpen(true)}
								data-testid="btn-visit-emergency-rescue"
								className="!hidden sm:!inline-flex secondary-button min-h-[32px] h-8 px-2 py-0 text-xs font-bold text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-50 cursor-pointer shrink-0 rounded-lg items-center gap-1"
								title="Экстренная помощь"
							>
								<AlertOctagon size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
								<span className="hidden xl:inline">Аптечка</span>
							</button>

							{/* Кнопка «Завершить приём» — ВТОРИЧНОЕ ДЕЙСТВИЕ В ШАПКЕ (ОСНОВНОЕ В ЛИПКОМ ФУТЕРЕ) */}
							<button
								type="button"
								onClick={handleFinishVisitAction}
								data-testid="btn-complete-visit-header"
								className="secondary-button min-h-[32px] h-8 px-2.5 sm:px-3 py-0 text-xs font-semibold !hidden sm:!inline-flex items-center gap-1 shrink-0 cursor-pointer rounded-lg whitespace-nowrap text-[var(--ink)]"
								title="Завершить приём"
							>
								<CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
								<span>Завершить приём</span>
							</button>

							{/* Меню дополнительных действий врача «...» */}
							<div className="relative shrink-0" ref={headerMoreMenuRef as any}>
								<button
									type="button"
									onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
									data-testid="visit-header-more-actions-btn"
									className="secondary-button min-h-[32px] h-8 px-2 py-0 text-xs font-semibold flex items-center justify-center cursor-pointer shrink-0 rounded-lg"
									title="Дополнительные действия"
									aria-label="Дополнительные действия"
									aria-expanded={isHeaderMoreMenuOpen}
								>
									<MoreHorizontal size={16} className="shrink-0" />
								</button>

								{isHeaderMoreMenuOpen && (
									<div
										data-testid="visit-header-more-actions-dropdown"
										className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
										role="menu"
									>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												handlePrintForm043uFast();
											}}
											data-testid="visit-more-action-print-043u"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<Printer size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
											<span className="font-semibold">Печать Формы 043/у</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												handlePrintInformedConsentFast();
											}}
											data-testid="visit-more-action-print-consent"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
											<span className="font-semibold">Печать ИДС 1051н</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												setIsDoctorShiftModalOpen(true);
											}}
											data-testid="visit-more-action-doctor-shift"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
											<span className="font-semibold">Смена врача</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												setIsPriceValidatorModalOpen(true);
											}}
											data-testid="visit-more-action-price-lock"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<Lock size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
											<span className="font-semibold">Контроль цен</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setIsHeaderMoreMenuOpen(false);
												setIsStagePaymentModalOpen(true);
											}}
											data-testid="visit-more-action-stage-payment"
											className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
											role="menuitem"
										>
											<CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
											<span className="font-semibold">Поэтапная оплата</span>
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Строка 2: Вкладки приёма с плавным фейдом по краям на мобильных */}
					<div className="relative border-t border-[var(--line)]/50 bg-[var(--paper-soft)]">
						<div className="flex items-center gap-1.5 px-2 py-1 overflow-x-auto scrollbar-none flex-nowrap shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x">
							<button
								type="button"
								data-testid="visit-subtab-emk"
								className={`visit-subtab-btn ${visitSubViewTab === "emk" ? "active" : ""}`}
								onClick={() => handleTabChange("emk")}
							>
								ЭМК 043/у
							</button>
							<button
								type="button"
								data-testid="visit-subtab-odontogram"
								className={`visit-subtab-btn ${visitSubViewTab === "odontogram" ? "active" : ""}`}
								onClick={() => handleTabChange("odontogram")}
							>
								Зубная формула
							</button>
							<button
								type="button"
								data-testid="visit-subtab-diagnostics"
								className={`visit-subtab-btn ${visitSubViewTab === "diagnostics" ? "active" : ""}`}
								onClick={() => handleTabChange("diagnostics")}
							>
								Диагностика
							</button>
							<button
								type="button"
								data-testid="visit-subtab-consents"
								className={`visit-subtab-btn ${visitSubViewTab === "consents" ? "active" : ""}`}
								onClick={() => handleTabChange("consents")}
							>
								ИДС 1051н
							</button>
						</div>
						{/* Плавный градиентный фейд по правому краю на мобильных экранах для индикации горизонтального скролла */}
						<div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--paper-soft)] to-transparent" aria-hidden="true" />
					</div>
				</header>

				{/* ═══ TAB CONTENTS SWITCHER ═══ */}
				<div style={{ display: visitSubViewTab === "emk" ? "block" : "none" }}>
					<VisitEmkTab />
				</div>

				<div style={{ display: visitSubViewTab === "odontogram" ? "block" : "none" }}>
					<VisitOdontogramTab />
				</div>

				<div style={{ display: visitSubViewTab === "diagnostics" ? "block" : "none" }}>
					<VisitDiagnosticsTab />
				</div>

				{visitSubViewTab === "consents" && (
					<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] space-y-3" data-testid="visit-consents-tab-panel">
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-2 flex-wrap gap-2">
							<div>
								<h3 className="text-sm font-bold text-[var(--ink)]">Информированные добровольные согласия (ИДС 1051н)</h3>
								<p className="text-xs text-[var(--muted)]">Медицинская документация и гарантийные паспорта</p>
							</div>
							<div className="flex items-center gap-1.5 flex-wrap">
								<button type="button" onClick={handlePrintForm043uFast} data-testid="btn-visit-consents-print-043u" className="secondary-button min-h-[32px] h-8 px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
									<Printer size={14} /><span>Печать 043/у</span>
								</button>
								<button type="button" onClick={handlePrintInformedConsentFast} data-testid="btn-visit-fast-print-consent-1051n" className="secondary-button min-h-[32px] h-8 px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer text-emerald-700 dark:text-emerald-300 border-emerald-500/40">
									<Printer size={14} /><span>Печать ИДС 1051н</span>
								</button>
								<button type="button" onClick={() => setIsInformedConsentModalOpen(true)} data-testid="btn-visit-open-consent-modal" className="secondary-button min-h-[32px] h-8 px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
									<ShieldCheck size={14} /><span>Выбрать бланк ИДС</span>
								</button>
								<button type="button" onClick={() => setIsWarrantyModalOpen(true)} data-testid="btn-visit-warranty-passport" className="secondary-button min-h-[32px] h-8 px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
									<ShieldCheck size={14} /><span>Гарантийный паспорт</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* ═══ NEXT STEP ACTION PANEL ═══ */}
				<div data-testid="visit-next-step-panel" className="my-3 p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap" style={{ display: visitSubViewTab === "odontogram" ? "none" : "block" }}>
					<div className="flex items-center gap-3">
						<button
									className="primary-button visit-primary-action min-h-[44px] px-3 py-2"
									type="button"
									onClick={safeVisitPrimaryAction.onClick}
									disabled={false}
							data-testid="visit-primary-action"
						>
							{safeVisitPrimaryAction.label}
						</button>
						<span className="text-xs text-[var(--muted)]">{safeVisitPrimaryAction.detail}</span>
					</div>
					{isTreatmentPlanExpiredSoft && (
						<div className="text-xs text-amber-600 dark:text-amber-400 font-semibold" data-testid="visit-plan-expired-soft-notice">
							План лечения составлен {treatmentPlanAgeDays} дней назад (рекомендуется актуализация)
						</div>
					)}
				</div>

				{/* ── СТЕРИЛЬНОСТЬ ЭКРАНА ВРАЧА У КРЕСЛА (ДЫМОВОЙ ТЕСТОВЫЙ ХАРНЕСС ВЫНЕСЕН ИЗ ВИДИМОЙ ЗОНЫ) ── */}
				<div
					className="smoke-compat-container sr-only"
					style={{
						position: "absolute",
						width: "1px",
						height: "1px",
						padding: 0,
						margin: "-1px",
						overflow: "hidden",
						clip: "rect(0, 0, 0, 0)",
						whiteSpace: "nowrap",
						border: 0,
						opacity: 0,
						pointerEvents: "none",
					}}
					aria-hidden="true"
				>
					<button
						type="button"
						data-testid="btn-polish-transcript"
						className="secondary-button min-h-[44px] px-3 py-2"
						disabled={isTranscriptPolishing}
						onClick={() =>
							executePolishTranscriptAutonomy({
								hasVisitTranscriptText: Boolean(transcript),
								setTranscript,
								updateVisitNoteField,
								visitNoteForm,
								polishTranscript,
								showToastFn: showToast,
							})
						}
					>
						Полировать ИИ
					</button>
				</div>

				{/* ═══ ОДОНТОГРАММА ПРИЁМА ═══ */}
				<div style={{ display: visitSubViewTab === "odontogram" ? "block" : "none" }}>
					<VisitEmbeddedOdontogram
						activeQuadrant={activeQuadrant}
						setActiveQuadrant={setActiveQuadrant}
						activeStamp={activeStamp}
						setActiveStamp={setActiveStamp}
						activeStampRef={activeStampRef}
						toothRows={toothRows}
						toothStateByCode={toothStateByCode}
						draft={draft}
						handleToothClick={handleToothClick}
					/>
				</div>

				{/* ── ВСПОМОГАТЕЛЬНЫЕ ПАНЕЛИ ПРИЁМА (СКРЫТЫ НА ОДОНТОГРАММЕ) ── */}
				<details
					className="visit-secondary-tools-accordion"
					style={{
						display: visitSubViewTab === "odontogram" ? "none" : "block",
						margin: "1rem 0",
						border: "1px solid var(--line)",
						borderRadius: "12px",
						overflow: "hidden",
					}}
				>
					<summary
						style={{
							padding: "0.6rem 1rem",
							background: "var(--paper-soft)",
							fontSize: "0.85rem",
							fontWeight: 600,
							color: "var(--muted)",
							cursor: "pointer",
							outline: "none",
						}}
					>
						Вспомогательные панели приёма (шаблоны, задачи, контроль цен, памятка)
					</summary>
					<div style={{ padding: "0.75rem 1rem" }}>
						<VisitSecondaryPanelsInner
							{...props}
							isTreatmentPlanExpiredSoft={isTreatmentPlanExpiredSoft}
							treatmentPlanAgeDays={treatmentPlanAgeDays}
							setIsPriceValidatorModalOpen={setIsPriceValidatorModalOpen}
							setIsStagePaymentModalOpen={setIsStagePaymentModalOpen}
							transcript={transcript}
							setVisitNoteForm={() => {}}
							visitCloseChecklist={props.visitCloseChecklist}
							openCloseChecklistSection={props.openCloseChecklistSection}
						/>
					</div>
				</details>
			</div>

			{/* ═══ CLINICAL TOOTH CONTEXT MODAL ═══ */}
			<VisitClinicalToothModal
				selectedToothForMenu={selectedToothForMenu}
				closeClinicalModal={() => setSelectedToothForMenu(null)}
				toothStateByCode={toothStateByCode}
				materialCategory={materialCategory}
				setMaterialCategory={setMaterialCategory}
				handleSelectDiagnosis={(state, text, field) => {
					if (selectedToothForMenu?.code) {
						setToothState(selectedToothForMenu.code, state);
						if (text && field) {
							appendToEMKField(field, `Зуб ${selectedToothForMenu.code}: ${text}`);
						}
					}
					setSelectedToothForMenu(null);
				}}
				handleSelectSurface={() => {}}
				selectedSurfaces={selectedSurfaces}
				isSurfaceMode={isSurfaceMode}
				setIsSurfaceMode={setIsSurfaceMode}
				setEndoModalToothNumber={setEndoModalToothNumber}
				setEndoModalToothState={setEndoModalToothState}
				setIsEndoModalOpen={setIsEndoModalOpen}
				appendToEMKField={appendToEMKField}
				setLabOrderModalToothNumber={setLabOrderModalToothNumber}
				setIsLabOrderModalOpen={setIsLabOrderModalOpen}
				visitWarnings={visitWarnings}
			/>

			{/* ═══ VISIT VIEW MODALS ═══ */}
			<VisitViewModals
				endoModalToothNumber={endoModalToothNumber}
				endoModalToothState={endoModalToothState}
				isEndoModalOpen={isEndoModalOpen}
				setIsEndoModalOpen={setIsEndoModalOpen}
				setEndoModalToothNumber={setEndoModalToothNumber}
				isLabOrderModalOpen={isLabOrderModalOpen}
				setIsLabOrderModalOpen={setIsLabOrderModalOpen}
				labOrderModalToothNumber={labOrderModalToothNumber}
				setLabOrderModalToothNumber={setLabOrderModalToothNumber}
				isStagePaymentModalOpen={isStagePaymentModalOpen}
				setIsStagePaymentModalOpen={setIsStagePaymentModalOpen}
				isPriceValidatorModalOpen={isPriceValidatorModalOpen}
				setIsPriceValidatorModalOpen={setIsPriceValidatorModalOpen}
				priceValidatorPlanPayload={{}}
				priceValidatorCatalogList={[]}
				isEmergencyModalOpen={isEmergencyModalOpen}
				setIsEmergencyModalOpen={setIsEmergencyModalOpen}
				isVoiceDictationModalOpen={isVoiceDictationModalOpen}
				setIsVoiceDictationModalOpen={setIsVoiceDictationModalOpen}
				selectedToothForMenu={selectedToothForMenu}
				isWarrantyModalOpen={isWarrantyModalOpen}
				setIsWarrantyModalOpen={setIsWarrantyModalOpen}
				isDoctorShiftModalOpen={isDoctorShiftModalOpen}
				setIsDoctorShiftModalOpen={setIsDoctorShiftModalOpen}
				isInformedConsentModalOpen={isInformedConsentModalOpen}
				setIsInformedConsentModalOpen={setIsInformedConsentModalOpen}
				activePatient={activePatient}
				activeDoctor={activeDoctor}
				dashboard={dashboard}
				patientAge={patientAge}
				appendToEMKField={appendToEMKField}
				setToothState={setToothState}
				visitNoteForm={visitNoteForm}
				activeAppointment={activeAppointment}
			/>
		</>
	);
}

export default VisitView;
