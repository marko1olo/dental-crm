import { useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { INITIAL_FORM257_RECORDS } from "./autoclaveLogSeedRecords";
import { createDefault5ChamberPoints, createForm257Record, type Form257Record } from "./autoclaveLogEngine.js";
import type { AutoclaveModalTab } from "./AutoclaveLogModalTabs";

export function useAutoclaveLogModalLogic(isOpen: boolean, initialTab: string) {
	const isDemo = isDemoShowcaseMode();
	const [activeTab, setActiveTab] = useState<AutoclaveModalTab>(
		initialTab === "new_cycle" ? "new_cycle" : "journal_257"
	);
	const [records, setRecords] = useState<Form257Record[]>(() =>
		isDemo ? [...INITIAL_FORM257_RECORDS] : []
	);

	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;
		const fetchLive = async () => {
			try {
				const clinicToken = readDenteClinicToken();
				const staffToken = readDenteStaffToken();
				const res = await fetch("/api/sanpin/cycles", {
					headers: { ...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}), ...(staffToken ? { "X-Staff-Token": staffToken } : {}) },
				});
				if (!res.ok) return;
				const data = await res.json();
				if (Array.isArray(data) && data.length > 0 && !cancelled) {
					const mapped: Form257Record[] = data.map((item: any, idx: number) =>
						createForm257Record({
							date: item.timestamp ? item.timestamp.split("T")[0] : new Date().toISOString().split("T")[0],
							cycleNumber: item.cycleNumber || (idx + 1),
							sterilizerId: item.autoclaveId || "autoclave-melag-vacuklav-23b",
							regimeId: item.temperatureCelsius >= 180 ? "dry_heat_180_60min" : "steam_134_5min",
							sensors: { actualTemperatureCelsius: item.temperatureCelsius || 134, actualPressureBar: item.pressureBar || 2.1, actualExposureMinutes: item.durationMin || 5 },
							itemsDescriptionRu: item.itemsDescription || "Стоматологический инструментарий",
							packsCount: 1, packagingType: "kraft_pouch_sealed",
							chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", item.status === "passed"),
							operatorStaffFullName: item.operatorName || "Сотрудник ЦСО",
							operatorStaffPosition: "Сотрудник ЦСО / Врач",
							isHeadNurseVerified: item.status === "passed",
							notes: item.notes || undefined,
						})
					);
					setRecords(mapped);
				}
			} catch {}
		};
		fetchLive();
		return () => { cancelled = true; };
	}, [isOpen, isDemo]);

	const handleSaveNewRecord = async (newRec: Form257Record) => {
		setRecords((prev) => [newRec, ...prev]);
		setActiveTab("journal_257");
	};
	const handleDeleteRecord = (id: string) => setRecords((prev) => prev.filter((r) => r.id !== id));
	const handleVerifyRecord = (id: string, headNurseName: string) => {
		setRecords((prev) => prev.map((r) => r.id === id ? { ...r, isHeadNurseVerified: true, headNurseSignatureFullName: headNurseName, verificationTimestamp: new Date().toISOString() } : r));
	};
	const handleBatchAddRecords = (newRecs: Form257Record[]) => {
		setRecords((prev) => {
			const existing = new Set(prev.map((r) => r.id));
			return [...newRecs.filter((r) => !existing.has(r.id)), ...prev];
		});
	};

	return {
		activeTab, setActiveTab, records,
		handleSaveNewRecord, handleDeleteRecord, handleVerifyRecord, handleBatchAddRecords,
	};
}
