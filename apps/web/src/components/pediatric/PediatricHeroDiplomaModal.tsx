/**
 * PEDIATRIC HERO DIPLOMA MODAL (CANONICAL ALIAS)
 * SSOT delegates strictly to ./PediatricBraveryDiplomaModal
 * Retains 100% backward compatibility for all existing tests and call sites.
 */

import React from "react";
import {
	PediatricBraveryDiplomaModal,
	type PediatricBraveryDiplomaModalProps,
} from "./PediatricBraveryDiplomaModal";

export type PediatricHeroDiplomaModalProps = PediatricBraveryDiplomaModalProps;

export const PediatricHeroDiplomaModal: React.FC<PediatricHeroDiplomaModalProps> = (props) => {
	return <PediatricBraveryDiplomaModal {...props} />;
};

export default PediatricHeroDiplomaModal;
