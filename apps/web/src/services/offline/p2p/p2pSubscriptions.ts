import type {
	AnyP2PEventListener,
	AssistantCitoListener,
	ChairStatusListener,
	InvoiceTransferListener,
	StaffActionListener,
} from "./types";
import type { P2PListenerRegistry } from "./p2pListenerRegistry";

export function bindP2PSubscriptions(registry: P2PListenerRegistry) {
	return {
		onChairStatusChange(l: ChairStatusListener): () => void {
			registry.chair.add(l);
			return () => registry.chair.delete(l);
		},
		onAssistantCitoCall(l: AssistantCitoListener): () => void {
			registry.assistant.add(l);
			return () => registry.assistant.delete(l);
		},
		onInvoiceTransferredToCashier(l: InvoiceTransferListener): () => void {
			registry.invoice.add(l);
			return () => registry.invoice.delete(l);
		},
		onStaffActionTelemetry(l: StaffActionListener): () => void {
			registry.staff.add(l);
			return () => registry.staff.delete(l);
		},
		onAnyEvent(l: AnyP2PEventListener): () => void {
			registry.any.add(l);
			return () => registry.any.delete(l);
		},
	};
}
