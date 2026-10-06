import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/settings/telegram/TelegramBotStudio.css";

import { SettingsTelegramTab } from "./components/settings/SettingsTelegramTab";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function TelegramStudioPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	useEffect(() => {
		const updateTheme = () => {
			const currentTheme = (document.documentElement.getAttribute("data-theme") || rawTheme) as ThemeMode;
			const resolved = resolveTheme(currentTheme, false);
			applyThemeToRoot(document.documentElement, resolved);
			const isDark = currentTheme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.setAttribute("data-theme", currentTheme);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen p-4 md:p-6`;
		};
		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
		return () => observer.disconnect();
	}, [rawTheme]);

	const mockProps = {
		telegramStatus: {
			botUsername: "smiledent_bot",
			tokenConfigured: true,
			webhookReady: true,
			webhookSecretConfigured: true,
			activeChatLinkCount: 4,
			pendingLinkCodeCount: 1,
			mode: "clinic_owned_bot",
			warnings: [],
			nextActions: [],
		},
		telegramFeaturePlan: {
			enabledFeatures: ["appointment_confirmation", "payment_reminder_notice", "voice_note_intake"],
			patientSafeActions: ["Подтвердить прием", "Перенести запись", "Оплатить счет"],
			blockedByDefault: ["ПДн без согласия", "Диагнозы МКБ", "Снимки КЛКТ"],
		},
		telegramModeDraft: "clinic_owned_bot",
		telegramBotUsernameDraft: "dentecrm_bot",
		telegramOwnBotUsernameDraft: "smiledent_bot",
		telegramBotConfigId: "clinic-main",
		telegramWebhookBaseUrlDraft: "https://crm.dente-clinic.ru",
		telegramPatientPortalBaseUrlDraft: "https://portal.dente-clinic.ru",
		telegramWelcomeImageUrlDraft: "https://dente.ru/welcome.jpg",
		telegramTokenTtlDraft: 15,
		telegramReminderLeadTimesDraft: "24, 2",
		telegramReviewRequestDelayDraft: 2,
		telegramStaffEscalationChannelDraft: "@clinic_admin",
		telegramPrivacyModeDraft: "no_phi_by_default",
		telegramMapsUrlDraft: "https://maps.yandex.ru",
		telegramReviewUrlDraft: "https://prodoctorov.ru",
		telegramAllowVoiceIntakeDraft: true,
		telegramEnabledFeaturesDraft: ["voice_note_intake", "appointment_reminder"],
		typedTelegramFeatureOptions: ["voice_note_intake", "appointment_reminder", "online_booking"],
		telegramFeatureLabel: (f: string) => f,
		telegramFeatureHelp: {
			voice_note_intake: "Прием голосовых аудиосообщений",
			appointment_reminder: "Напоминание о приеме за 24 часа",
			online_booking: "Онлайн-запись пациентов",
		},
		telegramVisualCardFields: [],
		telegramVisualCardUrlDrafts: {},
		typedTelegramPostVisitCheckupDelayDrafts: {},
		telegramPostVisitCheckupDelayFields: [],
		typedTelegramLinkStaffOptions: [{ id: "staff-1", fullName: "Смирнова Е.А." }],
		typedTelegramLinkCodes: [
			{ id: "c1", subjectType: "patient", subjectId: "p1", codeLast4: "4921", status: "pending", expiresAt: new Date(Date.now() + 3600000).toISOString() },
		],
		typedTelegramChatLinks: [
			{ id: "l1", subjectType: "patient", subjectId: "p1", telegramUsername: "ivanov_patient", linkedAt: new Date().toISOString() },
		],
		telegramSubjectName: () => "Иванов Иван Иванович",
		formatDateTime: (d: string) => "06.10.2026 14:00",
		telegramHumanMessage: (s: string) => s || "",
		isTelegramLoading: false,
		markTelegramSettingsDirty: () => {},
		setTelegramOwnBotUsernameDraft: () => {},
		saveTelegramSettings: () => {},
		telegramSettingsSaveState: "saved",
		telegramTemplateLabels: {
			appointment_confirmation: "Подтверждение приема",
			document_ready_notice: "Готовность документа",
			payment_reminder_notice: "Вопрос по оплате",
			recall_notice: "Профосмотр",
			review_request: "Отзыв о визите",
			post_visit_instruction_link: "Памятка после приема",
			post_visit_checkup: "Контроль самочувствия",
			staff_daily_digest: "Сводка сотруднику",
		},
		telegramClassificationLabels: {
			limited_admin: "Безопасный служебный",
		},
		typedTelegramInlineButtonKindLabels: {
			portal: "Портал",
			confirm: "Действие",
		},
		visibleTelegramOutboxItems: [],
		filteredTelegramOutboxItems: [],
	};

	return (
		<div className="max-w-[1400px] mx-auto w-full">
			<SettingsTelegramTab props={mockProps} settingsTab="telegram" />
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<TelegramStudioPreviewApp />
		</React.StrictMode>,
	);
}
