/**
 * DENTE Dental CRM — Hot Queue of Unpaid Invoices for 54-FZ Cashbox Workspace.
 * Real-time queue connected to PostgreSQL 18 patientInvoices (draft, issued, partially_paid).
 * Mandate 8b: File strictly <= 120 lines.
 */

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { PendingInvoiceItem } from "./types.js";
import { UnpaidInvoiceCard } from "./UnpaidInvoiceCard.js";
import { UnpaidInvoicesHeader } from "./UnpaidInvoicesHeader.js";

export interface UnpaidInvoicesQueueProps {
	readonly onSelectInvoiceForPayment: (invoice: PendingInvoiceItem) => void;
	readonly selectedInvoiceId?: string | null | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly initialInvoices?: readonly PendingInvoiceItem[] | undefined;
}

export function UnpaidInvoicesQueue({
	onSelectInvoiceForPayment,
	selectedInvoiceId,
	currentPatientId,
	currentPatientName,
	initialInvoices,
}: UnpaidInvoicesQueueProps): React.JSX.Element {
	const [invoices, setInvoices] = useState<readonly PendingInvoiceItem[]>(initialInvoices ?? []);
	const [isLoading, setIsLoading] = useState<boolean>(initialInvoices === undefined);
	const [error, setError] = useState<string | null>(null);
	const [filterCurrentPatient, setFilterCurrentPatient] = useState<boolean>(false);

	const fetchPendingInvoices = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/invoices/pending", { headers: denteAdminSecretRequestHeaders() });
			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				throw new Error(errJson.message || `Ошибка сервера: ${res.status}`);
			}
			const data = await res.json();
			setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Не удалось загрузить очередь счетов");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchPendingInvoices();
		const handleRefresh = () => void fetchPendingInvoices();
		window.addEventListener("dente-invoices-updated", handleRefresh);
		window.addEventListener("dente-cashbox-refresh", handleRefresh);
		window.addEventListener("dente-cashbox-invoice-exported", handleRefresh);
		window.addEventListener("dente-invoice-created", handleRefresh);
		return () => {
			window.removeEventListener("dente-invoices-updated", handleRefresh);
			window.removeEventListener("dente-cashbox-refresh", handleRefresh);
			window.removeEventListener("dente-cashbox-invoice-exported", handleRefresh);
			window.removeEventListener("dente-invoice-created", handleRefresh);
		};
	}, [fetchPendingInvoices]);

	const displayedInvoices = filterCurrentPatient && currentPatientId
		? invoices.filter((inv) => inv.patientId === currentPatientId)
		: invoices;

	return (
		<section aria-label="Очередь счетов к оплате" className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-xs flex flex-col gap-3">
			<UnpaidInvoicesHeader
				count={displayedInvoices.length}
				currentPatientId={currentPatientId}
				currentPatientName={currentPatientName}
				filterCurrentPatient={filterCurrentPatient}
				onToggleFilterCurrentPatient={() => setFilterCurrentPatient(!filterCurrentPatient)}
				onRefresh={() => void fetchPendingInvoices()}
				isLoading={isLoading}
			/>

			{error && (
				<div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--danger,red)]/10 text-[var(--danger,red)] text-xs border border-[var(--danger,red)]/20">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						<span>{error}</span>
					</div>
					<button type="button" onClick={() => void fetchPendingInvoices()} className="underline font-semibold hover:opacity-80">Повторить</button>
				</div>
			)}

			{!isLoading && !error && displayedInvoices.length === 0 && (
				<div data-testid="unpaid-invoices-empty" className="flex flex-col sm:flex-row items-center justify-center gap-2 py-6 text-center text-xs text-[var(--muted)]">
					<CheckCircle2 className="w-5 h-5 text-[var(--success,#10b981)]" />
					<span>Все счета оплачены. В очереди нет ожидающих счетов.</span>
				</div>
			)}

			{displayedInvoices.length > 0 && (
				<div data-testid="unpaid-invoices-list" className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
					{displayedInvoices.map((inv) => (
						<UnpaidInvoiceCard
							key={inv.id}
							invoice={inv}
							isSelected={selectedInvoiceId === inv.id}
							onSelectInvoiceForPayment={onSelectInvoiceForPayment}
						/>
					))}
				</div>
			)}
		</section>
	);
}
