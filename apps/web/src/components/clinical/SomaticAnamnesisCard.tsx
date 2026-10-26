// Соматически здоров / норма (Мандаты 8e, 8y)
import React from "react";
import { SomaticAnamnesisCardView } from "./somaticCard/SomaticAnamnesisCardView";
import type { SomaticAnamnesisCardProps } from "./somaticCard/types";

export type { SomaticAnamnesisCardProps };
export const SomaticAnamnesisCard: React.FC<SomaticAnamnesisCardProps> = (props) => (
	<SomaticAnamnesisCardView {...props} />
);
export default SomaticAnamnesisCard;
