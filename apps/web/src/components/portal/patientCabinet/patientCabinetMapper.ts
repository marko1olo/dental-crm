import type {
	ConsentSignatureAudit,
	GeneratedDocumentSummary,
	PatientAppointment,
	PatientCabinetFamilyMember,
	PatientDiagnosticScan,
	PatientInvoiceItem,
	PatientPersonalCabinetData,
	PatientPrescriptionItem,
	PatientStatutoryConsent,
	PatientTreatmentPlan,
	TreatmentPlanStage,
} from "./patientCabinetEngine";

interface PrescriptionDocPayload {
	readonly prescriptionMedicationOrder?: {
		readonly drugNameRu?: string;
		readonly dosageFormRu?: string;
		readonly dosageAndAdministrationRu?: string;
		readonly treatmentDurationRu?: string;
		readonly prescribingDoctorFullName?: string;
		readonly validityDays?: number;
		readonly prescriptionSeriesAndNumber?: string;
	};
}

export function mapServerPortalMeToCabinetData(
	payload: {
		patient: Record<string, unknown>;
		visits?: Array<Record<string, unknown>>;
		plans?: Array<Record<string, unknown>>;
		invoices?: Array<Record<string, unknown>>;
		documents?: Array<Record<string, unknown>>;
		appointments?: Array<Record<string, unknown>>;
		familyGroup?: {
			id: string;
			name: string | null;
			groupName: string;
			balanceRub: number;
		} | null;
		familyMembers?: Array<PatientCabinetFamilyMember>;
		doctors?: Array<{ id: string; fullName: string; specialties?: string[] | null }>;
		scans?: Array<Record<string, unknown>>;
		prescriptions?: Array<Record<string, unknown>>;
	},
	serverConsents?: Array<Record<string, unknown>>,
): PatientPersonalCabinetData {
	const p = payload.patient || {};
	const adminProfile = ((p.administrativeProfile as Record<string, unknown> | null) || {}) as Record<string, unknown>;
	const visits = Array.isArray(payload.visits) ? payload.visits : [];
	const rawAppointments = Array.isArray(payload.appointments) ? payload.appointments : [];
	const plans = Array.isArray(payload.plans) ? payload.plans : [];
	const invoices = Array.isArray(payload.invoices) ? payload.invoices : [];
	const documents = Array.isArray(payload.documents) ? payload.documents : [];
	const rawScans = Array.isArray(payload.scans) ? payload.scans : [];

	// Map real clinical scans (RVG / OPTG / CT / TRG)
	const mappedScans: PatientDiagnosticScan[] = rawScans.map((s, index) => {
		const capDate = s.capturedAt ? new Date(s.capturedAt as string) : new Date();
		const dateRu = !Number.isNaN(capDate.getTime())
			? capDate.toLocaleDateString("ru-RU")
			: "Недавно";
		const rawMod = ((s.modality as string) || (s.kind as string) || "rvg").toLowerCase();
		const modality: "rvg" | "optg" | "cbct" | "trg" =
			rawMod === "optg" ? "optg" : rawMod === "ct" || rawMod === "cbct" ? "cbct" : rawMod === "trg" ? "trg" : "rvg";
		const modalityRu =
			modality === "optg"
				? "Панорама ОПТГ"
				: modality === "cbct"
					? "3D КТ / КЛКТ"
					: modality === "trg"
						? "ТРГ снимок"
						: "Прицельный снимок RVG";

		return {
			id: (s.id as string) || `scan-${index}`,
			titleRu: (s.titleRu as string) || (s.title as string) || `Снимок (${modalityRu})`,
			modality,
			modalityRu,
			dateRu,
			toothFdi: (s.toothCode as string) || (s.toothFdi as string) || undefined,
			doseMicroSv: Number(s.doseMicroSv || 2.0),
			previewUrl:
				(s.previewUrl as string) ||
				(s.storagePath ? `/api/imaging/studies/${s.id}/file` : "/radiology/sample_rvg_tooth16.jpg"),
			conclusionRu:
				(s.conclusionRu as string) ||
				(s.aiSummary as string) ||
				"Контрольный снимок без признаков патологических изменений.",
		};
	});

	// Map appointments from real schedule (payload.appointments) or fall back to visits
	let appointments: PatientAppointment[] = [];
	if (rawAppointments.length > 0) {
		appointments = rawAppointments.map((apt, index) => {
			const rawDate = apt.startsAt || apt.date;
			const aDate = rawDate ? new Date(rawDate as string) : new Date();
			const dateIso = !Number.isNaN(aDate.getTime())
				? aDate.toISOString().slice(0, 10)
				: new Date().toISOString().slice(0, 10);
			const timeRu = !Number.isNaN(aDate.getTime())
				? aDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
				: "12:00";
			const isPast = aDate < new Date();
			return {
				id: (apt.id as string) || `apt-${index}`,
				dateIso,
				timeRu,
				doctorId: (apt.doctorUserId as string) || (apt.doctorId as string) || "doc-main",
				doctorName:
					(apt.doctorName as string) ||
					(adminProfile.curatorFullName as string) ||
					"Лечащий врач",
				doctorSpecialtyRu: (apt.doctorSpecialtyRu as string) || "Стоматолог-терапевт",
				roomNumber: (apt.roomNumber as string) || "Кабинет 1",
				clinicName: "Стоматологическая клиника ДЕНТЕ",
				clinicAddressRu: "г. Москва, ул. Клиническая, д. 10",
				titleRu:
					(apt.reason as string) ||
					(apt.titleRu as string) ||
					(apt.comment as string) ||
					"Приём стоматолога",
				status:
					apt.status === "cancelled"
						? "cancelled"
						: apt.status === "completed"
							? "completed"
							: apt.status === "confirmed"
								? "confirmed"
								: apt.status === "planned" || apt.status === "scheduled"
									? "scheduled"
									: apt.status === "reschedule_requested"
										? "reschedule_requested"
										: isPast
											? "completed"
											: "scheduled",
				priceRub: apt.priceRub ? Number(apt.priceRub) : undefined,
				reminderSent: true,
				reminderChannel: "sms",
			};
		});
	} else {
		appointments = visits.map((v, index) => {
			const rawDate = v.visitDate || v.createdAt;
			const vDate = rawDate ? new Date(rawDate as string) : new Date();
			const dateIso = !Number.isNaN(vDate.getTime()) ? vDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
			const timeRu = !Number.isNaN(vDate.getTime())
				? vDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
				: "12:00";
			const isPast = vDate < new Date();
			const vStatus = typeof v.status === "string" ? v.status : undefined;
			const status: PatientAppointment["status"] =
				vStatus === "cancelled"
					? "cancelled"
					: vStatus === "completed"
						? "completed"
						: vStatus === "confirmed"
							? "confirmed"
							: vStatus === "reschedule_requested"
								? "reschedule_requested"
								: isPast
									? "completed"
									: "scheduled";
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
				status,
				priceRub: v.priceRub ? Number(v.priceRub) : undefined,
				reminderSent: true,
				reminderChannel: "sms",
			};
		});
	}

	// Map invoices
	const mappedInvoices: PatientInvoiceItem[] = invoices.map((inv, index) => {
		const isPaid = inv.status === "paid";
		const totalRub = Number(inv.totalAmountRub || inv.totalRub || 0);
		const paidRub = isPaid ? totalRub : Number(inv.paidAmountRub || 0);
		const remainingRub = Math.max(0, totalRub - paidRub);
		const rawCreated = inv.createdAt;
		const cDate = rawCreated ? new Date(rawCreated as string) : new Date();
		const dateIso = !Number.isNaN(cDate.getTime()) ? cDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
		const rawMethod = typeof inv.paymentMethod === "string" ? inv.paymentMethod : "";
		const paymentMethod: PatientInvoiceItem["paymentMethod"] = isPaid
			? rawMethod === "card_online" || rawMethod === "pos_terminal" || rawMethod === "cash"
				? rawMethod
				: "sbp"
			: undefined;

		return {
			id: (inv.id as string) || `inv-${index}`,
			invoiceNumber: (inv.number as string) || `СЧ-${String(inv.id || index).slice(0, 8).toUpperCase()}`,
			dateIso,
			issueDateIso: (inv.dateIso as string) || (inv.issueDateIso as string) || new Date().toISOString(),
			titleRu: (inv.titleRu as string) || "Стоматологические услуги",
			totalAmountRub: totalRub,
			paidAmountRub: paidRub,
			remainingAmountRub: remainingRub,
			status: isPaid ? "paid" : inv.status === "partially_paid" ? "partially_paid" : "unpaid",
			paymentMethod,
			paidAtIso: inv.paidAt ? new Date(inv.paidAt as string).toISOString() : undefined,
			fiscalReceiptNumber: (inv.fiscalReceiptNumber as string) || (isPaid ? `ФД-${String(inv.id).slice(-6).toUpperCase()}` : undefined),
			fiscalReceiptUrl: (inv.fiscalReceiptUrl as string) || undefined,
			items: Array.isArray(inv.items) && inv.items.length > 0
				? (inv.items as Array<Record<string, unknown>>).map((it, itIdx) => ({
						id: (it.id as string) || `item-${itIdx}`,
						code: (it.code as string) || "A16.07.001",
						titleRu: (it.titleRu as string) || (it.name as string) || "Лечение зуба",
						quantity: Number(it.quantity || it.qty || 1),
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
							quantity: 1,
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
			curatingDoctor: (pl.curatingDoctor as string) || (adminProfile.curatorFullName as string) || "Лечащий врач",
			createdAtIso: !Number.isNaN(plDate.getTime()) ? plDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
			totalCostRub: totalCost,
			paidCostRub: paidCost,
			remainingDueRub: remaining,
			progressPercent: progress,
			status: pl.status === "completed" ? "completed" : pl.status === "on_hold" ? "on_hold" : "in_progress",
			stages: Array.isArray(pl.stages) ? (pl.stages as TreatmentPlanStage[]) : [],
		};
	});

	// Map statutory consents (real consents from server or empty array)
	let mappedConsents: PatientStatutoryConsent[] = [];
	if (Array.isArray(serverConsents) && serverConsents.length > 0) {
		mappedConsents = serverConsents.map((sc) => ({
			id: (sc.id as string) || "consent",
			code: (sc.code as string) || (sc.id as string) || "ИДС",
			titleRu: (sc.titleRu as string) || (sc.title as string) || "Информированное согласие",
			categoryRu: (typeof sc.categoryRu === "string" ? sc.categoryRu : "Терапия"),
			statutoryBasis: (typeof sc.statutoryBasis === "string" ? sc.statutoryBasis : "323-ФЗ"),
			status: (typeof sc.status === "string" ? sc.status : sc.isSigned ? "signed" : "pending_signature"),
			summaryTextRu: (sc.summaryTextRu as string) || (sc.summaryRu as string) || "",
			fullTextContent: (sc.fullTextContent as string) || (sc.fullTextRu as string) || "",
			signedAtIso: typeof sc.signedAtIso === "string" ? sc.signedAtIso : undefined,
			signatureAudit: typeof sc.signatureAudit === "object" && sc.signatureAudit !== null
				? (sc.signatureAudit as ConsentSignatureAudit)
				: undefined,
		}));
	}

	// Map clinical documents from /api/portal/me
	const mappedDocuments: GeneratedDocumentSummary[] = documents.map((doc, index) => {
		const rawDate = doc.issuedAt || doc.createdAt;
		const dDate = rawDate ? new Date(rawDate as string) : new Date();
		const dateIso = !Number.isNaN(dDate.getTime())
			? dDate.toISOString().slice(0, 10)
			: new Date().toISOString().slice(0, 10);
		const id = (doc.id as string) || `doc-${index}`;

		return {
			id,
			kind: (doc.kind as string) || "document",
			title: (doc.title as string) || "Медицинский документ",
			status: (doc.status as string) || "issued",
			dateIso,
			totalAmountRub:
				doc.totalAmountRub !== undefined && doc.totalAmountRub !== null
					? Number(doc.totalAmountRub)
					: undefined,
			visitId: (doc.visitId as string) || undefined,
			documentNumber:
				(doc.documentNumber as string) || (doc.number as string) || undefined,
			sha256: (doc.issuedSnapshotSha256 as string) || undefined,
			storagePath: (doc.storagePath as string) || undefined,
			htmlUrl: `/api/portal/documents/${encodeURIComponent(id)}/html`,
			payloadJson: (doc.payloadJson as string) || undefined,
		};
	});

	// Map prescriptions from documents or payload
	const mappedPrescriptions: PatientPrescriptionItem[] = [];
	if (Array.isArray(payload.prescriptions)) {
		for (const rx of payload.prescriptions) {
			mappedPrescriptions.push({
				id: (rx.id as string) || `rx-${mappedPrescriptions.length}`,
				medicationName: (rx.medicationName as string) || (rx.name as string) || "Лекарственный препарат",
				dosageRu: (rx.dosageRu as string) || (rx.dosage as string) || "",
				instructionRu: (rx.instructionRu as string) || (rx.instructions as string) || "По назначению врача",
				durationRu: (rx.durationRu as string) || (rx.duration as string) || "5–7 дней",
				dateIso: (rx.dateIso as string) || new Date().toISOString().slice(0, 10),
				doctorName:
					(rx.doctorName as string) || (adminProfile.curatorFullName as string) || "Лечащий врач",
				validityDays: rx.validityDays ? Number(rx.validityDays) : 60,
				status: (rx.status as string) || "active",
				orderNumber: typeof rx.orderNumber === "string" ? rx.orderNumber : undefined,
			});
		}
	}
	for (const doc of documents) {
		if (doc.kind === "prescription_medication_order") {
			let payloadObj: PrescriptionDocPayload | null = null;
			if (typeof doc.payloadJson === "string") {
				try {
					payloadObj = JSON.parse(doc.payloadJson) as PrescriptionDocPayload;
				} catch {
					payloadObj = null;
				}
			} else if (typeof doc.payload === "object" && doc.payload !== null) {
				payloadObj = doc.payload as PrescriptionDocPayload;
			}
			if (payloadObj?.prescriptionMedicationOrder) {
				const pmo = payloadObj.prescriptionMedicationOrder;
				mappedPrescriptions.push({
					id: (doc.id as string) || `rx-${mappedPrescriptions.length}`,
					medicationName: pmo.drugNameRu || (typeof doc.title === "string" ? doc.title : "Препарат"),
					dosageRu: pmo.dosageFormRu || "",
					instructionRu:
						pmo.dosageAndAdministrationRu || "Принимать по назначению врача",
					durationRu: pmo.treatmentDurationRu || "По схеме",
					dateIso:
						(doc.issuedAt as string)?.slice(0, 10) ||
						new Date().toISOString().slice(0, 10),
					doctorName:
						pmo.prescribingDoctorFullName ||
						(adminProfile.curatorFullName as string) ||
						"Лечащий врач",
					validityDays: pmo.validityDays ? Number(pmo.validityDays) : 60,
					status: doc.status === "issued" ? "active" : "draft",
					orderNumber: pmo.prescriptionSeriesAndNumber || (typeof doc.documentNumber === "string" ? doc.documentNumber : undefined),
				});
			}
		}
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
	const patientFamilyMembers = Array.isArray(p.familyMembers)
		? (p.familyMembers as PatientCabinetFamilyMember[])
		: undefined;

	return {
		patientId: (p.id as string) || "live-patient",
		organizationId: (p.organizationId as string) || (payload as { organizationId?: string }).organizationId || undefined,
		fullName: (p.fullName as string) || "Пациент клиники",
		phone: (p.phone as string) || "",
		email: (p.email as string) || undefined,
		birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : undefined,
		inn: (p.inn as string) || (adminProfile.taxpayerInn as string) || undefined,
		cardNumber: (p.cardNumber as string) || (p.id ? `КРТ-${String(p.id).slice(0, 6).toUpperCase()}` : "КРТ-001"),
		curatingDoctor: (adminProfile.curatorFullName as string) || (appointments[0]?.doctorName) || "Лечащий врач",
		loyaltyBonusBalance: bonusPoints,
		loyaltyTierRu,
		cashbackEarnedRub: bonusPoints > 0 ? bonusPoints * 10 : 0,
		dmsInsuranceName: adminProfile.insurancePolicyNumber ? `Полис: ${adminProfile.insurancePolicyNumber}` : undefined,
		familyBalanceRub:
			payload.familyGroup?.balanceRub !== undefined
				? Number(payload.familyGroup.balanceRub)
				: p.familyBalanceRub !== undefined
					? Number(p.familyBalanceRub)
					: undefined,
		familyBonusPool:
			p.familyBonusPool !== undefined ? Number(p.familyBonusPool) : undefined,
		familyMembers: payload.familyMembers ?? patientFamilyMembers ?? undefined,
		familyMembersCount:
			payload.familyMembers?.length ??
			(p.familyMembersCount !== undefined ? Number(p.familyMembersCount) : undefined),
		invoices: mappedInvoices,
		appointments,
		treatmentPlans: mappedPlans,
		warranties: [],
		consents: mappedConsents,
		documents: mappedDocuments,
		prescriptions: mappedPrescriptions.length > 0 ? mappedPrescriptions : undefined,
		scans: mappedScans,
	};
}
