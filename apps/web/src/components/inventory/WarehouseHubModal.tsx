/**
 * WarehouseHubModal.tsx — Фасад обратной совместимости на канонический SSOT WarehouseStudioModal.
 * Мандаты 8e, 8n, 8am.
 */

import { WarehouseStudioModal, type WarehouseStudioModalProps } from "./WarehouseStudioModal.js";

export type WarehouseHubModalProps = WarehouseStudioModalProps;
export const WarehouseHubModal = WarehouseStudioModal;
export default WarehouseStudioModal;
