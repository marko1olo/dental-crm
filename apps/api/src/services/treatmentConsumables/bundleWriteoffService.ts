/**
 * bundleWriteoffService.ts — Layer 3: 1-click clinical shift and visit bundle write-offs.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

import type { DbExecutor } from "./types.js";
import { executeUnifiedStockDeduction } from "./unifiedStockDeductionEngine.js";
import {
	getShiftBundleDefinitions,
	SHIFT_BUNDLE_NAMES,
	type ShiftBundleType,
} from "./bundleWriteoff/shiftBundlePresets.js";
import {
	getVisitBundleDefinitions,
	type QuickWriteoffVisitBundleType,
	VISIT_BUNDLE_NAMES,
} from "./bundleWriteoff/visitBundlePresets.js";

export type { QuickWriteoffVisitBundleType, ShiftBundleType };

export async function quickWriteoffShiftBundle(
	tx: DbExecutor,
	params: {
		organizationId: string;
		bundleType?: ShiftBundleType | undefined;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		notes?: string | null | undefined;
	},
) {
	const bundleType = params.bundleType || "therapy";
	const items = getShiftBundleDefinitions(bundleType);
	const bundleNameRu = SHIFT_BUNDLE_NAMES[bundleType] || "Терапия";

	return executeUnifiedStockDeduction(tx, {
		organizationId: params.organizationId,
		items,
		transactionType: "nurse_shift_bundle",
		userId: params.userId,
		visitId: params.visitId,
		notes: params.notes,
		reasonPrefix: `Стандартный расход смены «${bundleNameRu}» медсестрой (1 клик, без комиссии)`,
		successMessageTemplate: (count) =>
			`Стандартный расход смены «${bundleNameRu}» успешно списан (${count} позиций без комиссии).`,
	});
}

export async function quickWriteoffVisitBundle(
	tx: DbExecutor,
	params: {
		organizationId: string;
		visitType?: QuickWriteoffVisitBundleType | undefined;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		notes?: string | null | undefined;
	},
) {
	const visitType = params.visitType || "therapy";
	const items = getVisitBundleDefinitions(visitType);
	const visitNameRu = VISIT_BUNDLE_NAMES[visitType] || "Терапевтический прием";

	return executeUnifiedStockDeduction(tx, {
		organizationId: params.organizationId,
		items,
		transactionType: "nurse_visit_bundle",
		visitId: params.visitId,
		userId: params.userId,
		notes: params.notes,
		reasonPrefix: `1-клик списание набора «${visitNameRu}» (без комиссии)`,
		successMessageTemplate: (count) =>
			`Набор «${visitNameRu}» успешно списан (${count} позиций без комиссии).`,
	});
}

export async function quickWriteoffOrthopedicProtocol(
	tx: DbExecutor,
	params: {
		organizationId: string;
		protocolId: string;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		toothNumber?: string | number | null | undefined;
		notes?: string | null | undefined;
	},
) {
	const { protocolId, toothNumber, notes } = params;
	let visitType: QuickWriteoffVisitBundleType = "orthopedics_prep";

	if (protocolId.includes("impression") || protocolId.includes("scan")) {
		visitType = "orthopedics_impression";
	} else if (protocolId.includes("temp") || protocolId.includes("luxatemp") || protocolId.includes("protemp")) {
		visitType = "orthopedics_temporary";
	} else if (protocolId.includes("cement") || protocolId.includes("permanent") || protocolId.includes("fixation")) {
		visitType = "orthopedics_cementation";
	}

	const toothSuffix = toothNumber ? ` (зуб ${toothNumber})` : "";
	const combinedNotes = notes
		? `${notes}${toothSuffix}`
		: `1-клик списание материалов по ортопедическому протоколу [${protocolId}]${toothSuffix}`;

	return quickWriteoffVisitBundle(tx, {
		organizationId: params.organizationId,
		visitType,
		userId: params.userId,
		visitId: params.visitId,
		notes: combinedNotes,
	});
}
