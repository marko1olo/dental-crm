/**
 * DigitalSmileDesignModal.tsx — Канонический тонкий фасад-реэкспорт на DsdAestheticStudioModal (Мандаты 8b, PHO-02).
 * Управление жизненным циклом памяти и очистка (URL.revokeObjectURL) делегированы в DsdAestheticStudioModal (PHO-04).
 */
import React from 'react';
import {
	DsdAestheticStudioModal,
	type DsdAestheticStudioModalProps,
	type DsdPatientPhotoOption,
	DEFAULT_CLINICAL_SMILE_PHOTO,
} from './dsd/DsdAestheticStudioModal';

export type { DsdPatientPhotoOption };
export type DigitalSmileDesignModalProps = DsdAestheticStudioModalProps;
export { DEFAULT_CLINICAL_SMILE_PHOTO };

export const DigitalSmileDesignModal: React.FC<DigitalSmileDesignModalProps> = (props) => {
	return <DsdAestheticStudioModal {...props} />;
};

export default DigitalSmileDesignModal;
