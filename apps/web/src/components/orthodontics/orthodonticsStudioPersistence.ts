/**
 * @dental/web/components/orthodontics/orthodonticsStudioPersistence.ts
 *
 * Сохранение протокола ортодонтической студии, фиксация этапов в ЭМК и серверные API.
 * Соответствует Мандатам 8e (Автономия врача), 8bo (Идемпотентность транзакций) и 8zr (Ноль проглатывания ошибок).
 */

import type { OrthoProtocolState } from "./orthodonticsCatalogData";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { clientLogger } from "../../services/logging/clientLogger";

export interface SaveOrthoProtocolOptions {
	readonly protocol: OrthoProtocolState;
	readonly soapSummary: string;
	readonly skeletalClass: string;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly onSaveProtocol?: ((protocol: OrthoProtocolState, summarySoap: string) => void | Promise<void>) | undefined;
}

async function postOrthoEndpoint(url: string, payload: unknown, idempotencyKey: string): Promise<Response> {
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Idempotency-Key": idempotencyKey,
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		let message = `Ошибка сервера (${res.status})`;
		try {
			const errJson = (await res.json()) as { message?: string; error?: string };
			if (errJson?.message) {
				message = errJson.message;
			} else if (errJson?.error) {
				message = errJson.error;
			}
		} catch {
			// не-JSON ответ
		}
		throw new Error(message);
	}

	return res;
}

export async function saveOrthodonticProtocolToApi(options: SaveOrthoProtocolOptions): Promise<boolean> {
	const { protocol, soapSummary, skeletalClass, patientId, visitId, treatmentPlanId, onSaveProtocol } = options;
	const updatedProtocol: OrthoProtocolState = { ...protocol, savedAt: new Date().toISOString() };

	if (onSaveProtocol) {
		try {
			await onSaveProtocol(updatedProtocol, soapSummary);
		} catch (err) {
			clientLogger.warn("onSaveProtocol error", err, { module: "orthodonticsStudioPersistence" });
		}
	}

	if (!patientId) {
		return true;
	}

	const effectiveTreatmentPlanId = treatmentPlanId ?? protocol.treatmentPlanId;
	const anbAngle = protocol.trgValues?.anb ?? undefined;
	const bitePayload = {
		...(protocol.angleClass ? { angleClass: protocol.angleClass } : {}),
		...(protocol.verticalBite ? { verticalBite: protocol.verticalBite } : {}),
		...(typeof protocol.overjetMm === "number" ? { overjetMm: protocol.overjetMm } : {}),
		...(typeof protocol.overbitePercent === "number" ? { overbitePercent: protocol.overbitePercent } : {}),
		...(typeof anbAngle === "number" ? { anbAngle } : {}),
		...(skeletalClass ? { skeletalClass } : {}),
		...(effectiveTreatmentPlanId ? { treatmentPlanId: effectiveTreatmentPlanId } : {}),
	};

	try {
		if (protocol.applianceCategory === "aligners") {
			// DEF-ORTHO-08: Количество выдаваемых кап берется строго из issuedSetsCount (пар на руки), а не из currentStep
			const alignerCount = protocol.alignerTracking.issuedSetsCount > 0
				? protocol.alignerTracking.issuedSetsCount
				: 1;

			await postOrthoEndpoint(`/api/orthodontics/${patientId}/aligners/issue-set`, {
				alignerCount,
				wearDaysPerAligner: protocol.alignerTracking.wearDaysPerStep || 14,
				totalAligners: protocol.alignerTracking.totalSteps || 24,
				note: `Выдача комплекта элайнеров (актуальный шаг ${protocol.alignerTracking.currentStep} из ${protocol.alignerTracking.totalSteps})`,
				visitId,
				soapSummary,
				applianceId: protocol.applianceId,
				applianceName: protocol.applianceName,
				selectedElasticId: protocol.selectedElasticId,
				selectedActionIds: protocol.selectedActionIds,
				...bitePayload,
			}, generateUuidV7());
		} else if (protocol.applianceCategory === "plate") {
			await postOrthoEndpoint(`/api/orthodontics/${patientId}/stages/advance`, {
				nextStage: Math.max(1, protocol.currentMonth || 1),
				stageTitle: `Активация аппарата / винта: ${protocol.applianceName}`,
				note: protocol.clinicalNotes || protocol.notes || "Контрольный осмотр и активация расширяющего винта пластинки",
				visitId,
				soapSummary,
				applianceId: protocol.applianceId,
				applianceName: protocol.applianceName,
				selectedElasticId: protocol.selectedElasticId,
				selectedActionIds: protocol.selectedActionIds,
				...bitePayload,
			}, generateUuidV7());
		} else {
			const materialMap: Record<string, "NiTi" | "CuNiTi" | "SS" | "TMA"> = {
				niti: "NiTi",
				cuniti: "CuNiTi",
				ss: "SS",
				tma: "TMA",
				NiTi: "NiTi",
				CuNiTi: "CuNiTi",
				SS: "SS",
				TMA: "TMA",
			};
			const upperMat = materialMap[protocol.upperAlloy] || "CuNiTi";
			const lowerMat = materialMap[protocol.lowerAlloy] || "CuNiTi";

			const isSameWire = upperMat === lowerMat && protocol.upperSection === protocol.lowerSection;
			await postOrthoEndpoint(`/api/orthodontics/${patientId}/archwire-change`, {
				material: upperMat,
				section: protocol.upperSection,
				upperMaterial: upperMat,
				upperSection: protocol.upperSection,
				lowerMaterial: lowerMat,
				lowerSection: protocol.lowerSection,
				arch: "both",
				applianceCategory: "brackets",
				isWireChange: true,
				note: isSameWire
					? "Плановая смена ортодонтических дуг ВЧ + НЧ"
					: `Смена дуг: ВЧ (${upperMat} ${protocol.upperSection}), НЧ (${lowerMat} ${protocol.lowerSection})`,
				visitId,
				soapSummary,
				applianceId: protocol.applianceId,
				applianceName: protocol.applianceName,
				selectedElasticId: protocol.selectedElasticId,
				selectedActionIds: protocol.selectedActionIds,
				...bitePayload,
			}, generateUuidV7());

			await postOrthoEndpoint(`/api/orthodontics/${patientId}/ligatures-activate`, {
				powerChain: protocol.selectedActionIds.includes("power_chain"),
				applianceCategory: "brackets",
				note: "Активация лигатур",
				visitId,
				soapSummary,
			}, generateUuidV7());
		}

		// DEF-ORTHO-04: Сохранение протокола в ЭМК через API визита
		if (visitId) {
			try {
				const autoSaveRes = await fetch(`/api/visits/${visitId}/draft/autosave`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					},
					body: JSON.stringify({
						visitId,
						patientId,
						selectedSpecialty: "orthodontics",
						transcript: "",
						draft: {
							complaint: "Плановый визит по ортодонтическому лечению",
							anamnesis: `Ортодонтическое лечение: ${protocol.applianceName}. Месяц ${protocol.currentMonth} из ${protocol.totalMonths}.`,
							objectiveStatus: `Аппарат: ${protocol.applianceName}. Скелетный класс ${skeletalClass}.`,
							diagnosis: "K07.4 Аномалии положения зубов",
							treatmentPlan: soapSummary,
						},
					}),
				});
				if (!autoSaveRes.ok) {
					console.warn("[saveOrthodonticProtocolToApi] Autosave draft HTTP status:", autoSaveRes.status);
				}
			} catch (vErr) {
				console.warn("[saveOrthodonticProtocolToApi] Autosave visit draft error:", vErr);
			}
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:emr-entry-added", {
					detail: {
						patientId,
						visitId,
						type: "orthodontic_protocol",
						text: soapSummary,
						savedAt: new Date().toISOString(),
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente:patient-updated", {
					detail: { patientId },
				}),
			);
			if (visitId) {
				window.dispatchEvent(
					new CustomEvent("dente:visit-updated", {
						detail: { visitId, patientId },
					}),
				);
			}
		}
		showToast("✓ Активация этапа успешно зафиксирована в ЭМК", "success");
		return true;
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.warn("[saveOrthodonticProtocolToApi] Save error:", err);
		showToast(`Сбой при фиксации этапа: ${errorMessage}`, "error");
		return false;
	}
}
