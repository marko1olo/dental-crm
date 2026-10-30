import React from "react";

const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function DentalFormulaRowTable({
	// biome-ignore lint/suspicious/noExplicitAny: formulaMap
	formulaMap,
	headerBg = "#eeeeee",
	defaultState = "—",
}: {
	// biome-ignore lint/suspicious/noExplicitAny: formulaMap
	formulaMap?: Record<number, { state?: string }> | undefined;
	headerBg?: string;
	defaultState?: string;
}): React.JSX.Element {
	return (
		<table
			className="a4-table"
			style={{ fontSize: "7.5pt", textAlign: "center", margin: "2px 0 6px" }}
		>
			<tbody>
				<tr>
					<td colSpan={8} style={{ background: headerBg, fontWeight: "bold" }}>
						Верхняя челюсть справа
					</td>
					<td colSpan={8} style={{ background: headerBg, fontWeight: "bold" }}>
						Верхняя челюсть слева
					</td>
				</tr>
				<tr style={{ background: "#f7f7f7", fontWeight: "bold" }}>
					{upperTeeth.map((t) => (
						<td key={t} style={{ width: "22px" }}>
							{t}
						</td>
					))}
				</tr>
				<tr>
					{upperTeeth.map((t) => (
						<td key={t} style={{ width: "22px" }}>
							{formulaMap?.[t]?.state || defaultState}
						</td>
					))}
				</tr>
				<tr>
					<td colSpan={16} style={{ height: "2px", padding: 0, background: "#000000" }} />
				</tr>
				<tr>
					{lowerTeeth.map((t) => (
						<td key={t} style={{ width: "22px" }}>
							{formulaMap?.[t]?.state || defaultState}
						</td>
					))}
				</tr>
				<tr style={{ background: "#f7f7f7", fontWeight: "bold" }}>
					{lowerTeeth.map((t) => (
						<td key={t} style={{ width: "22px" }}>
							{t}
						</td>
					))}
				</tr>
				<tr>
					<td colSpan={8} style={{ background: headerBg, fontWeight: "bold" }}>
						Нижняя челюсть справа
					</td>
					<td colSpan={8} style={{ background: headerBg, fontWeight: "bold" }}>
						Нижняя челюсть слева
					</td>
				</tr>
			</tbody>
		</table>
	);
}
