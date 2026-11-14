import React from "react";

export interface LabOrdersTableHeaderProps {
	readonly isAllSelected?: boolean;
	readonly isSomeSelected?: boolean;
	readonly onToggleSelectAll?: () => void;
}

export function LabOrdersTableHeader({
	isAllSelected = false,
	isSomeSelected = false,
	onToggleSelectAll,
}: LabOrdersTableHeaderProps = {}): React.JSX.Element {
	const checkboxRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		if (checkboxRef.current) {
			checkboxRef.current.indeterminate = isSomeSelected && !isAllSelected;
		}
	}, [isSomeSelected, isAllSelected]);

	return (
		<thead>
			<tr className="h-8 min-h-[32px] max-h-[32px] bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] select-none">
				<th className="px-2 py-0 whitespace-nowrap w-[36px] text-center" onClick={(e) => e.stopPropagation()}>
					{onToggleSelectAll ? (
						<input
							ref={checkboxRef}
							type="checkbox"
							checked={isAllSelected}
							onChange={onToggleSelectAll}
							aria-label="Выбрать все наряды"
							className="rounded border-[var(--line)] text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)] cursor-pointer w-3.5 h-3.5"
						/>
					) : null}
				</th>
				<th className="px-2.5 py-0 whitespace-nowrap w-[80px]">№ Наряда</th>
				<th className="px-2.5 py-0 whitespace-nowrap w-[150px]">Пациент</th>
				<th className="px-2 py-0 whitespace-nowrap text-center w-[80px]">Зуб</th>
				<th className="px-2.5 py-0 whitespace-nowrap w-[195px]">Конструкция / Материал</th>
				<th className="px-2.5 py-0 whitespace-nowrap w-[50px]">VITA</th>
				<th className="px-2.5 py-0 whitespace-nowrap w-[130px]">Статус ЗТЛ</th>
				<th className="px-2.5 py-0 whitespace-nowrap w-[125px]">Срок</th>
				<th className="px-2.5 py-0 whitespace-nowrap font-mono text-right w-[85px]">Стоимость</th>
				<th className="px-3 py-0 whitespace-nowrap text-left w-[210px]">Действия</th>
			</tr>
		</thead>
	);
}
