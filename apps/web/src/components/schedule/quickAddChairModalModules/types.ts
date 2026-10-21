export interface ChairColorPreset {
	id: string;
	label: string;
	hex: string;
	lightHex: string;
	darkHex: string;
}

export interface ChairSpecialtyPreset {
	id: string;
	label: string;
}

export interface ChairArchetypePreset {
	id: string;
	label: string;
	specialty: string;
	colorHex: string;
	description: string;
}

export interface QuickAddChairData {
	id?: string;
	name: string;
	room?: string;
	roomNumber?: string;
	specialization?: string;
	color?: string;
	isActive?: boolean;
	branchId?: string;
	defaultDoctorId?: string | null;
}

export interface QuickAddChairModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly existingChairsCount?: number | undefined;
	readonly onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	readonly initialData?: QuickAddChairData | null | undefined;
	readonly onUpdateChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	readonly branches?: any;
	readonly doctors?: Array<{
		id: string;
		fullName: string;
		role?: string;
		specialties?: string[];
		active?: boolean;
	}> | undefined;
}

export interface QuickAddChairFieldsProps {
	chairName: string;
	setChairName: (name: string) => void;
	defaultChairName: string;
	roomNumber: string;
	setRoomNumber: (room: string) => void;
	defaultRoomName: string;
	selectedSpecialty: string;
	setSelectedSpecialty: (spec: string) => void;
	defaultDoctorId: string;
	setDefaultDoctorId: (id: string) => void;
	isActive: boolean;
	setIsActive: (active: boolean) => void;
	doctors?: Array<{
		id: string;
		fullName: string;
		role?: string;
		specialties?: string[];
		active?: boolean;
	}>;
}
