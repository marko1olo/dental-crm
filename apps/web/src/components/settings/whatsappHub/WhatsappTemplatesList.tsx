/**
 * @file WhatsappTemplatesList.tsx
 * @description Component for WhatsApp notification templates, staff routing rules, test message dispatch, and hub settings save.
 */

import React from "react";
import { AlertCircle, Check, RefreshCw, Send } from "lucide-react";
import { MessengerRoutingRules } from "../MessengerRoutingRules.js";
import type { WhatsappStaffRouting } from "../../../hooks/useWhatsappSettings.js";
import type { StaffOption, TemplateFeatureItem, WaTestSendResult } from "./types.js";

const DEFAULT_FEATURES: TemplateFeatureItem[] = [
	{ id: "appointment_reminders", label: "Напоминания за 24 ч" },
	{ id: "appointment_confirmation", label: "Быстрое подтверждение визита" },
	{ id: "post_visit_instructions", label: "Инструкции после лечения (СОП)" },
	{ id: "document_ready_notice", label: "Готовность справок и выписок" },
];

export interface WhatsappTemplatesListProps {
	isActiveDraft: boolean;
	setIsActiveDraft: (active: boolean) => void;
	enabledFeaturesDraft: string[];
	setEnabledFeaturesDraft: (features: string[]) => void;
	staffRoutingDraft: WhatsappStaffRouting;
	setStaffRoutingDraft: (routing: WhatsappStaffRouting) => void;
	staffOptions?: StaffOption[];
	testWaPhone: string;
	setTestWaPhone: (phone: string) => void;
	testWaMessage: string;
	setTestWaMessage: (msg: string) => void;
	isSendingWaTest: boolean;
	onSendWaTest: (e: React.FormEvent) => void | Promise<void>;
	waTestSendResult: WaTestSendResult | null;
	saveState: string;
	canSave: boolean;
	onSaveAll: () => void | Promise<void>;
}

export function WhatsappTemplatesList({
	isActiveDraft,
	setIsActiveDraft,
	enabledFeaturesDraft,
	setEnabledFeaturesDraft,
	staffRoutingDraft,
	setStaffRoutingDraft,
	staffOptions = [],
	testWaPhone,
	setTestWaPhone,
	testWaMessage,
	setTestWaMessage,
	isSendingWaTest,
	onSendWaTest,
	waTestSendResult,
	saveState,
	canSave,
	onSaveAll,
}: WhatsappTemplatesListProps) {
	return (
		<div className="whatsapp-mode-card" style={{ marginTop: "8px" }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<div>
					<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
						Автоматические уведомления пациентам
					</h4>
					<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
						Каденции напоминаний, подтверждение визитов и рекомендации после приёма
					</p>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<label htmlFor="wa-active-toggle" style={{ fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
						Канал активен
					</label>
					<input
						id="wa-active-toggle"
						type="checkbox"
						checked={isActiveDraft}
						onChange={(e) => setIsActiveDraft(e.target.checked)}
						style={{ width: "18px", height: "18px", cursor: "pointer" }}
					/>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
				{DEFAULT_FEATURES.map((feature) => {
					const isChecked = enabledFeaturesDraft.includes(feature.id);
					return (
						<label
							key={feature.id}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								padding: "10px",
								background: "var(--paper-soft)",
								borderRadius: "8px",
								border: "1px solid var(--line)",
								cursor: "pointer",
								fontSize: "13px",
							}}
						>
							<input
								type="checkbox"
								checked={isChecked}
								onChange={(e) => {
									if (e.target.checked) {
										setEnabledFeaturesDraft([...enabledFeaturesDraft, feature.id]);
									} else {
										setEnabledFeaturesDraft(enabledFeaturesDraft.filter((f) => f !== feature.id));
									}
								}}
							/>
							<span style={{ fontWeight: isChecked ? 600 : 400 }}>{feature.label}</span>
						</label>
					);
				})}
			</div>

			{/* Роутинг входящих сообщений */}
			<div style={{ marginTop: "12px" }}>
				<h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600 }}>
					Маршрутизация входящих сообщений сотрудникам
				</h4>
				<MessengerRoutingRules
					routing={staffRoutingDraft}
					onChange={(r: WhatsappStaffRouting) => setStaffRoutingDraft(r)}
					staffOptions={staffOptions}
				/>
			</div>

			{/* Блок тестовой отправки сообщения в WhatsApp */}
			<div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--line)" }} data-testid="whatsapp-test-message-section">
				<h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600 }}>
					Тестовая отправка сообщения WhatsApp
				</h4>
				<p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "var(--muted)" }}>
					Проверка отправки сообщений пациентам через рабочий номер или Cloud API
				</p>
				<form onSubmit={onSendWaTest} style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
					<input
						type="tel"
						placeholder="+7 (999) 000-00-00"
						value={testWaPhone}
						onChange={(e) => setTestWaPhone(e.target.value)}
						style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: "13px", minWidth: "180px", minHeight: "44px" }}
						aria-label="Номер телефона получателя"
					/>
					<input
						type="text"
						placeholder="Текст тестового сообщения"
						value={testWaMessage}
						onChange={(e) => setTestWaMessage(e.target.value)}
						style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: "13px", flex: 1, minWidth: "220px", minHeight: "44px" }}
						aria-label="Текст тестового сообщения"
					/>
					<button
						type="submit"
						disabled={isSendingWaTest}
						className="btn-primary"
						style={{ minHeight: "44px", padding: "0 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
					>
						{isSendingWaTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
						<span>Отправить тест</span>
					</button>
				</form>
				{waTestSendResult && (
					<p style={{ marginTop: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", color: waTestSendResult.ok ? "var(--teal)" : "#ef4444" }}>
						{waTestSendResult.ok ? <Check size={14} /> : <AlertCircle size={14} />}
						<span>{waTestSendResult.message}</span>
					</p>
				)}
			</div>

			{/* Кнопка глобального сохранения */}
			<div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
				<button
					type="button"
					className="btn-primary"
					style={{ minHeight: "44px", padding: "0 20px" }}
					onClick={() => void onSaveAll()}
					disabled={!canSave || saveState === "saving"}
					data-testid="btn-save-whatsapp-all"
				>
					{saveState === "saving" ? "Сохранение..." : saveState === "saved" ? "Сохранено" : "Сохранить настройки"}
				</button>
			</div>
		</div>
	);
}
