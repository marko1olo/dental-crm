import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";
import {
	Activity,
	Calendar,
	Camera,
	Clock,
	Eye,
	FileSpreadsheet,
	FileText,
	Gift,
	MoreVertical,
	Plus,
	Printer,
	Receipt,
	Scan,
	Shield,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { sliceDomList } from "../../utils/domVirtualizationHelper";
import { money } from "../../utils/financeUtils";
import { showToast } from "../GlobalToast";
import { PatientWorkspaceModals } from "./PatientWorkspaceModals";
import type { DmsGuaranteeLetter } from "../insurance/DmsGuaranteeLetterModal";
import { usePatientStore } from "../../store/patientStore";
import { PatientJourneyTimeline } from "../PatientJourneyTimeline";
import {
	printBlankMedicalContract,
	printBlankMedicalConsent,
} from "./blankContractPrint";
import { PatientAllergySafetyBanner } from "./PatientAllergySafetyBanner";
import { PatientDuplicateAlert } from "./PatientDuplicateAlert";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";

const DicomViewerModal = React.lazy(() =>
	import("../imaging/DicomViewerModal").then((m) => ({
		default: m.DicomViewerModal,
	})),
);

export interface PatientWorkspaceViewProps {
	patientId: string;
	patientName?: string | null;
	dashboard?: Dashboard | null;
	initialTab?: "timeline" | "plans" | "visits" | "scans";
	onOpenVisit?: (visitId: string) => void;
	onOpenPlan?: (planId: string) => void;
}
import { TreatmentPlanCardItem } from "./TreatmentPlanCardItem";

const VisitHistoryCardItem: React.FC<{
	appointment: Appointment;
	doctorFullName?: string | null;
	onOpenVisit?: (visitId: string) => void;
}> = React.memo(({ appointment, doctorFullName, onOpenVisit }) => {
	const formattedDate = useMemo(() => {
		if (!appointment.startsAt) return "Дата не указана";
		const d = new Date(appointment.startsAt);
		if (Number.isNaN(d.getTime())) return "Дата не указана";
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}, [appointment.startsAt]);

	const statusLabel = useMemo(() => {
		switch (appointment.status) {
			case "completed":
				return "Завершён";
			case "in_treatment":
				return "Идёт приём";
			case "cancelled":
				return "Отменён";
			case "no_show":
				return "Не явился";
			case "confirmed":
				return "Подтверждён";
			default:
				return "Запланирован";
		}
	}, [appointment.status]);

	return (
		<div
			className="visit-history-card p-3 rounded-lg flex flex-col gap-1.5 bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shadow-xs"
			style={{ contentVisibility: "auto", containIntrinsicSize: "auto 110px" }}
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
					<Calendar className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span>{formattedDate}</span>
				</div>
				<span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper)] text-[var(--ink)] font-bold border border-[var(--line-strong)] shrink-0">
					{statusLabel}
				</span>
			</div>
			<div className="text-xs text-[var(--muted)] truncate min-w-0">
				Врач:{" "}
				<strong className="text-[var(--ink)]">
					{doctorFullName || "Врач не назначен"}
				</strong>
			</div>
			{appointment.reason ? (
				<div className="text-xs text-[var(--ink)] line-clamp-2">
					{appointment.reason}
				</div>
			) : null}
			{onOpenVisit ? (
				<div className="mt-0.5 flex justify-end">
					<button
						type="button"
						onClick={() => onOpenVisit(appointment.id)}
						className="min-h-[32px] px-1.5 text-[var(--teal)] hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
					>
						К визиту &rarr;
					</button>
				</div>
			) : null}
		</div>
	);
});
VisitHistoryCardItem.displayName = "VisitHistoryCardItem";

export const PatientWorkspaceView: React.FC<PatientWorkspaceViewProps> =
	React.memo(
		({
			patientId,
			patientName,
			dashboard: propDashboard,
			initialTab = "timeline",
			onOpenVisit,
			onOpenPlan,
		}) => {
			const appLogic = useAppLogicContext();
			const dashboard = propDashboard ?? appLogic?.dashboard;
			const [activeTab, setActiveTab] = useState<
				"timeline" | "plans" | "visits" | "scans"
			>(initialTab ?? "timeline");
			const [isDicomModalOpen, setIsDicomModalOpen] = useState(false);
			const [selectedScanForDicom, setSelectedScanForDicom] = useState<{
				url: string;
				tooth?: string | null;
				title?: string | null;
			} | null>(null);

			useEffect(() => {
				let isMounted = true;
				const handleCustomRefresh = () => {
					if (isMounted) {
						// State refresh notification if needed
					}
				};

				window.addEventListener(
					"dente-patient-workspace-refresh",
					handleCustomRefresh,
				);
				return () => {
					isMounted = false;
					window.removeEventListener(
						"dente-patient-workspace-refresh",
						handleCustomRefresh,
					);
				};
			}, []);

			const staffMap = useMemo(() => {
				const map = new Map<string, string>();
				for (const s of dashboard?.clinicSettings?.staff ?? []) {
					if (s.id && s.fullName) {
						map.set(s.id, s.fullName);
					}
				}
				return map;
			}, [dashboard?.clinicSettings?.staff]);

			const patientAppointments = useMemo(() => {
				const list = (dashboard?.appointments ?? []).filter(
					(a) => a?.patientId === patientId,
				);
				return list.sort(
					(a, b) =>
						new Date(b?.startsAt ?? 0).getTime() -
						new Date(a?.startsAt ?? 0).getTime(),
				);
			}, [dashboard?.appointments, patientId]);

			const patientPlanItems = useMemo(() => {
				return (dashboard?.treatmentPlanItems ?? []).filter(
					(item) => item?.patientId === patientId,
				);
			}, [dashboard?.treatmentPlanItems, patientId]);

			const currentPatient = useMemo(() => {
				return (dashboard?.patients ?? []).find(
					(p: any) => String(p?.id) === String(patientId),
				);
			}, [dashboard?.patients, patientId]);

			const patientCardNumber = useMemo(() => {
				return (
					(currentPatient as any)?.cardNumber ||
					(currentPatient as any)?.chartNumber ||
					(currentPatient as any)?.medicalCardNumber ||
					null
				);
			}, [currentPatient]);

			const patientBalanceRub = useMemo(() => {
				const b = (currentPatient as any)?.balanceRub ?? (currentPatient as any)?.balance;
				return typeof b === "number" ? b : null;
			}, [currentPatient]);

			const patientStudies = useMemo(() => {
				const all = (dashboard?.imagingStudies ?? []) as any[];
				const filtered = all.filter((s) => String(s?.patientId) === String(patientId));
				if (filtered.length > 0) return filtered;
				if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
					return [
						{
							id: `demo-study-rvg-16-${patientId}`,
							patientId,
							title: "Прицельный снимок зуба 1.6",
							kind: "periapical",
							toothCode: "16",
							previewUrl: "/radiology/sample_rvg_tooth16.jpg",
							viewerUrl: "/radiology/sample_rvg_tooth16.jpg",
							capturedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
							effectiveDoseMicrosv: 2,
							status: "available",
						},
						{
							id: `demo-study-rvg-36-${patientId}`,
							patientId,
							title: "Прицельный снимок зуба 3.6 (периапикальный)",
							kind: "periapical",
							toothCode: "36",
							previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
							viewerUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
							capturedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
							effectiveDoseMicrosv: 3,
							status: "available",
						},
						{
							id: `demo-study-cbct-${patientId}`,
							patientId,
							title: "3D КЛКТ сегмента верхней челюсти",
							kind: "cbct",
							toothCode: "16",
							previewUrl: "/radiology/sample_rvg_pathology.jpg",
							viewerUrl: "/radiology/kavo_op300_cbct_slice.dcm",
							capturedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
							effectiveDoseMicrosv: 35,
							status: "available",
						},
						{
							id: `demo-study-trg-${patientId}`,
							patientId,
							title: "ТРГ (Телерентгенограмма) боковая",
							kind: "cephalometric",
							toothCode: null,
							previewUrl: "/radiology/sample_trg_cephalogram.jpg",
							viewerUrl: "/radiology/sample_trg_cephalogram.jpg",
							capturedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
							effectiveDoseMicrosv: 12,
							status: "available",
						},
					];
				}
				return [];
			}, [dashboard?.imagingStudies, patientId]);

			// Low-Spec Celeron / 4GB RAM Optimization: Bound DOM render to keep total nodes strictly <= 400
			// 30 items * ~10 DOM nodes = 300 nodes + ~80 container nodes = 380 DOM nodes total per active tab
			const DEFAULT_WORKSPACE_PAGE_SIZE = 30;
			const [visibleVisitsLimit, setVisibleVisitsLimit] = useState<number>(DEFAULT_WORKSPACE_PAGE_SIZE);
			const [visiblePlansLimit, setVisiblePlansLimit] = useState<number>(DEFAULT_WORKSPACE_PAGE_SIZE);

			// Deterministic reset when switching patient context
			useEffect(() => {
				setVisibleVisitsLimit(DEFAULT_WORKSPACE_PAGE_SIZE);
				setVisiblePlansLimit(DEFAULT_WORKSPACE_PAGE_SIZE);
			}, [patientId]);

			const visitsSlice = useMemo(() => {
				return sliceDomList(patientAppointments ?? [], visibleVisitsLimit, 0);
			}, [patientAppointments, visibleVisitsLimit]);

			const plansSlice = useMemo(() => {
				return sliceDomList(patientPlanItems ?? [], visiblePlansLimit, 0);
			}, [patientPlanItems, visiblePlansLimit]);

			const patientAddendums = useMemo(() => {
				return (dashboard?.documents ?? []).filter(
					(doc) =>
						doc?.patientId === patientId &&
						doc?.kind === "treatment_plan_acceptance" &&
						doc?.status === "issued",
				);
			}, [dashboard?.documents, patientId]);

			const handleOpenVisitCallback = useCallback(
				(visitId: string) => {
					if (onOpenVisit) {
						onOpenVisit(visitId);
					} else {
						window.location.hash = `/patients/${patientId}/visit/${visitId}`;
					}
				},
				[onOpenVisit, patientId],
			);

			const handleOpenPlanCallback = useCallback(
				(planId: string) => {
					if (onOpenPlan) {
						onOpenPlan(planId);
					} else {
						window.location.hash = "#documents";
					}
				},
				[onOpenPlan],
			);

			const [isDmsLetterOpen, setIsDmsLetterOpen] = useState(false);
			const [isDmsRegistryOpen, setIsDmsRegistryOpen] = useState(false);
			const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
			const [isCbctModalOpen, setIsCbctModalOpen] = useState(false);
			const [isDocsMenuOpen, setIsDocsMenuOpen] = useState(false);
			const docsMenuRef = useRef<HTMLDivElement>(null);

			useEffect(() => {
				const handleClickOutside = (event: MouseEvent) => {
					if (
						docsMenuRef.current &&
						!docsMenuRef.current.contains(event.target as Node)
					) {
						setIsDocsMenuOpen(false);
					}
				};
				if (isDocsMenuOpen) {
					document.addEventListener("mousedown", handleClickOutside);
				}
				return () => {
					document.removeEventListener("mousedown", handleClickOutside);
				};
			}, [isDocsMenuOpen]);

			const handleSaveDmsLetter = useCallback(
				async (letter: DmsGuaranteeLetter) => {
					try {
						const isExisting =
							letter.id &&
							!letter.id.startsWith("letter-") &&
							!letter.id.startsWith("gl-");
						const endpoint = isExisting
							? `/api/insurance/guarantee-letters/${letter.id}`
							: "/api/insurance/guarantee-letters";
						const method = isExisting ? "PUT" : "POST";
						const res = await fetch(endpoint, {
							method,
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify(letter),
						});
						if (!res.ok) {
							const errBody = await res.json().catch(() => null);
							throw new Error(
								errBody?.message || `Ошибка сохранения (${res.status})`,
							);
						}
						showToast(
							`Гарантийное письмо № ${letter.letterNumber} (${letter.insurerName}) сохранено в базе данных`,
							"success",
						);
						setIsDmsLetterOpen(false);
					} catch (err: any) {
						showToast(
							err.message || "Не удалось сохранить гарантийное письмо",
							"error",
						);
					}
				},
				[],
			);

			return (
				<div
					data-testid="patient-workspace-view"
					className="patient-workspace-view flex flex-col gap-2 rounded-xl bg-[var(--paper)] p-2.5 sm:p-3 text-[var(--ink)] border border-[var(--line)] shadow-xs pb-6"
				>
					{/* Clinical Safety & Allergy Red-Flag Emergency Banner (Zero Noise when clean, Mandates 8d, 8p) */}
					<PatientAllergySafetyBanner
						patientId={patientId}
						patientName={patientName}
						profile={currentPatient?.anamnesis || currentPatient?.notes}
						notes={
							typeof currentPatient?.anamnesis === "string"
								? currentPatient.anamnesis
								: currentPatient?.notes
						}
						showModalButton={true}
						hideWhenClean={true}
					/>

					{/* Patient Duplicate Alert Guard */}
					<PatientDuplicateAlert patientId={patientId} />

					<div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--line)] pb-3">
						<div className="flex items-center gap-2 min-w-0 flex-wrap">
							<span className="text-sm md:text-base font-black text-[var(--ink)] truncate">
								{patientName || "Карточка пациента"}
							</span>
							<span className="text-xs font-mono font-bold text-[var(--muted)] bg-[var(--paper-soft)] px-2 py-0.5 rounded-md border border-[var(--line)] shrink-0">
								{patientCardNumber ? `Карта: ${patientCardNumber}` : patientId ? `№ ${String(patientId || "").slice(0, 8)}` : "—"}
							</span>
							{patientBalanceRub !== null && (
								<span
									className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
										patientBalanceRub < 0
											? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
											: patientBalanceRub > 0
												? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
												: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
									}`}
									title={`Текущий баланс пациента: ${patientBalanceRub.toLocaleString("ru-RU")} ₽`}
									data-testid="patient-workspace-balance-badge"
								>
									Баланс: {patientBalanceRub > 0 ? "+" : ""}{patientBalanceRub.toLocaleString("ru-RU")} ₽
								</span>
							)}
						</div>

						<div className="flex items-center gap-1.5 flex-wrap">
							{/* Первичная кнопка прямого действия 1: «+ Новый визит» */}
							<button
								type="button"
								className="primary-button min-h-[34px] h-8 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-xs"
								onClick={() => {
									if (patientId) {
										appLogic?.setSelectedPatientId?.(patientId);
									}
									window.location.hash = "visit";
								}}
								title="Создать новый клинический визит для пациента"
								data-testid="btn-patient-create-visit"
							>
								<Plus className="w-3.5 h-3.5 shrink-0" />
								<span>Новый визит</span>
							</button>

							{/* Первичная кнопка прямого действия 2: «+ План лечения» */}
							<button
								type="button"
								className="secondary-button min-h-[34px] h-8 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
								onClick={() => {
									setActiveTab("plans");
									if (onOpenPlan) {
										onOpenPlan("new");
									}
								}}
								title="Составить новый план лечения или открыть раздел планов"
								data-testid="btn-patient-create-treatment-plan"
							>
								<Plus className="w-3.5 h-3.5 shrink-0" />
								<span>План лечения</span>
							</button>

							{/* Вторичные действия: аккуратное выпадающее меню [⋮ Документы и ДМС] */}
							<div
								className="relative inline-block text-left"
								ref={docsMenuRef}
							>
								<button
									type="button"
									className="secondary-button min-h-[34px] h-8 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
									onClick={() => setIsDocsMenuOpen((prev) => !prev)}
									title="Документы, ДМС и программа лояльности"
									aria-haspopup="true"
									aria-expanded={isDocsMenuOpen}
									data-testid="btn-patient-docs-dms-menu"
								>
									<MoreVertical className="w-3.5 h-3.5 shrink-0" />
									<span className="hidden sm:inline">Документы и ДМС</span>
								</button>

								{isDocsMenuOpen && (
									<div
										className="absolute right-0 mt-1 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
										role="menu"
										data-testid="patient-docs-dms-dropdown"
									>
										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (patientId) {
													appLogic?.setSelectedPatientId?.(patientId);
												}
												window.location.hash = "patients";
											}}
											title="Открыть медицинскую карту пациента"
											data-testid="patient-workspace-open-043u-btn"
										>
											<FileText className="w-4 h-4 text-[var(--teal)] shrink-0" />
											<span>Медицинская карта</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (typeof window !== "undefined") {
													window.print();
												}
												showToast(
													"Печать и экспорт медицинской карты запущены",
													"info",
												);
											}}
											title="Распечатать медицинскую карту пациента"
											data-testid="patient-workspace-print-043u-btn"
										>
											<Printer className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
											<span>Печать медицинской карты</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (patientId) {
													appLogic?.setSelectedPatientId?.(patientId);
												}
												window.location.hash = "finance";
											}}
											title="Открыть счета, услуги и кассу"
											data-testid="patient-workspace-open-finance-btn"
										>
											<Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
											<span>Счета и касса</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												showToast(
													"Семейный баланс и распределение авансов",
													"info",
												);
											}}
											title="Семейный баланс и распределение авансовых платежей"
											data-testid="patient-workspace-family-balance-btn"
										>
											<UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
											<span>Семейный баланс</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors text-cyan-700 dark:text-cyan-300"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (patientId) {
													appLogic?.setSelectedPatientId?.(patientId);
													usePatientStore.getState().setSelectedPatientId(patientId);
												}
												setIsCbctModalOpen(true);
											}}
											title="Открыть 3D КЛКТ / КТ-исследование (MPR & Имплантация)"
											data-testid="patient-workspace-open-cbct-modal-btn"
										>
											<Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
											<span>3D КТ / КЛКТ Студия</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (patientId) {
													appLogic?.setSelectedPatientId?.(patientId);
													usePatientStore.getState().setSelectedPatientId(patientId);
												}
												window.location.hash = "imaging";
											}}
											title="Открыть рентгенологические и КТ исследования"
											data-testid="patient-workspace-open-radiology-btn"
										>
											<Camera className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
											<span>Рентген и КТ снимки</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												setIsLoyaltyModalOpen(true);
											}}
											title="Программа лояльности и бонусы"
											data-testid="open-loyalty-program-modal-btn"
										>
											<Gift className="w-4 h-4 text-amber-500 shrink-0" />
											<span>Программа лояльности</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												setIsDmsLetterOpen(true);
											}}
											title="Управление полисами ДМС и гарантийными письмами"
											data-testid="patient-dms-manager-btn"
										>
											<Shield className="w-4 h-4 text-[var(--teal)] shrink-0" />
											<span>Управление ДМС</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												setIsDmsRegistryOpen(true);
											}}
											title="Экспорт реестра услуг ДМС"
											data-testid="patient-dms-registry-btn"
										>
											<FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
											<span>Реестр ДМС</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												void printBlankMedicalContract(
													{ id: patientId, fullName: patientName },
													{
														clinicName:
															dashboard?.clinicSettings?.profile?.legalName,
													},
												);
											}}
											title="Распечатать пустой договор со строками _______ для ручного заполнения"
											data-testid="patient-print-blank-contract-btn"
										>
											<FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
											<span>Бланк договора (_______)</span>
										</button>
										<button
											type="button"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-teal-500/10 text-teal-900 dark:text-teal-200 flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												void printBlankMedicalConsent(
													{ id: patientId, fullName: patientName },
													{
														clinicName:
															dashboard?.clinicSettings?.profile?.legalName,
													},
												);
											}}
											title="Распечатать пустой бланк ИДС со строками _______ для ручного заполнения"
											data-testid="patient-print-blank-consent-btn"
										>
											<Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
											<span>Бланк ИДС / согласий (_______)</span>
										</button>
									</div>
								)}
							</div>
							<div className="flex items-center gap-0.5 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] flex-nowrap overflow-x-auto h-8 sm:h-9 max-w-full">
								<button
									type="button"
									className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "timeline"
											? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("timeline")}
								>
									<Clock className="w-3 h-3 inline mr-1" />
									Лента
								</button>
								<button
									type="button"
									className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "plans"
											? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("plans")}
								>
									<FileText className="w-3 h-3 inline mr-1" />
									Планы лечения ({patientPlanItems.length})
								</button>
								<button
									type="button"
									className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "visits"
											? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("visits")}
								>
									<Calendar className="w-3 h-3 inline mr-1" />
									Визиты ({patientAppointments.length})
								</button>
								<button
									type="button"
									className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "scans"
											? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("scans")}
									data-testid="patient-tab-scans"
								>
									<Camera className="w-3 h-3 inline mr-1" />
									Снимки и КТ ({patientStudies.length})
								</button>
							</div>
						</div>
					</div>

					{activeTab === "timeline" && (
						<PatientJourneyTimeline
							patientId={patientId}
							dashboard={dashboard}
						/>
					)}

					{activeTab === "plans" && (
						<div className="flex flex-col gap-2.5">
							{/* Decree 659 & Upsell Consent Shield Status Banner */}
							<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-3 flex-wrap">
								<div className="flex items-center gap-2">
									<Shield className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
									<div className="text-xs">
										<span className="font-bold text-[var(--ink)]">
											Защита согласий и сметы (ПП РФ №659 и ст. 16 ЗоЗПП)
										</span>
										<p className="text-[11px] text-[var(--muted)] m-0">
											Все манипуляции фиксируются в плане. Новые позиции требуют
											Дополнительного соглашения.
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]">
										Активных ДС: {patientAddendums.length}
									</span>
									<button
										type="button"
										onClick={() => {
											window.location.hash = "#documents";
										}}
										className="min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 border-0 cursor-pointer inline-flex items-center gap-1"
									>
										<FileText className="w-3 h-3" />
										<span>Оформить ДС</span>
									</button>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
									Позиции плана лечения ({patientPlanItems.length})
								</h4>
							</div>
							{patientPlanItems.length === 0 ? (
								<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
									Планы лечения для пациента пока не составлены.
								</div>
							) : (
								<>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
										{(plansSlice?.visibleItems ?? []).map((item: any) => (
											<TreatmentPlanCardItem
												key={item.id}
												item={item}
												onOpenPlan={handleOpenPlanCallback}
											/>
										))}
									</div>
									{plansSlice.hasMore && (
										<div className="flex justify-center pt-1">
											<button
												type="button"
												onClick={() =>
													setVisiblePlansLimit((prev) => prev + DEFAULT_WORKSPACE_PAGE_SIZE)
												}
												className="secondary-button min-h-[34px] h-8 px-4 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
												data-testid="btn-patient-plans-show-more"
											>
												{`Показать ещё ${Math.min(DEFAULT_WORKSPACE_PAGE_SIZE, plansSlice.remainingCount)} поз. (показано ${plansSlice.displayedCount} из ${plansSlice.totalCount})`}
											</button>
										</div>
									)}
								</>
							)}
						</div>
					)}

					{activeTab === "visits" && (
						<div className="flex flex-col gap-2.5">
							<div className="flex items-center justify-between">
								<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
									История визитов и записей ({patientAppointments.length})
								</h4>
							</div>
							{patientAppointments.length === 0 ? (
								<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
									История приёмов пациента пуста.
								</div>
							) : (
								<>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
										{(visitsSlice?.visibleItems ?? []).map((appt: any) => (
											<VisitHistoryCardItem
												key={appt.id}
												appointment={appt}
												doctorFullName={
													appt?.doctorUserId
														? (staffMap.get(appt.doctorUserId) ?? null)
														: null
												}
												onOpenVisit={handleOpenVisitCallback}
											/>
										))}
									</div>
									{visitsSlice.hasMore && (
										<div className="flex justify-center pt-1">
											<button
												type="button"
												onClick={() =>
													setVisibleVisitsLimit((prev) => prev + DEFAULT_WORKSPACE_PAGE_SIZE)
												}
												className="secondary-button min-h-[34px] h-8 px-4 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
												data-testid="btn-patient-visits-show-more"
											>
												{`Показать ещё ${Math.min(DEFAULT_WORKSPACE_PAGE_SIZE, visitsSlice.remainingCount)} визитов (показано ${visitsSlice.displayedCount} из ${visitsSlice.totalCount})`}
											</button>
										</div>
									)}
								</>
							)}
						</div>
					)}

					{activeTab === "scans" && (
						<div className="flex flex-col gap-3" data-testid="patient-scans-gallery">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<div>
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
										Рентгенологические снимки и КТ-исследования ({patientStudies.length})
									</h4>
									<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
										Мгновенный просмотр 200×200px без задержки и сдвига макета (CLS = 0)
									</p>
								</div>
								<div className="flex items-center gap-2 flex-wrap">
									<button
										type="button"
										onClick={() => {
											if (patientId) {
												appLogic?.setSelectedPatientId?.(patientId);
												usePatientStore.getState().setSelectedPatientId(patientId);
											}
											window.location.hash = "imaging";
										}}
										className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
										title="Перейти в полный рентген-кокпит"
										data-testid="btn-patient-open-imaging-view"
									>
										<Scan size={14} className="text-[var(--teal)]" />
										<span>Рентген-кокпит</span>
									</button>
									<button
										type="button"
										onClick={() => setIsCbctModalOpen(true)}
										className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
										title="Открыть 3D КЛКТ MPR студию"
										data-testid="btn-patient-open-cbct-studio"
									>
										<Activity size={14} className="text-cyan-500" />
										<span>3D КЛКТ Студия</span>
									</button>
								</div>
							</div>

							{patientStudies.length === 0 ? (
								<div
									data-testid="patient-scans-empty-state"
									className="p-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col items-center justify-center gap-2"
								>
									<Camera size={32} className="text-[var(--muted)] opacity-50" />
									<div className="font-bold text-[var(--ink)]">Снимки и КТ-исследования пока не прикреплены</div>
									<p className="max-w-md m-0">
										В карте пациента пока нет загруженных радиовизиографических или томографических снимков.
										Вы можете прикрепить снимок в приёме врача или импортировать DICOM через рентген-кокпит.
									</p>
								</div>
							) : (
								<div
									data-testid="patient-scans-grid"
									className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 flex-wrap sm:flex-nowrap"
								>
									{patientStudies.map((study: any) => {
										const isCbct = study.kind === "cbct" || study.modality === "cbct_3d";
										const thumbSrc = study.previewUrl || study.viewerUrl || "/radiology/sample_rvg_tooth16.jpg";
										return (
											<div
												key={study.id}
												className="group relative rounded-xl overflow-hidden border border-[var(--line)] bg-[#030712] cursor-pointer shrink-0 shadow-xs hover:border-[var(--teal)] transition-all"
												style={{
													width: "200px",
													height: "200px",
													minWidth: "200px",
													minHeight: "200px",
													maxWidth: "200px",
													maxHeight: "200px",
													aspectRatio: "1 / 1",
												}}
												data-testid={`patient-scan-card-${study.id}`}
												onClick={() => {
													if (isCbct) {
														setIsCbctModalOpen(true);
													} else {
														setSelectedScanForDicom({
															url: thumbSrc,
															tooth: study.toothCode,
															title: study.title,
														});
														setIsDicomModalOpen(true);
													}
												}}
												title={isCbct ? "Открыть в 3D КЛКТ Студии" : "Открыть в DICOM / RVG просмотрщике"}
											>
												<img
													src={thumbSrc}
													alt={study.title || "Рентген-снимок"}
													loading="lazy"
													decoding="async"
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
													style={{ width: "100%", height: "100%", objectFit: "cover" }}
												/>
												{/* Top Badges */}
												<div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
													<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/75 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40 shadow-xs backdrop-blur-xs">
														{study.kind === "cbct"
															? "3D КЛКТ"
															: study.kind === "opg"
																? "ОПТГ"
																: study.kind === "cephalometric" || study.kind === "trg"
																	? "ТРГ"
																	: "RVG"}
													</span>
													{study.toothCode && (
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/75 text-white border border-white/20 shadow-xs">
															#{study.toothCode}
														</span>
													)}
												</div>
												{/* Bottom Overlay */}
												<div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between text-white text-[10px]">
													<span className="truncate max-w-[110px] opacity-90">
														{study.capturedAt ? new Date(study.capturedAt).toLocaleDateString("ru-RU") : "Архив"}
														{study.effectiveDoseMicrosv ? ` · ${study.effectiveDoseMicrosv} мкЗв` : ""}
													</span>
													<span className="text-[var(--teal,#0d9488)] font-semibold flex items-center gap-0.5 group-hover:underline">
														<Eye size={12} />
														<span>Открыть</span>
													</span>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}

					{/* DICOM / RVG Viewer Modal for Patient Workspace */}
					{isDicomModalOpen && (
						<React.Suspense fallback={null}>
							<DicomViewerModal
								isOpen={isDicomModalOpen}
								onClose={() => {
									setIsDicomModalOpen(false);
									setSelectedScanForDicom(null);
								}}
								imageSrc={selectedScanForDicom?.url}
								patientName={patientName || undefined}
								toothFdiCode={selectedScanForDicom?.tooth ? String(selectedScanForDicom.tooth) : "16"}
							/>
						</React.Suspense>
					)}

					{/* Patient Workspace Modals: 3D CBCT Studio, DMS Letters, Registry & Loyalty */}
					<PatientWorkspaceModals
						patientId={patientId}
						patientName={patientName || undefined}
						isDmsLetterOpen={isDmsLetterOpen}
						setIsDmsLetterOpen={setIsDmsLetterOpen}
						handleSaveDmsLetter={handleSaveDmsLetter}
						isDmsRegistryOpen={isDmsRegistryOpen}
						setIsDmsRegistryOpen={setIsDmsRegistryOpen}
						isLoyaltyModalOpen={isLoyaltyModalOpen}
						setIsLoyaltyModalOpen={setIsLoyaltyModalOpen}
						isCbctModalOpen={isCbctModalOpen}
						setIsCbctModalOpen={setIsCbctModalOpen}
					/>

					{/* FAB clearance bottom spacer */}
					<div
						className="h-24 w-full shrink-0 pointer-events-none"
						aria-hidden="true"
					/>
				</div>
			);
		},
	);

PatientWorkspaceView.displayName = "PatientWorkspaceView";
