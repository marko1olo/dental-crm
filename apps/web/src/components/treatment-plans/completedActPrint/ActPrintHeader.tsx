/**
 * ActPrintHeader.tsx — Шапка официального бланка Акта выполненных работ:
 * логотип клиники, реквизиты лицензии, ИНН/КПП/ОГРН, номер договора и дата,
 * паспортные данные пациента, СНИЛС, полис ОМС и реквизиты лечащего врача
 * согласно стандартам Минздрава РФ и ГОСТ Р 7.0.97-2016.
 */

import React from "react";
import { TreatmentPlanActHeader } from "../TreatmentPlanActHeader";
import type { ActPrintHeaderProps } from "./types";

export const ActPrintHeader: React.FC<ActPrintHeaderProps> = (props) => {
	return <TreatmentPlanActHeader {...props} />;
};
