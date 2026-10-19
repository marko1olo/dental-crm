export type CourierDeliveryWindow =
	| "morning"
	| "afternoon"
	| "evening"
	| "express_urgent";

export interface CourierDispatchConfig {
	readonly courierServiceName: string;
	readonly courierName?: string;
	readonly courierPhone?: string;
	readonly deliveryWindow: CourierDeliveryWindow;
	readonly trackingNumber?: string;
	readonly temperatureBoxRequired: boolean;
	readonly disinfectionSigned: boolean;
}

export const COURIER_SERVICES = [
	{
		id: "lab_in_house",
		name: "Штатная доставка ЗТЛ",
		phone: "+7 (495) 215-08-41",
	},
	{
		id: "clinic_express",
		name: "Доставка клиники",
		phone: "+7 (999) 000-11-22",
	},
	{ id: "yandex_med", name: "Яндекс Доставка", phone: "8 (800) 250-96-39" },
	{ id: "cdek_health", name: "СДЭК Экспресс", phone: "+7 (495) 009-04-05" },
] as const;

export const DELIVERY_WINDOWS: readonly {
	readonly id: CourierDeliveryWindow;
	readonly label: string;
	readonly time: string;
}[] = [
	{ id: "morning", label: "Утро", time: "09:00 – 13:00" },
	{ id: "afternoon", label: "День", time: "13:00 – 16:00" },
	{ id: "evening", label: "Вечер", time: "16:00 – 19:00" },
	{ id: "express_urgent", label: "Экспресс", time: "в течение 2 часов" },
] as const;
