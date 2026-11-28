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
			<tr className="h-8 min-h-[32px] max-h-[32px] bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-semibold text-[var(--muted)] select-none">
				<th className="px-1 py-0 whitespace-nowrap w-[30px] text-center" onClick={(e) => e.stopPropagation()}>
					{onToggleSelectAll ? (
						<input
							ref={checkboxRef}
							type="checkbox"
							checked={isAllSelected}
							onChange={onToggleSelectAll}
							aria-label="Выбрать все наряды"
							className="rounded border-[var(--line)] accent-[var(--primary)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer w-3.5 h-3.5"
						/>
					) : null}
				</th>
				<th className="px-1.5 py-0 whitespace-nowrap w-[74px]">№ Наряда</th>
				<th className="px-1.5 py-0 whitespace-nowrap w-[126px]">Пациент</th>
				<th className="px-1 py-0 whitespace-nowrap text-center w-[88px]">Зуб</th>
				<th className="px-1.5 py-0 whitespace-nowrap">Конструкция / Материал</th>
				<th className="px-1 py-0 whitespace-nowrap w-[44px]">VITA</th>
				<th className="px-1 py-0 whitespace-nowrap w-[128px]">Статус ЗТЛ</th>
				<th className="px-1 py-0 whitespace-nowrap w-[134px]">Срок</th>
				<th className="px-1.5 py-0 whitespace-nowrap font-mono text-right w-[74px]">Стоимость</th>
				<th className="px-1.5 py-0 whitespace-nowrap text-left w-[268px]">Действия</th>
			</tr>
		</thead>
	);
}
