import React from "react";
import { useDocumentStore } from "../../../../store/documentStore";

export const PaidContractChecklist: React.FC = React.memo(function PaidContractChecklist() {
	const {
		paidContractClinicInfoConfirmed, setPaidContractClinicInfoConfirmed,
		paidContractServiceListConfirmed, setPaidContractServiceListConfirmed,
		paidContractPaidBasisConfirmed, setPaidContractPaidBasisConfirmed,
		paidContractWrittenChangesConfirmed, setPaidContractWrittenChangesConfirmed,
	} = useDocumentStore();

	return (
		<>
			<label className="document-payload-checkbox">
				<input
					checked={paidContractClinicInfoConfirmed}
					type="checkbox"
					onChange={(e) => setPaidContractClinicInfoConfirmed(e.target.checked)}
				/>
				Пациент получил сведения о клинике, лицензии и исполнителе
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={paidContractServiceListConfirmed}
					type="checkbox"
					onChange={(e) => setPaidContractServiceListConfirmed(e.target.checked)}
				/>
				Перечень услуг и стоимость переданы пациенту до подписания
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={paidContractPaidBasisConfirmed}
					type="checkbox"
					onChange={(e) => setPaidContractPaidBasisConfirmed(e.target.checked)}
				/>
				Пациент понимает платную основу оказания услуг
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={paidContractWrittenChangesConfirmed}
					type="checkbox"
					onChange={(e) => setPaidContractWrittenChangesConfirmed(e.target.checked)}
				/>
				Изменения состава или стоимости оформляются письменно
			</label>
		</>
	);
});
