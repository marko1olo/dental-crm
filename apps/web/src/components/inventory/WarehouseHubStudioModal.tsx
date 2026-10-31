/**
 * WarehouseHubStudioModal.tsx — Фасад обратной совместимости на канонический SSOT WarehouseStudioModal.
 * Мандаты 8e, 8n, 8am.
 */

import { WarehouseStudioModal, type WarehouseStudioModalProps } from "./WarehouseStudioModal.js";

export type WarehouseHubStudioModalProps = WarehouseStudioModalProps;
export const WarehouseHubStudioModal = WarehouseStudioModal;
export default WarehouseStudioModal;
