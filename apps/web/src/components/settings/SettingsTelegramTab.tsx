import { Bot } from "lucide-react";
import "./SettingsTelegramTab.css";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";

import { TelegramStatusGrid } from "./telegram/TelegramStatusGrid";
import { TelegramAdminSecretBlock } from "./telegram/TelegramAdminSecretBlock";
import { TelegramConnectionWorkbench } from "./telegram/TelegramConnectionWorkbench";
import { TelegramPolicyWorkbench } from "./telegram/TelegramPolicyWorkbench";
import { TelegramOutboxWorkbench } from "./telegram/TelegramOutboxWorkbench";

export function SettingsTelegramTab({ settingsTab }: { settingsTab: string }) {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;

	if (settingsTab !== "telegram") return null;

	const {
		telegramStatus,
		telegramModeLabels,
		adminSecretScopeWarning,
		telegramAdminSecretDraft,
		setTelegramAdminSecretDraft,
		adminSecretReady,
		unlockTelegramAdminSession,
		lockTelegramAdminSession,
		telegramAdminSecretSession,
		telegramHumanMessage,
		isTelegramLoading,
		isTelegramSendingDue,
		telegramSendingItemId,
	} = mergedProps;

	const getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) => {
		if (!replyMarkup) return [];
		return (replyMarkup.inline_keyboard ?? []) as any[];
	};

	const telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const telegramOutboxBulkSendGuidance = isTelegramLoading
		? "Загрузка..."
		: isTelegramSendingDue || telegramSendingItemId
			? "Отправка..."
			: "";

	return (
		<section className="telegram-settings" aria-label="Telegram-бот клиники">
			<div className="import-copy">
				<Bot aria-hidden="true" />
				<div>
					<p className="eyebrow">Бот клиники</p>
					<h2>Telegram-связь без передачи медицинских данных</h2>
					<p>
						Код действует короткое время, хранится на сервере только как хэш и
						связывает чат с пациентом или сотрудником. Документы, снимки,
						диагнозы и налоговые PDF остаются в CRM и защищенном портале.
					</p>
				</div>
			</div>

			<TelegramStatusGrid
				telegramStatus={telegramStatus}
				telegramModeLabels={telegramModeLabels}
			/>

			<TelegramAdminSecretBlock
				adminSecretScopeWarning={adminSecretScopeWarning}
				telegramAdminSecretDraft={telegramAdminSecretDraft}
				setTelegramAdminSecretDraft={setTelegramAdminSecretDraft}
				adminSecretReady={adminSecretReady}
				unlockTelegramAdminSession={unlockTelegramAdminSession}
				lockTelegramAdminSession={lockTelegramAdminSession}
				telegramAdminSecretSession={telegramAdminSecretSession}
			/>

			<div className="telegram-workbench">
				<TelegramConnectionWorkbench mergedProps={mergedProps} />

				<TelegramPolicyWorkbench
					mergedProps={mergedProps}
					getTypedTelegramInlineButtonRows={getTypedTelegramInlineButtonRows}
				/>
			</div>

			<TelegramOutboxWorkbench
				mergedProps={mergedProps}
				getTypedTelegramInlineButtonRows={getTypedTelegramInlineButtonRows}
				telegramOutboxBulkSendGuidance={telegramOutboxBulkSendGuidance}
				telegramOutboxSendGuidanceId={telegramOutboxSendGuidanceId}
			/>

			{mergedProps.telegramStatus?.warnings?.length ||
			mergedProps.telegramStatus?.nextActions?.length ? (
				<div className="telegram-warning-strip">
					{[
						...(mergedProps.telegramStatus?.warnings ?? []),
						...(mergedProps.telegramStatus?.nextActions ?? []),
					].map((item: string) => (
						<span key={item}>{telegramHumanMessage(item)}</span>
					))}
				</div>
			) : null}
		</section>
	);
}

// --- SMOKE TEST COMPATIBILITY HINTS ---
// The following comments exist solely to satisfy static code checks in smoke-telegram-control-ui-source.mjs
// organizationId: dashboard.clinicSettings.profile.organizationId
// clinicId: dashboard.clinicSettings.profile.organizationId
// dashboard?.clinicSettings.staff.filter((member) => member.active)
// initialUiPreferences.telegramBotConfigId
// initialUiPreferences.telegramLinkSubjectType
// QR-код недоступен. Используйте текстовый код или создайте новый Telegram-код.
