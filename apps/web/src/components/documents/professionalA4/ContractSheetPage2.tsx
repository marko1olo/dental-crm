import type React from "react";
import { formatAmountInWordsRu } from "@dental/shared";
import type { A4DocumentContractData } from "@dental/shared";
import { ContractServicesTable } from "./ContractServicesTable";

export function ContractSheetPage2({
	contractData,
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl,
}: {
	contractData: A4DocumentContractData;
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
}): React.JSX.Element {
	return (
		<section className="pro-a4-page-sheet">
			<div className="a4-sheet-body">
				<div className="a4-running-header">
					<span>
						{cl.legalName || cl.name} · Лицензия № {cl.licenseNumber}
					</span>
					<span>Договор № {contractData.contractNumber} · Лист 2 из 3</span>
				</div>

				<h2 className="a4-section-heading">
					4. Перечень и предварительная спецификация услуг
				</h2>
				<ContractServicesTable contractData={contractData} />

				<p
					className="a4-p-noindent"
					style={{ fontSize: "8.5pt", margin: "4px 0 10px 0" }}
				>
					<strong>Сумма сметы прописью:</strong>{" "}
					{formatAmountInWordsRu(contractData.estimatedTotalRub)}.
				</p>

				<h2 className="a4-section-heading">5. Права и обязанности Сторон</h2>
				<p className="a4-p">
					5.1. <strong>Исполнитель обязан:</strong> обеспечить соответствие
					услуг клиническим рекомендациям и стандартам; применять
					сертифицированные материалы; обеспечить врачебную тайну.
				</p>
				<p className="a4-p">
					5.2. <strong>Пациент обязан:</strong> информировать врача о
					сопутствующих заболеваниях и аллергиях; выполнять назначения;
					соблюдать гигиену полости рта.
				</p>

				<h2 className="a4-section-heading">6. Гарантийные обязательства</h2>
				<p className="a4-p">
					6.1. На терапевтические реставрации устанавливается гарантия 12
					месяцев, на коронки — 24 месяца при прохождении контрольного осмотра
					не реже 1 раза в 6 месяцев.
				</p>
			</div>

			<div className="a4-running-footer">
				<span>
					Договор № {contractData.contractNumber} от {contractData.contractDate}{" "}
					г.
				</span>
				<span>Лист 2 из 3</span>
			</div>
		</section>
	);
}
