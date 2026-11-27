import {
	type LanAssistantCitoEvent,
	type LanChairStatusEvent,
	type LanInvoiceTransferEvent,
	type LanP2PMessage,
	type StaffActionAuditEntry,
	lanAssistantCitoEventSchema,
	lanChairStatusEventSchema,
	lanInvoiceTransferEventSchema,
	staffActionAuditEntrySchema,
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
				const parsed = lanChairStatusEventSchema.safeParse(msg.payload);
				if (!parsed.success) {
					logger.warn("[LanP2PDispatcher] Invalid chair_status_changed payload:", parsed.error);
					break;
				}
				const typedMsg: LanP2PMessage<LanChairStatusEvent> = { ...msg, payload: parsed.data };
				for (const l of this.chair) {
					try { l(parsed.data, typedMsg); } catch (err) { logger.error("[LanP2PDispatcher] chair err:", err); }
				}
				break;
			}
			case "assistant_call_cito": {
				const parsed = lanAssistantCitoEventSchema.safeParse(msg.payload);
				if (!parsed.success) {
					logger.warn("[LanP2PDispatcher] Invalid assistant_call_cito payload:", parsed.error);
					break;
				}
				const typedMsg: LanP2PMessage<LanAssistantCitoEvent> = { ...msg, payload: parsed.data };
				for (const l of this.assistant) {
					try { l(parsed.data, typedMsg); } catch (err) { logger.error("[LanP2PDispatcher] cito err:", err); }
				}
				break;
			}
			case "invoice_transferred_to_cashier": {
				const parsed = lanInvoiceTransferEventSchema.safeParse(msg.payload);
				if (!parsed.success) {
					logger.warn("[LanP2PDispatcher] Invalid invoice_transferred_to_cashier payload:", parsed.error);
					break;
				}
				const typedMsg: LanP2PMessage<LanInvoiceTransferEvent> = { ...msg, payload: parsed.data };
				for (const l of this.invoice) {
					try { l(parsed.data, typedMsg); } catch (err) { logger.error("[LanP2PDispatcher] inv err:", err); }
				}
				break;
			}
			case "staff_action_telemetry": {
				const parsed = staffActionAuditEntrySchema.safeParse(msg.payload);
				if (!parsed.success) {
					logger.warn("[LanP2PDispatcher] Invalid staff_action_telemetry payload:", parsed.error);
					break;
				}
				const typedMsg: LanP2PMessage<StaffActionAuditEntry> = { ...msg, payload: parsed.data };
				for (const l of this.staff) {
					try { l(parsed.data, typedMsg); } catch (err) { logger.error("[LanP2PDispatcher] staff err:", err); }
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
