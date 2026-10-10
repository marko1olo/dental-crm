/**
 * ActPrintSignaturesAndLegal.tsx — Юридический блок сдачи-приемки Акта:
 * гарантийные обязательства по Закону о защите прав потребителей № 2300-1,
 * предупреждение о соблюдении гигиены и контрольных осмотров, подписи врача и пациента,
 * оттиск печати клиники (М.П.) и криптографический QR-код верификации по ГОСТ Р 7.0.97-2016.
 */

import React from "react";
import { TreatmentPlanActSignatures } from "../TreatmentPlanActSignatures";
import type { ActPrintSignaturesAndLegalProps } from "./types";

export const ActPrintSignaturesAndLegal: React.FC<ActPrintSignaturesAndLegalProps> = (
	props,
) => {
	return <TreatmentPlanActSignatures {...props} />;
};
