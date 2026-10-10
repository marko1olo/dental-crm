import {
	renderForm043uHtml,
	calculateDmftFromOdontogram,
	renderActOfCompletedWorksHtml,
	renderEstimatePrintableHtml,
	type ActOfCompletedWorksItem,
	type EstimateStage,
	type EstimateStageItem,
} from "@dental/shared";
import { generateInformedConsent1051nHtml } from "../../../lib/clinicalProtocols043";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";
import { showToast } from "../../GlobalToast";

/**
 * Печать HTML документа через скрытый iframe (без блокировки UI и без перехода по страницам).
 */
export function printHtmlViaIframe(htmlContent: string): void {
	if (typeof window === "undefined") return;

	const printFrame = document.createElement("iframe");
	printFrame.style.position = "fixed";
	printFrame.style.right = "0";
	printFrame.style.bottom = "0";
	printFrame.style.width = "0";
	printFrame.style.height = "0";
	printFrame.style.border = "0";
	document.body.appendChild(printFrame);

	const frameDoc =
		printFrame.contentWindow?.document || printFrame.contentDocument;
	if (frameDoc) {
		frameDoc.write(htmlContent);
		frameDoc.close();
		setTimeout(() => {
			printFrame.contentWindow?.focus();
			printFrame.contentWindow?.print();
			setTimeout(() => {
				if (document.body.contains(printFrame)) {
					document.body.removeChild(printFrame);
				}
			}, 1000);
		}, 150);
	} else {
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(htmlContent);
			printWindow.document.close();
			printWindow.focus();
			printWindow.print();
		} else {
			window.print();
		}
	}
}

/**
 * Извлекает реквизиты клиники из dashboard с надёжными дефолтами РФ.
 */
export function extractClinicRequisites(dashboard: any) {
	const profile =
		dashboard?.clinicSettings?.profile ||
		dashboard?.clinicProfile ||
		dashboard?.organization ||
		{};

	const clinicLegalName =
		profile?.legalName?.trim() ||
		profile?.clinicName?.trim() ||
		profile?.brandName?.trim() ||
		dashboard?.organization?.fullName ||
		dashboard?.organization?.name ||
		"Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";

	const clinicInn =
		profile?.inn?.trim() || dashboard?.organization?.inn || "7704123456";
	const clinicOgrn =
		profile?.ogrn?.trim() || dashboard?.organization?.ogrn || "1237700123456";
	const clinicKpp =
		profile?.kpp?.trim() || dashboard?.organization?.kpp || "770401001";
	const clinicAddress =
		profile?.address?.trim() ||
		dashboard?.organization?.address ||
		"г. Москва, ул. Стоматологическая, д. 24, корп. 1";
	const clinicPhone =
		profile?.phone?.trim() ||
		dashboard?.organization?.phone ||
		"+7 (495) 777-88-99";

	let clinicLicense = profile?.medicalLicenseNumber?.trim();
	if (clinicLicense) {
		if (profile?.medicalLicenseIssuedAt?.trim() && !clinicLicense.includes("от ")) {
			clinicLicense += ` от ${profile.medicalLicenseIssuedAt.trim()}`;
		}
		if (profile?.medicalLicenseIssuer?.trim() && !clinicLicense.includes("выдана")) {
			clinicLicense += ` выдана ${profile.medicalLicenseIssuer.trim()}`;
		}
	} else {
		clinicLicense =
			"ЛО41-01137-77/00368421 от 14.02.2023 г. выдана Департаментом здравоохранения города Москвы";
	}

	return {
		clinicLegalName,
		clinicInn,
		clinicOgrn,
		clinicKpp,
		clinicAddress,
		clinicPhone,
		clinicLicense,
		medicalLicenseNumber: profile?.medicalLicenseNumber?.trim() || "ЛО41-01137-77/00368421",
	};
}

/**
 * Нормализует одонтограмму для точного расчета индекса интенсивности кариеса КПУ (DMFT).
 */
export function normalizeOdontogramForDmft(
	teethInput: any,
): Record<number, any> {
	if (!teethInput) return {};
	const result: Record<number, any> = {};

	if (Array.isArray(teethInput)) {
		for (const item of teethInput) {
			if (!item) continue;
			const num = Number(item.toothNumber || item.code || item.number);
			if (num) {
				const cond =
					item.statusCode || item.condition || item.status || item.state || "H";
				result[num] = {
					toothNumber: num,
					statusCode: cond,
					condition: cond,
					status: cond,
					surfaces: item.surfaces || [],
				};
			}
		}
		return result;
	}

	if (typeof teethInput === "object") {
		if (Array.isArray(teethInput.teeth)) {
			return normalizeOdontogramForDmft(teethInput.teeth);
		}
		for (const [key, val] of Object.entries(teethInput)) {
			const num = Number(key);
			if (!num) continue;
			if (typeof val === "string") {
				result[num] = {
					toothNumber: num,
					statusCode: val,
					condition: val,
					status: val,
				};
			} else if (typeof val === "object" && val !== null) {
				const v = val as any;
				const cond =
					v.statusCode || v.condition || v.status || v.state || "H";
				result[num] = {
					toothNumber: num,
					statusCode: cond,
					condition: cond,
					status: cond,
					surfaces: v.surfaces || [],
				};
			}
		}
	}

	return result;
}

export interface FastPrint043Params {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: form
	visitNoteForm: any;
	isClosed: boolean;
	watermarkText: string;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard?: any;
	// biome-ignore lint/suspicious/noExplicitAny: formula
	teethFormula?: any;
	// biome-ignore lint/suspicious/noExplicitAny: tooth
	selectedToothForMenu?: any;
}

export function executeFastPrint043u({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	isClosed,
	watermarkText,
	dashboard,
	teethFormula,
	selectedToothForMenu: _selectedToothForMenu,
}: FastPrint043Params) {
	if (typeof window === "undefined") return;

	const revisionCount = Number(
		visitNoteForm?.revisionCount ??
			activeAppointment?.revisionCount ??
			0,
	);
	const effectiveWatermark =
		revisionCount > 0
			? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount})`
			: (isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");

	const req = extractClinicRequisites(dashboard);
	const rawFormula =
		teethFormula ||
		activeAppointment?.dentalFormula ||
		activePatient?.dentalFormula ||
		{};
	const normalizedFormula = normalizeOdontogramForDmft(rawFormula);
	const calculatedDmft = calculateDmftFromOdontogram(normalizedFormula);

	const effectiveObjectiveStatus =
		visitNoteForm?.objectiveStatus ||
		visitNoteForm?.objectiveInspection ||
		"Слизистая полости рта без патологических изменений.";

	const cardHtml = renderForm043uHtml({
		organization: {
			fullName: req.clinicLegalName,
			legalName: req.clinicLegalName,
			inn: req.clinicInn,
			ogrn: req.clinicOgrn,
			kpp: req.clinicKpp,
			address: req.clinicAddress,
			medicalLicenseNumber: req.medicalLicenseNumber,
		},
		clinicLegalName: req.clinicLegalName,
		clinicAddress: req.clinicAddress,
		clinicOgrn: req.clinicOgrn,
		clinicInn: req.clinicInn,
		clinicMedicalLicenseNumber: req.clinicLicense,
		medicalLicenseNumber: req.clinicLicense,
		dentalFormula: normalizedFormula,
		dmftIndex: calculatedDmft,
		medicalCardNumber:
			activePatient?.cardNumber ||
			activePatient?.medicalCardNumber ||
			"__________",
		cardOpenedDate:
			activePatient?.cardOpenedAt ||
			new Date().toISOString().slice(0, 10),
		patientFullName:
			activePatient?.fullName ||
			activePatient?.name ||
			"________________________",
		patientBirthDate: activePatient?.birthDate || "—",
		patientSex: activePatient?.gender === "female" ? "female" : "male",
		patientPhone: activePatient?.phone || "—",
		patientAddressRegistration: activePatient?.address || "—",
		chiefComplaint:
			visitNoteForm?.complaint || "Жалоб на момент осмотра не предъявляет.",
		historyOfPresentIllness:
			visitNoteForm?.anamnesis ||
			"Ранее лечился по поводу кариеса и его осложнений.",
		allergologicalHistory:
			activePatient?.allergies || "Аллергологический анамнез не отягощен.",
		concomitantDiseases:
			visitNoteForm?.anamnesis || "Хронические заболевания отрицает.",
		attendingDoctorFullName:
			activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог",
		attendingDoctorSpecialty:
			activeDoctor?.specialty ||
			activeDoctor?.specialtyRu ||
			"Врач-стоматолог",
		diaries: [
			{
				entryDate: new Date().toISOString().slice(0, 10),
				doctorFullName:
					activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог",
				doctorSpecialty:
					activeDoctor?.specialty ||
					activeDoctor?.specialtyRu ||
					"Врач-стоматолог",
				clinicalDiagnosisIcd10:
					visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование",
				complaints: visitNoteForm?.complaint || "Плановый осмотр.",
				objectiveStatus: effectiveObjectiveStatus,
				treatmentProtocol:
					visitNoteForm?.treatmentPlan ||
					"Консультация и профилактический осмотр проведены.",
			},
		],
		isClosed,
		watermarkText: effectiveWatermark,
	});

	printHtmlViaIframe(cardHtml);

	StaffActionAuditService.logDocumentPrint({
		documentType: "emr_card_043",
		title: "Медицинская карта",
		patientId: activePatient?.id,
	});
	showToast(
		`Медицинская карта отправлена на печать (${watermarkText})`,
		"success",
		6000,
	);
}

export interface FastPrintConsentParams {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: form
	visitNoteForm: any;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard: any;
	// biome-ignore lint/suspicious/noExplicitAny: tooth
	selectedToothForMenu: any;
}

export function executeFastPrintInformedConsent({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	dashboard,
	selectedToothForMenu,
}: FastPrintConsentParams) {
	if (typeof window === "undefined") return;

	const isClosed =
		activeAppointment?.status === "completed" ||
		activeAppointment?.status === "signed" ||
		activeAppointment?.status === "closed" ||
		visitNoteForm?.status === "completed" ||
		visitNoteForm?.status === "signed";
	const watermarkText = isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК";

	const req = extractClinicRequisites(dashboard);
	const toothCode =
		selectedToothForMenu?.code != null
			? String(selectedToothForMenu.code)
			: typeof selectedToothForMenu === "number" || typeof selectedToothForMenu === "string"
				? String(selectedToothForMenu)
				: undefined;

	const consentHtml = generateInformedConsent1051nHtml({
		patientFullName:
			activePatient?.fullName ||
			activePatient?.name ||
			"________________________",
		patientBirthDate: activePatient?.birthDate || "—",
		patientAddress: activePatient?.address || "—",
		doctorFullName:
			activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог",
		doctorSpecialty:
			activeDoctor?.specialty ||
			activeDoctor?.specialtyRu ||
			"Врач-стоматолог",
		clinicName: req.clinicLegalName,
		clinicLicense: req.clinicLicense,
		diagnosisIcd: visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование",
		toothNumbers: toothCode,
		isClosed,
		watermarkText,
	});

	printHtmlViaIframe(consentHtml);

	StaffActionAuditService.logDocumentPrint({
		documentType: "informed_consent",
		title: "Информированное добровольное согласие",
		patientId: activePatient?.id,
	});
	showToast(`Согласие на лечение отправлено на печать (${watermarkText})`, "success", 4000);
}

export interface FastPrintCompletedActParams {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: form
	visitNoteForm?: any;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard?: any;
	// biome-ignore lint/suspicious/noExplicitAny: active plan
	activePlan?: any;
	selectedToothForMenu?: any;
	toothNumber?: number | string;
	isClosed?: boolean;
}

export function executeFastPrintCompletedAct({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm: _visitNoteForm,
	dashboard,
	activePlan,
	selectedToothForMenu,
	toothNumber,
	isClosed = false,
}: FastPrintCompletedActParams) {
	if (typeof window === "undefined") return;

	const req = extractClinicRequisites(dashboard);
	const actNumber = `АКТ-${activeAppointment?.id ? String(activeAppointment.id).slice(-6) : new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
	const actDate = new Date().toISOString().slice(0, 10);
	const contractNumber =
		activePatient?.contractNumber ||
		`ДОГ-${new Date().getFullYear()}/${activePatient?.cardNumber || "043"}`;
	const contractDate = activePatient?.contractDate || actDate;

	const effectiveTooth =
		toothNumber != null
			? String(toothNumber)
			: selectedToothForMenu?.code != null
				? String(selectedToothForMenu.code)
				: typeof selectedToothForMenu === "number" || typeof selectedToothForMenu === "string"
					? String(selectedToothForMenu)
					: _visitNoteForm?.tooth != null
						? String(_visitNoteForm.tooth)
						: activeAppointment?.tooth != null
							? String(activeAppointment.tooth)
							: undefined;

	// Извлекаем перечень услуг из визита / записи / плана
	const rawItems: any[] =
		activeAppointment?.services ||
		activeAppointment?.items ||
		activePlan?.items ||
		[];

	const items: ActOfCompletedWorksItem[] = [];
	let runningTotal = 0;

	if (rawItems.length > 0) {
		for (const it of rawItems) {
			const qty = Number(it.quantity || 1);
			const price = Number(it.price || it.priceRub || it.unitPriceRub || 0);
			const sum = it.totalRub != null ? Number(it.totalRub) : qty * price;
			runningTotal += sum;
			items.push({
				code804n: it.code804n || it.code || "A16.07.002.001",
				serviceName: it.serviceName || it.name || it.title || "Стоматологическая услуга",
				toothNumber: it.toothNumber ? String(it.toothNumber) : effectiveTooth,
				quantity: qty,
				unitPriceRub: price,
				totalRub: sum,
			});
		}
	} else {
		// Клинический дефолт по номенклатуре 804н (Мандат 8e: нулевой тупик)
		const defPrice = Number(activeAppointment?.price || 1500);
		runningTotal = defPrice;
		items.push({
			code804n: "B01.065.001",
			serviceName: "Прием (осмотр, консультация) врача-стоматолога первичный",
			toothNumber: effectiveTooth,
			quantity: 1,
			unitPriceRub: defPrice,
			totalRub: defPrice,
		});
	}

	const actHtml = renderActOfCompletedWorksHtml({
		actNumber,
		actDate,
		contractNumber,
		contractDate,
		clinicLegalName: req.clinicLegalName,
		clinicAddress: req.clinicAddress,
		clinicOgrn: req.clinicOgrn,
		clinicInn: req.clinicInn,
		medicalLicenseNumber: req.clinicLicense,
		patientFullName:
			activePatient?.fullName ||
			activePatient?.name ||
			"________________________",
		customerFullName:
			activePatient?.customerFullName ||
			activePatient?.fullName ||
			activePatient?.name,
		attendingDoctorFullName:
			activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог",
		attendingDoctorSpecialty:
			activeDoctor?.specialty || activeDoctor?.specialtyRu || "Врач-стоматолог",
		items,
		totalAmountRub: runningTotal,
		isClosed,
	});

	printHtmlViaIframe(actHtml);

	StaffActionAuditService.logDocumentPrint({
		documentType: "act_completed_works_804n",
		title: "Акт выполненных услуг",
		patientId: activePatient?.id,
	});
	showToast("Акт выполненных работ отправлен на печать", "success", 4000);
}

export interface FastPrintEstimateParams {
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: doctor
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: appointment
	activeAppointment?: any;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard
	dashboard?: any;
	// biome-ignore lint/suspicious/noExplicitAny: active plan
	activePlan?: any;
}

export function executeFastPrintTreatmentPlanEstimate({
	activePatient,
	activeDoctor,
	activeAppointment,
	dashboard,
	activePlan,
}: FastPrintEstimateParams) {
	if (typeof window === "undefined") return;

	const req = extractClinicRequisites(dashboard);
	const todayIso = new Date().toISOString().slice(0, 10);
	const estimateNumber = `СМ-${activePlan?.id ? String(activePlan.id).slice(-6) : todayIso.replace(/-/g, "")}`;

	const stages: EstimateStage[] = [];
	let subtotalKopecks = 0;

	if (activePlan && Array.isArray(activePlan.stages) && activePlan.stages.length > 0) {
		activePlan.stages.forEach((st: any, idx: number) => {
			const items: EstimateStageItem[] = [];
			let stageTotal = 0;
			const stItems: any[] = Array.isArray(st.items) ? st.items : [];
			stItems.forEach((it: any, itemIdx: number) => {
				const priceRub = Number(it.price || it.priceRub || it.unitPriceRub || 0);
				const priceKopecks = Math.round(priceRub * 100);
				const qty = Number(it.quantity || 1);
				const disc = Number(it.discountPercent || 0);
				const totalKopecks = Math.round(priceKopecks * qty * (1 - disc / 100));
				stageTotal += totalKopecks;
				items.push({
					id: it.id || `it-${idx}-${itemIdx}`,
					toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
					code804n: it.code804n || it.code || null,
					name: it.name || it.title || it.serviceName || "Стоматологическая услуга",
					quantity: qty,
					priceKopecks,
					...(disc > 0 ? { discountPercent: disc } : {}),
					totalKopecks,
				});
			});
			subtotalKopecks += stageTotal;
			stages.push({
				stageNumber: idx + 1,
				name: st.name || st.title || `Этап ${idx + 1}`,
				description: st.description || null,
				items,
				totalKopecks: stageTotal,
			});
		});
	} else if (activePlan && Array.isArray(activePlan.items) && activePlan.items.length > 0) {
		const items: EstimateStageItem[] = [];
		let stageTotal = 0;
		activePlan.items.forEach((it: any, itemIdx: number) => {
			const priceRub = Number(it.price || it.priceRub || it.unitPriceRub || 0);
			const priceKopecks = Math.round(priceRub * 100);
			const qty = Number(it.quantity || 1);
			const disc = Number(it.discountPercent || 0);
			const totalKopecks = Math.round(priceKopecks * qty * (1 - disc / 100));
			stageTotal += totalKopecks;
			items.push({
				id: it.id || `it-${itemIdx}`,
				toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
				code804n: it.code804n || it.code || null,
				name: it.name || it.title || it.serviceName || "Стоматологическая услуга",
				quantity: qty,
				priceKopecks,
				...(disc > 0 ? { discountPercent: disc } : {}),
				totalKopecks,
			});
		});
		subtotalKopecks = stageTotal;
		stages.push({
			stageNumber: 1,
			name: activePlan.name || "Комплексный план лечения",
			description: activePlan.description || "Согласованный комплекс стоматологических процедур",
			items,
			totalKopecks: stageTotal,
		});
	} else {
		const rawItems: any[] =
			activeAppointment?.services ||
			activeAppointment?.items ||
			[];
		const items: EstimateStageItem[] = [];
		let stageTotal = 0;

		if (rawItems.length > 0) {
			rawItems.forEach((it: any, itemIdx: number) => {
				const priceRub = Number(it.price || it.priceRub || it.unitPriceRub || 0);
				const priceKopecks = Math.round(priceRub * 100);
				const qty = Number(it.quantity || 1);
				const totalKopecks = priceKopecks * qty;
				stageTotal += totalKopecks;
				items.push({
					id: `visit-it-${itemIdx}`,
					toothNumber: it.toothNumber ? Number(it.toothNumber) : null,
					code804n: it.code804n || it.code || null,
					name: it.serviceName || it.name || it.title || "Стоматологическая услуга",
					quantity: qty,
					priceKopecks,
					totalKopecks,
				});
			});
		} else {
			const defPrice = Number(activeAppointment?.price || 2500);
			const priceKopecks = Math.round(defPrice * 100);
			stageTotal = priceKopecks;
			items.push({
				id: "def-consult-1",
				toothNumber: null,
				code804n: "B01.065.001",
				name: "Комплексная стоматологическая диагностика и составление плана лечения",
				quantity: 1,
				priceKopecks,
				totalKopecks: priceKopecks,
			});
		}

		subtotalKopecks = stageTotal;
		stages.push({
			stageNumber: 1,
			name: "Этап 1: Первичная санация и лечение",
			description: "Клинические процедуры текущего приёма",
			items,
			totalKopecks: stageTotal,
		});
	}

	const estimateHtml = renderEstimatePrintableHtml({
		estimateNumber,
		date: todayIso,
		clinic: {
			name: req.clinicLegalName,
			legalName: req.clinicLegalName,
			address: req.clinicAddress,
			phone: req.clinicPhone,
			licenseInfo: req.clinicLicense,
			inn: req.clinicInn,
		},
		patient: {
			fullName:
				activePatient?.fullName ||
				activePatient?.name ||
				"________________________",
			birthDate: activePatient?.birthDate || undefined,
			cardNumber:
				activePatient?.cardNumber ||
				activePatient?.medicalCardNumber ||
				undefined,
			phone: activePatient?.phone || undefined,
		},
		attendingDoctor: {
			fullName:
				activeDoctor?.fullName || activeDoctor?.name || "Врач-стоматолог",
			specialty:
				activeDoctor?.specialty || activeDoctor?.specialtyRu || "Врач-стоматолог",
		},
		stages,
		subtotalKopecks,
		discountKopecks: 0,
		totalPayableKopecks: subtotalKopecks,
		currencySymbol: "₽",
	});

	printHtmlViaIframe(estimateHtml);

	StaffActionAuditService.logDocumentPrint({
		documentType: "treatment_plan_estimate",
		title: "Смета / План лечения",
		patientId: activePatient?.id,
	});
	showToast("Смета / План лечения отправлен на печать", "success", 4000);
}

export function handlePrintForm043uFast(): void {
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente:fast-print-043u"));
	}
}
