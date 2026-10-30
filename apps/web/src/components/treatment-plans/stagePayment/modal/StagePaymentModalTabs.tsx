import { formatKopecksRu } from "@dental/shared";
import {
	Calendar,
	FileCheck,
	FileText,
	QrCode,
	RotateCcw,
	Wallet,
} from "lucide-react";
import React from "react";
import type { PatientDepositWallet } from "../stagePaymentEngine.js";
import type { StagePaymentModalTab } from "./stagePaymentModalTypes";

export interface StagePaymentModalTabsProps {
	readonly activeTab: StagePaymentModalTab;
	readonly onSelectTab: (tab: StagePaymentModalTab) => void;
	readonly stagesCount: number;
	readonly depositWallet: PatientDepositWallet;
}

export const StagePaymentModalTabs: React.FC<StagePaymentModalTabsProps> = ({
	activeTab,
	onSelectTab,
	stagesCount,
	depositWallet,
}) => {
	return (
		<nav className="stage-payment-tabs-bar no-print">
			<button
				type="button"
				onClick={() => onSelectTab("schedule")}
				className={`stage-payment-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
			>
				<Calendar className="h-4 w-4" />
				<span>График этапов и оплат</span>
				<span className="ml-1 rounded-full bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line-subtle)] px-2 py-0.5 text-xs">
					{stagesCount}
				</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectTab("escrow")}
				className={`stage-payment-tab-btn ${activeTab === "escrow" ? "active" : ""}`}
			>
				<Wallet className="h-4 w-4" />
				<span>Авансовый депозит</span>
				{depositWallet.availableDepositKopecks > 0 && (
					<span className="ml-1 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] px-2 py-0.2 text-xs">
						{formatKopecksRu(depositWallet.availableDepositKopecks)}
					</span>
				)}
			</button>

			<button
				type="button"
				onClick={() => onSelectTab("act")}
				className={`stage-payment-tab-btn ${activeTab === "act" ? "active" : ""}`}
			>
				<FileCheck className="h-4 w-4" />
				<span>Закрытие этапа актом</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectTab("termination")}
				className={`stage-payment-tab-btn ${activeTab === "termination" ? "active" : ""}`}
			>
				<RotateCcw className="h-4 w-4" />
				<span>Расторжение и возврат</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectTab("fiscal54fz")}
				className={`stage-payment-tab-btn ${activeTab === "fiscal54fz" ? "active" : ""}`}
			>
				<QrCode className="h-4 w-4" />
				<span>Кассовые чеки</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectTab("contract_addendum")}
				className={`stage-payment-tab-btn ${activeTab === "contract_addendum" ? "active" : ""}`}
			>
				<FileText className="h-4 w-4" />
				<span>Доп. соглашение (А4)</span>
			</button>
		</nav>
	);
};
