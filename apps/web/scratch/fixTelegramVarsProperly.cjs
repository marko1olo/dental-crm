const fs = require("fs");

const missingVars = [
	"telegramLinkCodeStatusLabels",
	"telegramLinkCodeLedger",
	"loadMoreTelegramLinkCodes",
	"isTelegramLinkCodesLoadingMore",
	"telegramModeLabels",
	"telegramModeDraft",
	"setTelegramModeDraft",
	"normalizedTelegramBotMode",
	"telegramModeHints",
	"telegramBotUsernameDraft",
	"setTelegramBotUsernameDraft",
	"telegramOwnBotUsernameDraft",
	"setTelegramOwnBotUsernameDraft",
	"telegramBotConfigId",
	"setTelegramBotConfigId",
	"telegramWebhookBaseUrlDraft",
	"setTelegramWebhookBaseUrlDraft",
	"telegramPatientPortalBaseUrlDraft",
	"setTelegramPatientPortalBaseUrlDraft",
	"telegramWelcomeImageUrlDraft",
	"setTelegramWelcomeImageUrlDraft",
	"telegramTokenTtlDraft",
	"setTelegramTokenTtlDraft",
	"telegramReminderLeadTimesDraft",
	"setTelegramReminderLeadTimesDraft",
	"telegramReviewRequestDelayDraft",
	"setTelegramReviewRequestDelayDraft",
	"typedTelegramPostVisitCheckupDelayDrafts",
	"telegramStaffEscalationChannelDraft",
	"setTelegramStaffEscalationChannelDraft",
	"telegramPrivacyModeLabels",
	"telegramPrivacyModeDraft",
	"setTelegramPrivacyModeDraft",
	"normalizedTelegramPrivacyMode",
	"telegramPrivacyModeHints",
	"typedTelegramFeatureOptions",
	"typedTelegramEnabledFeaturesDraft",
	"toggleTelegramFeature",
	"telegramFeatureLabel",
	"telegramAllowVoiceIntakeDraft",
	"setTelegramAllowVoiceIntakeDraft",
	"setTelegramEnabledFeaturesDraft",
	"telegramVisualCardUrlDrafts",
	"updateTelegramVisualCardUrlDraft",
	"telegramReviewUrlDraft",
	"setTelegramReviewUrlDraft",
	"telegramMapsUrlDraft",
];

const viewFile = "apps/web/src/SettingsView.tsx";
let viewCode = fs.readFileSync(viewFile, "utf8");

const regex =
	/(<SettingsTelegramTab[\s\S]*?props=\{\{[\s\S]*?telegramPreviewStaffGuidanceId)(\s*)\}\}/;
const newViewVars = missingVars.map((v) => "              " + v).join(",\n");
viewCode = viewCode.replace(regex, "$1,\n" + newViewVars + "$2}}");
fs.writeFileSync(viewFile, viewCode, "utf8");

const tabFile = "apps/web/src/components/settings/SettingsTelegramTab.tsx";
let tabCode = fs.readFileSync(tabFile, "utf8");

const tabRegex = /(telegramPreviewStaffGuidanceId)(\s*)\} = props;/;
const newTabVars = missingVars.map((v) => "    " + v).join(",\n");
tabCode = tabCode.replace(tabRegex, "$1,\n" + newTabVars + "$2} = props;");
fs.writeFileSync(tabFile, tabCode, "utf8");

console.log("Fixed missing variables properly!");
