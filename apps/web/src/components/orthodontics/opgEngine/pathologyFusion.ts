import type { OpgPathologyDetection, OpgToothSlot } from "./types";

export function fusePathologiesToSlots(
	slots: Record<number, OpgToothSlot>,
	pathologies: OpgPathologyDetection[],
	midlineX = 512,
	splitY = 300,
): void {
	if (!pathologies || pathologies.length === 0) return;

	for (const p of pathologies) {
		let bestFdi: number | null = null;
		let minDistance = Infinity;

		for (const slotKey of Object.keys(slots)) {
			const fdi = Number(slotKey);
			const slot = slots[fdi]!;
			if (slot.toothDetection) {
				const dx = p.cx - slot.toothDetection.cx;
				const dy = p.cy - slot.toothDetection.cy;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < minDistance && dist < slot.toothDetection.height * 2.0) {
					minDistance = dist;
					bestFdi = fdi;
				}
			}
		}

		if (!bestFdi && p.label === "impacted_tooth") {
			const isRightSide = p.cx < midlineX;
			const isTopSide = p.cy < splitY;
			const targetWisdomFdi = isTopSide
				? (isRightSide ? 18 : 28)
				: (isRightSide ? 48 : 38);

			if (slots[targetWisdomFdi]) {
				bestFdi = targetWisdomFdi;
			}
		}

		if (bestFdi && slots[bestFdi]) {
			const targetSlot = slots[bestFdi]!;
			targetSlot.pathologies.push(p);

			if (p.label === "impacted_tooth") {
				targetSlot.status = "Retained";
				targetSlot.clinicalDescriptionRu = `Ретинированный зуб ${bestFdi} (уверенность ${(p.confidence * 100).toFixed(0)}%)`;
			} else if (p.label === "periapical_lesion" && targetSlot.status !== "Retained") {
				targetSlot.status = "Periodontitis";
				targetSlot.clinicalDescriptionRu = "Периапикальный очаг деструкции кости (Pt)";
			} else if (p.label === "caries" && targetSlot.status === "Healthy") {
				targetSlot.status = "Caries";
				targetSlot.clinicalDescriptionRu = "Кариозное поражение (C)";
			}
		}
	}
}
