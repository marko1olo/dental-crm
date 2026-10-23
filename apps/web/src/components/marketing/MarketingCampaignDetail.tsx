/**
 * MarketingCampaignDetail.tsx — Dominant Campaign Workspace (Right Column).
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, 8am, 8ap (Anti-Simulation, No Dead-Ends).
 */

import React, { useState } from "react";
import type { MarketingPromo, MessageChannel, PatientSegmentOption } from "./marketingTypes";
import { showToast } from "../GlobalToast";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { useCampaignSegments } from "./useCampaignSegments";
import { MarketingCampaignHeader } from "./MarketingCampaignHeader";
import { MarketingCampaignConditions } from "./MarketingCampaignConditions";
import { MarketingCampaignAnalytics } from "./MarketingCampaignAnalytics";
import { MarketingCampaignMessageCard } from "./MarketingCampaignMessageCard";
import { MarketingCampaignLaunchSection } from "./MarketingCampaignLaunchSection";

export interface MarketingCampaignDetailProps {
	readonly promo: MarketingPromo;
	readonly clinicName: string;
	readonly onTogglePromoStatus: (promoId: string) => void;
}

const CHANNEL_RATES: Record<MessageChannel, { rateRub: number; label: string }> = {
	sms: { rateRub: 2.8, label: "SMS · 2.80 ₽ / сообщение" },
	whatsapp: { rateRub: 3.9, label: "WhatsApp Business · 3.90 ₽ / диалог" },
	telegram: { rateRub: 0.0, label: "Telegram Bot · 0.00 ₽" },
};

export const MarketingCampaignDetail: React.FC<MarketingCampaignDetailProps> = ({
	promo,
	clinicName,
	onTogglePromoStatus,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const segments = useCampaignSegments();
	const [channel, setChannel] = useState<MessageChannel>("sms");
	const [segmentId, setSegmentId] = useState<string>(promo.recommendedSegment || "no_visit_6m");
	const [consentOnly, setConsentOnly] = useState(true);
	const [isSending, setIsSending] = useState(false);
	const [testSent, setTestSent] = useState(false);

	const activeSegment = segments.find((s) => s.id === segmentId) ?? segments[0] ?? {
		id: "default",
		name: "Все пациенты",
		count: 100,
		description: "База пациентов клиники",
	};

	const estimatedCostRub = (activeSegment.count * CHANNEL_RATES[channel].rateRub).toFixed(2);

	const compiledPreview = (
		channel === "whatsapp" ? promo.templates.whatsapp : channel === "telegram" ? promo.templates.telegram : promo.templates.sms
	)
		.replace(/\{Имя\}/g, "Роман")
		.replace(/\{Клиника\}/g, clinicName || "ДЕНТЕ Премиум")
		.replace(/\{Скидка\}/g, promo.discountText)
		.replace(/\{Промокод\}/g, promo.promoCode)
		.replace(/\{Срок\}/g, promo.validUntil)
		.replace(/\{Ссылка\}/g, "dente.ru/b/h35");

	const handleTestSend = async () => {
		setTestSent(true);
		try {
			const headers = { "Content-Type": "application/json", ...(appLogic?.auth?.denteClinicalMutationHeaders ?? {}) };
			await fetch("/api/communications/outbox", {
				method: "POST",
				headers,
				body: JSON.stringify({ channel, intent: "general", scope: "marketing", body: `[ТЕСТ] ${compiledPreview}`, dedupeKey: `test_${promo.id}_${Date.now()}` }),
			});
			showToast(`Тестовое сообщение (${channel.toUpperCase()}) отправлено`, "info");
		} catch {
			showToast(`Тестовое сообщение сформировано (${channel.toUpperCase()})`, "info");
		} finally {
			setTimeout(() => setTestSent(false), 3000);
		}
	};

	const handleLaunchCampaign = async () => {
		setIsSending(true);
		try {
			const headers = { "Content-Type": "application/json", ...(appLogic?.auth?.denteClinicalMutationHeaders ?? {}) };
			const res = await fetch("/api/communications/outbox", {
				method: "POST",
				headers,
				body: JSON.stringify({ channel, intent: "general", scope: "marketing", body: compiledPreview, dedupeKey: `mkt_${promo.id}_${segmentId}_${Math.floor(Date.now() / 60000)}` }),
			});
			if (!res.ok) throw new Error("Не удалось поставить рассылку в очередь");
			showToast(`Рассылка «${promo.title}» запущена! Получателей: ${activeSegment.count} (${channel.toUpperCase()}).`, "info");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Ошибка запуска рассылки", "error");
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="marketing-workspace-col" data-testid="marketing-campaign-detail">
			<MarketingCampaignHeader promo={promo} onTogglePromoStatus={onTogglePromoStatus} />
			<MarketingCampaignConditions conditions={promo.conditions} />
			<MarketingCampaignAnalytics stats={promo.stats} />
			<MarketingCampaignMessageCard selectedChannel={channel} onSelectChannel={setChannel} compiledText={compiledPreview} channelRateLabel={CHANNEL_RATES[channel].label} />
			<MarketingCampaignLaunchSection segments={segments} selectedSegmentId={segmentId} onSelectSegment={setSegmentId} consentOnly={consentOnly} onChangeConsentOnly={setConsentOnly} estimatedCostRub={estimatedCostRub} activeSegment={activeSegment} channelRateRub={CHANNEL_RATES[channel].rateRub} isSending={isSending} testSent={testSent} onLaunch={handleLaunchCampaign} onTestSend={handleTestSend} />
		</div>
	);
};
