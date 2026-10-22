import React from "react";
import { ImplantWarehouseSelector, type ImplantWarehouseSelectorProps } from "./ImplantWarehouseSelector";

export type ImplantBatchSelectorProps = ImplantWarehouseSelectorProps;

/**
 * ImplantBatchSelector — Селектор складских партий и остатков имплантатов клиники (DENTE CRM).
 * Позволяет в 1 клик привязать реальный LOT, артикул и срок годности без ручного ввода.
 * При отсутствии остатка фиксирует Soft Overdraft без блокировки операции врача.
 */
export const ImplantBatchSelector: React.FC<ImplantBatchSelectorProps> = (props) => {
	return <ImplantWarehouseSelector {...props} />;
};

export default ImplantBatchSelector;
