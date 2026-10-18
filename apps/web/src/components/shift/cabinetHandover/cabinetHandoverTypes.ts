export interface CabinetHandoverCheckItem {
	readonly id: string;
	readonly title: string;
	readonly detailRu: string;
	readonly checked: boolean;
}

export interface DoctorCabinetHandoverCardProps {
	readonly cabinetName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly nextDoctorName?: string | undefined;
	readonly onConfirmHandover?: ((notes: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const DEFAULT_HANDOVER_ITEMS: readonly CabinetHandoverCheckItem[] = [
	{
		id: "chair_disinfection",
		title: "Дезинфекция установки и кресла",
		detailRu: "Обработка поверхностей, подлокотников и плевательницы дезраствором",
		checked: true,
	},
	{
		id: "aspiration_flushing",
		title: "Промывка аспирационной системы",
		detailRu: "Аспирация дезинфицирующего средства через шланги слюноотсоса и пылесоса",
		checked: true,
	},
	{
		id: "sterilization_cso",
		title: "Стерилизация и ЦСО инструментария",
		detailRu: "Наконечники смазаны и упакованы, лотки переданы в автоклав / ЦСО",
		checked: true,
	},
	{
		id: "waste_disposal_b",
		title: "Утилизация отходов Класса Б",
		detailRu: "Жёлтый пакет опломбирован, контейнер для игл и карпул заполнен и закрыт",
		checked: true,
	},
	{
		id: "water_refill",
		title: "Заправка дистиллированной воды",
		detailRu: "Баллон автономной подачи воды заполнен дистиллятом, запас перчаток пополнен",
		checked: true,
	},
];
