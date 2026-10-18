import React, { useState } from "react";
import { showToast } from "../GlobalToast";
import {
	type CabinetHandoverCheckItem,
	type DoctorCabinetHandoverCardProps,
	DEFAULT_HANDOVER_ITEMS,
} from "./cabinetHandover/cabinetHandoverTypes";
import { DoctorCabinetHandoverHeader } from "./cabinetHandover/DoctorCabinetHandoverHeader";
import { DoctorCabinetHandoverGrid } from "./cabinetHandover/DoctorCabinetHandoverGrid";
import { DoctorCabinetHandoverFooter } from "./cabinetHandover/DoctorCabinetHandoverFooter";

export type { CabinetHandoverCheckItem, DoctorCabinetHandoverCardProps };

export const DoctorCabinetHandoverCard: React.FC<DoctorCabinetHandoverCardProps> = ({
	cabinetName = "Кабинет №1",
	doctorFullName = "Лечащий врач",
	nextDoctorName = "Сменяющий врач",
	onConfirmHandover,
	className = "",
}) => {
	const [items, setItems] = useState<readonly CabinetHandoverCheckItem[]>(DEFAULT_HANDOVER_ITEMS);
	const [handoverNote, setHandoverNote] = useState<string>("");
	const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

	const allChecked = items.every((i) => i.checked);
	const checkedCount = items.filter((i) => i.checked).length;

	const handleToggleItem = (id: string) => {
		setItems((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, checked: !item.checked } : item,
			),
		);
	};

	const handleCheckAllNorma = () => {
		setItems((prev) => prev.map((item) => ({ ...item, checked: true })));
		showToast("Все пункты чек-листа передачи кабинета отмечены нормой", "info");
	};

	const handleSubmitHandover = () => {
		setIsSubmitted(true);
		onConfirmHandover?.(handoverNote);
		showToast(`Кабинет «${cabinetName}» успешно передан смене. Журнал СанПиН обновлён.`, "info");
	};

	return (
		<section
			className={`doctor-cabinet-handover-card ${className}`.trim()}
			aria-label="Чек-лист передачи кабинета и готовности стерилизации"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "14px",
				padding: "16px 18px",
				boxShadow: "var(--shadow-1)",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
			data-testid="doctor-cabinet-handover-card"
		>
			<DoctorCabinetHandoverHeader
				cabinetName={cabinetName}
				doctorFullName={doctorFullName}
				nextDoctorName={nextDoctorName}
				checkedCount={checkedCount}
				totalCount={items.length}
				allChecked={allChecked}
				onCheckAllNorma={handleCheckAllNorma}
			/>

			<DoctorCabinetHandoverGrid
				items={items}
				onToggleItem={handleToggleItem}
			/>

			<DoctorCabinetHandoverFooter
				handoverNote={handoverNote}
				isSubmitted={isSubmitted}
				onChangeNote={setHandoverNote}
				onSubmitHandover={handleSubmitHandover}
			/>
		</section>
	);
};
