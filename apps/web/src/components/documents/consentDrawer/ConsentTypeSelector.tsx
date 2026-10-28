import React from "react";
import type { ConsentKindItem, ConsentKindOption } from "./types";

export const CONSENT_OPTIONS: ConsentKindItem[] = [
	{
		id: "therapeutic",
		title: "Информированное согласие на терапевтическое лечение",
		shortTitle: "Терапия",
		description: "Лечение кариеса, пульпита, периодонтита, эстетическая реставрация",
	},
	{
		id: "surgical_implantation",
		title: "Согласие на хирургическое вмешательство и имплантацию",
		shortTitle: "Хирургия и имплантация",
		description: "Удаление зубов, синус-лифтинг, установка дентальных имплантатов",
	},
	{
		id: "anesthesia",
		title: "Анестезиологическая карта и согласие на обезболивание",
		shortTitle: "Анестезия",
		description: "Инфильтрационная и проводниковая анестезия (артикаин, мепивакаин)",
	},
	{
		id: "orthodontic",
		title: "Согласие на ортодонтическое лечение",
		shortTitle: "Ортодонтия",
		description: "Лечение брекет-системами, элайнерами, пластиночными аппаратами",
	},
	{
		id: "orthopedic",
		title: "Согласие на ортопедическое лечение (протезирование)",
		shortTitle: "Протезирование",
		description: "Коронки, мостовидные протезы, вкладки, виниры, съемное протезирование",
	},
	{
		id: "personal_data",
		title: "Согласие на обработку персональных данных",
		shortTitle: "Персональные данные",
		description: "Хранение и обработка сведений о здоровье и лечении в клинике",
	},
	{
		id: "paid_contract",
		title: "Договор оказания стоматологических услуг",
		shortTitle: "Договор",
		description: "Обязательства клиники, гарантийные сроки, правила оплаты",
	},
];

export interface ConsentTypeSelectorProps {
	selectedKind: ConsentKindOption;
	onSelectKind: (kind: ConsentKindOption) => void;
}

export const ConsentTypeSelector: React.FC<ConsentTypeSelectorProps> = ({
	selectedKind,
	onSelectKind,
}) => {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-xs font-semibold text-[var(--muted)]">Тип клинического документа / согласия:</label>
			<div className="flex gap-1.5 flex-wrap">
				{CONSENT_OPTIONS.map((item) => {
					const isSelected = item.id === selectedKind;
					return (
						<button
							key={item.id}
							type="button"
							className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
								isSelected
									? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-2xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
							}`}
							onClick={() => onSelectKind(item.id)}
						>
							{item.shortTitle}
						</button>
					);
				})}
			</div>
		</div>
	);
};
