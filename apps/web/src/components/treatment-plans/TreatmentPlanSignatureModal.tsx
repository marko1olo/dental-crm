/**
 * TreatmentPlanSignatureModal.tsx — фасад модального окна электронного и бумажного подписания плана лечения.
 * Декомпозирован по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import type { TreatmentPlanSignatureModalProps } from "./signatureModal/types";
import { TreatmentPlanSignatureModalView } from "./signatureModal/TreatmentPlanSignatureModalView";

export * from "./signatureModal/types";
export * from "./signatureModal";

export const TreatmentPlanSignatureModal: React.FC<TreatmentPlanSignatureModalProps> = (props) => {
	return <TreatmentPlanSignatureModalView {...props} />;
};

export default TreatmentPlanSignatureModal;
