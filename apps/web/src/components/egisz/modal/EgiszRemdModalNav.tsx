/**
 * EgiszRemdModalNav.tsx — Statutory modal tab navigation bar.
 * Mandate 8b compliant (<= 120 lines). Apple HIG touch ergonomics.
 */

import React from "react";
import { Archive, Code2, FileText, Key, Receipt, Shield } from "lucide-react";
import type { EgiszHubActiveDocType, EgiszHubModalTab } from "./modalTypes";

export interface EgiszRemdModalNavProps {
	activeDocType: EgiszHubActiveDocType;
	activeTab: EgiszHubModalTab;
	onSelectTab: (tab: EgiszHubModalTab) => void;
	scorePercent: number;
	isDoctorSigned: boolean;
}

export const EgiszRemdModalNav: React.FC<EgiszRemdModalNavProps> = ({
	activeDocType,
	activeTab,
	onSelectTab,
	scorePercent,
	isDoctorSigned,
}) => {
	return (
		<nav className="egisz-tabs-nav">
			{activeDocType === "cda_semd" ? (
				<button
					type="button"
					className={`egisz-tab-btn ${activeTab === "clinical" ? "active" : ""}`}
					onClick={() => onSelectTab("clinical")}
				>
					<FileText size={16} />
					<span className="hidden sm:inline">Медицинская карта приёма</span>
					<span className="sm:hidden">Медкарта</span>
				</button>
			) : (
				<button
					type="button"
					className={`egisz-tab-btn ${activeTab === "tax_deduction" ? "active" : ""}`}
					onClick={() => onSelectTab("tax_deduction")}
				>
					<Receipt size={16} />
					<span className="hidden sm:inline">Справка для налогового вычета</span>
					<span className="sm:hidden">Справка ФНС</span>
				</button>
			)}

			<button
				type="button"
				className={`egisz-tab-btn ${activeTab === "preflight" ? "active" : ""}`}
				onClick={() => onSelectTab("preflight")}
			>
				<Shield size={16} />
				<span className="hidden sm:inline">Проверка готовности</span>
				<span className="sm:hidden">Готовность</span>
				<span className="egisz-tab-badge">{scorePercent}%</span>
			</button>

			<button
				type="button"
				className={`egisz-tab-btn ${activeTab === "signature" ? "active" : ""}`}
				onClick={() => onSelectTab("signature")}
			>
				<Key size={16} />
				<span className="hidden sm:inline">Подписание документа</span>
				<span className="sm:hidden">Подпись ЭЦП</span>
				{isDoctorSigned ? (
					<span className="egisz-tab-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success, #10b981)" }}>
						Подписан
					</span>
				) : (
					<span className="egisz-tab-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning, #d97706)" }}>
						Не подписан
					</span>
				)}
			</button>

			<button
				type="button"
				className={`egisz-tab-btn ${activeTab === "xml_preview" ? "active" : ""}`}
				onClick={() => onSelectTab("xml_preview")}
			>
				<Code2 size={16} />
				<span className="hidden sm:inline">Экспорт и статус</span>
				<span className="sm:hidden">Экспорт</span>
			</button>

			<button
				type="button"
				className={`egisz-tab-btn ${activeTab === "journal" ? "active" : ""}`}
				onClick={() => onSelectTab("journal")}
			>
				<Archive size={16} />
				<span className="hidden sm:inline">Журнал отправки</span>
				<span className="sm:hidden">Журнал</span>
			</button>
		</nav>
	);
};
