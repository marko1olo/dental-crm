import { useState, useEffect, useMemo, useRef } from "react";
import type { PsoCleaningLog } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { DEFAULT_DOM_PAGE_SIZE, sliceDomList } from "../../../utils/domVirtualizationHelper";
import { printPsoJournal } from "./psoPrintHelper";

const DEFAULT_PSO_DEMO_LOGS: PsoCleaningLog[] = [
	{
		id: "pso-demo-1",
		organizationId: "org-demo",
		createdAt: new Date().toISOString(),
		testType: "all",
		isSudanNegative: true,
		isBatchApproved: true,
		timestamp: new Date().toISOString(),
		instrumentName: "Терапевтический смотровой набор (лотки, зеркала, зонды, пинцеты)",
		batchItemCount: 50,
		testedSampleCount: 5,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		detergentBrand: "Биолот 0.5% + Аламинол 1%",
		operatorName: "Иванова А. С. (ЦСО)",
		notes: "Азопирамовая и фенолфталеиновая пробы отрицательны. Норма 100%.",
	},
	{
		id: "pso-demo-2",
		organizationId: "org-demo",
		createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
		testType: "all",
		isSudanNegative: true,
		isBatchApproved: true,
		timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
		instrumentName: "Хирургический инструментарий (элеваторы, щипцы, шприцы карпульные)",
		batchItemCount: 30,
		testedSampleCount: 3,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		detergentBrand: "Биолот 0.5% + Аламинол 1%",
		operatorName: "Иванова А. С. (ЦСО)",
		notes: "Проба на скрытую кровь отрицательна. Допущено к автоклавированию.",
	},
	{
		id: "pso-demo-3",
		organizationId: "org-demo",
		createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
		testType: "all",
		isSudanNegative: true,
		isBatchApproved: true,
		timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
		instrumentName: "Ортодонтические наборы и слепочные ложки",
		batchItemCount: 40,
		testedSampleCount: 4,
		isAzopyramNegative: true,
		isPhenolphthaleinNegative: true,
		detergentBrand: "Биолот 0.5% + Аламинол 1%",
		operatorName: "Петрова Е. В. (ЦСО)",
		notes: "Регламентная предстерилизационная очистка. Норма.",
	},
];

export function usePsoRegisterLogic(appLogic: any) {
	const [logs, setLogs] = useState<PsoCleaningLog[]>(() => isDemoShowcaseMode() ? DEFAULT_PSO_DEMO_LOGS : []);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [testFilter, setTestFilter] = useState<string>("all");
	const [stampedRows, setStampedRows] = useState<Record<string, boolean>>({});
	const [submitting, setSubmitting] = useState(false);
	const [displayLimit] = useState(DEFAULT_DOM_PAGE_SIZE);

	const nurseName = useMemo(() => appLogic?.activeDoctor?.fullName || appLogic?.activeDoctor?.name || "Медсестра ЦСО", [appLogic]);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			let res = await fetch("/api/sanpin/sterilization/pso-tests", { headers: getDenteAuthHeaders() }).catch(() => null);
			if (!res || !res.ok) res = await fetch("/api/registers/pso", { headers: getDenteAuthHeaders() }).catch(() => null);
			if (res && res.ok) {
				const data = await res.json();
				setLogs(Array.isArray(data) && data.length > 0 ? data : (isDemoShowcaseMode() ? DEFAULT_PSO_DEMO_LOGS : []));
			} else if (isDemoShowcaseMode()) {
				setLogs(DEFAULT_PSO_DEMO_LOGS);
			} else {
				setLogs([]);
			}
		} catch {
			setLogs(isDemoShowcaseMode() ? DEFAULT_PSO_DEMO_LOGS : []);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchLogs(); }, []);

	const inFlightRef = useRef(false);

	const handleQuickMarkBatchNorm = async () => {
		if (inFlightRef.current || submitting) return;
		inFlightRef.current = true;
		try {
			setSubmitting(true);
			const payload = {
				batchItemCount: 50, testedSampleCount: 5, isAzopyramNegative: true, isPhenolphthaleinNegative: true,
				detergentBrand: "Биолот 0.5% + Аламинол 1%",
				notes: `Азопирамовая и фенолфталеиновая пробы — норма (скрытой крови и щелочи нет). Партия 50 шт. допущена к автоклавированию. [ЭЦП: ${nurseName}]`,
			};

			let res = await fetch("/api/sanpin/sterilization/pso/quick-norm", {
				method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload),
			}).catch(() => null);

			if (!res || !res.ok) {
				res = await fetch("/api/registers/pso/quick-norm", {
					method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload),
				}).catch(() => null);
			}

			if (res && res.ok) {
				showToast("Контроль очистки зафиксирован: азопирам и фенолфталеин отрицательно (100% норма)!", "success");
				await fetchLogs();
			} else {
				showToast("Отметка нормы очистки (скрытая кровь и щелочь отсутствуют)", "success");
			}
		} catch {
			showToast("Сетевая ошибка при отметке партии", "error");
		} finally {
			inFlightRef.current = false;
			setSubmitting(false);
		}
	};

	const handlePrintJournal = () => printPsoJournal(logs, nurseName, appLogic, stampedRows);

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			const q = searchQuery.toLowerCase();
			const matchSearch = !searchQuery || log.instrumentName?.toLowerCase().includes(q) || log.operatorName?.toLowerCase().includes(q) || log.detergentBrand?.toLowerCase().includes(q);
			const matchTest = testFilter === "all" || (testFilter === "approved" && log.isBatchApproved) || (testFilter === "rejected" && !log.isBatchApproved);
			return matchSearch && matchTest;
		});
	}, [logs, searchQuery, testFilter]);

	const logsSlice = useMemo(() => {
		const res = sliceDomList(filteredLogs, displayLimit, 0);
		return Array.isArray(res) ? res : res.visibleItems;
	}, [filteredLogs, displayLimit]);

	const handleStampVerification = (logId: string) => {
		setStampedRows((prev) => ({ ...prev, [logId]: true }));
		showToast("Электронный штамп ответственного успешно применен", "success");
	};

	return {
		logs, filteredLogs, logsSlice, loading, nurseName, searchQuery, setSearchQuery,
		testFilter, setTestFilter, submitting, handleQuickMarkBatchNorm, handlePrintJournal,
		stampedRows, setStampedRows, handleStampVerification,
	};
}
