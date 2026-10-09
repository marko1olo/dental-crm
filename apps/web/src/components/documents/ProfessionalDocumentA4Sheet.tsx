import React, { useState } from "react";
import "../../styles/professional-a4-print.css";
import {
    ProfessionalA4DocumentTab,
    A4ZoomMode,
    ProfessionalDocumentA4SheetProps
} from "./professionalA4/types";
import { ProfessionalA4Toolbar } from "./professionalA4/ProfessionalA4Toolbar";
import { ContractSheet } from "./professionalA4/ContractSheet";
import { ActSheet } from "./professionalA4/ActSheet";
import { TreatmentPlanSheet } from "./professionalA4/TreatmentPlanSheet";
import { ConsentSheet } from "./professionalA4/ConsentSheet";
import { PersonalDataSheet } from "./professionalA4/PersonalDataSheet";
import { MedicalCardSheet } from "./professionalA4/MedicalCardSheet";

export * from "./professionalA4/types";

export const ProfessionalDocumentA4Sheet: React.FC<ProfessionalDocumentA4SheetProps> = ({
    activeTab = "contract",
    onTabChange,
    initialZoom = "100%",
    contractData,
    actData,
    treatmentPlanData,
    consentData: rawConsentData,
    informedConsentData,
    personalDataConsent: rawPersonalDataConsent,
    personalDataConsentData,
    medicalCardData,
    onPrint,
    className = "",
}) => {
    const [zoom, setZoom] = useState<A4ZoomMode>(initialZoom);

    const handlePrint = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    const cl =
        contractData?.clinic ||
        medicalCardData?.clinic ||
        actData?.clinic ||
        treatmentPlanData?.clinic || {
            name: "ООО Стоматологическая клиника ДЕНТЕ Премиум",
            legalName: 'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
            shortName: 'ООО "ДЕНТЕ Премиум"',
            inn: "7710984521",
            kpp: "771001001",
            ogrn: "1217700456123",
            licenseNumber: "ЛО41-01137-77/00645892",
            licenseDate: "15.04.2022",
            licenseIssuer: "Департамент здравоохранения города Москвы",
            address: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
            actualAddress: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
            phone: "+7 (495) 123-45-67",
            city: "г. Москва",
            bankName: 'ПАО "Сбербанк"',
            bik: "044525225",
            checkingAccount: "40702810938000123456",
            correspondentAccount: "30101810400000000225",
            directorTitle: "Генеральный директор",
            directorFullName: "Воронов Алексей Владимирович",
        };

    const pt = contractData?.patient || medicalCardData?.patient;
    const doctor =
        contractData?.doctorFullName ||
        actData?.doctorFullName ||
        treatmentPlanData?.doctorFullName ||
        medicalCardData?.doctorFullName ||
        cl.directorFullName ||
        "Воронов Алексей Владимирович";

    const effectiveConsentData = rawConsentData || informedConsentData;
    const effectivePersonalDataConsent = rawPersonalDataConsent || personalDataConsentData;

    const isInformedConsentTab = activeTab === "consent_1051n" || activeTab === "informed_consent";

    const zoomClass = zoom === "80%" ? "zoom-80" : zoom === "fit" ? "zoom-fit" : "zoom-100";

    return (
        <div className={`pro-a4-viewport ${className}`}>
            <ProfessionalA4Toolbar
                activeTab={activeTab}
                onTabChange={onTabChange}
                zoom={zoom}
                setZoom={setZoom}
                handlePrint={handlePrint}
                isInformedConsentTab={isInformedConsentTab}
            />

            <div className="pro-a4-paper-container">
                {activeTab === "contract" && (
                    <ContractSheet zoomClass={zoomClass} contractData={contractData} cl={cl} />
                )}
                {activeTab === "act" && (
                    <ActSheet zoomClass={zoomClass} actData={actData} />
                )}
                {activeTab === "treatment_plan" && (
                    <TreatmentPlanSheet zoomClass={zoomClass} treatmentPlanData={treatmentPlanData} cl={cl} />
                )}
                {isInformedConsentTab && (
                    <ConsentSheet zoomClass={zoomClass} effectiveConsentData={effectiveConsentData} cl={cl} />
                )}
                {activeTab === "personal_data" && (
                    <PersonalDataSheet zoomClass={zoomClass} effectivePersonalDataConsent={effectivePersonalDataConsent} cl={cl} />
                )}
                {activeTab === "medical_card" && (
                    <MedicalCardSheet zoomClass={zoomClass} medicalCardData={medicalCardData} cl={cl} pt={pt} doctor={doctor} />
                )}
            </div>
        </div>
    );
};

ProfessionalDocumentA4Sheet.displayName = "ProfessionalDocumentA4Sheet";
