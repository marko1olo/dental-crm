import React, { useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { rublesToKopecks, formatLabOrderFormZtl1A4Protocol } from "@dental/shared";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "./dentalLabFinancialGateEngine";
import {
	type DentalLabOrderData,
	type DentalLabOrderModalProps,
	type LabOrderStageKey,
	type ExpressLabPreset,
	type JawScope,
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	calculateLabFinancialSplit,
	formatGostOrderNumber,
	addWorkingDays,
	ONE_CLICK_LAB_DEFAULTS,
	formatJawScopeLabel,
} from "./labMath";
import { checkFittingAppointmentCollision } from "./dentalLabOrderEngine";
import { buildLabOrderMessengerSummary } from "./dentalLabModalPresets";

export type LabModalTabKey = "main" | "shades" | "stages" | "print";

export function useDentalLabOrderForm({
	isOpen,
	onClose,
	initialOrder,
	patientId,
	patientName,
	doctorId,
	doctorName,
	initialToothFdi,
	initialTeeth,
	patientChartNumber,
	patientDepositRub,
	stageTotalRub,
	stagePaidRub,
	chiefDoctorName,
	skipFinancialGate,
	treatmentPlanAgeDays,
	isPlanExpired,
	onOrderSaved,
	onSaveOrder,
	clinicPhone = "",
	clinicName = "Денте",
	initialTab = "main",
	scheduledVisitDate: propScheduledVisitDate,
}: DentalLabOrderModalProps) {
	const [activeTab, setActiveTab] = useState<LabModalTabKey>(initialTab as LabModalTabKey);

	useEffect(() => {
		if (isOpen && initialTab) {
			setActiveTab(initialTab as LabModalTabKey);
		}
	}, [isOpen, initialTab]);

	// Doctor Clinical Override State (Mandates 8d, 8e)
	const [gateOverride, setGateOverride] = useState<{
		authorized: boolean;
		doctorName: string;
		timestampIso: string;
		reason: string;
	} | null>(null);

	// Form State
	const [formPatientId, setFormPatientId] = useState(patientId || initialOrder?.patientId || "");
	const [formPatientName, setFormPatientName] = useState(patientName || initialOrder?.patientName || "Пациент");
	const [formDoctorId, setFormDoctorId] = useState(doctorId || initialOrder?.doctorId || "");
	const [formDoctorName, setFormDoctorName] = useState(doctorName || initialOrder?.doctorName || "Лечащий врач");

	// Tooth & Jaw Selection
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [jawScope, setJawScope] = useState<JawScope | null>(initialOrder?.jawScope || null);
	const [constructionType, setConstructionType] = useState<string>("single_crown");
	const [material, setMaterial] = useState<string>("zirconia_multilayer");
	const [impressionType, setImpressionType] = useState<string>("a_silicone");

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
	const [opalescence, setOpalescence] = useState<boolean>(false);

	// Occlusal Specs
	const [occlusalScheme, setOcclusalScheme] = useState<string>("mutually_protected");
	const [contactTightness, setContactTightness] = useState<string>("normal");
	const [surfaceTexture, setSurfaceTexture] = useState<string>("natural_anatomy");
	const [cementGapMicrons, setCementGapMicrons] = useState<number>(30);

	// Stages & Deadlines
	const [currentStage, setCurrentStage] = useState<LabOrderStageKey>("sent_to_lab");
	const [dueDate, setDueDate] = useState<string>("");
	const [scheduledVisitDate, setScheduledVisitDate] = useState<string>("");
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
			} else if (initialTeeth && initialTeeth.length > 0) {
				const parsed = initialTeeth
					.map((t) => (typeof t === "number" ? t : Number.parseInt(String(t), 10)))
					.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
				setSelectedTeeth(parsed);
			} else if (initialOrder.toothFdi) {
				const parsed = initialOrder.toothFdi
					.split(/[\s,;-]+/)
					.map((t) => Number.parseInt(t, 10))
					.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
				setSelectedTeeth(parsed);
			} else {
				setSelectedTeeth([]);
			}
			if (initialOrder.jawScope) {
				setJawScope(initialOrder.jawScope);
			} else if (initialOrder.toothFdi) {
				const tf = initialOrder.toothFdi.toLowerCase();
				if (tf.includes("обе челюсти") || tf.includes("both") || tf.includes("в/ч + н/ч")) {
					setJawScope("both");
				} else if (tf.includes("верхн") || tf.includes("в/ч") || tf.includes("upper")) {
					setJawScope("upper");
				} else if (tf.includes("нижн") || tf.includes("н/ч") || tf.includes("lower")) {
					setJawScope("lower");
				} else {
					setJawScope(null);
				}
			} else {
				setJawScope(null);
			}
			setConstructionType(initialOrder.constructionType || "single_crown");
			setMaterial(initialOrder.material || "zirconia_multilayer");
			setImpressionType(initialOrder.impressionType || "a_silicone");
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
			setOpalescence(Boolean(initialOrder.opalescence));
			setOcclusalScheme(initialOrder.occlusalScheme || "mutually_protected");
			setContactTightness(initialOrder.contactTightness || "normal");
			setSurfaceTexture(initialOrder.surfaceTexture || "natural_anatomy");
			setCementGapMicrons(initialOrder.cementGapMicrons ?? 30);
			setCurrentStage(initialOrder.currentStage || "sent_to_lab");
			setDueDate(initialOrder.dueDate ? initialOrder.dueDate.slice(0, 10) : "");
			setScheduledVisitDate(
				initialOrder.scheduledVisitDate
					? initialOrder.scheduledVisitDate.slice(0, 10)
					: propScheduledVisitDate
					? propScheduledVisitDate.slice(0, 10)
					: ""
			);
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
			setMamelons(false);
			setCalcifications(false);
			setOpalescence(false);
			setScheduledVisitDate(propScheduledVisitDate ? propScheduledVisitDate.slice(0, 10) : "");
			if (initialTeeth && initialTeeth.length > 0) {
				const parsed = initialTeeth
					.map((t) => (typeof t === "number" ? t : Number.parseInt(String(t), 10)))
					.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85);
				setSelectedTeeth(parsed);
			} else if (initialToothFdi) {
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
	}, [isOpen, initialOrder, patientId, patientName, doctorId, doctorName, initialToothFdi, initialTeeth, propScheduledVisitDate]);

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

	const { doctorAmountRub } = useMemo(() => {
		return calculateLabFinancialSplit(totalLabPriceRub, doctorSharePct);
	}, [totalLabPriceRub, doctorSharePct]);

	const fittingCollision = useMemo(() => {
		const targetVisit = scheduledVisitDate || propScheduledVisitDate;
		return checkFittingAppointmentCollision(dueDate, targetVisit);
	}, [dueDate, scheduledVisitDate, propScheduledVisitDate]);

	const handleApplyOneClickDefaults = () => {
		setConstructionType(ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle);
		setMaterial(ONE_CLICK_LAB_DEFAULTS.materialId);
		setShadeSystem(ONE_CLICK_LAB_DEFAULTS.shadeSystem);
		setShadeClassical(ONE_CLICK_LAB_DEFAULTS.colorVita);
		setShadeBody(ONE_CLICK_LAB_DEFAULTS.colorVita);
		setSurfaceTexture(ONE_CLICK_LAB_DEFAULTS.surfaceTexture);
		setCementGapMicrons(ONE_CLICK_LAB_DEFAULTS.cementGapMicrons);
		setTranslucency(ONE_CLICK_LAB_DEFAULTS.translucency);
		const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
		setDueDate(due.toISOString().slice(0, 10));
		showToast(
			`Применен 1-клик пресет: «Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней» (до ${due.toLocaleDateString("ru-RU")})`,
			"success",
			4000,
		);
	};

	const handleApplyExpressPreset = (preset: ExpressLabPreset) => {
		setConstructionType(preset.constructionType);
		setMaterial(preset.materialId);
		setShadeSystem("classical");
		setShadeClassical(preset.colorVita);
		setShadeBody(preset.colorVita);
		setOcclusalScheme(preset.occlusalScheme);
		setContactTightness(preset.contactTightness);
		setSurfaceTexture(preset.surfaceTexture);
		setCementGapMicrons(preset.cementGapMicrons);
		if (preset.impressionType) {
			setImpressionType(preset.impressionType);
		}
		if (preset.isFullArchOrJaw && preset.toothFdi) {
			setJawScope("both");
		}
		const due = addWorkingDays(new Date(), preset.workingDays);
		setDueDate(due.toISOString().slice(0, 10));
		setPriceRubInput(String(preset.priceRub));
		showToast(
			`Пресет применен: ${preset.title} (${preset.shortDesc})`,
			"success",
			4000,
		);
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
			doctorOverride: gateOverride ?? undefined,
			treatmentPlanAgeDays,
			isPlanExpired,
		});
	}, [stageTotalRub, totalLabPriceRub, stagePaidRub, patientDepositRub, gateOverride, treatmentPlanAgeDays, isPlanExpired]);

	// ─── SUBMIT HANDLER ────────────────────────────────────────────────────────
	const handleSaveOrder = async (e?: React.FormEvent, forceSaveWithOverride = false) => {
		if (e) e.preventDefault();

		const effectivePatientId = formPatientId.trim() || (patientId ? patientId.trim() : `pat-solo-${Date.now()}`);
		const isWarrantyOrder = Boolean(initialOrder?.isWarrantyRework || totalLabPriceRub === 0 || Number(priceRubInput) === 0);
		let effectiveOverride = gateOverride;
		if (!skipFinancialGate && !forceSaveWithOverride && !financialGateResult.isGatePassed && !isWarrantyOrder && !effectiveOverride) {
			effectiveOverride = createDoctorClinicalOverride(
				formDoctorName || chiefDoctorName || "Лечащий врач",
				"Отправка наряда в ЗТЛ — клиническое решение лечащего врача (Автономия врача)",
			);
			setGateOverride(effectiveOverride);
		}

		setIsSubmitting(true);
		try {
			let toothFdiStr: string;
			if (jawScope) {
				toothFdiStr = formatJawScopeLabel(jawScope);
			} else if (selectedTeeth.length > 0) {
				toothFdiStr = selectedTeeth.join(", ");
			} else {
				toothFdiStr = "Общий наряд / Челюсть целиком";
			}
			const finalShade =
				shadeSystem === "3d_master"
					? shade3dMaster
					: shadeSystem === "bleach"
					? shadeBleach
					: shadeClassical;

			const comprehensiveNotes = [
				initialOrder?.isWarrantyRework ? "ГАРАНТИЙНАЯ ПЕРЕДЕЛКА (0 ₽ ДЛЯ ПАЦИЕНТА)" : null,
				initialOrder?.reworkReason ? `Причина рекламации: ${initialOrder.reworkReason}` : null,
				initialOrder?.originalOrderNumber ? `Исходный наряд ЗТЛ: № ${initialOrder.originalOrderNumber}` : null,
				patientChartNumber ? `№ Медкарты: ${patientChartNumber}` : null,
				jawScope ? `Наряд на челюсть: ${formatJawScopeLabel(jawScope)}` : null,
				clinicalNotes.trim(),
				`Оттискная масса / Скан: ${impressionType}`,
				`Конструкция: ${CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}`,
				`Цветовые зоны: Пришейка ${shadeCervical}, Тело ${shadeBody}, Режущий край ${shadeIncisal}`,
				shadeStump ? `Культя: ${shadeStump}` : null,
				`Транслюцентность: ${translucency}`,
				mamelons ? "Эффект мамелонов" : null,
				"Окклюзия / Прикус: В привычной окклюзии (по силиконовому регистрату / шаблону)",
				"Анатомия: Естественная анатомическая форма зуба",
				frameworkTrialDate ? `Примерка каркаса: ${frameworkTrialDate}` : null,
				ceramicTrialDate ? `Примерка керамики: ${ceramicTrialDate}` : null,
				effectiveOverride?.authorized
					? `Клиническое решение лечащего врача: отправка наряда в ЗТЛ согласована (${effectiveOverride.doctorName})`
					: null,
			]
				.filter(Boolean)
				.join("\n• ");

			const payload = {
				patientId: effectivePatientId,
				doctorId: formDoctorId || null,
				toothFdi: toothFdiStr,
				jawScope: jawScope || undefined,
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
				const itemErrors: number[] = [];
				for (const tooth of selectedTeeth) {
					try {
						const itemRes = await fetch(
							`/api/clinical/lab-orders/${savedOrder.id}/items`,
							{
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
							},
						);
						if (!itemRes.ok) {
							itemErrors.push(tooth);
						}
					} catch {
						itemErrors.push(tooth);
					}
				}
				if (itemErrors.length > 0) {
					showToast(
						`Внимание: часть позиций не удалось привязать (зубы ${itemErrors.join(", ")})`,
						"warning",
					);
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
				jawScope,
				constructionType,
				material,
				impressionType,
				colorVita: finalShade,
				shadeSystem,
				shadeCervical,
				shadeBody,
				shadeIncisal,
				shadeStump,
				translucency,
				mamelons,
				calcifications,
				opalescence,
				occlusalScheme,
				contactTightness,
				surfaceTexture,
				cementGapMicrons,
				currentStage,
				frameworkTrialDate,
				ceramicTrialDate,
				dueDate,
				scheduledVisitDate: scheduledVisitDate || undefined,
				fittingCollisionWarning: fittingCollision.hasCollision ? fittingCollision.warningRu : undefined,
				clinicSharePct,
				doctorSharePct,
				doctorDeductionRub: doctorAmountRub,
			};

			if (onOrderSaved) {
				onOrderSaved(resultData);
			}
			if (onSaveOrder) {
				onSaveOrder(resultData);
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

	const gostOrderNumber = formatGostOrderNumber(secureToken);

	const handleCopyZtl1Protocol = () => {
		try {
			const safeWorkType = (constructionType as any) || "single_crown";
			const safeMaterial = (material as any) || "zirconia_multilayer";
			const synthOrder: any = {
				id: gostOrderNumber,
				clinicId: "clinic-default",
				patientId: patientId || "pat-default",
				patientFullName: formPatientName || "Пациент",
				doctorId: doctorId || "doc-default",
				doctorFullName: formDoctorName || "Лечащий врач-ортопед",
				labId: "lab-primary",
				labName: "Зуботехническая лаборатория DENTE",
				workType: safeWorkType,
				material: safeMaterial,
				shade: (shadeClassical || shade3dMaster || shadeBleach || "A2") as any,
				toothNumbers: selectedTeeth && selectedTeeth.length > 0 ? selectedTeeth : [11],
				antagonistInfo: "В центральной окклюзии",
				impressionType: (impressionType as any) || "digital_intraoral_scan",
				sentDate: new Date().toISOString().split("T")[0]!,
				expectedDate: dueDate || new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0]!,
				status: (currentStage as any) || "sent_to_lab",
				stages: [],
				labCostKopecks: rublesToKopecks(totalLabPriceRub || 0),
				isWarrantyRework: currentStage === "correction_remake",
				warrantyMonths: 12,
				notes: clinicalNotes || undefined,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			const protocolText = formatLabOrderFormZtl1A4Protocol(synthOrder, "Стоматологическая клиника DENTE");
			navigator.clipboard.writeText(protocolText);
			showToast("Протокол наряда ЗТЛ-1 скопирован в буфер", "success");
		} catch (_e) {
			showToast("Не удалось скопировать протокол ЗТЛ-1", "error");
		}
	};

	const handleCopyMessengerSummary = async () => {
		const finalShade =
			shadeSystem === "3d_master"
				? shade3dMaster
				: shadeSystem === "bleach"
				? shadeBleach
				: shadeClassical;

		let teethOrJaw: string;
		if (jawScope) {
			teethOrJaw = formatJawScopeLabel(jawScope);
		} else if (selectedTeeth.length > 0) {
			teethOrJaw = selectedTeeth.join(", ");
		} else {
			teethOrJaw = "Общий наряд / Челюсть целиком";
		}

		const constructionTypeTitle =
			CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType;
		const materialTitle =
			LAB_MATERIALS.find((m) => m.id === material)?.name || material;

		const formatDisplayDate = (dStr?: string | null) => {
			if (!dStr) return "";
			try {
				const parsed = new Date(dStr);
				if (!Number.isNaN(parsed.getTime())) {
					return parsed.toLocaleDateString("ru-RU");
				}
			} catch (err: unknown) {
				console.warn("[DentalLabOrderModal] Failed to format date:", dStr, err);
			}
			return dStr;
		};

		const text = buildLabOrderMessengerSummary({
			clinicName: clinicName || "Денте",
			clinicPhone: clinicPhone || "",
			gostOrderNumber,
			patientName: formPatientName,
			doctorName: formDoctorName,
			teethOrJaw,
			constructionTypeTitle,
			materialTitle,
			shade: finalShade,
			dueDate: dueDate ? formatDisplayDate(dueDate) : "Не указан",
			frameworkTrialDate: frameworkTrialDate ? formatDisplayDate(frameworkTrialDate) : undefined,
			ceramicTrialDate: ceramicTrialDate ? formatDisplayDate(ceramicTrialDate) : undefined,
			clinicalNotes: clinicalNotes.trim() || undefined,
		});

		try {
			if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
				await navigator.clipboard.writeText(text);
			}
			showToast("Выжимка наряда скопирована для отправки курьеру/технику в мессенджер", "success");
		} catch {
			showToast("Не удалось скопировать выжимку наряда в буфер", "error");
		}
	};

	const portalUrl = `${typeof window !== "undefined" ? (window.location?.origin || "") : ""}/#/portal/lab-order/${secureToken}`;

	return {
		activeTab,
		setActiveTab,
		gateOverride,
		setGateOverride,
		formPatientId,
		setFormPatientId,
		formPatientName,
		setFormPatientName,
		formDoctorId,
		setFormDoctorId,
		formDoctorName,
		setFormDoctorName,
		selectedTeeth,
		setSelectedTeeth,
		jawScope,
		setJawScope,
		constructionType,
		setConstructionType,
		material,
		setMaterial,
		impressionType,
		setImpressionType,
		shadeSystem,
		setShadeSystem,
		shadeClassical,
		setShadeClassical,
		shade3dMaster,
		setShade3dMaster,
		shadeBleach,
		setShadeBleach,
		shadeCervical,
		setShadeCervical,
		shadeBody,
		setShadeBody,
		shadeIncisal,
		setShadeIncisal,
		shadeStump,
		setShadeStump,
		translucency,
		setTranslucency,
		mamelons,
		setMamelons,
		calcifications,
		setCalcifications,
		opalescence,
		setOpalescence,
		occlusalScheme,
		setOcclusalScheme,
		contactTightness,
		setContactTightness,
		surfaceTexture,
		setSurfaceTexture,
		cementGapMicrons,
		setCementGapMicrons,
		currentStage,
		setCurrentStage,
		dueDate,
		setDueDate,
		scheduledVisitDate,
		setScheduledVisitDate,
		fittingCollision,
		frameworkTrialDate,
		setFrameworkTrialDate,
		ceramicTrialDate,
		setCeramicTrialDate,
		clinicalNotes,
		setClinicalNotes,
		secureToken,
		priceRubInput,
		setPriceRubInput,
		clinicSharePct,
		setClinicSharePct,
		doctorSharePct,
		setDoctorSharePct,
		isSubmitting,
		totalLabPriceRub,
		doctorAmountRub,
		financialGateResult,
		gostOrderNumber,
		portalUrl,
		toggleTooth,
		selectQuadrant,
		handleApplyOneClickDefaults,
		handleApplyExpressPreset,
		handleSaveOrder,
		handlePrint,
		handleCopyZtl1Protocol,
		handleCopyMessengerSummary,
	};
}
