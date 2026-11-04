import { useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import { INITIAL_FORM257_RECORDS } from "./autoclaveLogSeedRecords";
import { createDefault5ChamberPoints, createForm257Record, type Form257Record } from "./autoclaveLogEngine.js";
import type { PackagingTypeId } from "./autoclaveLogPresets.js";
import type { AutoclaveModalTab } from "./AutoclaveLogModalTabs";

export function useAutoclaveLogModalLogic(isOpen: boolean, initialTab: string) {
	const isDemo = isDemoShowcaseMode();
	const [activeTab, setActiveTab] = useState<AutoclaveModalTab>(
		initialTab === "new_cycle" ? "new_cycle" : "sterilization_log"
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
				const headers: Record<string, string> = {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				};
				let res = await fetch("/api/sanpin/sterilization/cycles", { headers }).catch(() => null);
				if (!res || !res.ok) {
					res = await fetch("/api/sanpin/sterilization", { headers }).catch(() => null);
				}
				if (!res || !res.ok) {
					if (!isDemo && !cancelled) setRecords([]);
					return;
				}
				const data = await res.json();
				if (cancelled) return;
				if (Array.isArray(data) && data.length > 0) {
					const mapped: Form257Record[] = data.map((item: any, idx: number) => {
						const tempC = Number(item.temperatureCelsius) || 134;
						const pressBar = Number(item.pressureBar) || 2.1;
						const durMin = Number(item.durationMin) || 5;
						const isPassed = item.status === "passed" || item.status === "sterile_passed" || item.passedIndicator !== false;
						const autoId = item.autoclaveId || "autoclave-melag-vacuklav-23b";
						const devName = item.deviceName || undefined;
						const dateStr = item.timestamp ? String(item.timestamp).split("T")[0] : new Date().toISOString().split("T")[0];
						const rec = createForm257Record({
							date: dateStr || new Date().toISOString().slice(0, 10),
							cycleNumber: Number(item.cycleNumber) || (idx + 1),
							sterilizerId: autoId,
							sterilizerCode: autoId,
							sterilizerBrandModel: devName,
							regimeId: tempC >= 180 ? "dry_heat_180_60min" : "steam_134_5min",
							sensors: { actualTemperatureCelsius: tempC, actualPressureBar: pressBar, actualExposureMinutes: durMin },
							itemsDescriptionRu: item.itemsDescription || "Стоматологический инструментарий",
							packsCount: Number(item.packsCount) || 1,
							packagingType: (item.packagingType === "kraft_heat_sealed" ? "kraft_pouch_sealed" : "kraft_pouch_self_seal") as PackagingTypeId,
							chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", isPassed),
							operatorStaffFullName: item.operatorName || "Сотрудник ЦСО",
							operatorStaffPosition: "Сотрудник ЦСО / Врач",
							isHeadNurseVerified: isPassed,
							notes: item.notes || undefined,
						});
						const finalStatus = (item.status === "rejected_defect" || item.status === "failed")
							? "rejected_defect"
							: (item.status === "quarantine" ? "quarantine" : (isPassed ? "sterile_passed" : "rejected_defect"));
						return {
							...rec,
							id: item.id || rec.id,
							status: finalStatus,
							isCyclePassed: isPassed,
						};
					});
					setRecords(mapped);
				} else if (!isDemo) {
					setRecords([]);
				}
			} catch {
				if (!isDemo && !cancelled) setRecords([]);
			}
		};
		fetchLive();
		return () => { cancelled = true; };
	}, [isOpen, isDemo]);

	const handleSaveNewRecord = async (newRec: Form257Record) => {
		setRecords((prev) => [newRec, ...prev]);
		setActiveTab("journal_257");

		try {
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
				...(staffToken ? { "X-Staff-Token": staffToken } : {}),
			};
			const payload = {
				deviceName: newRec.sterilizerBrandModel || newRec.sterilizerId || "Melag Vacuklav 23 B+",
				autoclaveId: newRec.sterilizerCode || newRec.sterilizerId || "АК-01",
				cycleNumber: newRec.cycleNumber,
				itemsDescription: newRec.itemsDescriptionRu || "Стоматологический инструментарий",
				packagingType: newRec.packagingType === "kraft_pouch_sealed" ? "kraft_heat_sealed" : "kraft_self_adhesive",
				temperatureCelsius: Number(newRec.actualTemperatureCelsius || newRec.sensors?.actualTemperatureCelsius || 134),
				pressureBar: Number(newRec.actualPressureBar || newRec.sensors?.actualPressureBar || 2.1),
				durationMin: Number(newRec.actualExposureMinutes || newRec.sensors?.actualExposureMinutes || 5),
				indicatorType: "class5_integrating",
				passedIndicator: true,
				notes: newRec.notes || undefined,
				barcode: newRec.barcode || undefined,
			};
			let res = await fetch("/api/sanpin/sterilization", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			}).catch(() => null);

			if (!res || !res.ok) {
				await fetch("/api/sanpin/sterilization/cycles", {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
				}).catch(() => null);
			}
		} catch (err) {
			console.warn("Failed to persist autoclave cycle to backend", err);
		}
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
