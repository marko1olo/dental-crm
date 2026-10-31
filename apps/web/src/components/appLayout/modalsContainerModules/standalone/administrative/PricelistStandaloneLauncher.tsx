/**
 * PricelistStandaloneLauncher — Автономный лаунчер прейскуранта и сопоставления цен.
 * Мандат 8b (<= 120 строк), Мандат 8aq (Монтирование в живой UI), Мандат 8am.
 */

import React, { Suspense, useState } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { PriceListMappingDiffView, type IngestedMappingItem } from "../../../../catalog/mappingDiff";
import { ServicePricelistManagerModal } from "../../../../catalog/pricelist/ServicePricelistManagerModal";
import { CANONICAL_SERVICE_PRESETS } from "../../../../catalog/pricelist/servicePricelistPresets";

const DEMO_DIFF_ITEMS: readonly IngestedMappingItem[] = [
	{
		id: "diff-01",
		sourceLineNumber: 1,
		rawLine: "A16.07.002.001 Наложение световой пломбы Gradia Direct 5 200 руб",
		cleanedTitle: "Наложение световой пломбы Gradia Direct",
		code804n: "A16.07.002.001",
		statutoryTitle804n: "Восстановление зуба пломбой с нарушением контактного пункта",
		category: "therapy",
		specialty: "therapist",
		priceRub: 5200,
		priceKopecks: 520000,
		confidence: 0.98,
		confidenceKind: "exact_code",
		suggestedAction: "update_existing",
		matchedExistingServiceId: "cat-001",
		matchedExistingTitle: "Пломбирование светоотверждаемым композитом",
		matchedExistingPriceRub: 4500,
		isApproved: true,
	},
	{
		id: "diff-02",
		sourceLineNumber: 2,
		rawLine: "Ультразвуковое удаление зубных отложений и AirFlow 3 800 ₽",
		cleanedTitle: "Ультразвуковое удаление зубных отложений и AirFlow",
		code804n: "A16.07.051",
		statutoryTitle804n: "Профессиональная гигиена полости рта и зубов",
		category: "hygiene",
		specialty: "hygienist",
		priceRub: 3800,
		priceKopecks: 380000,
		confidence: 0.94,
		confidenceKind: "high_keyword",
		suggestedAction: "update_existing",
		matchedExistingServiceId: "cat-002",
		matchedExistingTitle: "Комплексная гигиена полости рта",
		matchedExistingPriceRub: 4200,
		isApproved: true,
	},
	{
		id: "diff-03",
		sourceLineNumber: 3,
		rawLine: "Сложное удаление ретинированного зуба ультразвуком 8 500",
		cleanedTitle: "Сложное удаление ретинированного зуба ультразвуком",
		code804n: "A16.07.001.003",
		statutoryTitle804n: "Сложное удаление зуба с разъединением корней",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 8500,
		priceKopecks: 850000,
		confidence: 0.91,
		confidenceKind: "high_keyword",
		suggestedAction: "create_new",
		isApproved: true,
	},
	{
		id: "diff-04",
		sourceLineNumber: 4,
		rawLine: "Осмотр врача и пришлифовка пломбы по гарантии 0 руб",
		cleanedTitle: "Осмотр врача и пришлифовка пломбы по гарантии",
		code804n: "B01.065.002",
		statutoryTitle804n: "Прием (осмотр, консультация) врача-стоматолога повторный",
		category: "therapy",
		specialty: "therapist",
		priceRub: 0,
		priceKopecks: 0,
		confidence: 0.95,
		confidenceKind: "exact_code",
		suggestedAction: "create_new",
		isApproved: true,
	},
	{
		id: "diff-05",
		sourceLineNumber: 5,
		rawLine: "Коронка из диоксида циркония на мультиюнит 28 000 руб",
		cleanedTitle: "Коронка из диоксида циркония на мультиюнит",
		code804n: "A16.07.004",
		statutoryTitle804n: "Восстановление зуба коронкой постоянной безметалловой",
		category: "orthopedics",
		specialty: "orthopedist",
		priceRub: 28000,
		priceKopecks: 2800000,
		confidence: 0.88,
		confidenceKind: "high_keyword",
		suggestedAction: "create_new",
		isApproved: true,
	},
	{
		id: "diff-06",
		sourceLineNumber: 6,
		rawLine: "Нестандартная манипуляция с неопределенным кодом 1 500",
		cleanedTitle: "Нестандартная манипуляция с неопределенным кодом",
		code804n: "A16.07.099",
		statutoryTitle804n: "Прочие стоматологические вмешательства",
		category: "therapy",
		specialty: "therapist",
		priceRub: 1500,
		priceKopecks: 150000,
		confidence: 0.55,
		confidenceKind: "low_unmatched",
		suggestedAction: "create_new",
		isApproved: false,
	},
];

const DEMO_CATALOG = [
	{ id: "cat-001", code: "A16.07.002.001", title: "Пломбирование светоотверждаемым композитом", basePriceRub: 4500, category: "therapy" },
	{ id: "cat-002", code: "A16.07.051", title: "Комплексная гигиена полости рта", basePriceRub: 4200, category: "hygiene" },
];

function StandaloneDiffView({ onClose }: { readonly onClose: () => void }) {
	const [items, setItems] = useState<readonly IngestedMappingItem[]>(DEMO_DIFF_ITEMS);
	return (
		<div className="w-full h-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-2 sm:p-4 flex flex-col box-border">
			<div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col min-h-0">
				<PriceListMappingDiffView
					items={items}
					onItemsChange={setItems}
					existingCatalog={DEMO_CATALOG}
					onCancel={onClose}
					onApply={onClose}
				/>
			</div>
		</div>
	);
}

export function renderPricelistStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	const isDiff = s.includes("diff") || s.includes("mapping") || h.includes("diff") || h.includes("mapping");
	const isPricelist = isDiff || s.includes("pricelist") || s.includes("catalog") || h.includes("pricelist") || h.includes("catalog");

	if (!isPricelist) return null;

	const handleClose = () => {
		const url = new URL(window.location.href);
		["pricelist", "catalog", "diff", "mapping"].forEach((k) => url.searchParams.delete(k));
		const cleanHash = window.location.hash.replace(/#pricelist|#catalog|#diff|#mapping/g, "");
		window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
		window.location.reload();
	};

	return (
		<Suspense fallback={<AppLoadingState message="Загрузка сопоставления прейскуранта..." />}>
			{isDiff ? (
				<StandaloneDiffView onClose={handleClose} />
			) : (
				<div className="w-full h-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center">
					<ServicePricelistManagerModal
						isOpen={true}
						initialItems={CANONICAL_SERVICE_PRESETS}
						onClose={handleClose}
						onSaveCatalog={handleClose}
					/>
				</div>
			)}
		</Suspense>
	);
}

export const DirectPricelistStandaloneLauncher: React.FC = () => renderPricelistStandaloneLauncher();
