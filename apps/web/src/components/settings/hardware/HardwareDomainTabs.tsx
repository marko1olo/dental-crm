import React from "react";
import { Barcode, Mic, Printer, Scan, Tag } from "lucide-react";

export type HardwareDomainTab = "imaging" | "kkt" | "scanners" | "labels" | "audio";

interface Props {
	activeDomain: HardwareDomainTab;
	onSelectDomain: (domain: HardwareDomainTab) => void;
}

export const HardwareDomainTabs: React.FC<Props> = ({ activeDomain, onSelectDomain }) => {
	const tabs: Array<{ id: HardwareDomainTab; label: string; icon: React.ReactNode; testId: string }> = [
		{ id: "imaging", label: "Рентген и Визиографы", icon: <Scan size={14} />, testId: "domain-tab-imaging" },
		{ id: "kkt", label: "Касса и чеки", icon: <Printer size={14} />, testId: "domain-tab-kkt" },
		{ id: "scanners", label: "Сканеры маркировки и штрихкодов", icon: <Barcode size={14} />, testId: "domain-tab-scanners" },
		{ id: "labels", label: "Принтеры этикеток (Стерилизация)", icon: <Tag size={14} />, testId: "domain-tab-labels" },
		{ id: "audio", label: "Микрофоны и звук (DSP)", icon: <Mic size={14} />, testId: "domain-tab-audio" },
	];

	return (
		<div
			className="hw-studio-domain-tabs"
			role="tablist"
			aria-label="Разделы аппаратного обеспечения"
		>
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					role="tab"
					aria-selected={activeDomain === tab.id}
					className={`hw-studio-category-tab ${activeDomain === tab.id ? "active" : ""}`}
					onClick={() => onSelectDomain(tab.id)}
					data-testid={tab.testId}
				>
					{tab.icon}
					<span>{tab.label}</span>
				</button>
			))}
		</div>
	);
};
