/**
 * apps/web/src/components/cashbox/studioModules/checkout/CheckoutFiscalReceiptOptions.tsx
 *
 * Dedicated Fiscalization & Receipt Print Format options for CashRegisterCheckoutSection.
 * Governed by Mandates 8e, 8n, 8am, 8ap:
 * - 0-click fiscal defaults.
 * - Honest Apple Segmented Control for delivery method (paper / electronic / none).
 * - Hardware format options (thermoprinter 58mm/80mm, A4).
 * - Visible SMS & Email electronic receipt delivery channels.
 */

import React, { useState } from "react";
import { Printer, Send, Smartphone, Mail, Ban } from "lucide-react";
import { RECEIPT_PRINT_FORMATS } from "../../cashRegisterCatalogData.js";

export type ReceiptDeliveryOption = "paper" | "electronic" | "none";
export type ElectronicChannel = "sms" | "email";

export interface CheckoutFiscalReceiptOptionsProps {
	readonly fiscalize: boolean;
	readonly setFiscalize: (val: boolean) => void;
	readonly printFormat: string;
	readonly setPrintFormat: (val: string) => void;
	readonly deliveryMode?: ReceiptDeliveryOption | undefined;
	readonly onDeliveryModeChange?: ((mode: ReceiptDeliveryOption) => void) | undefined;
	readonly electronicChannel?: ElectronicChannel | undefined;
	readonly onElectronicChannelChange?: ((channel: ElectronicChannel) => void) | undefined;
}

export const CheckoutFiscalReceiptOptions: React.FC<CheckoutFiscalReceiptOptionsProps> = ({
	fiscalize,
	setFiscalize,
	printFormat,
	setPrintFormat,
	deliveryMode: controlledMode,
	onDeliveryModeChange,
	electronicChannel: controlledChannel,
	onElectronicChannelChange,
}) => {
	const [localMode, setLocalMode] = useState<ReceiptDeliveryOption>(
		fiscalize ? "paper" : "none"
	);
	const [localChannel, setLocalChannel] = useState<ElectronicChannel>("sms");

	const mode = controlledMode ?? localMode;
	const channel = controlledChannel ?? localChannel;

	const handleModeSelect = (newMode: ReceiptDeliveryOption) => {
		setLocalMode(newMode);
		if (onDeliveryModeChange) onDeliveryModeChange(newMode);
		if (newMode === "none") {
			setFiscalize(false);
		} else {
			setFiscalize(true);
		}
	};

	const handleChannelSelect = (newChannel: ElectronicChannel) => {
		setLocalChannel(newChannel);
		if (onElectronicChannelChange) onElectronicChannelChange(newChannel);
		handleModeSelect("electronic");
	};

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] space-y-3 text-xs">
			{/* Top Bar: Fiscalization Checkbox & Print on Cash Desk */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--ink)]">
					<input
						type="checkbox"
						checked={fiscalize}
						onChange={(e) => {
							const checked = e.target.checked;
							setFiscalize(checked);
							if (!checked) {
								setLocalMode("none");
								if (onDeliveryModeChange) onDeliveryModeChange("none");
							} else if (mode === "none") {
								setLocalMode("paper");
								if (onDeliveryModeChange) onDeliveryModeChange("paper");
							}
						}}
						className="w-4 h-4 rounded text-[var(--primary)] cursor-pointer"
					/>
					<span>Чек с фискализацией</span>
				</label>

				{mode === "paper" && (
					<div className="flex items-center gap-2">
						<span className="text-[var(--ink-muted)]">Печать на кассе:</span>
						<select
							value={printFormat}
							onChange={(e) => setPrintFormat(e.target.value)}
							className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:border-[var(--primary)] outline-none cursor-pointer"
						>
							{RECEIPT_PRINT_FORMATS.map((f) => (
								<option key={f.id} value={f.id}>
									{f.label}
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			{/* Middle Bar: Apple Segmented Control for Delivery Method */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-[var(--line-subtle)]">
				<div className="flex items-center gap-2">
					<span className="text-[var(--ink-muted)] font-medium">Способ выдачи чека:</span>
					<div
						className="p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] inline-flex gap-1"
						role="group"
						aria-label="Способ выдачи чека"
					>
						<button
							type="button"
							data-testid="btn-delivery-paper"
							onClick={() => handleModeSelect("paper")}
							className={`h-8 px-3 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer ${
								mode === "paper"
									? "bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Printer className="w-3.5 h-3.5 shrink-0" />
							<span>Бумажный чек</span>
						</button>

						<button
							type="button"
							data-testid="btn-delivery-electronic"
							onClick={() => handleModeSelect("electronic")}
							className={`h-8 px-3 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer ${
								mode === "electronic"
									? "bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Send className="w-3.5 h-3.5 shrink-0" />
							<span>Электронный чек</span>
						</button>

						<button
							type="button"
							data-testid="btn-delivery-none"
							onClick={() => handleModeSelect("none")}
							className={`h-8 px-3 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer ${
								mode === "none"
									? "bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Ban className="w-3.5 h-3.5 shrink-0" />
							<span>Не печатать</span>
						</button>
					</div>
				</div>

				{/* Electronic Delivery Channels (SMS & Email) */}
				<div className="flex items-center gap-1.5">
					<span className="text-[var(--ink-muted)]">Электронный канал:</span>
					<div className="p-0.5 bg-[var(--paper)] rounded-lg border border-[var(--line)] inline-flex gap-0.5">
						<button
							type="button"
							data-testid="btn-delivery-sms"
							onClick={() => handleChannelSelect("sms")}
							className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1 cursor-pointer ${
								mode === "electronic" && channel === "sms"
									? "bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
							title="Отправить чек по SMS"
						>
							<Smartphone className="w-3 h-3 shrink-0" />
							<span>SMS</span>
						</button>
						<button
							type="button"
							data-testid="btn-delivery-email"
							onClick={() => handleChannelSelect("email")}
							className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1 cursor-pointer ${
								mode === "electronic" && channel === "email"
									? "bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs border border-[var(--line-subtle)]"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
							title="Отправить чек на Email"
						>
							<Mail className="w-3 h-3 shrink-0" />
							<span>Email</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
