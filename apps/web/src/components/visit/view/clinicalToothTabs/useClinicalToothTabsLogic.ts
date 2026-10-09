import { useState } from "react";
import type { ToothClinicalServicePayload } from "@dental/shared";
import { useVisitStore } from "../../../../store/visitStore";
import { showToast } from "../../../GlobalToast";
import { formatCompletedServiceLine } from "../../completedServicesPlan";
import type { ToothClinicalProtocol } from "./types";

export interface UseClinicalToothTabsLogicProps {
	code: string;
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	appendToEMKField: (field: string, text: string) => void;
	onAddServiceToTooth?: ((service: ToothClinicalServicePayload) => void) | undefined;
}

export function useClinicalToothTabsLogic({
	code,
	handleSelectDiagnosis,
	appendToEMKField,
	onAddServiceToTooth,
}: UseClinicalToothTabsLogicProps) {
	const completedServices = useVisitStore((s) => s.completedServices);
	const removeCompletedService = useVisitStore((s) => s.removeCompletedService);

	const toothServices = (completedServices || []).filter(
		(s) => String(s.toothCode || s.toothNumber) === String(code),
	);
	const toothTotalRub = toothServices.reduce(
		(sum, s) => sum + (s.priceRub || 0) * (s.quantity || 1),
		0,
	);

	const [selectedProtocolKey, setSelectedProtocolKey] = useState<
		"caries" | "pulpitis" | "extraction" | "hygiene"
	>("caries");

	const handleAddClinicalProtocol = (proto: ToothClinicalProtocol) => {
		const toothNum = Number.parseInt(code, 10) || undefined;
		const addedPayloads: ToothClinicalServicePayload[] = proto.services.map(
			(svc, idx) => ({
				serviceId: `${svc.serviceId}-${code}-${Date.now()}-${idx}`,
				code804n: svc.code804n,
				name: svc.name,
				priceRub: svc.priceRub,
				priceKopecks: Math.round(svc.priceRub * 100),
				quantity: svc.quantity || 1,
				category: svc.category || "therapy",
				toothNumber: toothNum,
				toothCode: code,
			}),
		);

		handleSelectDiagnosis(proto.toothState, proto.diagnosisText, "diagnosis");

		for (const payload of addedPayloads) {
			useVisitStore.getState().addCompletedService(payload);
			onAddServiceToTooth?.(payload);
		}

		useVisitStore.getState().applyServicesToToothState({
			toothNumber: toothNum,
			toothCode: code,
			services: addedPayloads.map((p) => ({
				code804n: p.code804n,
				title: p.name,
				price: p.priceRub,
				toothNumber: toothNum,
				toothCode: code,
			})),
		});

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services: addedPayloads.map((p) => ({
								code: p.code804n,
								code804n: p.code804n,
								title: p.name,
								name: p.name,
								price: p.priceRub,
								unitPriceRub: p.priceRub,
								quantity: p.quantity,
								toothNumber: toothNum,
								toothCode: code,
							})),
							toothNumber: toothNum,
							toothCode: code,
							source: "chairside_clinical_protocol",
						},
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		const lines = addedPayloads
			.map((p) =>
				formatCompletedServiceLine({
					code804n: p.code804n,
					title: p.name,
					priceRub: p.priceRub,
					toothCode: code,
				}),
			)
			.join("\n");
		appendToEMKField("treatmentPlan", lines);

		showToast(
			`Протокол лечения зуба ${code} добавлен в счёт (${addedPayloads.length} услуг)`,
			"success",
			3000,
		);
	};

	const handleAdd804nService = (preset: {
		serviceId: string;
		code804n: string;
		name: string;
		priceRub: number;
		priceKopecks?: number;
		quantity?: number;
		category?: string;
	}) => {
		const toothNum = Number.parseInt(code, 10) || undefined;
		const payload: ToothClinicalServicePayload = {
			serviceId: preset.serviceId,
			code804n: preset.code804n,
			name: preset.name,
			priceRub: preset.priceRub,
			priceKopecks: preset.priceKopecks ?? Math.round(preset.priceRub * 100),
			quantity: preset.quantity || 1,
			category: preset.category,
			toothNumber: toothNum,
			toothCode: code,
		};

		useVisitStore.getState().addCompletedService(payload);
		useVisitStore.getState().applyServicesToToothState({
			toothNumber: toothNum,
			toothCode: code,
			services: [
				{
					code804n: payload.code804n,
					title: payload.name,
					price: payload.priceRub,
					toothNumber: toothNum,
					toothCode: code,
				},
			],
		});

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services: [
								{
									code: payload.code804n,
									code804n: payload.code804n,
									title: payload.name,
									name: payload.name,
									price: payload.priceRub,
									unitPriceRub: payload.priceRub,
									quantity: payload.quantity,
									toothNumber: toothNum,
									toothCode: code,
								},
							],
							toothNumber: toothNum,
							toothCode: code,
							source: "chairside_tooth_tabs",
						},
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		appendToEMKField(
			"treatmentPlan",
			formatCompletedServiceLine({
				code804n: payload.code804n,
				title: payload.name,
				priceRub: payload.priceRub,
				toothCode: code,
			}),
		);

		showToast(
			`[${payload.code804n}] ${payload.name} (зуб ${code}) добавлена в счёт`,
			"success",
			3000,
		);

		onAddServiceToTooth?.(payload);
	};

	return {
		completedServices,
		removeCompletedService,
		toothServices,
		toothTotalRub,
		selectedProtocolKey,
		setSelectedProtocolKey,
		handleAddClinicalProtocol,
		handleAdd804nService,
	};
}
