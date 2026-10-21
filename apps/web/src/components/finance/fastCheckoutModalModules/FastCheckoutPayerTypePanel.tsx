import { Building2, ShieldCheck, User } from "lucide-react";
import type React from "react";
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
		className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2"
		data-testid="payer-type-section"
	>
		<div className="flex items-center justify-between flex-wrap gap-2">
			<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
				<Building2 size={14} className="text-teal-600" />
				Тип плательщика (реквизиты чека):
			</span>
			{clientType === "physical_person" && (
				<span
					className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center min-w-0"
					data-testid="inn-physical-not-required-badge"
					title="По 54-ФЗ для физлиц не требуется"
				>
					<ShieldCheck
						size={14}
						className="inline mr-1 shrink-0 text-emerald-500"
					/>
					Для пациентов-физлиц ИНН не требуется{" "}
					<span className="sr-only">(По 54-ФЗ для физлиц не требуется)</span>
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
