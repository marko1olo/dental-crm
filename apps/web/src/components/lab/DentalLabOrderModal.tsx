import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	DollarSign,
	FlaskConical,
	Layers,
	Loader2,
	Palette,
	Printer,
	QrCode,
	Send,
	X,
} from "lucide-react";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import "./labOrders.css";
import {
	type DentalLabOrderData,
	type DentalLabOrderModalProps,
	type LabOrderStageKey,
	type CanonicalLabOrderStatus,
	type CanonicalLabStatusInfo,
	type LabScheduleSlotInfo,
	CONSTRUCTION_TYPES,
	MATERIALS,
	LAB_MATERIALS,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	OCCLUSAL_SCHEMES,
	CONTACT_TIGHTNESS_OPTIONS,
	SURFACE_TEXTURE_OPTIONS,
	LAB_ORDER_STAGES,
	CANONICAL_LAB_STATUSES,
	mapToCanonicalStatus,
	calculateMaterialTotalCostKopecks,
	buildLabAppointmentDraft,
	calculateLabFinancialSplit,
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
} from "./labMath";
import { rublesToKopecks } from "@dental/shared";
import { DentalLabFinancialGate } from "./DentalLabFinancialGate";
import { checkDentalLabFinancialGate } from "./dentalLabFinancialGateEngine";
import { BankInstallmentQrModal } from "../payments/BankInstallmentQrModal";
import { DentalLabRestorationTab } from "./DentalLabRestorationTab";
import { DentalLabShadeSelector } from "./DentalLabShadeSelector";
import { DentalLabOcclusionTab } from "./DentalLabOcclusionTab";
import { DentalLabPricingTab } from "./DentalLabPricingTab";
import { DentalLabPrintBlank } from "./DentalLabPrintBlank";

// Re-export all types and constants for backwards compatibility with tests and callers
export * from "./labMath";

type TabKey = "main" | "shades" | "occlusion" | "stages" | "pricing" | "print";

export function DentalLabOrderModal({
	isOpen,
	onClose,
	initialOrder,
	patientId,
	patientName,
	doctorId,
	doctorName,
	initialToothFdi,
	patientDepositRub,
	stageTotalRub,
	stagePaidRub,
	chiefDoctorName,
	skipFinancialGate,
	onOrderSaved,
}: DentalLabOrderModalProps) {
	const [activeTab, setActiveTab] = useState<TabKey>("main");

	// Financial Gate & Installment States
	const [isGateModalOpen, setIsGateModalOpen] = useState(false);
	const [gateOverride, setGateOverride] = useState<{
		authorized: boolean;
		doctorName: string;
		timestampIso: string;
		reason: string;
	} | null>(null);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);

	// Form State
	const [formPatientId, setFormPatientId] = useState(patientId || initialOrder?.patientId || "");
	const [formPatientName, setFormPatientName] = useState(patientName || initialOrder?.patientName || "Пациент");
	const [formDoctorId, setFormDoctorId] = useState(doctorId || initialOrder?.doctorId || "");
	const [formDoctorName, setFormDoctorName] = useState(doctorName || initialOrder?.doctorName || "Лечащий врач");

	// Tooth Selection
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [constructionType, setConstructionType] = useState<string>("single_crown");
	const [material, setMaterial] = useState<string>("zirconia_multilayer");

	// VITA Shade Selection
	const [shadeSystem, setShadeSystem] = useState<"classical" | "3d_master" | "bleach">("classical");
	const [shadeClassical, setShadeClassical] = useState<string>("A2");
	const [shade3dMaster, setShade3dMaster] = useState<string>("2M2");
	const [shadeBleach, setShadeBleach] = useState<string>("BL2");
	const [shadeCervical, setShadeCervical] = useState<string>("A3");
	const [shadeBody, setShadeBody] = useState<string>("A2");
	const [shadeIncisal, setShadeIncisal] = useState<string>("A1");
	const [shadeStump, setShadeStump] = useState<string>("");
	const [translucency, setTranslucency] = useState<string>("HT");
	const [mamelons, setMamelons] = useState<boolean>(false);
	const [calcifications, setCalcifications] = useState<boolean>(false);

	// Occlusal Specs
	const [occlusalScheme, setOcclusalScheme] = useState<string>("mutually_protected");
	const [contactTightness, setContactTightness] = useState<string>("normal");
	const [surfaceTexture, setSurfaceTexture] = useState<string>("natural_anatomy");
	const [cementGapMicrons, setCementGapMicrons] = useState<number>(30);

	// Stages & Deadlines
	const [currentStage, setCurrentStage] = useState<LabOrderStageKey>("sent_to_lab");
	const [dueDate, setDueDate] = useState<string>("");
	const [frameworkTrialDate, setFrameworkTrialDate] = useState<string>("");
	const [ceramicTrialDate, setCeramicTrialDate] = useState<string>("");
	const [clinicalNotes, setClinicalNotes] = useState<string>("");
	const [secureToken, setSecureToken] = useState<string>("");

	// Financials (Копеечно точный расчет)
	const [priceRubInput, setPriceRubInput] = useState<string>("15000");
	const [clinicSharePct, setClinicSharePct] = useState<number>(50);
	const [doctorSharePct, setDoctorSharePct] = useState<number>(50);

	// Loading & Status
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ─── INITIALIZATION EFFECT ─────────────────────────────────────────────────
	useEffect(() => {
		if (!isOpen) return;

		if (initialOrder) {
			setFormPatientId(initialOrder.patientId || patientId || "");
			setFormPatientName(initialOrder.patientName || patientName || "Пациент");
			setFormDoctorId(initialOrder.doctorId || doctorId || "");
			setFormDoctorName(initialOrder.doctorName || doctorName || "Лечащий врач");
			if (initialOrder.selectedTeeth && initialOrder.selectedTeeth.length > 0) {
				setSelectedTeeth(initialOrder.selectedTeeth);
			} else if (initialOrder.toothFdi) {
				const parsed = initialOrder.toothFdi
					.split(/[\s,;-]+/)
					.map((t) => Number.parseInt(t, 10))
					.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
				setSelectedTeeth(parsed);
			}
			setConstructionType(initialOrder.constructionType || "single_crown");
			setMaterial(initialOrder.material || "zirconia_multilayer");
			if (initialOrder.colorVita) {
				if (VITA_3D_MASTER_SHADES.includes(initialOrder.colorVita as any)) {
					setShadeSystem("3d_master");
					setShade3dMaster(initialOrder.colorVita);
				} else if (VITA_BLEACH_SHADES.includes(initialOrder.colorVita as any)) {
					setShadeSystem("bleach");
					setShadeBleach(initialOrder.colorVita);
				} else {
					setShadeSystem("classical");
					setShadeClassical(initialOrder.colorVita);
				}
				setShadeBody(initialOrder.colorVita);
			}
			setShadeCervical(initialOrder.shadeCervical || "A3");
			setShadeBody(initialOrder.shadeBody || initialOrder.colorVita || "A2");
			setShadeIncisal(initialOrder.shadeIncisal || "A1");
			setShadeStump(initialOrder.shadeStump || "");
			setTranslucency(initialOrder.translucency || "HT");
			setMamelons(Boolean(initialOrder.mamelons));
			setCalcifications(Boolean(initialOrder.calcifications));
			setOcclusalScheme(initialOrder.occlusalScheme || "mutually_protected");
			setContactTightness(initialOrder.contactTightness || "normal");
			setSurfaceTexture(initialOrder.surfaceTexture || "natural_anatomy");
			setCementGapMicrons(initialOrder.cementGapMicrons ?? 30);
			setCurrentStage(initialOrder.currentStage || "sent_to_lab");
			setDueDate(initialOrder.dueDate ? initialOrder.dueDate.slice(0, 10) : "");
			setFrameworkTrialDate(initialOrder.frameworkTrialDate ? initialOrder.frameworkTrialDate.slice(0, 10) : "");
			setCeramicTrialDate(initialOrder.ceramicTrialDate ? initialOrder.ceramicTrialDate.slice(0, 10) : "");
			setClinicalNotes(initialOrder.clinicalNotes || "");
			setPriceRubInput(initialOrder.priceRub != null ? String(initialOrder.priceRub) : "15000");
			setClinicSharePct(initialOrder.clinicSharePct ?? 50);
			setDoctorSharePct(initialOrder.doctorSharePct ?? 50);
			setSecureToken(initialOrder.secureToken || crypto.randomUUID());
		} else {
			setFormPatientId(patientId || "");
			setFormPatientName(patientName || "Пациент");
			setFormDoctorId(doctorId || "");
			setFormDoctorName(doctorName || "Лечащий врач");
			if (initialToothFdi) {
				const toothNum = typeof initialToothFdi === "number" ? initialToothFdi : Number.parseInt(String(initialToothFdi), 10);
				if (!Number.isNaN(toothNum)) {
					setSelectedTeeth([toothNum]);
				}
			} else {
				setSelectedTeeth([]);
			}
			setSecureToken(crypto.randomUUID());
			const d = new Date();
			d.setDate(d.getDate() + 7);
			setDueDate(d.toISOString().slice(0, 10));

			const dTrial = new Date();
			dTrial.setDate(dTrial.getDate() + 3);
			setFrameworkTrialDate(dTrial.toISOString().slice(0, 10));

			const dCeramic = new Date();
			dCeramic.setDate(dCeramic.getDate() + 5);
			setCeramicTrialDate(dCeramic.toISOString().slice(0, 10));
		}
	}, [isOpen, initialOrder, patientId, patientName, doctorId, doctorName, initialToothFdi]);

	// ─── TOOTH PICKER HELPERS ──────────────────────────────────────────────────
	const toggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const selectQuadrant = (teeth: number[]) => {
		setSelectedTeeth((prev) => {
			const allSelected = teeth.every((t) => prev.includes(t));
			if (allSelected) {
				return prev.filter((t) => !teeth.includes(t));
			}
			return Array.from(new Set([...prev, ...teeth])).sort((a, b) => a - b);
		});
	};

	// ─── FINANCIAL CALCULATIONS (KOPECK EXACT) ──────────────────────────────────
	const totalLabPriceRub = useMemo(() => {
		const parsed = normalizeRubAmountInput(priceRubInput);
		return parsed != null && parsed >= 0 ? parsed : 0;
	}, [priceRubInput]);

	const { clinicAmountRub, doctorAmountRub, isBalanced } = useMemo(() => {
		return calculateLabFinancialSplit(totalLabPriceRub, doctorSharePct);
	}, [totalLabPriceRub, doctorSharePct]);

	const handleSharePreset = (clinic: number, doctor: number) => {
		setClinicSharePct(clinic);
		setDoctorSharePct(doctor);
	};

	// ─── DENTAL LAB FINANCIAL GATE ──────────────────────────────────────────────
	const financialGateResult = useMemo(() => {
		const stageTotalKopecks = rublesToKopecks(stageTotalRub ?? totalLabPriceRub);
		const paidKopecks = rublesToKopecks(stagePaidRub ?? 0);
		const depositKopecks = rublesToKopecks(patientDepositRub ?? 0);
		const orderPriceKopecks = rublesToKopecks(totalLabPriceRub);

		return checkDentalLabFinancialGate({
			stageTotalKopecks,
			paidKopecks,
			availableDepositKopecks: depositKopecks,
			labOrderPriceKopecks: orderPriceKopecks,
			minAdvancePercent: 50,
			chiefDoctorOverride: gateOverride ?? undefined,
		});
	}, [stageTotalRub, totalLabPriceRub, stagePaidRub, patientDepositRub, gateOverride]);

	// ─── SUBMIT HANDLER ────────────────────────────────────────────────────────
	const handleSaveOrder = async (e?: React.FormEvent, forceSaveWithOverride = false) => {
		if (e) e.preventDefault();

		if (!formPatientId) {
			showToast("ID пациента обязателен для создания наряда ЗТЛ", "error");
			return;
		}

		if (selectedTeeth.length === 0) {
			showToast("Выберите хотя бы один зуб в зубной формуле", "error");
			return;
		}

		// Проверка финансового шлюза (50% аванс за этап)
		if (!skipFinancialGate && !forceSaveWithOverride && !financialGateResult.isGatePassed) {
			setIsGateModalOpen(true);
			return;
		}

		setIsSubmitting(true);
		try {
			const toothFdiStr = selectedTeeth.join(", ");
			const finalShade =
				shadeSystem === "3d_master"
					? shade3dMaster
					: shadeSystem === "bleach"
					? shadeBleach
					: shadeClassical;

			const comprehensiveNotes = [
				clinicalNotes.trim(),
				`Конструкция: ${CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}`,
				`Цветовые зоны: Пришейка ${shadeCervical}, Тело ${shadeBody}, Режущий край ${shadeIncisal}`,
				shadeStump ? `Культя: ${shadeStump}` : null,
				`Транслюцентность: ${translucency}`,
				mamelons ? "Эффект мамелонов" : null,
				calcifications ? "Кальцификаты/пятна" : null,
				`Окклюзия: ${OCCLUSAL_SCHEMES.find((o) => o.id === occlusalScheme)?.name || occlusalScheme}`,
				`Апроксимальные контакты: ${CONTACT_TIGHTNESS_OPTIONS.find((c) => c.id === contactTightness)?.name || contactTightness}`,
				`Текстура поверхности: ${SURFACE_TEXTURE_OPTIONS.find((s) => s.id === surfaceTexture)?.name || surfaceTexture}`,
				`Цементный зазор: ${cementGapMicrons} мкм`,
				frameworkTrialDate ? `Примерка каркаса: ${frameworkTrialDate}` : null,
				ceramicTrialDate ? `Примерка керамики: ${ceramicTrialDate}` : null,
				`Доля клиники/врача: ${clinicSharePct}% / ${doctorSharePct}% (Удержание с врача: ${money(doctorAmountRub)})`,
			]
				.filter(Boolean)
				.join("\n• ");

			const payload = {
				patientId: formPatientId,
				doctorId: formDoctorId || null,
				toothFdi: toothFdiStr,
				material: LAB_MATERIALS.find((m) => m.id === material)?.name || material,
				colorVita: finalShade,
				dueDate: dueDate ? new Date(dueDate).toISOString() : null,
				clinicalNotes: `• ${comprehensiveNotes}`,
				priceRub: totalLabPriceRub,
			};

			const url = initialOrder?.id
				? `/api/clinical/lab-orders/${initialOrder.id}`
				: "/api/clinical/lab-orders";
			const method = initialOrder?.id ? "PUT" : "POST";

			const res = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || "Не удалось сохранить заказ ЗТЛ");
			}

			const savedOrder = await res.json();

			if (method === "POST" && savedOrder?.id && selectedTeeth.length > 0) {
				for (const tooth of selectedTeeth) {
					await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							toothFdi: tooth,
							restorationType: constructionType,
							material,
							shadeFinal: finalShade,
							shadeStump: shadeStump || null,
							translucencyLevel: translucency,
							cementGapMicrons,
							priceRub: totalLabPriceRub / selectedTeeth.length,
						}),
					}).catch(() => {});
				}
			}

			showToast(
				initialOrder?.id
					? "Наряд ЗТЛ успешно обновлен"
					: "Наряд-заказ в зуботехническую лабораторию успешно оформлен!",
				"success",
			);

			const resultData: DentalLabOrderData = {
				...savedOrder,
				selectedTeeth,
				constructionType,
				material,
				colorVita: finalShade,
				shadeSystem,
				shadeCervical,
				shadeBody,
				shadeIncisal,
				shadeStump,
				translucency,
				mamelons,
				calcifications,
				occlusalScheme,
				contactTightness,
				surfaceTexture,
				cementGapMicrons,
				currentStage,
				frameworkTrialDate,
				ceramicTrialDate,
				dueDate,
				clinicSharePct,
				doctorSharePct,
				doctorDeductionRub: doctorAmountRub,
			};

			if (onOrderSaved) {
				onOrderSaved(resultData);
			}

			onClose();
		} catch (err: any) {
			showToast(err.message || "Ошибка сохранения наряда ЗТЛ", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	if (!isOpen) return null;

	const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/#/portal/lab-order/${secureToken}`;
	const gostOrderNumber = formatGostOrderNumber(secureToken);

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dental-lab-modal-title"
		>
			<div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
				
				{/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shadow-sm">
							<FlaskConical className="w-6 h-6" />
						</div>
						<div>
							<h2
								id="dental-lab-modal-title"
								className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0"
							>
								Наряд-заказ в зуботехническую лабораторию (ЗТЛ)
								<span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
									CAD/CAM Pro
								</span>
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
								Пациент: <span className="font-bold text-slate-800 dark:text-slate-200">{formPatientName}</span> · Врач: <span className="font-bold text-slate-800 dark:text-slate-200">{formDoctorName}</span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
							title="Печать наряда (ГОСТ)"
						>
							<Printer className="w-4 h-4" />
							Печать (ГОСТ)
						</button>
						<button
							type="button"
							onClick={onClose}
							data-testid="lab-order-modal-close-btn"
							className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							aria-label="Закрыть модальное окно"
						>
							<X className="w-6 h-6" />
						</button>
					</div>
				</div>

				{/* ─── NAVIGATION TABS ───────────────────────────────────────────── */}
				<div className="flex items-center gap-1.5 px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 overflow-x-auto text-xs scrollbar-none">
					{[
						{ id: "main", label: "1. Зубная формула & Конструкция", icon: FlaskConical },
						{ id: "shades", label: "2. Расцветка VITA & Культя", icon: Palette },
						{ id: "occlusion", label: "3. Окклюзия & Текстура", icon: Layers },
						{ id: "stages", label: "4. Этапы ЗТЛ & Примерки", icon: Clock },
						{ id: "pricing", label: "5. Себестоимость & Сделка", icon: DollarSign },
						{ id: "print", label: "6. Бланк наряда (ГОСТ) & QR", icon: QrCode },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id as TabKey)}
								className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold whitespace-nowrap shrink-0 transition-all ${
									isActive
										? "bg-white dark:bg-slate-800 text-[var(--teal)] shadow-sm border border-slate-200 dark:border-slate-700"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
								}`}
							>
								<Icon className="w-4 h-4" />
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* ─── MODAL BODY WITH TAB PANELS ───────────────────────────────── */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">

					{/* ═══ TAB 1: MAIN SPECS & ODONTOGRAM ═══════════════════════════ */}
					{activeTab === "main" && (
						<DentalLabRestorationTab
							selectedTeeth={selectedTeeth}
							setSelectedTeeth={setSelectedTeeth}
							toggleTooth={toggleTooth}
							selectQuadrant={selectQuadrant}
							constructionType={constructionType}
							setConstructionType={setConstructionType}
							material={material}
							setMaterial={setMaterial}
							dueDate={dueDate}
							setDueDate={setDueDate}
							clinicalNotes={clinicalNotes}
							setClinicalNotes={setClinicalNotes}
						/>
					)}

					{/* ═══ TAB 2: VITA SHADES & STUMP PREPARATION ════════════════════ */}
					{activeTab === "shades" && (
						<DentalLabShadeSelector
							shadeSystem={shadeSystem}
							setShadeSystem={setShadeSystem}
							shadeClassical={shadeClassical}
							setShadeClassical={setShadeClassical}
							shade3dMaster={shade3dMaster}
							setShade3dMaster={setShade3dMaster}
							shadeBleach={shadeBleach}
							setShadeBleach={setShadeBleach}
							shadeCervical={shadeCervical}
							setShadeCervical={setShadeCervical}
							shadeBody={shadeBody}
							setShadeBody={setShadeBody}
							shadeIncisal={shadeIncisal}
							setShadeIncisal={setShadeIncisal}
							shadeStump={shadeStump}
							setShadeStump={setShadeStump}
							translucency={translucency}
							setTranslucency={setTranslucency}
							mamelons={mamelons}
							setMamelons={setMamelons}
							calcifications={calcifications}
							setCalcifications={setCalcifications}
						/>
					)}

					{/* ═══ TAB 3: OCCLUSION, CONTACTS, TEXTURE ══════════════════════ */}
					{activeTab === "occlusion" && (
						<DentalLabOcclusionTab
							occlusalScheme={occlusalScheme}
							setOcclusalScheme={setOcclusalScheme}
							contactTightness={contactTightness}
							setContactTightness={setContactTightness}
							surfaceTexture={surfaceTexture}
							setSurfaceTexture={setSurfaceTexture}
							cementGapMicrons={cementGapMicrons}
							setCementGapMicrons={setCementGapMicrons}
							toothFdi={selectedTeeth[0] || initialToothFdi || 16}
							materialId={material}
							onMaterialChange={setMaterial}
						/>
					)}

					{/* ═══ TAB 4: LAB STAGES & TRIAL FITTINGS TRACKER ═══════════════ */}
					{activeTab === "stages" && (
						<div className="space-y-6">
							<div>
								<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
									Жизненный цикл, трекинг ЗТЛ и даты примерок
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									Пошаговый трекер технологических этапов от передачи оттисков до фиксации в полости рта.
								</p>
							</div>

							{/* Fitting Trial Dates Box (Eliminate <= 11px micro-fonts) */}
							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-[var(--teal)]" />
									<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
										Даты клинических примерок у пациента
									</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-1.5">
										<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
											1. Примерка каркаса (Framework Try-In)
										</label>
										<input
											type="date"
											value={frameworkTrialDate}
											onChange={(e) => setFrameworkTrialDate(e.target.value)}
											className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--teal)]"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
											2. Примерка керамики / Бисквит (Ceramic Try-In)
										</label>
										<input
											type="date"
											value={ceramicTrialDate}
											onChange={(e) => setCeramicTrialDate(e.target.value)}
											className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--teal)]"
										/>
									</div>
								</div>
							</div>

							<div className="space-y-3">
								{LAB_ORDER_STAGES.map((stage, idx) => {
									const isCurrent = currentStage === stage.id;
									const isPassed = LAB_ORDER_STAGES.findIndex((s) => s.id === currentStage) > idx;

									return (
										<div
											key={stage.id}
											onClick={() => setCurrentStage(stage.id)}
											className={`min-h-[52px] p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
												isCurrent
													? `${stage.color} ring-2 ring-[var(--teal-soft)] shadow-md font-bold`
													: isPassed
													? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-85"
													: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50 hover:opacity-100"
											}`}
										>
											<div className="flex items-center gap-3">
												<div
													className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
														isPassed || isCurrent
															? "bg-[var(--teal)] text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													{isPassed ? <Check className="w-4 h-4" /> : stage.step}
												</div>
												<div>
													<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
														{stage.name}
													</div>
													<div className="text-xs text-slate-500 dark:text-slate-400">
														{stage.desc}
													</div>
												</div>
											</div>

											{isCurrent && (
												<span className="px-3 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-sm flex-shrink-0">
													Текущий этап
												</span>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* ═══ TAB 5: PRICING & DOCTOR SALARY DEDUCTION ══════════════════ */}
					{activeTab === "pricing" && (
						<DentalLabPricingTab
							priceRubInput={priceRubInput}
							setPriceRubInput={setPriceRubInput}
							clinicSharePct={clinicSharePct}
							setClinicSharePct={setClinicSharePct}
							doctorSharePct={doctorSharePct}
							setDoctorSharePct={setDoctorSharePct}
							totalLabPriceRub={totalLabPriceRub}
							clinicAmountRub={clinicAmountRub}
							doctorAmountRub={doctorAmountRub}
							isBalanced={isBalanced}
							handleSharePreset={handleSharePreset}
						/>
					)}

					{/* ═══ TAB 6: PRINTABLE BLANK (GOST) & QR CODE ══════════════════ */}
					{activeTab === "print" && (
						<DentalLabPrintBlank
							gostOrderNumber={gostOrderNumber}
							secureToken={secureToken}
							formPatientName={formPatientName}
							formDoctorName={formDoctorName}
							selectedTeeth={selectedTeeth}
							constructionType={constructionType}
							material={material}
							shadeSystem={shadeSystem}
							shadeClassical={shadeClassical}
							shade3dMaster={shade3dMaster}
							shadeBleach={shadeBleach}
							shadeCervical={shadeCervical}
							shadeBody={shadeBody}
							shadeIncisal={shadeIncisal}
							shadeStump={shadeStump}
							translucency={translucency}
							mamelons={mamelons}
							calcifications={calcifications}
							occlusalScheme={occlusalScheme}
							contactTightness={contactTightness}
							surfaceTexture={surfaceTexture}
							cementGapMicrons={cementGapMicrons}
							frameworkTrialDate={frameworkTrialDate}
							ceramicTrialDate={ceramicTrialDate}
							dueDate={dueDate}
							clinicalNotes={clinicalNotes}
							totalLabPriceRub={totalLabPriceRub}
							portalUrl={portalUrl}
							handlePrint={handlePrint}
						/>
					)}
				</div>

				{/* ─── MODAL FOOTER WITH SAVE / SUBMIT ───────────────────────────── */}
				<div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
					<div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
						{selectedTeeth.length > 0 ? (
							<span>
								Зубы FDI: <strong className="text-slate-800 dark:text-slate-200 text-sm">{selectedTeeth.join(", ")}</strong> · Себестоимость: <strong className="text-[var(--teal)] text-sm">{money(totalLabPriceRub)}</strong>
							</span>
						) : (
							<span>Зубы не выбраны</span>
						)}
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={() => handleSaveOrder()}
							disabled={isSubmitting || selectedTeeth.length === 0}
							className="min-h-[44px] px-5 py-2.5 text-xs font-bold rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
							data-testid="submit-lab-order-btn"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Сохранение наряда...
								</>
							) : (
								<>
									<Send className="w-4 h-4" />
									{initialOrder?.id ? "Сохранить изменения" : "Оформить наряд в ЗТЛ"}
								</>
							)}
						</button>
					</div>
				</div>

				{/* ─── DENTAL LAB FINANCIAL GATE MODAL ───────────────────────── */}
				{isGateModalOpen && (
					<DentalLabFinancialGate
						isOpen={isGateModalOpen}
						onClose={() => setIsGateModalOpen(false)}
						gateResult={financialGateResult}
						patientName={formPatientName}
						stageTitle={`Наряд ЗТЛ: ${CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}`}
						defaultChiefDoctorName={chiefDoctorName || "Д-р Смирнов А. В. (Главный врач)"}
						variant="modal"
						onConfirmOverride={(override) => {
							setGateOverride(override);
							setIsGateModalOpen(false);
							showToast(`Оверрайд главврача авторизован: ${override.doctorName}`, "success");
							// Автоматически продолжаем сохранение наряда с оверрайдом
							handleSaveOrder(undefined, true);
						}}
						onBlock={() => {
							setIsGateModalOpen(false);
							showToast("Отправка наряда в лабораторию заблокирована финансовым шлюзом", "warning");
						}}
						onOpenInstallmentModal={() => {
							setIsGateModalOpen(false);
							setIsInstallmentModalOpen(true);
						}}
						onAcceptAdvancePayment={() => {
							setIsGateModalOpen(false);
							showToast("Перейдите в кассовый модуль для приема аванса", "info");
						}}
					/>
				)}

				{/* ─── BANK INSTALLMENT QR MODAL ─────────────────────────────── */}
				{isInstallmentModalOpen && (
					<BankInstallmentQrModal
						isOpen={isInstallmentModalOpen}
						onClose={() => setIsInstallmentModalOpen(false)}
						stageTitle={`Наряд ЗТЛ: ${CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}`}
						stageAmountKopecks={rublesToKopecks(totalLabPriceRub)}
						patientId={formPatientId}
						patientName={formPatientName}
						onInstallmentApproved={(approval) => {
							showToast(
								`Рассрочка на сумму ${totalLabPriceRub.toLocaleString("ru-RU")} ₽ одобрена банком ${approval.providerId.toUpperCase()}! Наряд разблокирован.`,
								"success",
							);
							// После одобрения банк покрыл сумму, отправляем наряд
							handleSaveOrder(undefined, true);
						}}
					/>
				)}

			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
