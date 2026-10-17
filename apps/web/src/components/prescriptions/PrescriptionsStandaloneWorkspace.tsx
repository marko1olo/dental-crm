import React, { useState } from "react";
import { PrescriptionModal } from "./PrescriptionModal";

export function PrescriptionsStandaloneWorkspace(): React.ReactElement {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<div
			className="w-full min-h-screen bg-[var(--canvas)] flex items-center justify-center p-0 sm:p-4"
			data-testid="prescriptions-standalone-workspace"
		>
			<PrescriptionModal
				isOpen={isOpen}
				onClose={() => setIsOpen(true)}
				patient={{
					id: "pat-1",
					fullName: "Иванов Иван Иванович",
					cardNumber: "4201",
					birthDate: "1988-04-12",
					gender: "male",
					allergies: ["Пенициллин"],
				}}
				doctorName="Д-р Соколов А. В."
				clinicName="ООО «ДЕНТЕ КЛИНИК»"
				initialSelectedDrugIds={["amoxiclav_875_125"]}
			/>
		</div>
	);
}
