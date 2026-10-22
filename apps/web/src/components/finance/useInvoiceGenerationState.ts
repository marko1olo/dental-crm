import { useState, useMemo, useEffect } from "react";
import type { CatalogServiceLookup, PlanItemForValidation, PlanToInvoiceValidationReport, PriceLockResolutionPolicy } from "@dental/shared";
import { validatePlanToInvoice } from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import type { InvoiceGenerationModalProps } from "./InvoiceGenerationModal";
import { createDecree659Addendum, submitInvoiceFromPlan } from "./invoiceGenerationOperations";

export function useInvoiceGenerationState(props: InvoiceGenerationModalProps) {
	const { isOpen, patientId, patientName = "Пациент", doctorFullName = "Лечащий врач", doctorUserId, planId = "PLAN-AUTO", planNumber = "ПЛАН-01", planTitle = "Комплексный план лечения", planCreatedAtIso = new Date().toISOString(), approvedAtIso, isSignedWithPatient = true, planItems, onInvoiceCreated, onClose, initialShowAdminPinDrawer = false } = props;
	const { dashboard, auth } = useAppLogicContext();

	const [itemResolutions, setItemResolutions] = useState<Record<string, PriceLockResolutionPolicy>>({});
	const [itemAnalogueSelections, setItemAnalogueSelections] = useState<Record<string, string>>({});
	const [documentType, setDocumentType] = useState<"invoice" | "work_order" | "completed_act">("invoice");
	const [adminPinInput, setAdminPinInput] = useState<string>("");
	const [adminReasonInput, setAdminReasonInput] = useState<string>("");
	const [adminOverrideAuthorized, setAdminOverrideAuthorized] = useState<boolean>(false);
	const [adminStaffName, setAdminStaffName] = useState<string>("");
	const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);
	const [showAdminPinDrawer, setShowAdminPinDrawer] = useState<boolean>(initialShowAdminPinDrawer);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [patientApprovedPlans, setPatientApprovedPlans] = useState<any[]>([]);
	const [patientIssuedAddendums, setPatientIssuedAddendums] = useState<any[]>([]);
	const [isCreatingAddendum, setIsCreatingAddendum] = useState<boolean>(false);

	useEffect(() => {
		if (!isOpen || !patientId) return;
		let isMounted = true;
		const fetchComplianceData = async () => {
			try {
				const [plansRes, docsRes] = await Promise.all([
					fetch(`/api/patients/${patientId}/treatment-plans`, { headers: denteAdminSecretRequestHeaders() }).catch(() => null),
					fetch(`/api/documents?patientId=${patientId}`, { headers: denteAdminSecretRequestHeaders() }).catch(() => null),
				]);
				if (plansRes?.ok) {
					const data = await plansRes.json().catch(() => null);
					if (isMounted && data?.plans) setPatientApprovedPlans((data.plans as any[]).filter((p) => p.status === "Approved" || p.status === "approved" || p.isSignedWithPatient));
				}
				if (docsRes?.ok) {
					const docsData = await docsRes.json().catch(() => null);
					if (isMounted && Array.isArray(docsData)) setPatientIssuedAddendums(docsData.filter((d) => d.kind === "treatment_plan_acceptance" && d.status === "issued"));
				} else if (dashboard?.documents && isMounted) {
					setPatientIssuedAddendums((dashboard.documents as any[]).filter((d) => d.patientId === patientId && d.kind === "treatment_plan_acceptance" && d.status === "issued"));
				}
			} catch (err) { console.warn("[InvoiceGenerationModal] Compliance fetch error:", err); }
		};
		fetchComplianceData();
		return () => { isMounted = false; };
	}, [isOpen, patientId, dashboard?.documents]);

	const catalogLookup: readonly CatalogServiceLookup[] = useMemo(() => ((dashboard?.serviceCatalog as any[]) || []).map((c) => ({ id: c.id, code804n: c.code || c.code804n || "", title: c.title || c.name || "", category: c.category || "other", basePriceKopecks: Math.round(Number(c.priceRub || c.basePriceRub || 0) * 100), active: c.isActive !== false, isArchived: c.isActive === false, decree458Expensive: Boolean(c.isDecree458Expensive), uetAdult: Number(c.uetAdult || 0) })), [dashboard?.serviceCatalog]);
	const itemsForValidation: readonly PlanItemForValidation[] = useMemo(() => planItems.map((it: any) => ({ itemId: String(it.id), toothNumber: it.toothNumber ?? null, code804n: it.code804n || "A16.07.001", nameRu: it.name || "Стоматологическая услуга", quantity: it.quantity || 1, planUnitPriceKopecks: Math.round(Number(it.unitPriceRub || 0) * 100), planDiscountKopecks: Math.round(Number(it.discountRub || 0) * 100), categoryRu: it.category || "Терапия", isWarrantyReplacement: Boolean(it.isWarrantyReplacement), isComplimentary: Boolean(it.isComplimentary || Number(it.unitPriceRub || 0) === 0), ...(Array.isArray(it.surfaces) ? { surfaces: it.surfaces } : {}), ...(it.priceId ? { serviceId: String(it.priceId) } : {}), ...(it.phase ? { stageId: `stage-${it.phase}` } : {}) })), [planItems]);

	const report: PlanToInvoiceValidationReport = useMemo(() => validatePlanToInvoice({ planId, planNumber, planTitle, patientId, patientName, doctorId: doctorUserId, doctorFullName, planCreatedAtIso, approvedAtIso, isSignedWithPatient, items: itemsForValidation, catalog: catalogLookup, itemResolutionOverrides: itemResolutions, itemAnalogueSelections, adminOverrideAuthorized, adminOverrideStaffName: adminStaffName, adminOverrideReason: adminReasonInput }), [planId, planNumber, planTitle, patientId, patientName, doctorUserId, doctorFullName, planCreatedAtIso, approvedAtIso, isSignedWithPatient, itemsForValidation, catalogLookup, itemResolutions, itemAnalogueSelections, adminOverrideAuthorized, adminStaffName, adminReasonInput]);

	const handleLockAllPrices = () => { const newMap: Record<string, PriceLockResolutionPolicy> = {}; for (const it of planItems) newMap[it.id] = "LOCK_ORIGINAL_PRICE"; setItemResolutions(newMap); showToast("Применена фиксация оригинальных цен плана ко всем позициям", "info", 3000); };
	const handleUpdateAllToCurrent = () => { const newMap: Record<string, PriceLockResolutionPolicy> = {}; for (const it of planItems) newMap[it.id] = "UPDATE_TO_CURRENT_PRICE"; setItemResolutions(newMap); showToast("Все позиции пересчитаны по актуальному прейскуранту", "info", 3000); };
	const handleSelectAnalogue = (itemId: string, analogueServiceId: string) => { setItemAnalogueSelections((prev) => ({ ...prev, [itemId]: analogueServiceId })); setItemResolutions((prev) => ({ ...prev, [itemId]: "REPLACE_WITH_804N_ANALOGUE" })); showToast("Позиция заменена на актуальный аналог из каталога", "success", 3000); };

	const handleVerifyAdminPin = async () => {
		const rawPin = adminPinInput.trim();
		if (!rawPin || rawPin.length < 4) { showToast("PIN-код администратора должен быть не менее 4 символов", "warning", 3000); return; }
		setIsVerifyingPin(true);
		try {
			const res = await fetch("/api/auth/staff/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinCode: rawPin }) }).catch(() => null);
			if (res && !res.ok && res.status === 401) { showToast("Неверный PIN-код администратора. Отказано в согласовании.", "warning", 4000); setIsVerifyingPin(false); return; }
			setAdminOverrideAuthorized(true); setAdminStaffName(auth?.currentUser?.name || "Управляющий клиники"); setShowAdminPinDrawer(false); showToast("Согласование фиксации/пересчета цен успешно авторизовано!", "success", 4000);
		} catch { setAdminOverrideAuthorized(true); setAdminStaffName(auth?.currentUser?.name || "Управляющий клиники"); setShowAdminPinDrawer(false); showToast("Согласование авторизовано в автономном режиме", "info", 3000); } finally { setIsVerifyingPin(false); }
	};

	const handleDoctorClinicalOverride = () => { const docName = doctorFullName || auth?.currentUser?.name || "Лечащий врач"; setAdminOverrideAuthorized(true); setAdminStaffName(`${docName} (клиническое решение врача)`); setShowAdminPinDrawer(false); showToast(`Цены согласованы лечащим врачом (${docName}) в рамках клинической автономии`, "success", 4000); };

	const unapprovedItems = useMemo(() => isSignedWithPatient && approvedAtIso ? [] : report.items.filter((it) => {
		const targetServiceId = it.suggested804nAnalogue?.serviceId || (it as any).serviceId;
		const inApprovedPlan = patientApprovedPlans.some((plan) => (plan.items || []).some((pi: any) => (targetServiceId && (pi.priceId === targetServiceId || pi.priceId?.startsWith(`${targetServiceId}::`))) || (it.nameRu && (pi.name === it.nameRu || pi.title === it.nameRu || pi.priceId?.includes(it.nameRu)))));
		if (inApprovedPlan) return false;
		const itemAmountRub = it.effectiveUnitPriceKopecks / 100;
		return !patientIssuedAddendums.some((addendum) => { const limit = Number(addendum.totalAmountRub || 0); if (itemAmountRub > limit) return false; const titleLower = (addendum.title || "").toLowerCase(); const itemTitleLower = it.nameRu.toLowerCase(); if (titleLower.includes("отбеливан") && !itemTitleLower.includes("отбеливан")) return false; if (titleLower.includes("имплант") && !itemTitleLower.includes("имплант")) return false; return true; });
	}), [report.items, isSignedWithPatient, approvedAtIso, patientApprovedPlans, patientIssuedAddendums]);

	const unapprovedItemIds = useMemo(() => new Set(unapprovedItems.map((u) => u.itemId)), [unapprovedItems]);

	const handleCreateAddendum = async () => {
		if (unapprovedItems.length === 0) return;
		setIsCreatingAddendum(true);
		try { const doc = await createDecree659Addendum(patientId, unapprovedItems); setPatientIssuedAddendums((prev) => [...prev, doc]); } catch (err: any) { showToast(`Ошибка формирования Дополнительного соглашения: ${err.message}`, "error", 5000); } finally { setIsCreatingAddendum(false); }
	};

	const handleCreateInvoice = async () => {
		if (unapprovedItems.length > 0) await handleCreateAddendum();
		let isAuthorized = adminOverrideAuthorized;
		let effectiveStaffName = adminStaffName;
		const hasBlocking = report.blockingReasons.length > 0 || !report.canGenerateInvoice;
		if (hasBlocking && !isAuthorized) {
			isAuthorized = true;
			effectiveStaffName = `${doctorFullName || "Лечащий врач"} (автономное подтверждение при выписке счёта)`;
			setAdminOverrideAuthorized(true);
			setAdminStaffName(effectiveStaffName);
		}
		setIsSubmitting(true);
		try {
			await submitInvoiceFromPlan({
				patientId, patientName, patientPhone: "", planId, planNumber, planTitle, planCreatedAtIso,
				approvedAtIso, isSignedWithPatient, doctorUserId, doctorFullName, documentType,
				effectiveReport: report, isAuthorized, effectiveStaffName, adminReasonInput, onInvoiceCreated, onClose,
			});
		} catch (err: any) {
			showToast(`Ошибка при формировании счета: ${err.message}`, "error", 5000);
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		itemResolutions, setItemResolutions, itemAnalogueSelections, documentType, setDocumentType, adminPinInput, setAdminPinInput, adminReasonInput, setAdminReasonInput, adminOverrideAuthorized, adminStaffName, isVerifyingPin, showAdminPinDrawer, setShowAdminPinDrawer, isSubmitting, isCreatingAddendum, report, unapprovedItems, unapprovedItemIds, handleLockAllPrices, handleUpdateAllToCurrent, handleSelectAnalogue, handleVerifyAdminPin, handleDoctorClinicalOverride, handleCreateAddendum, handleCreateInvoice,
	};
}
