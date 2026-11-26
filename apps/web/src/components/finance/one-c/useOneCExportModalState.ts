import { useCallback, useEffect, useMemo, useState } from "react";
import { generateOneCEnterpriseXml, type OneCDocumentType } from "@dental/shared";
import { rublesToKopecks, kopecksToRubles } from "@dental/shared";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type { OneCExportItem } from "../OneCExportButton";
import { formatMoney, triggerXmlDownload } from "./types";
import { buildOneCExportParams } from "./buildOneCExportParams";

export interface UseOneCExportModalStateParams {
	readonly isOpen?: boolean | undefined;
	readonly items: readonly OneCExportItem[];
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly patientAddress: string;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly contractNumber: string;
	readonly contractDate?: string | undefined;
	readonly initialActNumber?: string | undefined;
	readonly initialDoctorName: string;
	readonly initialTotalRub?: number | undefined;
}

export function useOneCExportModalState(p: UseOneCExportModalStateParams) {
	const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
	const monthStartIso = useMemo(() => `${todayIso.slice(0, 7)}-01`, [todayIso]);
	const [startDateIso, setStartDateIso] = useState<string>(monthStartIso);
	const [endDateIso, setEndDateIso] = useState<string>(todayIso);
	const [docType, setDocType] = useState<OneCDocumentType>("act");
	const [docDate, setDocDate] = useState<string>(todayIso);
	const [actNumber, setActNumber] = useState<string>(
		p.initialActNumber || `АКТ-${todayIso.replace(/-/g, "")}-001`,
	);
	const [selectedContract, setSelectedContract] = useState<string>(p.contractNumber);
	const [selectedContractDate, setSelectedContractDate] = useState<string>(p.contractDate || todayIso);
	const [customDoctorName, setCustomDoctorName] = useState<string>(p.initialDoctorName);
	const [activeSubTab, setActiveSubTab] = useState<"items" | "xml" | "requisites">("items");
	const [isXmlCopied, setIsXmlCopied] = useState(false);
	const [isEditingRequisites, setIsEditingRequisites] = useState(false);
	const [serverExportLoading, setServerExportLoading] = useState(false);
	const [serverExportError, setServerExportError] = useState<string | null>(null);
	const [serverXml, setServerXml] = useState<string | null>(null);
	const [serverSha256, setServerSha256] = useState<string | null>(null);
	const [serverItems, setServerItems] = useState<readonly OneCExportItem[]>([]);
	const [serverTotalKop, setServerTotalKop] = useState<number>(0);

	const loadServerCommerceMl = useCallback(
		async (fromIso = startDateIso, toIso = endDateIso) => {
			setServerExportLoading(true);
			setServerExportError(null);
			try {
				const url = `/api/v1/integrations/1c/commerceml/export?startDateIso=${encodeURIComponent(fromIso)}&endDateIso=${encodeURIComponent(toIso)}&format=json`;
				const res = await fetch(url, { headers: denteClinicalReadHeaders() });
				if (!res.ok) {
					const errJson = (await res.json().catch(() => null)) as Record<string, unknown> | null;
					const msg =
						(typeof errJson?.message === "string" && errJson.message.trim()) ||
						`Ошибка выгрузки CommerceML 1С (HTTP ${res.status})`;
					setServerExportError(msg);
					return;
				}
				const rawJson = (await res.json()) as unknown;
				const payload =
					rawJson && typeof rawJson === "object" && "data" in rawJson
						? ((rawJson as { data?: unknown }).data ?? rawJson)
						: rawJson;
				const rec = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
				const xml = typeof rec.xml === "string" ? rec.xml : null;
				const sha256 = typeof rec.sha256 === "string" ? rec.sha256 : null;
				const pkg = (rec.package && typeof rec.package === "object" ? rec.package : null) as Record<string, unknown> | null;
				const acts = Array.isArray(pkg?.medicalActs) ? (pkg.medicalActs as Array<Record<string, unknown>>) : [];
				const extractedItems: OneCExportItem[] = [];
				for (const act of acts) {
					const actItems = Array.isArray(act.items) ? (act.items as Array<Record<string, unknown>>) : [];
					for (const it of actItems) {
						const kop = Number(it.priceKopecks ?? it.totalKopecks ?? 0);
						extractedItems.push({
							id: typeof it.id === "string" ? it.id : `act-${extractedItems.length + 1}`,
							name: typeof it.name === "string" ? it.name : "Стоматологическая услуга",
							code804n: typeof it.code804n === "string" ? it.code804n : undefined,
							toothNumber: typeof it.toothNumber === "number" ? it.toothNumber : undefined,
							quantity: typeof it.quantity === "number" ? it.quantity : 1,
							priceRub: kopecksToRubles(Number.isFinite(kop) ? kop : 0),
							discountRub: 0,
						});
					}
				}
				const retailDoc = (pkg?.retailSalesDocument && typeof pkg.retailSalesDocument === "object"
					? pkg.retailSalesDocument
					: null) as Record<string, unknown> | null;
				const retailTotalKop = Number(retailDoc?.totalKopecks ?? 0);
				const actsTotalKop = acts.reduce((acc, a) => acc + Number(a.totalKopecks ?? 0), 0);

				setServerXml(xml);
				setServerSha256(sha256);
				setServerItems(extractedItems);
				setServerTotalKop(actsTotalKop > 0 ? actsTotalKop : Math.max(0, retailTotalKop));
			} catch (err: unknown) {
				setServerExportError(err instanceof Error ? err.message : "Сетевая ошибка при выгрузке CommerceML 1С");
			} finally {
				setServerExportLoading(false);
			}
		},
		[endDateIso, startDateIso],
	);

	useEffect(() => {
		if (p.isOpen && p.items.length === 0) {
			void loadServerCommerceMl(startDateIso, endDateIso);
		}
	}, [p.isOpen, p.items.length, loadServerCommerceMl, startDateIso, endDateIso]);

	const effectiveItems = p.items.length > 0 ? p.items : serverItems;

	const calculatedTotalRub = useMemo(() => {
		if (effectiveItems.length > 0) {
			const totalKop = effectiveItems.reduce((sum, it) => {
				const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
				const unitPriceKop = rublesToKopecks(it.priceRub);
				const discKop = rublesToKopecks(it.discountRub || 0);
				return sum + Math.max(0, unitPriceKop * qty - discKop);
			}, 0);
			return kopecksToRubles(totalKop);
		}
		if (serverTotalKop > 0) {
			return kopecksToRubles(serverTotalKop);
		}
		if (typeof p.initialTotalRub === "number" && p.initialTotalRub > 0) {
			return kopecksToRubles(rublesToKopecks(p.initialTotalRub));
		}
		return 0;
	}, [effectiveItems, serverTotalKop, p.initialTotalRub]);

	const generatedXml = useMemo(() => {
		if (serverXml && p.items.length === 0) {
			return serverXml;
		}
		try {
			const exportParams = buildOneCExportParams({
				actNumber, docDate, docType, clinicName: p.clinicName, clinicInn: p.clinicInn,
				clinicKpp: p.clinicKpp, patientId: p.patientId, patientName: p.patientName,
				patientPhone: p.patientPhone, patientAddress: p.patientAddress, items: effectiveItems,
				calculatedTotalRub, selectedContract, selectedContractDate, customDoctorName,
			});
			return generateOneCEnterpriseXml(exportParams);
		} catch (err) {
			return `<!-- Ошибка формирования XML: ${err instanceof Error ? err.message : String(err)} -->`;
		}
	}, [serverXml, actNumber, calculatedTotalRub, p, effectiveItems, customDoctorName, docDate, docType, selectedContract, selectedContractDate]);

	const handleCopyXml = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(generatedXml);
			setIsXmlCopied(true);
			showToast("XML-документ CommerceML 2.09 скопирован в буфер", "success", 2500);
			setTimeout(() => setIsXmlCopied(false), 3000);
		}
	};

	const handleCopyAccountantSummary = () => {
		const docName = docType === "act" ? "Акт выполненных работ" : "Счет / Заказ";
		const summaryText = `ВЫГРУЗКА В 1С:ПРЕДПРИЯТИЕ 8.3\nДокумент: ${docName} № ${actNumber} от ${docDate}\nКлиника: ${p.clinicName} (ИНН ${p.clinicInn} / КПП ${p.clinicKpp})\nПациент: ${p.patientName} (Договор ${selectedContract} от ${selectedContractDate})\nВрач: ${customDoctorName}\nПозиций: ${effectiveItems.length}\nИтого: ${formatMoney(calculatedTotalRub)} (Без НДС - пп. 2 п. 2 ст. 149 НК РФ)`;
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(summaryText);
			showToast("Сводка для бухгалтерии скопирована в буфер", "success", 2500);
		}
	};

	const handleDownloadXml = () => {
		if (!generatedXml || generatedXml.startsWith("<!-- Ошибка")) {
			showToast("Ошибка в структуре XML для 1С", "error");
			return;
		}
		const filename =
			serverXml && p.items.length === 0
				? `1C_CommerceML_${startDateIso}_${endDateIso}.xml`
				: `1C_Export_${actNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}_${docDate}.xml`;
		triggerXmlDownload(generatedXml, filename);
		showToast(`Файл выгрузки 1С:Предприятие (${filename}) успешно сформирован и скачан!`, "success", 5000);
	};

	return {
		todayIso, startDateIso, setStartDateIso, endDateIso, setEndDateIso,
		docType, setDocType, docDate, setDocDate, actNumber, setActNumber,
		selectedContract, setSelectedContract, selectedContractDate, setSelectedContractDate,
		customDoctorName, setCustomDoctorName, activeSubTab, setActiveSubTab,
		isXmlCopied, isEditingRequisites, setIsEditingRequisites, calculatedTotalRub,
		effectiveItems, serverExportLoading, serverExportError, serverSha256, loadServerCommerceMl,
		generatedXml, handleCopyXml, handleCopyAccountantSummary, handleDownloadXml,
	};
}
