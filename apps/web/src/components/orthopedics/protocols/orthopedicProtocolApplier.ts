import { rublesToKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { useVisitStore } from "../../../store/visitStore.js";
import type { ApplyOrthopedicProtocolParams, OrthopedicServiceItem, Order804nServiceItem } from "./orthopedicProtocolTypes.js";
import { formatOrthopedicProtocolStatement } from "./orthopedicProtocolFormatter.js";

function dispatchOrthopedicEvents(
	formatted: ReturnType<typeof formatOrthopedicProtocolStatement>,
	protocol: ApplyOrthopedicProtocolParams["protocol"],
	teethNumbers: number[],
	options: ApplyOrthopedicProtocolParams["options"],
) {
	if (typeof window === "undefined") return;
	try {
		const protocolServices = protocol.clinicalServices ?? protocol.services ?? protocol.order804nServices;
		window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
			detail: {
				soap: {
					anamnesis: formatted.anamnesis, objective: formatted.objective, statusLocalis: formatted.objective,
					treatment: formatted.treatment, treatmentDescription: formatted.treatment,
					recommendations: formatted.recommendations, icd10: protocol.defaultIcd10,
				},
				mode: "smart_append", immediate: true,
			},
		}));
		if (teethNumbers.length > 0) {
			window.dispatchEvent(new CustomEvent("dente-odontogram-update", {
				detail: { states: teethNumbers.map((t) => ({ toothNumber: t, state: "Crown" })) },
			}));
		}
		const primaryTooth = teethNumbers.length > 0 ? teethNumbers[0] : undefined;
		window.dispatchEvent(new CustomEvent("dente-estimate-stage-add", {
			detail: { stageKind: "stage_3_orthopedics", toothFdi: primaryTooth, teethFdi: teethNumbers, protocolId: protocol.id, services: protocolServices },
		}));
		const invoiceServices = protocolServices.map((s) => {
			const priceRub = s.priceRub ?? s.suggestedPriceRub ?? 0;
			const priceKopecks = rublesToKopecks(priceRub);
			return {
				code: s.code, nameRu: s.nameRu, name: s.nameRu,
				priceRub,
				priceKopecks,
				amountKopecks: BigInt(priceKopecks),
				suggestedPriceRub: s.suggestedPriceRub ?? s.priceRub ?? 0,
				toothNumber: primaryTooth, stageKind: s.stageKind,
				labOrderId: options?.labOrderId, labOrderNumber: options?.labOrderNumber,
				technicianName: options?.technicianName, materialName: options?.material, warrantyPassport: options?.warrantyPassport,
			};
		});
		const totalKopecks = invoiceServices.reduce((sum, s) => sum + s.amountKopecks, 0n);
		window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
			detail: {
				toothNumber: primaryTooth,
				teethNumbers,
				services: invoiceServices,
				totalKopecks,
				priceKopecks: Number(totalKopecks),
				amountKopecks: totalKopecks,
				labOrderId: options?.labOrderId,
				labOrderNumber: options?.labOrderNumber,
				technicianName: options?.technicianName,
				material: options?.material,
				warrantyPassport: options?.warrantyPassport,
			},
		}));
	} catch (err) {
		console.warn("Failed to dispatch orthopedic DOM events", err);
	}
}

export function applyOrthopedicProtocolToVisit(params: ApplyOrthopedicProtocolParams): {
	summary: string;
	teethNumbers: number[];
	services: readonly OrthopedicServiceItem[];
	formatted: ReturnType<typeof formatOrthopedicProtocolStatement>;
} {
	const { protocol, options } = params;
	const formatted = formatOrthopedicProtocolStatement(protocol, options);
	const rawTeeth = options?.teethFdi && options.teethFdi.length > 0 ? [...options.teethFdi] : options?.toothFdi ? [options.toothFdi] : [];
	const teethNumbers = rawTeeth.map((t) => Number(String(t).replace(/\D/g, ""))).filter((n) => Number.isInteger(n) && n >= 11 && n <= 85);

	dispatchOrthopedicEvents(formatted, protocol, teethNumbers, options);

	const protocolServices = protocol.clinicalServices ?? protocol.services ?? protocol.order804nServices;

	if (params.onAddToInvoice) {
		try {
			params.onAddToInvoice(protocolServices);
		} catch (err) {
			console.warn("Failed to add orthopedic services to invoice", err);
		}
	}

	try {
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus?.trim() ? `${prev.objectiveStatus.trim()}\n\n${formatted.objective}` : formatted.objective,
			treatmentPlan: prev.treatmentPlan?.trim() ? `${prev.treatmentPlan.trim()}\n\n${formatted.treatment}` : formatted.treatment,
			diagnosis: prev.diagnosis || protocol.defaultIcd10Label,
		}));
	} catch (err) {
		console.warn("Failed to update visit store with orthopedic protocol", err);
	}

	if (params.copyToClipboard !== false && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(`ЖАЛОБЫ:\n${formatted.anamnesis}\n\nОБЪЕКТИВНО:\n${formatted.objective}\n\nЛЕЧЕНИЕ:\n${formatted.treatment}\n\nРЕКОМЕНДАЦИИ:\n${formatted.recommendations}`).catch((err) => {
			console.warn("Failed to copy orthopedic protocol to clipboard", err);
		});
	}

	if (protocol.warehouseBundleType && typeof window !== "undefined") {
		try {
			window.dispatchEvent(new CustomEvent("dente-inventory-writeoff", {
				detail: { protocolId: protocol.id, bundleType: protocol.warehouseBundleType, toothNumber: teethNumbers[0], teethNumbers, consumables: protocol.consumables },
			}));
		} catch (err) {
			console.warn("Failed to dispatch inventory writeoff event", err);
		}
	}

	if (params.showNotification !== false) {
		showToast(`Протокол «${protocol.shortLabel}» внесен в дневник приёма, смету и Этап 3 (Ортопедия)`, "success", 3500);
	}
	params.onSuccess?.(formatted.summaryLine);

	return { summary: formatted.summaryLine, teethNumbers, services: protocolServices, formatted };
}
