export type WarehouseTransferStatus =
	| "draft"
	| "requested"
	| "dispatched"
	| "in_transit"
	| "received_ok"
	| "discrepancy"
	| "cancelled";

export interface TransferStatusDefinition {
	readonly status: WarehouseTransferStatus;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly hexBadgeBg: string;
	readonly hexBadgeFg: string;
	readonly stepIndex: number;
}

export const TRANSFER_STATUS_PIPELINE: Record<WarehouseTransferStatus, TransferStatusDefinition> = {
	draft: {
		status: "draft",
		labelRu: "Черновик",
		descriptionRu: "Заявка на перемещение создана и ожидает утверждения складом",
		hexBadgeBg: "#f1f5f9",
		hexBadgeFg: "#475569",
		stepIndex: 1,
	},
	requested: {
		status: "requested",
		labelRu: "Запрошено",
		descriptionRu: "Заявка отправлена на склад-отправитель для комплектации",
		hexBadgeBg: "#fef3c7",
		hexBadgeFg: "#92400e",
		stepIndex: 2,
	},
	dispatched: {
		status: "dispatched",
		labelRu: "Скомплектовано",
		descriptionRu: "Товар скомплектован на складе, выписана накладная ТОРГ-13",
		hexBadgeBg: "#e0f2fe",
		hexBadgeFg: "#0369a1",
		stepIndex: 3,
	},
	in_transit: {
		status: "in_transit",
		labelRu: "В пути / Курьер",
		descriptionRu: "ТМЦ переданы водителю-курьеру для доставки в филиал",
		hexBadgeBg: "#ede9fe",
		hexBadgeFg: "#6d28d9",
		stepIndex: 4,
	},
	received_ok: {
		status: "received_ok",
		labelRu: "Принято без расхождений",
		descriptionRu: "ТМЦ успешно оприходованы филиалом-получателем в полном объеме",
		hexBadgeBg: "#ecfdf5",
		hexBadgeFg: "#047857",
		stepIndex: 5,
	},
	discrepancy: {
		status: "discrepancy",
		labelRu: "Принято с расхождениями",
		descriptionRu: "Выявлена недостача, бой или пересортица (составлен акт ТОРГ-2)",
		hexBadgeBg: "#fef2f2",
		hexBadgeFg: "#b91c1c",
		stepIndex: 5,
	},
	cancelled: {
		status: "cancelled",
		labelRu: "Отменено",
		descriptionRu: "Перемещение отменено инициатором или складом",
		hexBadgeBg: "#f1f5f9",
		hexBadgeFg: "#94a3b8",
		stepIndex: 0,
	},
};
