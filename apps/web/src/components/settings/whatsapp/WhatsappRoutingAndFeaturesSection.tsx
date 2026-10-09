import React from "react";
import { MessageCircle } from "lucide-react";
import type { WhatsappStaffRouting } from "../../../hooks/useWhatsappSettings.js";
import { MessengerRoutingRules } from "../MessengerRoutingRules.js";
import {
	type StaffOption,
	WHATSAPP_FEATURE_LABELS,
} from "./types.js";

export interface WhatsappRoutingAndFeaturesSectionProps {
	isActiveDraft: boolean;
	onIsActiveChange: (val: boolean) => void;
	enabledFeaturesDraft: string[];
	onToggleFeature: (featureKey: string) => void;
	staffRoutingDraft: WhatsappStaffRouting;
	onStaffRoutingChange: (routing: WhatsappStaffRouting) => void;
	staffOptions: StaffOption[];
}

export function WhatsappRoutingAndFeaturesSection({
	isActiveDraft,
	onIsActiveChange,
	enabledFeaturesDraft,
	onToggleFeature,
	staffRoutingDraft,
	onStaffRoutingChange,
	staffOptions,
}: WhatsappRoutingAndFeaturesSectionProps) {
	return (
		<div className="whatsapp-routing-features-section">
			<div className="form-group form-group-toggle">
				<label htmlFor="wa-active">Активен</label>
				<div className="premium-switch">
					<input
						id="wa-active"
						type="checkbox"
						checked={isActiveDraft}
						onChange={(e) => onIsActiveChange(e.target.checked)}
					/>
					<span className="slider"></span>
				</div>
			</div>

			<fieldset
				className="premium-feature-grid"
				aria-label="Функции WhatsApp"
				style={{ border: "none", padding: 0, margin: 0 }}
			>
				{Object.entries(WHATSAPP_FEATURE_LABELS).map(([key, label]) => {
					const enabled = enabledFeaturesDraft.includes(key);
					return (
						<label
							htmlFor={`wa-feature-${key}`}
							key={key}
							className={`premium-feature-card ${enabled ? "active" : ""}`}
						>
							<div className="premium-feature-icon">
								<MessageCircle size={24} />
							</div>
							<div className="premium-feature-content">
								<h4>{label}</h4>
								<p>Автоматическая отправка</p>
							</div>
							<div className="premium-switch">
								<input
									id={`wa-feature-${key}`}
									type="checkbox"
									checked={enabled}
									onChange={() => onToggleFeature(key)}
								/>
								<span className="slider"></span>
							</div>
						</label>
					);
				})}
			</fieldset>

			<div className="messenger-routing-section">
				<h4>Роутинг входящих сообщений</h4>
				<p className="messenger-routing-hint">
					Укажите, кому направлять входящие сообщения пациентов.
				</p>
				<MessengerRoutingRules
					routing={staffRoutingDraft}
					onChange={onStaffRoutingChange}
					staffOptions={staffOptions}
				/>
			</div>
		</div>
	);
}
