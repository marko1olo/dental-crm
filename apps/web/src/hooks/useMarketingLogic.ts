import { useEffect, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";

export type MarketingStats = {
	yandex: { rating: number; reviews: number };
	gis2: { rating: number; reviews: number };
	google: { rating: number; reviews: number };
};

export type ReviewTone = "positive" | "negative" | "neutral";

export type MarketingTab = "reviews" | "stats" | "keys" | "nps" | "referrals";
export type MarketingPlatform = "yandex" | "gis2" | "google";

export function useMarketingLogic(clinicName: string, clinicPhone: string) {
	const { auth, dashboard, fetchDashboard } = useAppLogicContext();
	const marketingData = dashboard?.clinicSettings?.profile?.marketingData || {};

	const [customSeoKeys, setCustomSeoKeys] = useState<string[]>(() => {
		return (
			marketingData.customSeoKeys || [
				"лечение кариеса",
				"имплантация зубов",
				"отбеливание",
				"детский стоматолог",
			]
		);
	});

	const [phone, setPhone] = useState(() => {
		return marketingData.phone || clinicPhone || "+7 (800) 000-00-00";
	});

	const [stats, setStats] = useState<MarketingStats>(() => {
		return (
			marketingData.stats || {
				yandex: { rating: 0, reviews: 0 },
				gis2: { rating: 0, reviews: 0 },
				google: { rating: 0, reviews: 0 },
			}
		);
	});

	// NPS State
	const [npsScore, setNpsScore] = useState(() => marketingData.npsScore ?? 9.2);
	const [npsEnabled, setNpsEnabled] = useState(
		() => marketingData.npsEnabled ?? true,
	);
	const [npsSendDelay, setNpsSendDelay] = useState(
		() => marketingData.npsSendDelay ?? 24,
	);
	const [npsMessageTemplate, setNpsMessageTemplate] = useState(
		() =>
			marketingData.npsMessageTemplate ??
			`Здравствуйте! Спасибо, что посетили "${clinicName}". Оцените, пожалуйста, качество приема по 10-балльной шкале, ответив на это СМС. Это займет всего секунду, а нам поможет стать лучше!`,
	);

	// Referral State
	const [refReward, setRefReward] = useState(
		() => marketingData.refReward ?? "1000",
	);
	const [refEnabled, setRefEnabled] = useState(
		() => marketingData.refEnabled ?? true,
	);
	const [refNewDiscount, setRefNewDiscount] = useState(
		() => marketingData.refNewDiscount ?? "10",
	);

	useEffect(() => {
		if (marketingData.customSeoKeys)
			setCustomSeoKeys(marketingData.customSeoKeys);
		if (marketingData.stats) setStats(marketingData.stats);
		if (marketingData.phone) setPhone(marketingData.phone);
		if (marketingData.npsScore !== undefined)
			setNpsScore(marketingData.npsScore);
		if (marketingData.npsEnabled !== undefined)
			setNpsEnabled(marketingData.npsEnabled);
		if (marketingData.npsSendDelay !== undefined)
			setNpsSendDelay(marketingData.npsSendDelay);
		if (marketingData.npsMessageTemplate !== undefined)
			setNpsMessageTemplate(marketingData.npsMessageTemplate);
		if (marketingData.refReward !== undefined)
			setRefReward(marketingData.refReward);
		if (marketingData.refEnabled !== undefined)
			setRefEnabled(marketingData.refEnabled);
		if (marketingData.refNewDiscount !== undefined)
			setRefNewDiscount(marketingData.refNewDiscount);
	}, [
		marketingData.customSeoKeys,
		marketingData.stats,
		marketingData.phone,
		marketingData.npsScore,
		marketingData.npsEnabled,
		marketingData.npsSendDelay,
		marketingData.npsMessageTemplate,
		marketingData.refReward,
		marketingData.refEnabled,
		marketingData.refNewDiscount,
	]);

	const saveMarketingData = async (newData: any) => {
		try {
			const merged = {
				customSeoKeys,
				stats,
				phone,
				npsScore,
				npsEnabled,
				npsSendDelay,
				npsMessageTemplate,
				refReward,
				refEnabled,
				refNewDiscount,
				...newData,
			};
			const res = await fetch("/api/settings/profile", {
				method: "PUT",
				headers: auth.denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ marketingData: merged }),
			});
			if (res.ok) {
				fetchDashboard?.();
			}
		} catch (error) {
			console.error("[Marketing] Save error", error);
		}
	};

	const handleAddSeoKey = (val: string) => {
		if (!val.trim()) return;
		const updated = [...customSeoKeys, val.trim()];
		setCustomSeoKeys(updated);
		saveMarketingData({ customSeoKeys: updated });
	};

	const handleRemoveSeoKey = (val: string) => {
		const updated = customSeoKeys.filter((k: string) => k !== val);
		setCustomSeoKeys(updated);
		saveMarketingData({ customSeoKeys: updated });
	};

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setPhone(val);
	};

	const handlePhoneBlur = () => {
		saveMarketingData({ phone });
	};

	const updateStat = (
		platform: keyof MarketingStats,
		field: "rating" | "reviews",
		value: string,
	) => {
		const num = parseFloat(value) || 0;
		const newStats = {
			...stats,
			[platform]: { ...stats[platform], [field]: num },
		};
		setStats(newStats);
		saveMarketingData({ stats: newStats });
	};

	const [reviewText, setReviewText] = useState("");
	const [tone, setTone] = useState<ReviewTone>("positive");
	const [generatedReply, setGeneratedReply] = useState("");
	const [copied, setCopied] = useState(false);
	const [activeTab, setActiveTab] = useState<MarketingTab>("reviews");
	const [activePlatform, setActivePlatform] = useState<MarketingPlatform>("yandex");

	const [newKeyInput, setNewKeyInput] = useState("");
	const [isAiLoading, setIsAiLoading] = useState(false);
	const [aiError, setAiError] = useState<string | null>(null);

	const handleGenerate = async () => {
		if (!reviewText.trim()) return;
		setIsAiLoading(true);
		setAiError(null);
		setGeneratedReply("");

		try {
			const res = await fetch("/api/ai/marketing-reply", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					reviewText,
					tone,
					clinicName,
					seoKeys: customSeoKeys,
				}),
			});

			if (!res.ok) {
				throw new Error("Не удалось сгенерировать ответ ИИ");
			}

			const data = await res.json();
			setGeneratedReply(data.reply);
		} catch (error: any) {
			console.error("[Marketing AI error]", error);
			setAiError(error.message || "Ошибка соединения");
		} finally {
			setIsAiLoading(false);
		}
	};

	const handleCopy = () => {
		if (!generatedReply) return;
		navigator.clipboard.writeText(generatedReply).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		});
	};

	const clearAll = () => {
		setReviewText("");
		setGeneratedReply("");
		setCopied(false);
	};

	return {
		state: {
			customSeoKeys,
			phone,
			stats,
			npsScore,
			npsEnabled,
			npsSendDelay,
			npsMessageTemplate,
			refReward,
			refEnabled,
			refNewDiscount,
			reviewText,
			tone,
			generatedReply,
			copied,
			activeTab,
			activePlatform,
			newKeyInput,
			isAiLoading,
			aiError,
		},
		actions: {
			setReviewText,
			setTone,
			setActiveTab,
			setActivePlatform,
			setNewKeyInput,
			setNpsScore,
			setNpsEnabled,
			setNpsSendDelay,
			setNpsMessageTemplate,
			setRefReward,
			setRefEnabled,
			setRefNewDiscount,
			saveMarketingData,
			handleAddSeoKey,
			handleRemoveSeoKey,
			handlePhoneChange,
			handlePhoneBlur,
			updateStat,
			handleGenerate,
			handleCopy,
			clearAll,
		},
	};
}
