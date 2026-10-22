import type { ClinicLegalInfo, Form257Record } from "./types";

export function renderForm257RowsHtml(
	records: readonly Form257Record[],
	clinicInfo: ClinicLegalInfo,
): string {
	return records
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
					<td style="text-align:center; font-weight:600;">${index + 1}</td>
					<td style="text-align:center; white-space:nowrap;">
						${rec.date}<br/>
						<span style="font-size:8pt; color:#475569;">Цикл №${rec.cycleNumber}</span>
					</td>
					<td>
						<strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})<br/>
						<span style="font-size:7.5pt; color:#64748b;">Зав. № ${rec.sterilizerSerialNumber}</span>
					</td>
					<td>${rec.itemsDescriptionRu}</td>
					<td style="text-align:center;">
						${rec.packsCount}<br/>
						<span style="font-size:7.5pt; color:#64748b;">${rec.packagingNameRu}</span>
						${rec.bixNumber ? `<br/><span style="font-size:7.5pt; font-weight:600; color:#0f172a;">${rec.bixNumber}</span>` : ""}
					</td>
					<td style="text-align:center; white-space:nowrap;">
						${rec.actualTemperatureCelsius}°C / ${rec.actualPressureBar} бар<br/>
						<strong>${rec.actualExposureMinutes} мин</strong>
					</td>
					<td style="font-size:7.5pt;">
						${rec.chemicalIndicatorNameRu}<br/>
						<span style="font-family:monospace; font-weight:bold;">КТ: [${pt1}][${pt2}][${pt3}][${pt4}][${pt5}]</span>
					</td>
					<td style="text-align:center; font-weight:bold;" class="${verdictClass}">
						${verdictLabel}
						${rec.rejectionReason ? `<br/><span style="font-size:7pt; font-weight:normal; color:#dc2626;">${rec.rejectionReason}</span>` : ""}
					</td>
					<td style="font-size:8pt; word-break:break-word;">
						${rec.operatorStaffFullName || clinicInfo.headNurse || "Медсестра ЦСО"}<br/>
						<span style="font-size:7pt; color:#64748b;">${rec.operatorStaffPosition || "Медсестра ЦСО"}</span>
					</td>
					<td style="font-size:7.5pt; text-align:center;">
						${rec.isHeadNurseVerified ? `Подписано:<br/>${rec.headNurseSignatureFullName ?? clinicInfo.headNurse ?? "Главная медсестра"}` : "—"}
					</td>
				</tr>
			`;
		})
		.join("\n");
}
