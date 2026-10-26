import { useMemo, useState } from "react";
import {
	generateOneCEnterpriseXml,
	type OneCDocumentType,
	type OneCExportParams,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../../../treatment-plans/types";
import { buildOneCExportParams } from "./oneCExportParamsBuilder";

export interface UseOneCEnterpriseExportStateParams {
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly totalSumRub: number;
	readonly clinicName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly customerContact?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly actNumber: string;
	readonly contractNumber: string;
}

export function useOneCEnterpriseExportState({
	activeItems,
	totalSumRub,
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	patientId = "00000000-0000-0000-0000-000000000001",
	patientName = "Пациент",
	customerContact,
	patientPhone,
	cashierFullName,
	actNumber,
	contractNumber,
}: UseOneCEnterpriseExportStateParams) {
	const [oneCDocType, setOneCDocType] = useState<OneCDocumentType>("act");
	const [oneCDocDate, setOneCDocDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [oneCDocTime] = useState<string>("12:00:00");
	const [oneCClinicInn, setOneCClinicInn] = useState<string>("");
	const [oneCClinicKpp, setOneCClinicKpp] = useState<string>("");
	const [oneCPatientInn, setOneCPatientInn] = useState<string>("");
	const [oneCPatientAddress, setOneCPatientAddress] = useState<string>("");

	const oneCExportParams: OneCExportParams = useMemo(() => {
		return buildOneCExportParams({
			clinicName,
			oneCClinicInn,
			oneCClinicKpp,
			actNumber,
			oneCDocDate,
			oneCDocTime,
			oneCDocType,
			patientId,
			patientName,
			oneCPatientInn,
			customerContact,
			patientPhone,
			oneCPatientAddress,
			activeItems,
			totalSumRub,
			contractNumber,
			cashierFullName,
		});
	}, [
		clinicName,
		oneCClinicInn,
		oneCClinicKpp,
		actNumber,
		oneCDocDate,
		oneCDocTime,
		oneCDocType,
		patientId,
		patientName,
		oneCPatientInn,
		customerContact,
		patientPhone,
		oneCPatientAddress,
		activeItems,
		totalSumRub,
		contractNumber,
		cashierFullName,
	]);

	const oneCXmlPreview = useMemo(() => {
		try {
			return generateOneCEnterpriseXml(oneCExportParams);
		} catch (err) {
			return `<!-- Ошибка формирования XML: ${err instanceof Error ? err.message : String(err)} -->`;
		}
	}, [oneCExportParams]);

	return {
		oneCDocType,
		setOneCDocType,
		oneCDocDate,
		setOneCDocDate,
		oneCDocTime,
		oneCClinicInn,
		setOneCClinicInn,
		oneCClinicKpp,
		setOneCClinicKpp,
		oneCPatientInn,
		setOneCPatientInn,
		oneCPatientAddress,
		setOneCPatientAddress,
		oneCExportParams,
		oneCXmlPreview,
	};
}
