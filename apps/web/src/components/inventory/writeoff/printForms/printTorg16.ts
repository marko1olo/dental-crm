import {
	generateCanonicalTorg16Html,
	type Torg16ItemLine,
} from "@dental/shared";
import {
	DEFAULT_CLINIC_LEGAL_INFO,
	type ClinicLegalInfo,
	getDiscrepancyReason,
} from "../clinicalWriteoffPresets.js";
import type { ClinicalWriteoffDocument } from "../clinicalWriteoffEngine.js";
import { kopecksToRubles } from "../clinicalWriteoffEngine.js";

export function generateTorg16Html(
	doc: ClinicalWriteoffDocument,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const info = doc.clinicInfo || clinicInfo;
	const totals = doc.totals;

	const items: Torg16ItemLine[] = doc.lines.map((line, index) => {
		const unitRub = kopecksToRubles(line.unitCostKopecks);
		const totalRub = kopecksToRubles(line.totalCostKopecks);
		const reasonDef = getDiscrepancyReason(line.discrepancyReasonCode);

		return {
			itemIndex: index + 1,
			sku: line.sku,
			nameRu: line.nameRu,
			unitRu: line.unit,
			okeiCode: line.okeiCode,
			batchNumber: line.lotNumber || "—",
			expiryDate: line.expirationDate || "—",
			quantity: line.actualQuantity,
			unitCostKopecks: line.unitCostKopecks,
			totalCostKopecks: line.totalCostKopecks,
			totalCostRubles: totalRub,
			defectDescriptionRu: line.discrepancyNotes || reasonDef.labelRu,
		};
	});

	return generateCanonicalTorg16Html({
		actNumber: doc.actNumber,
		actDate: doc.actDate,
		organizationNameRu: info.clinicNameRu,
		organizationOkpo: info.okpoCode,
		organizationInn: info.inn,
		organizationKpp: info.kpp,
		warehouseNameRu: doc.cabinetNameRu,
		molFullName: doc.doctorFullName || info.chiefDoctorFullName,
		molPosition: doc.doctorSpecialty || info.chiefDoctorPosition,
		reasonRu: "Списание расходных материалов и медикаментов клинического приема",
		items,
		isSingleSigner: true,
		singleSignerRole: doc.writtenOffByRole || doc.doctorSpecialty || "Врач-стоматолог",
		singleSignerFullName: doc.assistantFullName || doc.doctorFullName || info.headNurseFullName,
		totalQuantity: totals.totalMaterialsQuantity,
		totalCostKopecks: totals.totalCostKopecks,
		totalCostRubles: totals.totalCostRubles,
		totalCostWordsRu: totals.totalCostFormatted,
	});
}
