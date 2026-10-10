/**
 * types.ts — Контракты и типы для сетевого сервера DICOM C-STORE SCP (PS 3.8 / PS 3.7).
 */

export interface DicomScpServerOptions {
	port?: number;
	calledAeTitle?: string;
	defaultOrganizationId?: string;
	maxPduLength?: number;
}

export interface DicomScpServerStats {
	isRunning: boolean;
	port: number;
	calledAeTitle: string;
	defaultOrganizationId: string | null;
	totalAssociations: number;
	activeAssociations: number;
	totalCStoresReceived: number;
	totalCStoresSuccess: number;
	totalCStoresFailed: number;
	totalCEchoReceived: number;
	lastActivityAt: string | null;
}

export interface PresentationContextItem {
	id: number;
	abstractSyntax: string;
	transferSyntaxes: string[];
	acceptedTransferSyntax: string | null;
	resultReason: number; // 0 = accepted, 3 = abstract syntax not supported, 4 = transfer syntax not supported
}

export interface ParsedDimseCommand {
	commandField: number;
	messageId: number;
	affectedSopClassUid: string | null;
	affectedSopInstanceUid: string | null;
	hasDataSet: boolean;
	status?: number | undefined;
}

export interface AssociateNegotiationResult {
	callingAe: string;
	calledAe: string;
	contexts: Map<number, PresentationContextItem>;
}
