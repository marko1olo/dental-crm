import React from "react";
import { KraftAutoclaveParamsCard } from "./KraftAutoclaveParamsCard.js";
import { KraftMaterialAndSizeCard } from "./KraftMaterialAndSizeCard.js";
import type {
	KraftPackageMaterialId,
	KraftPackageSizeId,
} from "./kraftPackagePresets.js";

export interface KraftAutoclaveBatchConfigProps {
	readonly selectedMaterialId: KraftPackageMaterialId;
	readonly onMaterialChange: (id: KraftPackageMaterialId) => void;
	readonly selectedSizeId: KraftPackageSizeId;
	readonly onSizeChange: (id: KraftPackageSizeId) => void;
	readonly selectedAutoclaveId: string;
	readonly onAutoclaveChange: (id: string) => void;
	readonly cycleNumber: number;
	readonly onCycleNumberChange: (cycle: number) => void;
	readonly packQuantity: number;
	readonly onPackQuantityChange: (qty: number) => void;
}

export const KraftAutoclaveBatchConfig: React.FC<KraftAutoclaveBatchConfigProps> = ({
	selectedMaterialId,
	onMaterialChange,
	selectedSizeId,
	onSizeChange,
	selectedAutoclaveId,
	onAutoclaveChange,
	cycleNumber,
	onCycleNumberChange,
	packQuantity,
	onPackQuantityChange,
}) => {
	return (
		<>
			<KraftMaterialAndSizeCard
				selectedMaterialId={selectedMaterialId}
				onMaterialChange={onMaterialChange}
				selectedSizeId={selectedSizeId}
				onSizeChange={onSizeChange}
			/>

			<KraftAutoclaveParamsCard
				selectedAutoclaveId={selectedAutoclaveId}
				onAutoclaveChange={onAutoclaveChange}
				cycleNumber={cycleNumber}
				onCycleNumberChange={onCycleNumberChange}
				packQuantity={packQuantity}
				onPackQuantityChange={onPackQuantityChange}
			/>
		</>
	);
};

export default KraftAutoclaveBatchConfig;
