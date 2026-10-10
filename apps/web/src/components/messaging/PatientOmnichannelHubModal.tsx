/**
 * PatientOmnichannelHubModal.tsx — Тонкий фасад омниканального центра сообщений (WhatsApp, Telegram, SMS),
 * дашборда NPS / лояльности и динамического эквайринга СБП.
 * Декомпозирован в поддиректорию omnichannelHub/ в соответствии с Мандатом 8b.
 */

import React, { useId } from "react";
import { createPortal } from "react-dom";
import { SbpPaymentQrModal } from "./SbpPaymentQrModal.js";
import {
	OmnichannelChatTab,
	OmnichannelHeader,
	OmnichannelModalFooter,
	OmnichannelNpsTab,
	OmnichannelTemplatesTab,
	useOmnichannelHubState,
} from "./omnichannelHub/index.js";
import { DEFAULT_TEMPLATES } from "./omnichannelEngine.js";
import type {
	OmnichannelTab,
	PatientOmnichannelHubModalProps,
} from "./omnichannelHub/types.js";
import "./omnichannelHub.css";

export type { OmnichannelTab, PatientOmnichannelHubModalProps };

export const PatientOmnichannelHubModal: React.FC<PatientOmnichannelHubModalProps> = ({
	isOpen,
	onClose,
	initialPatientId = "pat-101",
	clinicName = "DENTE Dental Clinic",
	clinicAddress = "г. Москва, ул. Арбат, д. 24",
	onSendMessage,
	portal = false,
}) => {
	const modalTitleId = useId();
	const hub = useOmnichannelHubState({
		initialPatientId,
		clinicName,
		clinicAddress,
		onSendMessage,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="omnichannel-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={modalTitleId}
		>
			<div className="omnichannel-modal-container hub-main-container">
				<OmnichannelHeader
					titleId={modalTitleId}
					activeTab={hub.activeTab}
					setActiveTab={hub.setActiveTab}
					unreadCount={hub.selectedContact.unreadCount}
					criticalPendingCount={hub.npsMetrics.criticalPendingCount}
					npsScore={hub.npsMetrics.npsScore}
					averageScore={hub.npsMetrics.averageScore}
					onClose={onClose}
				/>

				<div className="hub-tab-content-area">
					{hub.activeTab === "chat" && <OmnichannelChatTab hub={hub} />}

					{hub.activeTab === "templates" && (
						<OmnichannelTemplatesTab
							templates={DEFAULT_TEMPLATES}
							selectedContactName={hub.selectedContact.fullName}
							onApplyTemplate={hub.handleApplyTemplate}
						/>
					)}

					{hub.activeTab === "nps" && (
						<OmnichannelNpsTab
							npsMetrics={hub.npsMetrics}
							npsReviews={hub.npsReviews}
							filteredNpsReviews={hub.filteredNpsReviews}
							npsFilterUrgency={hub.npsFilterUrgency}
							setNpsFilterUrgency={hub.setNpsFilterUrgency}
							npsFilterStatus={hub.npsFilterStatus}
							setNpsFilterStatus={hub.setNpsFilterStatus}
							onUpdateNpsStatus={hub.handleUpdateNpsStatus}
							onOpenChatFromNps={hub.handleOpenChatFromNps}
						/>
					)}
				</div>

				<OmnichannelModalFooter onClose={onClose} />

				{hub.isSbpModalOpen && hub.currentSbpInvoice && (
					<SbpPaymentQrModal
						isOpen={hub.isSbpModalOpen}
						embedded={true}
						onClose={() => hub.setIsSbpModalOpen(false)}
						invoice={hub.currentSbpInvoice}
						onPaymentSuccess={hub.handleSbpPaymentSuccess}
						onSendToChat={(channel, text) => {
							hub.setMessageText(text);
							hub.setInputChannel(channel);
							hub.setIsSbpModalOpen(false);
							hub.setActiveTab("chat");
						}}
					/>
				)}
			</div>
		</div>
	);

	if (portal && typeof document !== "undefined" && document.body) {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};

