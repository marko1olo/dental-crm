import React from "react";

export function AutoclaveRegisterTableHeader() {
	return (
		<thead>
			<tr>
				<th style={{ fontSize: "0.74rem", width: "10%", whiteSpace: "nowrap" }}>
					Дата / № Цикла
				</th>
				<th style={{ fontSize: "0.74rem", width: "13%" }}>
					Марка аппарата
				</th>
				<th style={{ fontSize: "0.74rem", width: "19%" }}>
					Стерилизуемые изделия
				</th>
				<th style={{ fontSize: "0.74rem", width: "11%" }}>
					Вид упаковки
				</th>
				<th style={{ fontSize: "0.74rem", width: "10%", whiteSpace: "nowrap" }}>
					Режим (T°, P, t)
				</th>
				<th style={{ fontSize: "0.74rem", width: "7%", whiteSpace: "nowrap" }}>
					Индикатор
				</th>
				<th style={{ fontSize: "0.74rem", width: "7%", whiteSpace: "nowrap" }}>
					Годен до
				</th>
				<th style={{ fontSize: "0.74rem", width: "10%", minWidth: "110px", whiteSpace: "nowrap" }}>
					Штрихкод
				</th>
				<th
					style={{ fontSize: "0.74rem", width: "13%", minWidth: "120px", whiteSpace: "nowrap", paddingRight: "0.5rem" }}
					title="Заверка / Оператор"
				>
					Оператор / ЭЦП
				</th>
			</tr>
		</thead>
	);
}
