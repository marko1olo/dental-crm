import type {
	LanAssistantCitoEvent,
	LanChairStatusEvent,
	LanInvoiceTransferEvent,
	LanP2PMessage,
	StaffActionAuditEntry,
} from "@dental/shared";
import { logger } from "../../../utils/logger";
import type {
	AnyP2PEventListener,
	AssistantCitoListener,
	ChairStatusListener,
	InvoiceTransferListener,
	StaffActionListener,
} from "./types";

export class P2PListenerRegistry {
	public chair = new Set<ChairStatusListener>();
	public assistant = new Set<AssistantCitoListener>();
	public invoice = new Set<InvoiceTransferListener>();
	public staff = new Set<StaffActionListener>();
	public any = new Set<AnyP2PEventListener>();

	public dispatch(msg: LanP2PMessage): void {
		for (const listener of this.any) {
			try { listener(msg); } catch (err) { logger.error("[LanP2PDispatcher] anyListener err:", err); }
		}
		switch (msg.eventType) {
			case "chair_status_changed": {
				const ev = msg.payload as unknown as LanChairStatusEvent;
				for (const l of this.chair) {
					try { l(ev, msg as LanP2PMessage<LanChairStatusEvent>); } catch (err) { logger.error("[LanP2PDispatcher] chair err:", err); }
				}
				break;
			}
			case "assistant_call_cito": {
				const ev = msg.payload as unknown as LanAssistantCitoEvent;
				for (const l of this.assistant) {
					try { l(ev, msg as LanP2PMessage<LanAssistantCitoEvent>); } catch (err) { logger.error("[LanP2PDispatcher] cito err:", err); }
				}
				break;
			}
			case "invoice_transferred_to_cashier": {
				const ev = msg.payload as unknown as LanInvoiceTransferEvent;
				for (const l of this.invoice) {
					try { l(ev, msg as LanP2PMessage<LanInvoiceTransferEvent>); } catch (err) { logger.error("[LanP2PDispatcher] inv err:", err); }
				}
				break;
			}
			case "staff_action_telemetry": {
				const ev = msg.payload as unknown as StaffActionAuditEntry;
				for (const l of this.staff) {
					try { l(ev, msg as LanP2PMessage<StaffActionAuditEntry>); } catch (err) { logger.error("[LanP2PDispatcher] staff err:", err); }
				}
				break;
			}
		}
	}

	public clear(): void {
		this.chair.clear();
		this.assistant.clear();
		this.invoice.clear();
		this.staff.clear();
		this.any.clear();
	}
}
