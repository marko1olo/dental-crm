export async function getDashboardFromDb(organizationId) {
    const orgId = "00000000-0000-0000-0000-000000000000";
    return {
        clinicName: "DENTE Demo Clinic",
        todayIso: new Date().toISOString().split("T")[0],
        clinicSettings: {
            profile: {
                organizationId: orgId,
                clinicName: "DENTE Demo Clinic",
                legalName: "DENTE LLC",
                inn: "1234567890",
                address: "Demo St 1",
                phone: "+79990000000",
                mode: "one_chair",
                timezone: "Europe/Moscow",
                defaultVisitMinutes: 60,
                scheduleDefaults: {
                    workdayStart: "09:00",
                    workdayEnd: "18:00",
                    workingDays: [1, 2, 3, 4, 5, 6],
                    appointmentBufferMinutes: 15
                },
                networkEnabled: false,
                egiszEnabled: false,
                updatedAt: new Date().toISOString()
            },
            integrationPresets: [],
            chairs: [],
            workspaceProfiles: [],
            roleAccessPolicies: [],
            modeHints: [],
            staff: [{
                    id: "00000000-0000-0000-0000-000000000001",
                    organizationId: orgId,
                    fullName: "Dr. Demo",
                    role: "owner",
                    specialties: ["therapist"],
                    phone: "+79991234567",
                    email: "dr@demo.com",
                    active: true,
                    canSignMedicalRecords: true,
                    canManageMoney: true,
                    canManageImports: true,
                    color: "#ffffff",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }]
        },
        patients: [
            {
                id: "00000000-0000-0000-0000-000000000002",
                organizationId: orgId,
                fullName: "Demo Patient",
                status: "active",
                birthDate: "1990-01-01",
                phone: "+79991234567",
                email: "pat@demo.com",
                notes: "Demo",
                administrativeProfile: null,
                balanceRub: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ],
        appointments: [
            {
                id: "00000000-0000-0000-0000-000000000003",
                organizationId: orgId,
                patientId: "00000000-0000-0000-0000-000000000002",
                chairId: "00000000-0000-0000-0000-000000000004",
                doctorUserId: "00000000-0000-0000-0000-000000000001",
                startsAt: new Date().toISOString(),
                endsAt: new Date(Date.now() + 3600000).toISOString(),
                status: "planned",
                reason: "Checkup",
                comment: ""
            }
        ],
        documents: [],
        imagingStudies: [],
        serviceCatalog: [],
        clinicalRules: [],
        activeVisit: {
            id: "00000000-0000-0000-0000-000000000005",
            organizationId: orgId,
            patientId: "00000000-0000-0000-0000-000000000002",
            appointmentId: "00000000-0000-0000-0000-000000000003",
            status: "draft",
            revision: 1,
            complaint: null,
            anamnesis: null,
            objectiveStatus: null,
            diagnosis: null,
            treatmentPlan: null,
            doctorSummary: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        visitCloseChecklist: {
            visitId: "00000000-0000-0000-0000-000000000005", readyToSign: false, score: 0, nextAction: "review", blockingItems: 0, items: []
        },
        shiftIntelligence: {
            modeFit: { mode: "one_chair", title: "Test", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
            doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: []
        },
        clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
        billingSummary: { totalPlannedRub: 0, totalDiscountRub: 0, totalPaidRub: 0, totalDueRub: 0, taxDeductionEligibleRub: 0, draftDocumentAmountRub: 0, openTreatmentItems: 0, unpaidDocuments: 0 },
        communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
        payments: [],
        auditEvents: [],
        complianceWarnings: [],
        communicationTasks: [],
        patientInsights: [],
        recommendedActions: [],
        appointmentReadiness: [],
        scheduleSuggestions: [],
        protocolTemplates: [],
        treatmentPlanItems: [],
        treatmentPlanScenarios: [],
        clinicalRuleEvaluations: [],
        communicationTemplates: [],
        communicationEvents: [],
        importBatches: [],
        speechProviders: []
    };
}
