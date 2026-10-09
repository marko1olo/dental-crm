/**
 * MessageDeliveryConsole.tsx — Layer 5: Канонический тонкий фасад пульта отправки сообщений
 * Декомпозирован по правилам Safe Monolith Decomposition (/decomposer) в ./deliveryConsole/
 */

import React from "react";
import {
	DeliveryChannelsStatus,
	DeliveryEnqueueForm,
	DeliveryQueueList,
	DeliveryRetryPanel,
	DeliverySettingsSection,
	DeliveryTemplatesSection,
	type MessageDeliveryConsoleProps,
	useMessageDeliveryConsole,
} from "./deliveryConsole";

export type * from "./deliveryConsole/types";
export * from "./deliveryConsole/constants";
export type { MessageDeliveryConsoleProps };

export function MessageDeliveryConsole(props?: MessageDeliveryConsoleProps) {
	const consoleState = useMessageDeliveryConsole(props);

	if (consoleState.loadError) {
		return (
			<section
				className="panel ops-panel"
				data-testid="message-delivery-console"
			>
				<div className="panel-heading">
					<h2>Отправка сообщений</h2>
				</div>
				<p className="ops-notice ops-notice--error" role="alert">
					Не удалось получить данные: {consoleState.loadError}
				</p>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void consoleState.loadAll()}
				>
					Повторить
				</button>
			</section>
		);
	}

	return (
		<section className="panel ops-panel" data-testid="message-delivery-console">
			<DeliveryRetryPanel
				busy={consoleState.busy}
				notice={consoleState.notice}
				runDispatch={consoleState.runDispatch}
				runReminders={consoleState.runReminders}
			/>

			<DeliveryChannelsStatus
				gateways={consoleState.gateways}
				configuredChannels={consoleState.configuredChannels}
				uisQuota={consoleState.uisQuota}
			/>

			<DeliveryQueueList
				outbox={consoleState.outbox}
				summary={consoleState.summary}
				statusFilter={consoleState.statusFilter}
				setStatusFilter={consoleState.setStatusFilter}
				busy={consoleState.busy}
				outboxAction={consoleState.outboxAction}
			/>

			<DeliveryEnqueueForm
				enqueueChannel={consoleState.enqueueChannel}
				setEnqueueChannel={consoleState.setEnqueueChannel}
				enqueueIntent={consoleState.enqueueIntent}
				setEnqueueIntent={consoleState.setEnqueueIntent}
				enqueueScope={consoleState.enqueueScope}
				setEnqueueScope={consoleState.setEnqueueScope}
				enqueueRecipient={consoleState.enqueueRecipient}
				setEnqueueRecipient={consoleState.setEnqueueRecipient}
				enqueueSubject={consoleState.enqueueSubject}
				setEnqueueSubject={consoleState.setEnqueueSubject}
				enqueueTemplateId={consoleState.enqueueTemplateId}
				setEnqueueTemplateId={consoleState.setEnqueueTemplateId}
				enqueueBody={consoleState.enqueueBody}
				setEnqueueBody={consoleState.setEnqueueBody}
				enqueueBusy={consoleState.enqueueBusy}
				enqueueMessage={consoleState.enqueueMessage}
				enqueueTemplates={consoleState.enqueueTemplates}
				uisQuota={consoleState.uisQuota}
			/>

			<DeliveryTemplatesSection
				templates={consoleState.templates}
				draftTitle={consoleState.draftTitle}
				setDraftTitle={consoleState.setDraftTitle}
				draftChannel={consoleState.draftChannel}
				setDraftChannel={consoleState.setDraftChannel}
				draftIntent={consoleState.draftIntent}
				setDraftIntent={consoleState.setDraftIntent}
				draftBody={consoleState.draftBody}
				setDraftBody={consoleState.setDraftBody}
				editingId={consoleState.editingId}
				setEditingId={consoleState.setEditingId}
				preview={consoleState.preview}
				previewError={consoleState.previewError}
				variableCatalog={consoleState.variableCatalog}
				busy={consoleState.busy}
				saveTemplate={consoleState.saveTemplate}
				resetDraft={consoleState.resetDraft}
				insertTemplateVariable={consoleState.insertTemplateVariable}
			/>

			<DeliverySettingsSection
				settings={consoleState.settings}
				busy={consoleState.busy}
				saveSettings={consoleState.saveSettings}
			/>
		</section>
	);
}

export default MessageDeliveryConsole;
