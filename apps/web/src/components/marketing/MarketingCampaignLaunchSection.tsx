/**
 * MarketingCampaignLaunchSection.tsx — Audience Segmentation & 1-Click Campaign Launch.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy, Never Disabled), Mandate 8am (Single Primary CTA).
 */

import React from "react";
import { Send, MessageSquare, ShieldCheck } from "lucide-react";
import type { PatientSegmentOption } from "./marketingTypes";

export interface MarketingCampaignLaunchSectionProps {
	readonly segments: readonly PatientSegmentOption[];
	readonly selectedSegmentId: string;
	readonly onSelectSegment: (segmentId: string) => void;
	readonly consentOnly: boolean;
	readonly onChangeConsentOnly: (val: boolean) => void;
	readonly estimatedCostRub: string;
	readonly activeSegment: PatientSegmentOption;
	readonly channelRateRub: number;
	readonly isSending: boolean;
	readonly testSent: boolean;
	readonly onLaunch: () => void;
	readonly onTestSend: () => void;
}

export const MarketingCampaignLaunchSection: React.FC<MarketingCampaignLaunchSectionProps> = ({
	segments,
	selectedSegmentId,
	onSelectSegment,
	consentOnly,
	onChangeConsentOnly,
	estimatedCostRub,
	activeSegment,
	channelRateRub,
	isSending,
	testSent,
	onLaunch,
	onTestSend,
}) => {
	return (
		<div className="marketing-section" data-testid="marketing-launch-section">
			<div className="marketing-section-header">
				<div className="flex items-center gap-1.5">
					<Send size={16} className="text-[var(--primary)]" aria-hidden="true" />
					<h4 className="marketing-section-title">Быстрый запуск сегменту пациентов</h4>
				</div>
				<span className="marketing-section-badge">Запуск рассылки</span>
			</div>

			<div className="marketing-segments-grid">
				{segments.map((segment) => {
					const isSelected = segment.id === selectedSegmentId;
					return (
						<button
							key={segment.id}
							type="button"
							className={`marketing-segment-card ${isSelected ? "marketing-segment-card--selected" : ""}`}
							onClick={() => onSelectSegment(segment.id)}
							data-testid={`segment-${segment.id}`}
						>
							<div className="marketing-segment-card__top">
								<strong className="marketing-segment-name">{segment.name}</strong>
								<span className="marketing-segment-count">{segment.count} чел.</span>
							</div>
							<p className="marketing-segment-desc">{segment.description}</p>
						</button>
					);
				})}
			</div>

			<div className="marketing-launch-controls">
				<label className="marketing-compliance-checkbox">
					<input
						type="checkbox"
						checked={consentOnly}
						onChange={(e) => onChangeConsentOnly(e.target.checked)}
						className="marketing-checkbox-input"
					/>
					<ShieldCheck size={15} className="text-[var(--primary)] shrink-0" aria-hidden="true" />
					<span className="marketing-compliance-text">
						Только пациенты с подтвержденным согласием на сервисные и рекламные сообщения
					</span>
				</label>

				<div className="marketing-budget-calc">
					<span className="marketing-budget-label">Расчетный бюджет:</span>
					<strong className="marketing-budget-value">{estimatedCostRub} ₽</strong>
					<span className="marketing-budget-sub">
						({activeSegment.count} получателей × {channelRateRub.toFixed(2)} ₽)
					</span>
				</div>
			</div>

			<div className="marketing-launch-actions">
				<button
					type="button"
					className="primary-button marketing-launch-cta min-h-[44px] sm:min-h-[36px]"
					onClick={onLaunch}
					data-testid="btn-launch-campaign"
				>
					<Send size={15} aria-hidden="true" />
					<span>
						{isSending
							? "Запуск рассылки…"
							: `Запустить рассылку сегменту (${activeSegment.count} получателей)`}
					</span>
				</button>

				<button
					type="button"
					className="secondary-button marketing-test-btn min-h-[44px] sm:min-h-[36px]"
					onClick={onTestSend}
					data-testid="btn-test-send"
				>
					<MessageSquare size={14} aria-hidden="true" />
					<span>{testSent ? "Отправлено!" : "Тестовая отправка себе"}</span>
				</button>
			</div>
		</div>
	);
};
