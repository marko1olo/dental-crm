import type React from "react";
import type { FastClinicalPrintEngineProps } from "../FastClinicalPrintEngine";

export function RenderForm043uVisitTable({
	todayStr,
	visitData,
}: {
	todayStr: string;
	visitData?: FastClinicalPrintEngineProps["visitData"];
}): React.JSX.Element {
	return (
		<table className="fast-print-table">
			<tbody>
				<tr>
					<td style={{ width: "25%", fontWeight: 700 }}>Дата и время:</td>
					<td>{visitData?.date || todayStr}</td>
					<td style={{ width: "20%", fontWeight: 700 }}>Зуб / Сегмент:</td>
					<td>
						{visitData?.toothNumber
							? `Зуб №${visitData.toothNumber}`
							: "Санация полости рта"}
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: 700 }}>Жалобы:</td>
					<td colSpan={3}>
						{visitData?.complaints ||
							"На кратковременные боли от температурных раздражителей (холодное), попадание пищи."}
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: 700 }}>Объективные данные:</td>
					<td colSpan={3}>
						{visitData?.objective ||
							"Слизистая оболочка бледно-розовая, умеренно увлажнена. Глубокая кариозная полость, зондирование болезненно по дну."}
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: 700 }}>Диагноз (МКБ-10):</td>
					<td colSpan={3}>
						<strong>
							{visitData?.diagnosis ||
								"K02.1 Кариес дентина (хронический глубокий кариес)"}
						</strong>
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: 700 }}>Проведённое лечение:</td>
					<td colSpan={3}>
						{visitData?.treatment ||
							"Препарирование кариозной полости под водяным охлаждением. Изоляция раббердамом. Медобработка 2% хлоргексидином. Лечебная прокладка Life, изолирующая прокладка СИЦ. Послойная реставрация нанокомпозитом Filtek Ultimate. Шлифовка, полировка."}
					</td>
				</tr>
				<tr>
					<td style={{ fontWeight: 700 }}>Рекомендации:</td>
					<td colSpan={3}>
						{visitData?.recommendations ||
							"Воздержаться от красящей пищи 2 часа. Гигиена полости рта 2 раза в день. Контрольный осмотр через 6 месяцев."}
					</td>
				</tr>
			</tbody>
		</table>
	);
}
