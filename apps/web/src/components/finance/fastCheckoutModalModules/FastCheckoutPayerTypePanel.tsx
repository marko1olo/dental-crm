import { Building2, ShieldCheck, User } from "lucide-react";
import React from "react";
import type { ClientLegalType } from "../../payments/checkout/fastCheckoutEngine.js";
import { FastCheckoutLegalEntityFields } from "./FastCheckoutLegalEntityFields";
import { FastCheckoutPhysicalPersonFields } from "./FastCheckoutPhysicalPersonFields";

export interface FastCheckoutPayerTypePanelProps {
	readonly clientType: ClientLegalType;
	readonly setClientType: (type: ClientLegalType) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (val: string) => void;
	readonly buyerName: string;
	readonly setBuyerName: (val: string) => void;
	readonly onInputEnterKeyDown?:
		| ((e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void)
		| undefined;
}

export const FastCheckoutPayerTypePanel: React.FC<
	FastCheckoutPayerTypePanelProps
> = ({
	clientType,
	setClientType,
	buyerInn,
	setBuyerInn,
	buyerName,
	setBuyerName,
	onInputEnterKeyDown,
}) => (
		<div
			className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2"
			data-testid="payer-type-section"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
					<Building2 size={14} className="text-[var(--teal)]" />
					Тип плательщика (реквизиты чека):
				</span>
				{clientType === "physical_person" && (
					<span
						className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/30 flex items-center min-w-0"
						data-testid="inn-physical-not-required-badge"
						title="ИНН не требуется для физических лиц"
					>
						<ShieldCheck
							size={14}
							className="inline mr-1 shrink-0 text-[var(--teal)]"
						/>
						Для пациентов-физлиц ИНН не требуется{" "}
						<span className="sr-only">По 54-ФЗ для физлиц не требуется (ИНН не требуется для физических лиц)</span>
					</span>
				)}
			</div>
		<div
			className="dente-segmented-bar inline-flex"
			role="tablist"
			aria-label="Тип плательщика"
		>
			<button
				type="button"
				role="tab"
				aria-selected={clientType === "physical_person"}
				onClick={() => setClientType("physical_person")}
				className={`dente-segmented-item ${clientType === "physical_person" ? "active" : ""}`}
				data-testid="tab-payer-physical"
			>
				<User size={13} className="shrink-0" />
				<span>Физическое лицо (пациент)</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={clientType === "legal_entity"}
				onClick={() => setClientType("legal_entity")}
				className={`dente-segmented-item ${clientType === "legal_entity" ? "active" : ""}`}
				data-testid="tab-payer-legal"
			>
				<Building2 size={13} className="shrink-0" />
				<span>Юрлицо / ИП</span>
			</button>
		</div>

		{clientType === "physical_person" ? (
			<FastCheckoutPhysicalPersonFields
				buyerInn={buyerInn}
				setBuyerInn={setBuyerInn}
				onInputEnterKeyDown={onInputEnterKeyDown}
			/>
		) : (
			<FastCheckoutLegalEntityFields
				buyerInn={buyerInn}
				setBuyerInn={setBuyerInn}
				buyerName={buyerName}
				setBuyerName={setBuyerName}
			/>
		)}
	</div>
);
