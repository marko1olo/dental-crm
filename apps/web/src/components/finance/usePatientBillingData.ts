import { useMemo } from "react";
import type { CompletedWorksActParams, InvoiceServiceItem } from "./invoiceEngine";
import { compileCompletedWorksAct, generateCompletedActAndWarrantyHtml } from "./invoiceEngine";
import { calculateCashChange, distributeLoyaltyDiscountAcrossItems, type LoyaltyDiscountPreset } from "./fiscal/fiscal54fzEngine";
import { groupServicesIntoFriendlyBlocks } from "../portal/patientCabinet/patientCareInstructionsEngine";
import type { PatientBillingModalProps, PatientBillingPlanStage } from "./PatientBillingTypes";

export interface BillingDataParams {
	readonly props: PatientBillingModalProps;
	readonly actNumber: string;
	readonly resolvedClinic: { name: string; legalName: string; inn: string; kpp: string; ogrn: string; licenseNumber: string; licenseDate: string; address: string; phone: string; chiefDoctorName: string };
	readonly isStageApplied: boolean;
	readonly selectedStage: PatientBillingPlanStage | null;
	readonly itemWarrantyMap: Record<string, boolean>;
	readonly discountPreset: LoyaltyDiscountPreset;
	readonly customDiscountPercent: number;
	readonly customDiscountRub: number;
	readonly customAmountRub: number;
	readonly customServiceName: string;
	readonly receivedCashRub: number;
	readonly getStageAmountRub: (stg: PatientBillingPlanStage | null | undefined) => number;
}

export function usePatientBillingData(p: BillingDataParams) {
	const { props, actNumber, resolvedClinic, isStageApplied, selectedStage, itemWarrantyMap, discountPreset, customDiscountPercent, customDiscountRub, customAmountRub, customServiceName, receivedCashRub, getStageAmountRub } = p;
	const { patient, doctor, initialServices = [], contractNumber = "Д-2026/089", contractDateIso } = props;

	const rawServices: InvoiceServiceItem[] = useMemo(() => {
		let baseItems: InvoiceServiceItem[] = [];
		if (isStageApplied && selectedStage) {
			if (selectedStage.items && selectedStage.items.length > 0) {
				baseItems = selectedStage.items.map((item: any, idx: number) => ({ id: item.id ?? `stage-item-${idx}`, name: item.name ?? item.titleRu ?? item.title ?? `Услуга этапа ${selectedStage.stageNumber ?? ""}`, code804n: item.code804n ?? "A16.07.001", quantity: item.quantity ?? 1, priceRub: item.priceRub ?? (item.priceKopecks ? item.priceKopecks / 100 : (item.totalRub ?? 0)), category: item.category ?? "therapy" }));
			} else {
				baseItems = [{ id: `stage-${selectedStage.id}`, name: `Этап ${selectedStage.stageNumber ?? 1}: ${selectedStage.titleRu ?? selectedStage.title ?? "Стоматологическое лечение"}`, code804n: "A16.07.001", quantity: 1, priceRub: getStageAmountRub(selectedStage), category: "therapy" }];
			}
		} else if (initialServices.length > 0) {
			baseItems = [...initialServices];
		} else if (customAmountRub > 0) {
			baseItems = [{ id: "srv-custom", name: customServiceName.trim() || "Аванс за стоматологические услуги", code804n: "A16.07.002", quantity: 1, priceRub: customAmountRub, category: "therapy" }];
		}
		return baseItems.map((s) => (itemWarrantyMap[s.id] ?? !!s.isWarranty ? { ...s, isWarranty: true, warrantyDiscountPercent: 100, warrantyPriceRub: s.priceRub * s.quantity, warrantySourceAppointmentId: s.warrantySourceAppointmentId ?? null } : { ...s, isWarranty: false, warrantyDiscountPercent: undefined, warrantyPriceRub: 0 }));
	}, [isStageApplied, selectedStage, initialServices, customAmountRub, customServiceName, itemWarrantyMap, getStageAmountRub]);

	const discountResult = useMemo(() => distributeLoyaltyDiscountAcrossItems(rawServices, { preset: discountPreset, customPercent: customDiscountPercent, customRub: customDiscountRub }), [rawServices, discountPreset, customDiscountPercent, customDiscountRub]);
	const services = discountResult.items;
	const friendlyBreakdown = useMemo(() => groupServicesIntoFriendlyBlocks(services), [services]);
	const totalNetRub = discountResult.totalNetRub;

	const installmentSchedule = useMemo(() => {
		const totalNetKop = Math.round(totalNetRub * 100);
		const stage1Kop = Math.round((totalNetKop * 30) / 100);
		const remainingKop = Math.max(0, totalNetKop - stage1Kop);
		const stage2Kop = Math.floor(remainingKop / 3);
		const stage3Kop = Math.floor(remainingKop / 3);
		return { stage1Rub: stage1Kop / 100, stage2Rub: stage2Kop / 100, stage3Rub: stage3Kop / 100, stage4Rub: (remainingKop - stage2Kop - stage3Kop) / 100 };
	}, [totalNetRub]);

	const cashChangeResult = useMemo(() => calculateCashChange(totalNetRub, receivedCashRub > 0 ? receivedCashRub : totalNetRub), [totalNetRub, receivedCashRub]);

	const actParams: CompletedWorksActParams = useMemo(() => ({
		actNumber, contractNumber, contractDateIso: contractDateIso || new Date().toISOString(), actDateIso: new Date().toISOString(),
		clinic: resolvedClinic,
		patient: { id: patient?.id, fullName: patient?.fullName || "", birthDate: patient?.birthDate || undefined, passportData: patient?.passportData || "", phone: patient?.phone || "", address: patient?.address || "", medicalCardNumber: patient?.medicalCardNumber || "043/у-2026" },
		doctor: { fullName: doctor?.fullName || "Лечащий врач", specialty: doctor?.specialty || "Врач-стоматолог терапевт-ортопед" },
		items: services,
	}), [actNumber, contractNumber, contractDateIso, resolvedClinic, patient, doctor, services]);

	const summary = useMemo(() => compileCompletedWorksAct(actParams), [actParams]);
	const printableHtml = useMemo(() => generateCompletedActAndWarrantyHtml(actParams), [actParams]);

	return { rawServices, discountResult, services, friendlyBreakdown, totalNetRub, installmentSchedule, cashChangeResult, actParams, summary, printableHtml };
}
