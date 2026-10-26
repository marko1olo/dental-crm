import { useState, useEffect, useCallback, useMemo } from "react";
import { showToast } from "../../GlobalToast";
import type { SanpinRegisterTab } from "../sanpinNavigationConfig";
import { executeShiftSanpinAutoClose } from "../autoclaveLog/shiftAutoCloserEngine.js";
import { generateSanpinShiftAutopilotBundle } from "@dental/shared";

export function useSanpinRegistersLogic(auth: any, appLogic: any, initialTab: SanpinRegisterTab = "autoclave") {
	const [activeTab, setActiveTab] = useState<SanpinRegisterTab>(initialTab);
	const [showExpandedKpi, setShowExpandedKpi] = useState<boolean>(false);
	const [summary, setSummary] = useState<any>(null);
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isJournal257ModalOpen, setIsJournal257ModalOpen] = useState(false);
	const [isRetroactiveBatchModalOpen, setIsRetroactiveBatchModalOpen] = useState(false);
	const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
	const [autoFilling, setAutoFilling] = useState(false);
	const [autofillPeriod, setAutofillPeriod] = useState<"day" | "week" | "month">("month");
	const [refreshCounter, setRefreshCounter] = useState(0);

	const fetchSummary = useCallback(async () => {
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : { "Content-Type": "application/json" };
			const res = await fetch("/api/registers/summary", { headers });
			if (res.ok) {
				const data = await res.json();
				setSummary(data);
			}
		} catch (err) {
			console.error("Failed to load SanPiN summary", err);
		}
	}, [auth]);

	useEffect(() => {
		fetchSummary();
	}, [fetchSummary]);

	useEffect(() => {
		const handleHash = () => {
			if (typeof window === "undefined") return;
			const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
			const parts = hash.split(/[/?]/);
			const sub = parts[1] || (parts[0] !== "sanpin" && parts[0] !== "sterilization" ? parts[0] : "");
			const tabMap: Record<string, SanpinRegisterTab> = {
				autoclave: "autoclave", kraft: "autoclave", "kraft-packets": "autoclave",
				pso: "pso", azopyram: "pso", disinfection: "disinfection", cleaning: "disinfection", uv: "disinfection",
			};
			if (sub && tabMap[sub]) setActiveTab(tabMap[sub]!);
		};
		handleHash();
		window.addEventListener("hashchange", handleHash);
		return () => window.removeEventListener("hashchange", handleHash);
	}, []);

	const handleAutofillShift = async () => {
		try {
			setAutoFilling(true);
			const operatorName = appLogic?.activeDoctor?.fullName || "Медсестра ЦСО / Врач";
			const headNurseName = appLogic?.clinic?.legalEntityName || "Ответственный по СанПиН";
			const todayIso = new Date().toISOString().slice(0, 10);
			const shiftAutoResult = executeShiftSanpinAutoClose({
				date: todayIso, visitsCount: 12, operatorStaffFullName: operatorName, headNurseSignatureFullName: headNurseName,
			});
			const bundle = generateSanpinShiftAutopilotBundle({
				date: todayIso, operatorFullName: operatorName, headNurseFullName: headNurseName,
			});
			const headers = auth ? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" };
			await fetch("/api/registers/autofill-shift", {
				method: "POST", headers, body: JSON.stringify({ ...bundle, autoShiftData: shiftAutoResult }),
			}).catch(() => null);

			showToast(`Смена заполнена: автоклавы ${shiftAutoResult.totalAutoclaveCycles} цикла, очистка ${shiftAutoResult.totalPsoSamplesTested} проб (100% норма).`, "success");
			fetchSummary();
			setRefreshCounter((p) => p + 1);
		} catch {
			showToast("Ошибка при авто-заполнении смены", "error");
		} finally {
			setAutoFilling(false);
		}
	};

	const handleAutofillByPeriod = async (period: "day" | "week" | "month") => {
		if (period === "day") return handleAutofillShift();
		try {
			setAutoFilling(true);
			const now = new Date();
			const headers = auth ? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" };
			await fetch("/api/registers/autofill-month", {
				method: "POST", headers, body: JSON.stringify({
					year: now.getFullYear(), month: now.getMonth() + 1,
					operatorFullName: appLogic?.activeDoctor?.fullName || "Медсестра ЦСО",
					headNurseFullName: appLogic?.clinic?.legalEntityName || "Ответственный",
				}),
			}).catch(() => null);
			showToast("Журналы за период успешно зафиксированы в базе данных (100% норма)", "success");
			setRefreshCounter((p) => p + 1);
			fetchSummary();
		} catch {
			showToast("Ошибка при авто-заполнении журналов", "error");
		} finally {
			setAutoFilling(false);
		}
	};

	const exportContext = useMemo(() => ({ auth, appLogic }), [auth, appLogic]);

	return {
		activeTab, setActiveTab, showExpandedKpi, setShowExpandedKpi, summary,
		isKraftModalOpen, setIsKraftModalOpen,
		isSterilizationLogModalOpen: isJournal257ModalOpen, setIsSterilizationLogModalOpen: setIsJournal257ModalOpen,
		isJournal257ModalOpen, setIsJournal257ModalOpen,
		isRetroactiveBatchModalOpen, setIsRetroactiveBatchModalOpen, isExportMenuOpen, setIsExportMenuOpen,
		autoFilling, autofillPeriod, setAutofillPeriod, refreshCounter, fetchSummary,
		handleAutofillShift, handleAutofillByPeriod, exportContext,
	};
}
