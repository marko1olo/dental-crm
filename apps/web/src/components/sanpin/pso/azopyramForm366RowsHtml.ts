import type { PsoPrintRecordItem } from "./azopyramTypes";

export function renderPsoForm366RowsHtml(records: readonly PsoPrintRecordItem[]): string {
	return records
		.map((r, i) => {
			const dt = new Date(r.timestamp);
			const dateStr = dt.toLocaleDateString("ru-RU");
			const timeStr = dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
			const azoLabel = r.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ. (Кровь)";
			const phenolLabel = r.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ. (Щелочь)";
			const verdictLabel = r.isBatchApproved ? "Допущено" : "БРАК (Повторная очистка)";
			const verdictColor = r.isBatchApproved ? "#000000" : "#b91c1c";

			return `<tr>
				<td style="border: 1px solid #000; text-align: center; padding: 4px;">${i + 1}</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; white-space: nowrap;">
					${dateStr}<br/><span style="font-size: 7.5pt; color: #333;">${timeStr}</span>
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: 600;">${r.instrumentName}</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px;">${r.batchItemCount}</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: 600;">${r.testedSampleCount}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 7.5pt;">${r.reagentLot}<br/><span style="color: #444;">${r.solutionTimeRu}</span></td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: ${r.isAzopyramNegative ? "normal" : "bold"}; color: ${r.isAzopyramNegative ? "#000" : "#b91c1c"};">${azoLabel}</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: ${r.isPhenolphthaleinNegative ? "normal" : "bold"}; color: ${r.isPhenolphthaleinNegative ? "#000" : "#b91c1c"};">${phenolLabel}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.detergentBrand || "—"}</td>
				<td style="border: 1px solid #000; text-align: center; padding: 4px; font-weight: bold; color: ${verdictColor};">
					${verdictLabel}
					${r.rejectionReason ? `<br/><span style="font-size: 7pt; font-weight: normal; color: #b91c1c;">${r.rejectionReason}</span>` : ""}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 7.5pt;">
					${r.operatorStaffFullName}<br/><span style="font-size: 7pt; color: #444;">${r.operatorStaffPosition}</span>
					${r.electronicStampVerified ? `<br/><strong style="font-size: 6.5pt; color: #000;">[ЭЦП ВАЛИДНА]</strong>` : ""}
				</td>
			</tr>`;
		})
		.join("\n");
}
