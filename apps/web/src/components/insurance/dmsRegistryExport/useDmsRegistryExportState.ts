/**
 * useDmsRegistryExportState.ts — Логика состояния модального окна экспорта реестра ДМС
 */

import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { calculateRegistryTotals, type DmsRegistryServiceRecord, type DmsRegistrySummary } from "../insuranceMath.js";
import type { ClinicLegalInfo, DmsRegistryExportModalProps } from "./types.js";

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

export function useDmsRegistryExportState(props: DmsRegistryExportModalProps) {
	const { isOpen, patientId, records, clinicInfo } = props;
	const [selectedInsurer, setSelectedInsurer] = useState<string>("all");
	const [periodFilter, setPeriodFilter] = useState<string>("current_month");
	const [searchFilter, setSearchFilter] = useState<string>("");
	const [scopePatientOnly, setScopePatientOnly] = useState<boolean>(Boolean(patientId));
	const [fetchedRecords, setFetchedRecords] = useState<DmsRegistryServiceRecord[]>([]);
	const [fetchedClinic, setFetchedClinic] = useState<Record<string, string> | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [actNumber, setActNumber] = useState<string>(`АКТ-${new Date().getFullYear()}-08/1`);
	const [actDate, setActDate] = useState<string>(new Date().toLocaleDateString("ru-RU"));
	const [contractNumber, setContractNumber] = useState<string>("ДМС-2026/01");
	const [contractDate, setContractDate] = useState<string>("12.01.2026");
	const [representative, setRepresentative] = useState<string>("Руководитель управления мед. страхования");

	const now = new Date();
	const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const periodDisplay = periodFilter === "current_month"
		? `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()} г.`
		: periodFilter === "prev_month"
			? `${MONTH_NAMES[prevMonth.getMonth()]} ${prevMonth.getFullYear()} г.`
			: `${Math.floor(now.getMonth() / 3) + 1} квартал ${now.getFullYear()} г.`;

	useEffect(() => {
		if (!isOpen || (records && records.length > 0)) return;
		let isMounted = true;
		setIsLoading(true);
		const params = new URLSearchParams();
		if (selectedInsurer !== "all") params.set("insurerKey", selectedInsurer);
		if (periodFilter) params.set("period", periodFilter);
		if (scopePatientOnly && patientId) params.set("patientId", patientId);

		fetch(`/api/insurance/registry?${params.toString()}`, {
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		})
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
			.then((data) => {
				if (!isMounted) return;
				if (Array.isArray(data?.records)) setFetchedRecords(data.records);
				if (data?.clinicInfo) setFetchedClinic(data.clinicInfo);
			})
			.catch(() => { if (isMounted) setFetchedRecords([]); })
			.finally(() => { if (isMounted) setIsLoading(false); });
		return () => { isMounted = false; };
	}, [isOpen, selectedInsurer, periodFilter, scopePatientOnly, patientId, records]);

	const effectiveRecords: readonly DmsRegistryServiceRecord[] = (records && records.length > 0) ? records : fetchedRecords;
	const filteredRecords = effectiveRecords.filter((rec) => {
		if (selectedInsurer !== "all" && rec.insurerKey && rec.insurerKey !== selectedInsurer) return false;
		if (searchFilter.trim()) {
			const q = searchFilter.toLowerCase();
			return (rec.patientFullName || "").toLowerCase().includes(q) || rec.policyNumber.toLowerCase().includes(q) ||
				rec.serviceName.toLowerCase().includes(q) || rec.serviceCode804n.toLowerCase().includes(q);
		}
		return true;
	});

	const totals: DmsRegistrySummary = calculateRegistryTotals(filteredRecords);
	const defaultClinic: ClinicLegalInfo = {
		name: 'ООО «Стоматологический Центр «ДЕНТЕ»', inn: "7701984210", kpp: "770101001",
		ogrn: "1157746890123", address: "г. Москва, ул. Большая Спасская, д. 12, стр. 1",
		chiefDoctor: "Д-р Смирнов А.А.", bankAccount: "40702810400000012345", bic: "044525225", corrAccount: "30101810400000000225",
	};
	const effectiveClinic: ClinicLegalInfo = (clinicInfo && clinicInfo.inn) ? clinicInfo : (fetchedClinic ? { ...defaultClinic, ...fetchedClinic } : defaultClinic);

	return {
		selectedInsurer, setSelectedInsurer, periodFilter, setPeriodFilter,
		searchFilter, setSearchFilter, scopePatientOnly, setScopePatientOnly,
		isLoading, actNumber, setActNumber, actDate, setActDate,
		contractNumber, setContractNumber, contractDate, setContractDate,
		representative, setRepresentative, periodDisplay, filteredRecords,
		totals, effectiveClinic,
		currentMonthName: MONTH_NAMES[now.getMonth()] || "Текущий месяц",
		prevMonthName: MONTH_NAMES[prevMonth.getMonth()] || "Прошлый месяц",
		prevMonthDate: prevMonth, currentQuarter: Math.floor(now.getMonth() / 3) + 1, now,
	};
}
