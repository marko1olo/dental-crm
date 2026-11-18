import fs from "node:fs";
import path from "node:path";

const targetDir = "apps/web/src/components/messaging/styles";
if (!fs.existsSync(targetDir)) {
	fs.mkdirSync(targetDir, { recursive: true });
}

// 1. omnichannelThemeTokens.css
const themeTokens = `/* omnichannelThemeTokens.css — Дизайн-токены каналов, плашки и статусы (Мандат 8b) */
:root {
	--waba-green: #25d366;
	--tg-blue: #0088cc;
	--vk-blue: #0077ff;
	--sms-purple: #6366f1;
}

.text-ok { color: var(--ok-fg); }
.text-bad { color: var(--bad-fg); }
.text-amber { color: var(--warn-fg); }

.hub-channel-icon-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border-radius: 6px;
	font-size: 0.75rem;
	font-weight: 700;
	color: #ffffff;
}

.hub-channel-icon-pill.whatsapp { background: var(--waba-green); }
.hub-channel-icon-pill.telegram { background: var(--tg-blue); }
.hub-channel-icon-pill.vk { background: var(--vk-blue); }
.hub-channel-icon-pill.sms { background: var(--sms-purple); }
.hub-channel-icon-pill.web { background: var(--teal); }

.hub-status-pill {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 20px;
	font-size: 0.75rem;
	color: var(--ink-2);
}

.hub-status-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.hub-status-dot.green {
	background: var(--ok-fg);
	box-shadow: 0 0 6px var(--ok-fg);
}

.hub-status-dot.blue {
	background: #0284c7;
	box-shadow: 0 0 6px #0284c7;
}

.hub-status-pill.nps-badge {
	background: var(--paper-soft);
	border-color: var(--teal);
	font-weight: 600;
}

.hub-status-name { color: var(--muted); }
.hub-status-val { color: var(--ink); font-weight: 600; }
`;

// 2. omnichannelLayout.css
const layout = `/* omnichannelLayout.css — Оверлей, контейнеры модалок и вкладки (Мандат 8b) */
.omnichannel-modal-overlay {
	position: fixed;
	inset: 0;
	z-index: 1050;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(15, 23, 42, 0.72);
	backdrop-filter: blur(6px);
	padding: 16px;
	box-sizing: border-box;
}

.omnichannel-modal-container {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	max-height: calc(100vh - 32px);
	background: var(--paper);
	color: var(--ink);
	border: 1px solid var(--line-strong);
	border-radius: 12px;
	box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
	overflow: hidden;
	box-sizing: border-box;
}

.hub-main-container { max-width: 1280px; height: 860px; }
.sbp-modal-container { max-width: 840px; height: auto; }

.hub-tabs-navigation {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 0 20px;
	background: var(--paper-strong);
	border-bottom: 1px solid var(--line);
	overflow-x: auto;
	white-space: nowrap;
	flex-wrap: nowrap;
}

.hub-nav-tab {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px;
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	color: var(--muted);
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	white-space: nowrap;
	flex-shrink: 0;
	transition: color 0.15s ease, border-color 0.15s ease;
}

.hub-nav-tab:hover { color: var(--ink); }

.hub-nav-tab.active {
	color: var(--teal);
	border-bottom-color: var(--teal);
}

.hub-tab-badge {
	padding: 2px 6px;
	background: var(--paper-soft);
	border: 1px solid var(--line);
	border-radius: 10px;
	font-size: 0.72rem;
	font-weight: 700;
}

.hub-tab-badge.nps { background: rgba(13, 148, 136, 0.12); color: var(--teal); }
.hub-tab-content-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.hub-chat-workspace { display: flex; flex: 1; height: 100%; overflow: hidden; }
.hub-active-chat-pane { flex: 1; display: flex; flex-direction: column; background: var(--paper); overflow: hidden; }
`;

// 3. omnichannelHeader.css
const header = `/* omnichannelHeader.css — Шапка модального центра сообщений (Мандат 8b) */
.omnichannel-modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: var(--paper-strong);
	border-bottom: 1px solid var(--line);
	gap: 12px;
	box-sizing: border-box;
}

.hub-header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }

.hub-header-icon-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 38px;
	height: 38px;
	background: var(--teal);
	color: #ffffff;
	border-radius: 10px;
	flex-shrink: 0;
}

.omnichannel-modal-title {
	margin: 0;
	font-size: 1.05rem;
	font-weight: 700;
	color: var(--ink);
	line-height: 1.2;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hub-header-sub { margin: 2px 0 0 0; font-size: 0.76rem; color: var(--muted); }
.hub-channel-status-bar { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.omnichannel-modal-close {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 6px;
	color: var(--muted);
	cursor: pointer;
	flex-shrink: 0;
	transition: background 0.15s ease, color 0.15s ease;
}

.omnichannel-modal-close:hover {
	background: var(--paper-soft);
	color: var(--ink);
}
`;

// 4. omnichannelConversationsList.css
const conversationsList = `/* omnichannelConversationsList.css — Список диалогов и фильтры контактов (Мандат 8b) */
.hub-contacts-sidebar {
	width: 320px;
	display: flex;
	flex-direction: column;
	background: var(--paper-soft);
	border-right: 1px solid var(--line);
	overflow: hidden;
	flex-shrink: 0;
}

.hub-contacts-search { padding: 10px 12px; border-bottom: 1px solid var(--line); }

.hub-contacts-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }

.hub-contact-card {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	background: transparent;
	border: none;
	border-bottom: 1px solid var(--line);
	text-align: left;
	color: inherit;
	transition: background 0.15s ease;
}

.hub-contact-card:hover { background: var(--paper); }
.hub-contact-card.selected { background: var(--paper); border-left: 3px solid var(--teal); }

.hub-contact-avatar {
	width: 38px;
	height: 38px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #ffffff;
	font-weight: 700;
	font-size: 0.88rem;
	flex-shrink: 0;
}

.hub-contact-info { flex: 1; min-width: 0; }

.hub-contact-row-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 3px;
}

.hub-contact-name {
	font-size: 0.85rem;
	font-weight: 600;
	color: var(--ink);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hub-contact-snippet {
	font-size: 0.76rem;
	color: var(--muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin: 0;
}

.hub-unread-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	background: var(--teal);
	color: #ffffff;
	border-radius: 10px;
	font-size: 0.7rem;
	font-weight: 700;
	margin-left: 6px;
}

.hub-filter-channels-group { display: flex; align-items: center; gap: 4px; padding: 6px 14px; }
.hub-filter-btn { padding: 4px 8px; border-radius: 6px; font-size: 0.74rem; border: 1px solid var(--line); background: var(--paper); color: var(--muted); }
.hub-filter-btn.active { background: var(--teal); color: #fff; border-color: var(--teal); }
`;

// 5. omnichannelPatientCard.css
const patientCard = `/* omnichannelPatientCard.css — Досье пациента, шапка диалога и действия (Мандат 8b) */
.hub-chat-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	background: var(--paper-strong);
	border-bottom: 1px solid var(--line);
	gap: 12px;
	flex-shrink: 0;
	flex-wrap: wrap;
}

.hub-chat-patient-meta { display: flex; align-items: center; gap: 10px; }

.hub-chat-avatar-large {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #ffffff;
	font-weight: 700;
	font-size: 0.95rem;
	flex-shrink: 0;
}

.hub-chat-patient-title-row { display: flex; align-items: center; gap: 8px; }
.hub-chat-patient-name { margin: 0; font-size: 0.92rem; font-weight: 700; color: var(--ink); }
.hub-phone-chip { font-size: 0.78rem; color: var(--muted); }
.hub-chat-quick-details { display: flex; align-items: center; gap: 6px; margin-top: 2px; flex-wrap: wrap; }

.hub-detail-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 7px;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 4px;
	font-size: 0.72rem;
	color: var(--ink-2);
}

.hub-detail-chip.highlight { background: rgba(13, 148, 136, 0.1); border-color: var(--teal); color: var(--teal); }
.hub-chat-header-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.hub-btn-takeover { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; background: rgba(245, 158, 11, 0.12); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
.hub-btn-back-contacts { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--paper); border: 1px solid var(--line); border-radius: 6px; font-size: 0.74rem; font-weight: 600; color: var(--ink); cursor: pointer; }
/* Второстепенная кнопка СБП (Мандат 8am: ровно 1 Primary CTA) */
.hub-btn-sbp-invoice {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 6px 10px;
	background: var(--paper);
	color: var(--ink);
	border: 1px solid var(--line);
	border-radius: 8px;
	font-size: 0.78rem;
	font-weight: 600;
	cursor: pointer;
	transition: border-color 0.15s ease, background 0.15s ease;
}

.hub-btn-sbp-invoice:hover {
	border-color: var(--teal);
	background: var(--paper-soft);
}

.hub-patient-sidebar-panel { width: 280px; border-left: 1px solid var(--line); background: var(--paper-soft); padding: 14px; }
.hub-patient-sidebar-card { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
.hub-patient-sidebar-header { font-size: 0.82rem; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
`;

// 6. omnichannelMessageFeed.css
const messageFeed = `/* omnichannelMessageFeed.css — Лента пузырей переписки, вложения и статусы (Мандат 8b) */
.hub-messages-feed {
	flex: 1;
	overflow-y: auto;
	padding: 20px 20px 16px 20px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	background: var(--paper-soft);
}

.hub-empty-feed {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--muted);
	gap: 8px;
	font-size: 0.9rem;
}

.hub-message-bubble-wrapper { display: flex; width: 100%; }
.hub-message-bubble-wrapper.outbound { justify-content: flex-end; }
.hub-message-bubble-wrapper.inbound { justify-content: flex-start; }

.hub-message-bubble {
	max-width: 65%;
	padding: 10px 14px;
	border-radius: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: column;
	gap: 6px;
	position: relative;
	box-sizing: border-box;
}

.hub-message-bubble-wrapper.outbound .hub-message-bubble {
	background: var(--paper-strong);
	border: 1px solid var(--line-strong);
	border-bottom-right-radius: 2px;
}

.hub-message-bubble-wrapper.inbound .hub-message-bubble {
	background: var(--paper);
	border: 1px solid var(--line);
	border-bottom-left-radius: 2px;
}

.hub-message-bubble.whatsapp { border-left: 3px solid var(--ok-fg); }
.hub-message-bubble.telegram { border-left: 3px solid #0284c7; }
.hub-message-bubble.sms { border-left: 3px solid var(--muted); }

.hub-msg-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hub-msg-sender { font-size: 0.72rem; font-weight: 700; color: var(--teal); }

.hub-msg-channel-tag {
	font-size: 0.62rem;
	font-weight: 700;
	padding: 1px 4px;
	border-radius: 3px;
	background: var(--paper);
	border: 1px solid var(--line);
}

.hub-msg-body-text { font-size: 0.84rem; line-height: 1.45; color: var(--ink); word-break: break-word; }
.hub-msg-interactive-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }

.hub-msg-interactive-btn {
	padding: 5px 10px;
	background: var(--paper);
	border: 1px solid var(--line-strong);
	border-radius: 6px;
	font-size: 0.76rem;
	font-weight: 600;
	color: var(--ink);
	cursor: pointer;
}

.hub-msg-interactive-btn.primary { background: var(--teal); color: #ffffff; border-color: var(--teal); }
.hub-msg-attachments { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }

.hub-msg-attachment-item {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 10px;
	background: var(--paper-soft);
	border: 1px solid var(--line);
	border-radius: 6px;
	font-size: 0.78rem;
}

.att-name { color: var(--ink); font-weight: 500; }
.att-size { color: var(--muted); font-size: 0.7rem; }
.hub-msg-footer { display: flex; align-items: center; justify-content: flex-end; gap: 6px; font-size: 0.7rem; color: var(--muted); }
.hub-msg-time { font-size: 0.7rem; }
.hub-msg-status { display: flex; align-items: center; }
`;

// 7. omnichannelInputToolbar.css
const inputToolbar = `/* omnichannelInputToolbar.css — Панель ввода, вложения и Primary CTA отправки (Мандат 8b) */
.hub-chat-input-area {
	padding: 12px 20px;
	background: var(--paper-strong);
	border-top: 1px solid var(--line);
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex-shrink: 0;
}

.hub-input-top-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.hub-channel-select-wrap, .hub-template-quick-select-wrap { display: flex; align-items: center; gap: 6px; }
.hub-input-bar-label { font-size: 0.74rem; color: var(--muted); font-weight: 600; }

.hub-channel-select, .hub-template-select {
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 6px;
	padding: 5px 8px;
	font-size: 0.78rem;
	color: var(--ink);
	outline: none;
}

.hub-channel-select:focus, .hub-template-select:focus { border-color: var(--teal); }
.hub-textarea-container { position: relative; display: flex; flex-direction: column; }

.hub-message-textarea {
	width: 100%;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 10px 12px;
	padding-bottom: 38px;
	font-size: 0.86rem;
	font-family: inherit;
	color: var(--ink);
	resize: none;
	outline: none;
	box-sizing: border-box;
}

.hub-message-textarea:focus {
	border-color: var(--teal);
	box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.15);
}

.hub-textarea-actions {
	position: absolute;
	bottom: 8px;
	right: 8px;
	left: 8px;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.hub-icon-action-btn {
	background: transparent;
	border: none;
	color: var(--muted);
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.hub-icon-action-btn:hover { color: var(--ink); background: var(--paper-soft); }

/* Единственная Primary CTA изумрудная кнопка (Мандат 8am) */
.hub-btn-send {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 14px;
	background: var(--teal);
	color: #ffffff;
	border: none;
	border-radius: 8px;
	font-size: 0.8rem;
	font-weight: 600;
	cursor: pointer;
	box-shadow: 0 2px 6px rgba(13, 148, 136, 0.28);
	transition: opacity 0.15s ease;
}

.hub-btn-send:hover { opacity: 0.92; }
.hub-btn-send:disabled { opacity: 0.45; cursor: not-allowed; }
`;

// 8. omnichannelQuickBooking.css
const quickBooking = `/* omnichannelQuickBooking.css — Шторка быстрой записи слота в расписание (Мандат 8b) */
.hub-btn-quick-booking {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 6px 10px;
	background: var(--paper);
	color: var(--ink);
	border: 1px solid var(--line);
	border-radius: 8px;
	font-size: 0.78rem;
	font-weight: 600;
	cursor: pointer;
	transition: border-color 0.15s ease, background 0.15s ease;
}

.hub-btn-quick-booking:hover {
	border-color: var(--teal);
	background: var(--paper-soft);
}

.hub-quick-booking-drawer {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 340px;
	max-width: 100%;
	background: var(--paper);
	border-left: 1px solid var(--line-strong);
	box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
	display: flex;
	flex-direction: column;
	z-index: 40;
}

.hub-quick-booking-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: var(--paper-strong);
	border-bottom: 1px solid var(--line);
}

.hub-quick-booking-title { font-size: 0.9rem; font-weight: 700; color: var(--ink); margin: 0; }
.hub-quick-booking-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.hub-quick-booking-slots-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }

.hub-quick-booking-slot-btn {
	padding: 6px;
	border-radius: 6px;
	border: 1px solid var(--line);
	background: var(--paper-soft);
	font-size: 0.78rem;
	font-weight: 600;
	color: var(--ink);
	text-align: center;
	cursor: pointer;
}

.hub-quick-booking-slot-btn:hover { border-color: var(--teal); background: var(--paper); }
.hub-quick-booking-slot-btn.selected { background: var(--teal); color: #ffffff; border-color: var(--teal); }

.hub-quick-booking-footer {
	padding: 12px 16px;
	background: var(--paper-strong);
	border-top: 1px solid var(--line);
	display: flex;
	justify-content: flex-end;
}
`;

// 9. omnichannelTemplates.css
const templates = `/* omnichannelTemplates.css — Вкладка клинических шаблонов сообщений (Мандат 8b) */
.hub-templates-workspace {
	flex: 1;
	padding: 20px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.hub-templates-header { display: flex; flex-direction: column; gap: 4px; }
.hub-templates-title { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--ink); }
.hub-templates-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }
.hub-templates-filters { display: flex; gap: 8px; flex-wrap: wrap; }

.hub-tpl-filter-pill {
	padding: 5px 12px;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 20px;
	font-size: 0.78rem;
	color: var(--muted);
	cursor: pointer;
}

.hub-tpl-filter-pill.active { background: var(--teal); color: #ffffff; border-color: var(--teal); }
.hub-templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }

.hub-template-card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 14px;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 10px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.hub-tpl-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.hub-tpl-badge-category { font-size: 0.72rem; font-weight: 600; color: var(--teal); display: inline-flex; align-items: center; gap: 4px; }
.hub-tpl-channel-tag { font-size: 0.68rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: var(--paper-soft); border: 1px solid var(--line); color: var(--muted); }
.hub-tpl-name { margin: 0 0 4px 0; font-size: 0.92rem; font-weight: 700; color: var(--ink); }
.hub-tpl-desc { font-size: 0.76rem; color: var(--muted); margin: 0 0 10px 0; }
.hub-tpl-preview-box { padding: 10px; background: var(--paper-soft); border: 1px solid var(--line); border-radius: 6px; font-size: 0.8rem; color: var(--ink-2); line-height: 1.4; margin-bottom: 10px; white-space: pre-wrap; }
.hub-tpl-variables-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-bottom: 12px; }
.hub-tpl-vars-label { font-size: 0.72rem; color: var(--muted); font-weight: 600; }
.hub-tpl-var-chip { font-size: 0.7rem; padding: 2px 6px; background: var(--paper); border: 1px solid var(--line); border-radius: 4px; color: var(--ink); }

.hub-btn-apply-template {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 8px 12px;
	background: var(--paper-soft);
	border: 1px solid var(--teal);
	color: var(--teal);
	border-radius: 8px;
	font-size: 0.8rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s ease, color 0.15s ease;
}

.hub-btn-apply-template:hover { background: var(--teal); color: #ffffff; }
`;

// 10. omnichannelNpsMetrics.css
const npsMetrics = `/* omnichannelNpsMetrics.css — Метрики дашборда NPS и удовлетворенности (Мандат 8b) */
.hub-nps-workspace {
	flex: 1;
	padding: 20px;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.hub-nps-metrics-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 14px;
}

.hub-nps-metric-card {
	display: flex;
	flex-direction: column;
	padding: 14px;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 10px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.metric-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.metric-title { font-size: 0.76rem; color: var(--muted); font-weight: 600; }
.metric-val-num { font-size: 1.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 6px; }
.metric-count { font-size: 0.85rem; font-weight: 600; opacity: 0.8; }
.metric-bar-track { height: 6px; background: var(--paper-soft); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.metric-bar-fill { height: 100%; border-radius: 3px; }
.bar-promoter { background: var(--ok-fg); }
.bar-neutral { background: var(--warn-fg); }
.bar-detractor { background: var(--bad-fg); }
.metric-hint { font-size: 0.72rem; color: var(--muted); margin: 0; }
`;

// 11. omnichannelNpsTable.css
const npsTable = `/* omnichannelNpsTable.css — Таблица отзывов NPS и рейтингов пациентов (Мандат 8b) */
.hub-nps-table-container {
	display: flex;
	flex-direction: column;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 10px;
	overflow: hidden;
}

.hub-nps-table-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--line);
	background: var(--paper-strong);
}

.hub-nps-header-left { display: flex; align-items: center; gap: 10px; }
.hub-nps-table-title { font-size: 0.92rem; font-weight: 700; color: var(--ink); margin: 0; }
.hub-nps-count-badge { font-size: 0.74rem; padding: 2px 8px; border-radius: 12px; background: var(--paper-soft); border: 1px solid var(--line); color: var(--muted); }
.hub-nps-table-filters { display: flex; align-items: center; gap: 12px; }
.hub-filter-select-wrap { display: flex; align-items: center; gap: 6px; font-size: 0.76rem; }
.filter-label { color: var(--muted); font-weight: 600; }
.hub-nps-select { padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); color: var(--ink); font-size: 0.76rem; }

.hub-nps-table-scroll { overflow-x: auto; }
.hub-nps-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.hub-nps-table th { padding: 10px 14px; text-align: left; font-weight: 600; color: var(--muted); border-bottom: 1px solid var(--line); background: var(--paper-soft); }
.hub-nps-table td { padding: 12px 14px; border-bottom: 1px solid var(--line); color: var(--ink); }
.hub-table-empty { text-align: center; color: var(--muted); padding: 32px 16px; font-style: italic; }
`;

// 12. omnichannelSbpQr.css
const sbpQr = `/* omnichannelSbpQr.css — Бренд, QR-фрейм и радар эквайринга СБП (Мандат 8b) */
.sbp-header-brand { display: flex; align-items: center; gap: 12px; }

.sbp-emblem-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	background: #1d3557;
	border-radius: 10px;
	flex-shrink: 0;
}

.sbp-icon-tri { width: 22px; height: 22px; color: #f1faee; }
.sbp-brand-text { display: flex; flex-direction: column; }
.sbp-modal-title { margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--ink); }
.sbp-modal-subtitle { margin: 2px 0 0 0; font-size: 0.78rem; color: var(--muted); }

.sbp-modal-body {
	display: grid;
	grid-template-columns: 320px 1fr;
	gap: 20px;
	padding: 20px;
	overflow-y: auto;
}

.sbp-qr-column { display: flex; flex-direction: column; align-items: center; gap: 12px; }

.sbp-qr-frame {
	position: relative;
	padding: 16px;
	background: #ffffff;
	border: 2px solid var(--line-strong);
	border-radius: 16px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.sbp-qr-wrapper { display: flex; align-items: center; justify-content: center; }
.sbp-qr-svg-holder svg { display: block; width: 200px; height: 200px; }

.sbp-qr-radar-sweep {
	position: absolute;
	inset: 0;
	border-radius: 14px;
	border: 2px dashed rgba(13, 148, 136, 0.35);
	pointer-events: none;
}

.sbp-qr-corner-bracket { position: absolute; width: 14px; height: 14px; border-color: var(--teal); }
.sbp-qr-countdown-box { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--muted); }
.sbp-qr-timer-text { font-weight: 700; color: var(--ink); }
.sbp-supported-banks-row { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.sbp-bank-logo-chip { font-size: 0.68rem; padding: 2px 6px; background: var(--paper-soft); border: 1px solid var(--line); border-radius: 4px; color: var(--muted); }
`;

// 13. omnichannelSbpDetails.css
const sbpDetails = `/* omnichannelSbpDetails.css — Счет, действия и статусы СБП (Мандат 8b) */
.sbp-details-column { display: flex; flex-direction: column; gap: 14px; }

.sbp-invoice-summary-card {
	padding: 16px;
	background: var(--paper-soft);
	border: 1px solid var(--line);
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.sbp-summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.84rem; }
.sbp-summary-label { color: var(--muted); }
.sbp-summary-value { font-weight: 600; color: var(--ink); }
.sbp-amount-highlight { font-size: 1.4rem; font-weight: 800; color: var(--teal); }

.sbp-live-status-pill {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 20px;
	font-size: 0.8rem;
	font-weight: 700;
}

.sbp-live-status-pill.status-awaiting_scan { background: rgba(234, 179, 8, 0.15); color: #d97706; border: 1px solid rgba(234, 179, 8, 0.3); }
.sbp-live-status-pill.status-paid_success { background: rgba(34, 197, 94, 0.15); color: #16a34a; border: 1px solid rgba(34, 197, 94, 0.3); }
.sbp-live-status-pill.status-expired { background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); }

.sbp-actions-section { display: flex; flex-direction: column; gap: 8px; }
.sbp-actions-heading { font-size: 0.78rem; font-weight: 700; color: var(--muted); margin: 0; }
.sbp-action-buttons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.sbp-action-btn, .sbp-copy-link-btn, .sbp-send-sms-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 8px 12px;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 8px;
	font-size: 0.78rem;
	font-weight: 600;
	color: var(--ink);
	cursor: pointer;
}

.sbp-action-btn:hover, .sbp-copy-link-btn:hover, .sbp-send-sms-btn:hover { border-color: var(--teal); background: var(--paper-soft); }
.sbp-cashier-override { margin-top: 10px; display: flex; justify-content: flex-end; }
.sbp-cashier-confirm-btn { padding: 6px 12px; font-size: 0.76rem; border: 1px dashed var(--line-strong); background: transparent; color: var(--muted); border-radius: 6px; cursor: pointer; }
.sbp-embedded-drawer { position: absolute; inset: 0; z-index: 50; background: var(--paper); display: flex; flex-direction: column; overflow-y: auto; border-radius: 12px; }
`;

// 14. omnichannelFooter.css
const footer = `/* omnichannelFooter.css — Футер модалки и юридические уведомления (Мандат 8b) */
.omnichannel-modal-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	background: var(--paper-strong);
	border-top: 1px solid var(--line);
	flex-shrink: 0;
}

.hub-footer-status { display: flex; align-items: center; gap: 8px; font-size: 0.74rem; color: var(--muted); }
.sbp-footer-legal { font-size: 0.72rem; color: var(--muted); display: flex; align-items: center; gap: 8px; }
.sbp-legal-link { color: var(--teal); text-decoration: underline; }

.omnichannel-btn-secondary {
	padding: 6px 14px;
	background: var(--paper);
	border: 1px solid var(--line);
	border-radius: 8px;
	font-size: 0.8rem;
	font-weight: 600;
	color: var(--ink);
	cursor: pointer;
	transition: background 0.15s ease, border-color 0.15s ease;
}

.omnichannel-btn-secondary:hover {
	background: var(--paper-soft);
	border-color: var(--line-strong);
}
`;

// 15. omnichannelMobile.css
const mobile = `/* omnichannelMobile.css — Apple HIG мобильная адаптивность для 390x844 (Мандат 8b) */
@media (max-width: 768px) {
	.omnichannel-modal-overlay { padding: 0; }
	.omnichannel-modal-container {
		max-height: 100vh;
		height: 100vh;
		border-radius: 0;
		border: none;
		max-width: 100vw;
		overflow-x: clip;
	}
	.hub-main-container { height: 100vh; max-width: 100vw; }
	.hub-header-sub { display: none; }
	.hub-channel-status-bar { display: none; }
	.hub-tabs-navigation { padding: 0 8px; gap: 2px; }
	.hub-nav-tab { padding: 8px 10px; font-size: 0.78rem; min-height: 44px; flex-shrink: 0; white-space: nowrap; }
	.hub-chat-workspace { flex-direction: column; height: 100%; }
	.hub-contacts-sidebar { width: 100%; height: 100%; border-right: none; }
	.hub-contacts-sidebar.mobile-hidden { display: none !important; }
	.hub-active-chat-pane.mobile-hidden { display: none !important; }
	.hub-chat-header { padding: 8px 12px; flex-wrap: wrap; gap: 8px; }
	.hub-chat-header-actions { width: 100%; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
	.hub-message-bubble { max-width: 90%; }
	.hub-chat-input-area {
		padding: 8px 12px;
		padding-bottom: max(10px, env(safe-area-inset-bottom));
	}
	.hub-input-top-bar { flex-direction: column; align-items: stretch; gap: 6px; }
	.hub-btn-send { min-height: 44px; padding: 8px 16px; }
	.omnichannel-modal-close { min-width: 44px; min-height: 44px; }
	.hub-nps-metrics-grid { grid-template-columns: 1fr; }
	.sbp-modal-body { grid-template-columns: 1fr; }
}
`;

const files = {
	"omnichannelThemeTokens.css": themeTokens,
	"omnichannelLayout.css": layout,
	"omnichannelHeader.css": header,
	"omnichannelConversationsList.css": conversationsList,
	"omnichannelPatientCard.css": patientCard,
	"omnichannelMessageFeed.css": messageFeed,
	"omnichannelInputToolbar.css": inputToolbar,
	"omnichannelQuickBooking.css": quickBooking,
	"omnichannelTemplates.css": templates,
	"omnichannelNpsMetrics.css": npsMetrics,
	"omnichannelNpsTable.css": npsTable,
	"omnichannelSbpQr.css": sbpQr,
	"omnichannelSbpDetails.css": sbpDetails,
	"omnichannelFooter.css": footer,
	"omnichannelMobile.css": mobile,
};

let anyError = false;
for (const [filename, content] of Object.entries(files)) {
	const trimmed = content.trim() + "\n";
	const lineCount = trimmed.split("\n").length;
	console.log(`${filename.padEnd(35)}: ${lineCount} lines`);
	if (lineCount > 110) {
		console.error(`ERROR: ${filename} exceeds 110 lines (${lineCount})!`);
		anyError = true;
	}
	fs.writeFileSync(path.join(targetDir, filename), trimmed);
}

if (anyError) {
	process.exit(1);
}

// Write the thin facade omnichannelHub.css
const facade = `/* omnichannelHub.css — Тонкий фасад стилей центра сообщений (Мандат 8b) */
@import "./styles/omnichannelThemeTokens.css";
@import "./styles/omnichannelLayout.css";
@import "./styles/omnichannelHeader.css";
@import "./styles/omnichannelConversationsList.css";
@import "./styles/omnichannelPatientCard.css";
@import "./styles/omnichannelMessageFeed.css";
@import "./styles/omnichannelInputToolbar.css";
@import "./styles/omnichannelQuickBooking.css";
@import "./styles/omnichannelTemplates.css";
@import "./styles/omnichannelNpsMetrics.css";
@import "./styles/omnichannelNpsTable.css";
@import "./styles/omnichannelSbpQr.css";
@import "./styles/omnichannelSbpDetails.css";
@import "./styles/omnichannelFooter.css";
@import "./styles/omnichannelMobile.css";
`;

fs.writeFileSync("apps/web/src/components/messaging/omnichannelHub.css", facade.trim() + "\n");
console.log(`omnichannelHub.css written: ${facade.trim().split("\n").length} lines (<= 20 lines)`);
