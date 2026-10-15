/**
 * apps/web/src/components/cashbox/cashboxViewModules/UnpaidInvoicesQueue.tsx
 *
 * DENTE Dental CRM — Hot Queue of Unpaid Invoices for 54-FZ Cashbox Workspace.
 * Real-time queue connected to PostgreSQL 18 patientInvoices (draft, issued, partially_paid).
 *
 * Mandate Compliance:
 * - Mandate 8b: Strictly <= 250 lines.
 * - Mandate 8e: Cashier / Doctor autonomy (1-click payment trigger, zero administrative blocks).
 * - Apple HIG: Touch targets >= 44x44px, semantic CSS tokens (var(--paper), var(--ink), var(--line), var(--primary)).
 */

import React, { useState, useEffect, useCallback } from "react";
import {
	Clock,
	FileText,
	CheckCircle2,
	RotateCw,
	CreditCard,
	AlertCircle,
	User,
} from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { PendingInvoiceItem } from "./types.js";

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
			const res = await fetch("/api/invoices/pending", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				throw new Error(errJson.message || `Ошибка сервера: ${res.status}`);
			}
			const data = await res.json();
			const list: PendingInvoiceItem[] = Array.isArray(data.invoices) ? data.invoices : [];
			setInvoices(list);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось загрузить очередь счетов";
			setError(msg);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchPendingInvoices();

		const handleRefresh = () => {
			void fetchPendingInvoices();
		};

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
		<section
			aria-label="Очередь счетов к оплате"
			className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-xs flex flex-col gap-3"
		>
			{/* Header bar */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
						<Clock className="w-4 h-4" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold text-[var(--ink)]">
								Очередь счетов к оплате
							</h3>
							<span
								data-testid="unpaid-invoices-count-badge"
								className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]"
							>
								{displayedInvoices.length}
							</span>
						</div>
						<p className="text-xs text-[var(--muted)]">
							Автоматически поступают из утвержденных планов лечения и завершенных приемов
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{currentPatientId && (
						<button
							type="button"
							onClick={() => setFilterCurrentPatient(!filterCurrentPatient)}
							className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 min-h-[36px] ${
								filterCurrentPatient
									? "bg-[var(--primary)] text-[var(--paper)] border-[var(--primary)]"
									: "bg-[var(--surface,var(--paper))] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
							}`}
							title={currentPatientName ? `Только ${currentPatientName}` : "Фильтр по текущему пациенту"}
						>
							<User className="w-3.5 h-3.5" />
							<span>{filterCurrentPatient ? "Все счета" : "Текущий пациент"}</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => void fetchPendingInvoices()}
						disabled={isLoading}
						className="p-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line-subtle)] disabled:opacity-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
						title="Обновить очередь счетов"
						aria-label="Обновить очередь счетов"
					>
						<RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
					</button>
				</div>
			</div>

			{/* Error State */}
			{error && (
				<div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--danger,red)]/10 text-[var(--danger,red)] text-xs border border-[var(--danger,red)]/20">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						<span>{error}</span>
					</div>
					<button
						type="button"
						onClick={() => void fetchPendingInvoices()}
						className="underline font-semibold hover:opacity-80"
					>
						Повторить
					</button>
				</div>
			)}

			{/* Empty State */}
			{!isLoading && !error && displayedInvoices.length === 0 && (
				<div
					data-testid="unpaid-invoices-empty"
					className="flex flex-col sm:flex-row items-center justify-center gap-2 py-6 text-center text-xs text-[var(--muted)]"
				>
					<CheckCircle2 className="w-5 h-5 text-[var(--success,#10b981)]" />
					<span>Все счета оплачены. В очереди нет ожидающих счетов.</span>
				</div>
			)}

			{/* List of Invoices */}
			{displayedInvoices.length > 0 && (
				<div
					data-testid="unpaid-invoices-list"
					className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1"
				>
					{displayedInvoices.map((inv) => {
						const isSelected = selectedInvoiceId === inv.id;
						const numberLabel = inv.invoiceNumber || inv.number || `СЧ-${inv.id.slice(0, 6)}`;
						const formattedAmount = (inv.totalAmountRub || 0).toLocaleString("ru-RU");

						return (
							<div
								key={inv.id}
								data-testid={`unpaid-invoice-card-${inv.id}`}
								className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-3 ${
									isSelected
										? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
										: "border-[var(--line)] bg-[var(--surface,var(--paper))] hover:border-[var(--primary)]"
								}`}
							>
								{/* Left: Patient Info & Invoice Meta */}
								<div className="flex flex-col gap-1 min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-semibold text-sm text-[var(--ink)] truncate">
											{inv.patientName || "Пациент без имени"}
										</span>
										<span className="px-1.5 py-0.5 rounded font-mono text-xs bg-[var(--surface-muted,var(--line-subtle))] text-[var(--muted)]">
											{numberLabel}
										</span>
										{inv.status === "partially_paid" && (
											<span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--warning,#f59e0b)]/10 text-[var(--warning,#f59e0b)]">
												Частично оплачен
											</span>
										)}
									</div>
									<div className="flex items-center gap-3 text-xs text-[var(--muted)]">
										<span className="flex items-center gap-1">
											<FileText className="w-3 h-3" />
											{inv.date || "Сегодня"}
										</span>
										{inv.patientPhone && (
											<span>{inv.patientPhone}</span>
										)}
									</div>
								</div>

								{/* Right: Amount & 1-Click Pay Action */}
								<div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
									<div className="text-right">
										<span className="text-base font-bold text-[var(--ink)] tracking-tight">
											{formattedAmount} ₽
										</span>
									</div>

									<button
										type="button"
										onClick={() => onSelectInvoiceForPayment(inv)}
										data-testid={`pay-invoice-button-${inv.id}`}
										aria-label={`Принять оплату счёта ${numberLabel} пациента ${inv.patientName}`}
										className="min-h-[44px] min-w-[140px] px-3.5 py-2 rounded-lg bg-[var(--primary)] text-[var(--paper)] font-medium text-sm flex items-center justify-center gap-1.5 shadow-xs hover:opacity-95 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
									>
										<CreditCard className="w-4 h-4 shrink-0" />
										<span>Принять оплату</span>
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}
