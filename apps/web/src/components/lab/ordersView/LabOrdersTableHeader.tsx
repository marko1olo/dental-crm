import React from "react";

export function LabOrdersTableHeader(): React.JSX.Element {
	return (
		<thead>
			<tr className="h-8 min-h-[32px] max-h-[32px] bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] select-none">
				<th className="px-2.5 py-0 whitespace-nowrap">№ Наряда</th>
				<th className="px-2.5 py-0 whitespace-nowrap">Пациент</th>
				<th className="px-2 py-0 whitespace-nowrap text-center">Зуб</th>
				<th className="px-2.5 py-0 whitespace-nowrap">Конструкция / Материал</th>
				<th className="px-2.5 py-0 whitespace-nowrap">VITA</th>
				<th className="px-2.5 py-0 whitespace-nowrap">Статус ЗТЛ</th>
				<th className="px-2.5 py-0 whitespace-nowrap">Срок</th>
				<th className="px-2.5 py-0 whitespace-nowrap font-mono text-right min-w-[100px]">Стоимость</th>
				<th className="px-3 py-0 whitespace-nowrap text-left min-w-[190px]">Действия</th>
			</tr>
		</thead>
	);
}
