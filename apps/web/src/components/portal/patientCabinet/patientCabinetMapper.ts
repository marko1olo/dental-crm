import type {
	PatientAppointment,
	PatientInvoiceItem,
	PatientPersonalCabinetData,
	PatientStatutoryConsent,
	PatientTreatmentPlan,
	TreatmentPlanStage,
} from "./patientCabinetEngine";

export function mapServerPortalMeToCabinetData(
	payload: {
		patient: Record<string, unknown>;
		visits?: Array<Record<string, unknown>>;
		plans?: Array<Record<string, unknown>>;
		invoices?: Array<Record<string, unknown>>;
		documents?: Array<Record<string, unknown>>;
	},
	serverConsents?: Array<Record<string, unknown>>,
): PatientPersonalCabinetData {
	const p = payload.patient || {};
	const adminProfile = ((p.administrativeProfile as Record<string, unknown> | null) || {}) as Record<string, unknown>;
	const visits = Array.isArray(payload.visits) ? payload.visits : [];
	const plans = Array.isArray(payload.plans) ? payload.plans : [];
	const invoices = Array.isArray(payload.invoices) ? payload.invoices : [];
	const documents = Array.isArray(payload.documents) ? payload.documents : [];

	// Map appointments from visits
	const appointments: PatientAppointment[] = visits.map((v, index) => {
		const rawDate = v.visitDate || v.createdAt;
		const vDate = rawDate ? new Date(rawDate as string) : new Date();
		const dateIso = !Number.isNaN(vDate.getTime()) ? vDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
		const timeRu = !Number.isNaN(vDate.getTime())
			? vDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
			: "12:00";
		const isPast = vDate < new Date();
		return {
			id: (v.id as string) || `visit-${index}`,
			dateIso,
			timeRu,
			doctorId: (v.doctorId as string) || "doc-main",
			doctorName: (v.doctorName as string) || (adminProfile.curatorFullName as string) || "Врач-стоматолог",
			doctorSpecialtyRu: "Терапевт-ортопед",
			roomNumber: (v.roomNumber as string) || "Кабинет 3",
			clinicName: "Стоматологическая клиника ДЕНТЕ",
			clinicAddressRu: "г. Москва, ул. Клиническая, д. 10",
			titleRu: (v.treatmentRendered as string) || (v.complaints as string) || "Приём стоматолога",
			status: (v.status as any) || (isPast ? "completed" : "scheduled"),
			priceRub: v.priceRub ? Number(v.priceRub) : undefined,
			reminderSent: true,
			reminderChannel: "sms",
		};
	});

	// Map invoices
	const mappedInvoices: PatientInvoiceItem[] = invoices.map((inv, index) => {
		const isPaid = inv.status === "paid";
		const totalRub = Number(inv.totalAmountRub || inv.totalRub || 0);
		const paidRub = isPaid ? totalRub : Number(inv.paidAmountRub || 0);
		const remainingRub = Math.max(0, totalRub - paidRub);
		const rawCreated = inv.createdAt;
		const cDate = rawCreated ? new Date(rawCreated as string) : new Date();
		const dateIso = !Number.isNaN(cDate.getTime()) ? cDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

		return {
			id: (inv.id as string) || `inv-${index}`,
			invoiceNumber: (inv.number as string) || `СЧ-${String(inv.id || index).slice(0, 8).toUpperCase()}`,
			dateIso,
			titleRu: (inv.titleRu as string) || "Стоматологические услуги",
			totalAmountRub: totalRub,
			paidAmountRub: paidRub,
			remainingAmountRub: remainingRub,
			status: isPaid ? "paid" : inv.status === "partially_paid" ? "partially_paid" : "unpaid",
			paymentMethod: isPaid ? ((inv.paymentMethod as any) || "sbp") : undefined,
			paidAtIso: inv.paidAt ? new Date(inv.paidAt as string).toISOString() : undefined,
			fiscalReceiptNumber: (inv.fiscalReceiptNumber as string) || (isPaid ? `ФД-${String(inv.id).slice(-6).toUpperCase()}` : undefined),
			fiscalReceiptUrl: (inv.fiscalReceiptUrl as string) || undefined,
			items: Array.isArray(inv.items) && inv.items.length > 0
				? (inv.items as Array<Record<string, unknown>>).map((it, itIdx) => ({
						id: (it.id as string) || `item-${itIdx}`,
						code: (it.code as string) || "A16.07.001",
						titleRu: (it.titleRu as string) || (it.name as string) || "Лечение зуба",
						qty: Number(it.qty || it.quantity || 1),
						priceRub: Number(it.priceRub || it.price || 0),
						totalRub: Number(it.totalRub || Number(it.priceRub || it.price || 0) * Number(it.qty || it.quantity || 1)),
						toothNumber: it.toothNumber ? String(it.toothNumber) : undefined,
						categoryGroup: (it.categoryGroup as string) || "caries",
					}))
				: [
						{
							id: `item-${inv.id}`,
							code: "A16.07.001",
							titleRu: (inv.titleRu as string) || "Стоматологическое лечение",
							qty: 1,
							priceRub: totalRub,
							totalRub: totalRub,
							categoryGroup: "caries",
						},
					],
		};
	});

	// Map treatment plans
	const mappedPlans: PatientTreatmentPlan[] = plans.map((pl, index) => {
		const totalCost = Number(pl.totalAmountRub || pl.totalCostRub || 0);
		const paidCost = Number(pl.paidAmountRub || pl.paidCostRub || 0);
		const remaining = Math.max(0, totalCost - paidCost);
		const progress = totalCost > 0 ? Math.min(100, Math.round((paidCost / totalCost) * 100)) : 0;
		const plDate = pl.createdAt ? new Date(pl.createdAt as string) : new Date();

		return {
			id: (pl.id as string) || `plan-${index}`,
			planNumber: (pl.planNumber as string) || `ПЛ-${String(pl.id || index).slice(0, 6).toUpperCase()}`,
			titleRu: (pl.title as string) || (pl.titleRu as string) || "План комплексного лечения",
			curatingDoctor: (pl.curatingDoctor as string) || (adminProfile.curatorFullName as string) || "Д-р Воронова Е. С.",
			createdAtIso: !Number.isNaN(plDate.getTime()) ? plDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
			totalCostRub: totalCost,
			paidCostRub: paidCost,
			remainingDueRub: remaining,
			progressPercent: progress,
			status: pl.status === "completed" ? "completed" : pl.status === "on_hold" ? "on_hold" : "in_progress",
			stages: Array.isArray(pl.stages) ? (pl.stages as TreatmentPlanStage[]) : [],
		};
	});

	// Map statutory consents
	let mappedConsents: PatientStatutoryConsent[] = [];
	if (Array.isArray(serverConsents) && serverConsents.length > 0) {
		mappedConsents = serverConsents.map((sc) => ({
			id: sc.id as string,
			code: (sc.code as string) || (sc.id as string),
			titleRu: (sc.titleRu as string) || (sc.title as string) || "Информированное согласие",
			categoryRu: (sc.categoryRu as any) || "Терапия",
			statutoryBasis: (sc.statutoryBasis as any) || "323-ФЗ",
			status: (sc.status as any) || (sc.isSigned ? "signed" : "pending_signature"),
			summaryTextRu: (sc.summaryTextRu as string) || (sc.summaryRu as string) || "",
			fullTextContent: (sc.fullTextContent as string) || (sc.fullTextRu as string) || "",
			signedAtIso: sc.signedAtIso as string | undefined,
			signatureAudit: sc.signatureAudit as any,
		}));
	} else {
		const signedPd = documents.some((d) => d.documentType === "pd_152" || (typeof d.title === "string" && d.title.includes("152-ФЗ")));
		const signedIds = documents.some((d) => d.documentType === "ids_treatment" || (typeof d.title === "string" && d.title.includes("ИДС")));
		mappedConsents = [
			{
				id: "ids_treatment",
				code: "ИДС-ТЕР-01",
				titleRu: "Информированное добровольное согласие на терапевтическое лечение",
				categoryRu: "Терапия",
				statutoryBasis: "323-ФЗ",
				status: signedIds ? "signed" : "pending_signature",
				summaryTextRu: "Согласие на проведение осмотра, инструментальной диагностики, анестезии и пломбирования кариозных полостей.",
				fullTextContent: "Я, пациент клиники, даю информированное добровольное согласие на виды медицинских вмешательств в соответствии со ст. 20 Федерального закона № 323-ФЗ...",
			},
			{
				id: "ids_anesthesia",
				code: "ИДС-АНЕСТ-01",
				titleRu: "Информированное добровольное согласие на местное обезболивание",
				categoryRu: "Анестезия",
				statutoryBasis: "323-ФЗ",
				status: "pending_signature",
				summaryTextRu: "Согласие на инфильтрационную и проводниковую анестезию современными карпульными препаратами.",
				fullTextContent: "Я подтверждаю, что сообщил врачу полные и достоверные сведения о состоянии здоровья...",
			},
			{
				id: "pd_152",
				code: "ПДН-152",
				titleRu: "Согласие на обработку персональных данных",
				categoryRu: "Персональные данные",
				statutoryBasis: "152-ФЗ",
				status: signedPd ? "signed" : "pending_signature",
				summaryTextRu: "Согласие на сбор, хранение и обработку персональных данных в рамках оказания стоматологической помощи.",
				fullTextContent: "В соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» подтверждаю свое согласие...",
			},
		];
	}

	const loyaltyTierRu =
		adminProfile.loyaltyTier === "platinum"
			? "Платиновый VIP (15%)"
			: adminProfile.loyaltyTier === "gold"
				? "Золотой (10%)"
				: adminProfile.loyaltyTier === "silver"
					? "Серебряный (5%)"
					: "Базовый";

	const bonusPoints = Number(p.bonusPoints || 0);

	return {
		patientId: (p.id as string) || "live-patient",
		fullName: (p.fullName as string) || "Пациент клиники",
		phone: (p.phone as string) || "",
		email: (p.email as string) || undefined,
		birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : undefined,
		inn: (p.inn as string) || (adminProfile.taxpayerInn as string) || undefined,
		cardNumber: (p.cardNumber as string) || (p.id ? `КРТ-${String(p.id).slice(0, 6).toUpperCase()}` : "КРТ-001"),
		curatingDoctor: (adminProfile.curatorFullName as string) || (appointments[0]?.doctorName) || "Д-р Воронова Е. С. (Терапевт-микроскопист)",
		loyaltyBonusBalance: bonusPoints,
		loyaltyTierRu,
		cashbackEarnedRub: bonusPoints > 0 ? bonusPoints * 10 : 0,
		dmsInsuranceName: adminProfile.insurancePolicyNumber ? `Полис: ${adminProfile.insurancePolicyNumber}` : undefined,
		invoices: mappedInvoices,
		appointments,
		treatmentPlans: mappedPlans,
		warranties: [],
		consents: mappedConsents,
	};
}
