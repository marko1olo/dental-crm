import { type FdiToothRecord, toothStatusCodeShortMap } from "@dental/shared";
import { escapeHtml } from "../../emr043Math";

/** Рендерер таблицы зубной формулы FDI (все 32 постоянных зуба + расшифровка) */
export function renderFdiFormulaTableHtml(odontogramTeeth: FdiToothRecord[]): string {
	const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
	const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

	const teethMap = new Map<number, FdiToothRecord>();
	for (const t of odontogramTeeth) {
		teethMap.set(t.toothNumber, t);
	}

	const renderCell = (num: number, isRightBoundary: boolean) => {
		const rec = teethMap.get(num);
		const code = rec?.statusCode || "healthy";
		const shortCode = toothStatusCodeShortMap[code] || "Norm";
		const isPathology = code !== "healthy" && code !== "filled_satisfactory";
		const isExtracted = code === "extracted_absent";
		const isFilled = code === "filled_satisfactory";
		const isProsthetic = code.startsWith("crown") || code === "implant" || code.startsWith("bridge");

		let color = "#0f172a";
		let bg = "#ffffff";
		if (isExtracted) {
			color = "#94a3b8";
			bg = "#f8fafc";
		} else if (isPathology) {
			color = "#b91c1c";
			bg = "#fef2f2";
		} else if (isFilled) {
			color = "#047857";
			bg = "#f0fdf4";
		} else if (isProsthetic) {
			color = "#1d4ed8";
			bg = "#eff6ff";
		}

		const borderRight = isRightBoundary ? "border-right: 2px solid #0f172a;" : "border-right: 0.5pt solid #cbd5e1;";

		return `
      <td data-preserve-white="true" style="text-align:center; padding:3px 2px; font-size:7.5pt; background:${bg} !important; ${borderRight}">
        <div data-preserve-white="true" style="font-weight:bold; color:#0f172a !important; font-size:8pt;">${num}</div>
        <div data-preserve-white="true" style="font-weight:800; color:${color} !important; font-size:7.5pt; margin-top:1px;">${escapeHtml(shortCode)}</div>
      </td>
    `;
	};

	const upperCells = upperTeeth.map((t, idx) => renderCell(t, idx === 7)).join("");
	const lowerCells = lowerTeeth.map((t, idx) => renderCell(t, idx === 7)).join("");

	return `
    <table class="data-table-dense" style="width:100%; border:1pt solid #0f172a; margin:4px 0 6px 0;">
      <thead>
        <tr>
          <th colspan="8" style="background:#e2e8f0; font-weight:bold; border-right:2px solid #0f172a; text-align:center;">
            Верхняя челюсть справа (18–11)
          </th>
          <th colspan="8" style="background:#e2e8f0; font-weight:bold; text-align:center;">
            Верхняя челюсть слева (21–28)
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>${upperCells}</tr>
        <tr style="border-top:2px solid #0f172a;">${lowerCells}</tr>
      </tbody>
      <tfoot>
        <tr>
          <th colspan="8" style="background:#e2e8f0; font-weight:bold; border-right:2px solid #0f172a; text-align:center;">
            Нижняя челюсть справа (48–41)
          </th>
          <th colspan="8" style="background:#e2e8f0; font-weight:bold; text-align:center;">
            Нижняя челюсть слева (31–38)
          </th>
        </tr>
      </tfoot>
    </table>
    <div style="font-size:7pt; color:#475569; margin-bottom:6px; line-height:1.2;">
      <strong>Условные обозначения формулы:</strong> <strong>Norm</strong> — интактный, <strong>C0–C3</strong> — кариес, <strong>P/Pch</strong> — пульпит, <strong>Pt/Ptch</strong> — периодонтит, <strong>Pl</strong> — пломба, <strong>K(мк/zr/em)</strong> — коронка, <strong>Импл</strong> — имплантат, <strong>Отс(A)</strong> — отсутствует, <strong>R(кор)</strong> — корень.
    </div>
  `;
}
