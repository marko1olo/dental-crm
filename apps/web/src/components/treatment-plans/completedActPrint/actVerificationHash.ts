/**
 * apps/web/src/components/treatment-plans/completedActPrint/actVerificationHash.ts
 *
 * Криптографический расчет SHA-256 хэша акта по ГОСТ Р 7.0.97-2016.
 */

import { useEffect, useMemo, useState } from "react";
import { sha256Hex, type Kopecks } from "@dental/shared";
import type { CompletedWorksActAndWriteOffData } from "../types";

export function useActVerificationHash(
	actData: CompletedWorksActAndWriteOffData,
	netServicesRub: number,
	netServicesKopecks: Kopecks,
	netMaterialRub: number,
	netMaterialKopecks: Kopecks,
): string {
	const canonicalActPayload = useMemo(() => {
		return JSON.stringify({
			actNumber: actData.actNumber,
			actDate: actData.actDate,
			contractNumber: actData.contractNumber,
			patientId: actData.patientId,
			patientName: actData.patientName,
			doctorFullName: actData.doctorFullName,
			stageNumber: actData.stageNumber,
			stageTitle: actData.stageTitle,
			totalServiceRub: netServicesRub,
			totalServiceKopecks: netServicesKopecks,
			totalMaterialCostRub: netMaterialRub,
			totalMaterialCostKopecks: netMaterialKopecks,
			completedProcedures: actData.completedProcedures.map((p) => ({
				id: p.id,
				procedureName: p.name,
				code804n: p.code804n,
				toothNumber: p.toothNumber,
				quantity: p.quantity,
				unitPriceRub: p.unitPriceRub,
				discountRub: p.discountRub,
				totalRub: p.priceRub,
			})),
			writtenOffMaterials: actData.writtenOffMaterials.map((m) => ({
				id: m.id,
				materialName: m.materialName,
				order804nCode: m.order804nCode,
				quantityRequired: m.quantityRequired,
				unitCostRub: m.unitCostRub,
				totalCostRub: m.totalCostRub,
			})),
		});
	}, [actData, netServicesRub, netServicesKopecks, netMaterialRub, netMaterialKopecks]);

	const [verificationHash, setVerificationHash] = useState<string>(() => {
		return `SHA-256: ${sha256Hex(canonicalActPayload)}`;
	});

	useEffect(() => {
		let isCancelled = false;
		async function updateHashWithWebCrypto() {
			try {
				if (typeof window !== "undefined" && window.crypto?.subtle?.digest) {
					const encoder = new TextEncoder();
					const data = encoder.encode(canonicalActPayload);
					const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
					const hashArray = Array.from(new Uint8Array(hashBuffer));
					const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
					if (!isCancelled) {
						setVerificationHash(`SHA-256: ${hex}`);
					}
					return;
				}
			} catch (e) {
				// Web Crypto fallback to sha256Hex
			}
			if (!isCancelled) {
				setVerificationHash(`SHA-256: ${sha256Hex(canonicalActPayload)}`);
			}
		}
		updateHashWithWebCrypto();
		return () => {
			isCancelled = true;
		};
	}, [canonicalActPayload]);

	return verificationHash;
}
