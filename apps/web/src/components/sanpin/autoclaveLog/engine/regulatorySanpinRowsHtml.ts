import type { ClinicLegalInfo, Form257Record, RegulatoryPsoRecord } from "./types";

export function renderRegulatoryF257Rows(
	form257Records: readonly Form257Record[],
	clinicInfo: ClinicLegalInfo,
): string {
	return form257Records
		.map((rec, index) => {
			const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";
			const verdictClass = rec.isCyclePassed ? "pass-text" : "fail-text";
			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `
				<tr>
					<td style="text-align:center;">${index + 1}</td>
					<td style="text-align:center;">${rec.date}<br/><strong>Цикл #${rec.cycleNumber}</strong></td>
					<td><strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})</td>
					<td>${rec.itemsDescriptionRu}</td>
					<td style="text-align:center;">${rec.packsCount} упак.<br/><span style="font-size:7pt; color:#64748b;">${rec.packagingNameRu}</span></td>
					<td style="text-align:center;">${rec.actualTemperatureCelsius}°C • ${rec.actualPressureBar} бар<br/><strong>${rec.actualExposureMinutes} мин</strong></td>
					<td style="text-align:center; font-family: monospace;">1:${pt1} 2:${pt2} 3:${pt3} 4:${pt4} 5:${pt5}<br/><span style="font-size:6.5pt;">${rec.chemicalIndicatorNameRu}</span></td>
					<td style="text-align:center;" class="${verdictClass}"><strong>${verdictLabel}</strong></td>
					<td style="font-size:7.5pt; word-break:break-word;">${rec.operatorStaffFullName || clinicInfo.headNurse || "Медсестра ЦСО"}</td>
					<td style="font-size:7.5pt; text-align:center;">${rec.isHeadNurseVerified ? "Заверено" : "—"}</td>
				</tr>
			`;
		})
		.join("\n");
}

export function renderRegulatoryPsoRows(
	psoList: readonly RegulatoryPsoRecord[],
	clinicInfo: ClinicLegalInfo,
): string {
	return psoList
		.map((pso, idx) => `
			<tr>
				<td style="text-align:center;">${idx + 1}</td>
				<td style="text-align:center;">${pso.date}</td>
				<td>${pso.instrumentName}</td>
				<td style="text-align:center;">${pso.batchItemCount}</td>
				<td style="text-align:center;"><strong>${pso.testedSampleCount}</strong> (1%)</td>
				<td style="text-align:center; color:#166534;"><strong>${pso.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ."}</strong></td>
				<td style="text-align:center; color:#166534;"><strong>${pso.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ."}</strong></td>
				<td>${pso.detergentBrand || "Биолот 0.5%"}</td>
				<td style="text-align:center; color:#166534;"><strong>${pso.isBatchApproved ? "ДОПУЩЕНО" : "БРАК"}</strong></td>
				<td style="font-size:7.5pt; word-break:break-word;">${pso.operatorFullName || clinicInfo.headNurse || "Медсестра ЦСО"}</td>
			</tr>
		`)
		.join("\n");
}
