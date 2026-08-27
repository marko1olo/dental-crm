/**
 * WhatsApp Business API & Kapso Gateway Contracts
 *
 * Provides complete multi-tenant WhatsApp Cloud API & Kapso proxy schemas,
 * webhook validation contracts, interactive button/list payloads, and delivery status tracking.
 */
import { z } from "zod";
export declare const whatsappMessageStatusSchema: z.ZodEnum<["queued", "sending", "sent", "delivered", "read", "failed", "received"]>;
export type WhatsappMessageStatus = z.infer<typeof whatsappMessageStatusSchema>;
export declare const whatsappTemplateCategorySchema: z.ZodEnum<["AUTHENTICATION", "MARKETING", "UTILITY"]>;
export type WhatsappTemplateCategory = z.infer<typeof whatsappTemplateCategorySchema>;
export declare const whatsappInteractiveTypeSchema: z.ZodEnum<["button", "list", "button_reply", "list_reply", "quick_reply"]>;
export type WhatsappInteractiveType = z.infer<typeof whatsappInteractiveTypeSchema>;
export declare const kapsoSettingsUpdateSchema: z.ZodObject<{
    apiKey: z.ZodOptional<z.ZodString>;
    phoneNumberId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    businessAccountId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    webhookSecret: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    displayPhoneNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    apiKey?: string | undefined;
    phoneNumberId?: string | null | undefined;
    businessAccountId?: string | null | undefined;
    webhookSecret?: string | null | undefined;
    displayPhoneNumber?: string | null | undefined;
}, {
    isActive?: boolean | undefined;
    apiKey?: string | undefined;
    phoneNumberId?: string | null | undefined;
    businessAccountId?: string | null | undefined;
    webhookSecret?: string | null | undefined;
    displayPhoneNumber?: string | null | undefined;
}>;
export type KapsoSettingsUpdate = z.infer<typeof kapsoSettingsUpdateSchema>;
export declare const kapsoSettingsResponseSchema: z.ZodObject<{
    phoneNumberId: z.ZodNullable<z.ZodString>;
    businessAccountId: z.ZodNullable<z.ZodString>;
    displayPhoneNumber: z.ZodNullable<z.ZodString>;
    hasApiKey: z.ZodBoolean;
    hasWebhookSecret: z.ZodBoolean;
    isActive: z.ZodBoolean;
    isVerified: z.ZodBoolean;
    lastVerifiedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastTemplateSyncAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    phoneNumberId: string | null;
    businessAccountId: string | null;
    displayPhoneNumber: string | null;
    hasApiKey: boolean;
    hasWebhookSecret: boolean;
    isVerified: boolean;
    lastVerifiedAt?: string | null | undefined;
    lastTemplateSyncAt?: string | null | undefined;
}, {
    isActive: boolean;
    phoneNumberId: string | null;
    businessAccountId: string | null;
    displayPhoneNumber: string | null;
    hasApiKey: boolean;
    hasWebhookSecret: boolean;
    isVerified: boolean;
    lastVerifiedAt?: string | null | undefined;
    lastTemplateSyncAt?: string | null | undefined;
}>;
export type KapsoSettingsResponse = z.infer<typeof kapsoSettingsResponseSchema>;
export declare const kapsoTemplateResponseSchema: z.ZodObject<{
    name: z.ZodString;
    language: z.ZodString;
    status: z.ZodString;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    syncedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: string;
    name: string;
    language: string;
    category?: string | null | undefined;
    syncedAt?: string | null | undefined;
}, {
    status: string;
    name: string;
    language: string;
    category?: string | null | undefined;
    syncedAt?: string | null | undefined;
}>;
export type KapsoTemplateResponse = z.infer<typeof kapsoTemplateResponseSchema>;
export declare const kapsoTemplateMapRequestSchema: z.ZodObject<{
    notificationType: z.ZodString;
    locale: z.ZodString;
    templateName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notificationType: string;
    locale: string;
    templateName: string;
}, {
    notificationType: string;
    locale: string;
    templateName: string;
}>;
export type KapsoTemplateMapRequest = z.infer<typeof kapsoTemplateMapRequestSchema>;
export declare const kapsoTestRequestSchema: z.ZodObject<{
    toNumber: z.ZodString;
    templateName: z.ZodString;
    language: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    language: string;
    templateName: string;
    toNumber: string;
}, {
    templateName: string;
    toNumber: string;
    language?: string | undefined;
}>;
export type KapsoTestRequest = z.infer<typeof kapsoTestRequestSchema>;
export declare const whatsappInteractiveButtonSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    payload: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    payload?: string | undefined;
}, {
    id: string;
    title: string;
    payload?: string | undefined;
}>;
export type WhatsappInteractiveButton = z.infer<typeof whatsappInteractiveButtonSchema>;
export declare const whatsappInteractiveSectionRowSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    description?: string | undefined;
}, {
    id: string;
    title: string;
    description?: string | undefined;
}>;
export type WhatsappInteractiveSectionRow = z.infer<typeof whatsappInteractiveSectionRowSchema>;
export declare const whatsappInteractiveSectionSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    rows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        description?: string | undefined;
    }, {
        id: string;
        title: string;
        description?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rows: {
        id: string;
        title: string;
        description?: string | undefined;
    }[];
    title?: string | undefined;
}, {
    rows: {
        id: string;
        title: string;
        description?: string | undefined;
    }[];
    title?: string | undefined;
}>;
export type WhatsappInteractiveSection = z.infer<typeof whatsappInteractiveSectionSchema>;
export declare const whatsappInteractiveButtonMessageSchema: z.ZodObject<{
    messaging_product: z.ZodDefault<z.ZodLiteral<"whatsapp">>;
    recipient_type: z.ZodDefault<z.ZodLiteral<"individual">>;
    to: z.ZodString;
    type: z.ZodDefault<z.ZodLiteral<"interactive">>;
    interactive: z.ZodObject<{
        type: z.ZodLiteral<"button">;
        header: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["text", "image", "document", "video"]>;
            text: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "text" | "image" | "document" | "video";
            text?: string | undefined;
        }, {
            type: "text" | "image" | "document" | "video";
            text?: string | undefined;
        }>>;
        body: z.ZodObject<{
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            text: string;
        }, {
            text: string;
        }>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            text: string;
        }, {
            text: string;
        }>>;
        action: z.ZodObject<{
            buttons: z.ZodArray<z.ZodObject<{
                type: z.ZodDefault<z.ZodLiteral<"reply">>;
                reply: z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    title: string;
                }, {
                    id: string;
                    title: string;
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "reply";
                reply: {
                    id: string;
                    title: string;
                };
            }, {
                reply: {
                    id: string;
                    title: string;
                };
                type?: "reply" | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            buttons: {
                type: "reply";
                reply: {
                    id: string;
                    title: string;
                };
            }[];
        }, {
            buttons: {
                reply: {
                    id: string;
                    title: string;
                };
                type?: "reply" | undefined;
            }[];
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "button";
        action: {
            buttons: {
                type: "reply";
                reply: {
                    id: string;
                    title: string;
                };
            }[];
        };
        body: {
            text: string;
        };
        header?: {
            type: "text" | "image" | "document" | "video";
            text?: string | undefined;
        } | undefined;
        footer?: {
            text: string;
        } | undefined;
    }, {
        type: "button";
        action: {
            buttons: {
                reply: {
                    id: string;
                    title: string;
                };
                type?: "reply" | undefined;
            }[];
        };
        body: {
            text: string;
        };
        header?: {
            type: "text" | "image" | "document" | "video";
            text?: string | undefined;
        } | undefined;
        footer?: {
            text: string;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "interactive";
    messaging_product: "whatsapp";
    recipient_type: "individual";
    to: string;
    interactive: {
        type: "button";
        action: {
            buttons: {
                type: "reply";
                reply: {
                    id: string;
                    title: string;
                };
            }[];
        };
        body: {
            text: string;
        };
        header?: {
            type: "text" | "image" | "document" | "video";
            text?: string | undefined;
        } | undefined;
        footer?: {
            text: string;
        } | undefined;
    };
}, {
    to: string;
    interactive: {
        type: "button";
        action: {
            buttons: {
                reply: {
                    id: string;
                    title: string;
                };
                type?: "reply" | undefined;
            }[];
        };
        body: {
            text: string;
        };
        header?: {
            type: "text" | "image" | "document" | "video";
            text?: string | undefined;
        } | undefined;
        footer?: {
            text: string;
        } | undefined;
    };
    type?: "interactive" | undefined;
    messaging_product?: "whatsapp" | undefined;
    recipient_type?: "individual" | undefined;
}>;
export type WhatsappInteractiveButtonMessage = z.infer<typeof whatsappInteractiveButtonMessageSchema>;
export declare const whatsappInteractiveListMessageSchema: z.ZodObject<{
    messaging_product: z.ZodDefault<z.ZodLiteral<"whatsapp">>;
    recipient_type: z.ZodDefault<z.ZodLiteral<"individual">>;
    to: z.ZodString;
    type: z.ZodDefault<z.ZodLiteral<"interactive">>;
    interactive: z.ZodObject<{
        type: z.ZodLiteral<"list">;
        header: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "text";
            text: string;
        }, {
            type: "text";
            text: string;
        }>>;
        body: z.ZodObject<{
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            text: string;
        }, {
            text: string;
        }>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            text: string;
        }, {
            text: string;
        }>>;
        action: z.ZodObject<{
            button: z.ZodString;
            sections: z.ZodArray<z.ZodObject<{
                title: z.ZodOptional<z.ZodString>;
                rows: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }, {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                rows: {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }[];
                title?: string | undefined;
            }, {
                rows: {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }[];
                title?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            button: string;
            sections: {
                rows: {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }[];
                title?: string | undefined;
            }[];
        }, {
            button: string;
            sections: {
                rows: {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }[];
                title?: string | undefined;
            }[];
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "list";
        action: {
            button: string;
            sections: {
                rows: {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }[];
                title?: string | undefined;
            }[];
        };
        body: {
            text: string;
        };
        header?: {
            type: "text";
            text: string;
        } | undefined;
        footer?: {
            text: string;
        } | undefined;
    }, {
        type: "list";
        action: {
            button: string;
            sections: {
                rows: {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }[];
                title?: string | undefined;
            }[];
        };
        body: {
            text: string;
        };
        header?: {
            type: "text";
            text: string;
        } | undefined;
        footer?: {
            text: string;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "interactive";
    messaging_product: "whatsapp";
    recipient_type: "individual";
    to: string;
    interactive: {
        type: "list";
        action: {
            button: string;
            sections: {
                rows: {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }[];
                title?: string | undefined;
            }[];
        };
        body: {
            text: string;
        };
        header?: {
            type: "text";
            text: string;
        } | undefined;
        footer?: {
            text: string;
        } | undefined;
    };
}, {
    to: string;
    interactive: {
        type: "list";
        action: {
            button: string;
            sections: {
                rows: {
                    id: string;
                    title: string;
                    description?: string | undefined;
                }[];
                title?: string | undefined;
            }[];
        };
        body: {
            text: string;
        };
        header?: {
            type: "text";
            text: string;
        } | undefined;
        footer?: {
            text: string;
        } | undefined;
    };
    type?: "interactive" | undefined;
    messaging_product?: "whatsapp" | undefined;
    recipient_type?: "individual" | undefined;
}>;
export type WhatsappInteractiveListMessage = z.infer<typeof whatsappInteractiveListMessageSchema>;
export declare const whatsappDeliveryStatusSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["sent", "delivered", "read", "failed"]>;
    timestamp: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    recipient_id: z.ZodOptional<z.ZodString>;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
        title: z.ZodOptional<z.ZodString>;
        message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string | number;
        message?: string | undefined;
        title?: string | undefined;
    }, {
        code: string | number;
        message?: string | undefined;
        title?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "sent" | "delivered" | "read";
    id: string;
    timestamp: string | number;
    errors?: {
        code: string | number;
        message?: string | undefined;
        title?: string | undefined;
    }[] | undefined;
    recipient_id?: string | undefined;
}, {
    status: "failed" | "sent" | "delivered" | "read";
    id: string;
    timestamp: string | number;
    errors?: {
        code: string | number;
        message?: string | undefined;
        title?: string | undefined;
    }[] | undefined;
    recipient_id?: string | undefined;
}>;
export type WhatsappDeliveryStatus = z.infer<typeof whatsappDeliveryStatusSchema>;
export declare const whatsappInboundMessageSchema: z.ZodObject<{
    from: z.ZodString;
    id: z.ZodString;
    timestamp: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    type: z.ZodString;
    text: z.ZodOptional<z.ZodObject<{
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        body: string;
    }, {
        body: string;
    }>>;
    interactive: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["button_reply", "list_reply"]>;
        button_reply: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
        }, {
            id: string;
            title: string;
        }>>;
        list_reply: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            description?: string | undefined;
        }, {
            id: string;
            title: string;
            description?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "button_reply" | "list_reply";
        button_reply?: {
            id: string;
            title: string;
        } | undefined;
        list_reply?: {
            id: string;
            title: string;
            description?: string | undefined;
        } | undefined;
    }, {
        type: "button_reply" | "list_reply";
        button_reply?: {
            id: string;
            title: string;
        } | undefined;
        list_reply?: {
            id: string;
            title: string;
            description?: string | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    timestamp: string | number;
    from: string;
    interactive?: {
        type: "button_reply" | "list_reply";
        button_reply?: {
            id: string;
            title: string;
        } | undefined;
        list_reply?: {
            id: string;
            title: string;
            description?: string | undefined;
        } | undefined;
    } | undefined;
    text?: {
        body: string;
    } | undefined;
}, {
    type: string;
    id: string;
    timestamp: string | number;
    from: string;
    interactive?: {
        type: "button_reply" | "list_reply";
        button_reply?: {
            id: string;
            title: string;
        } | undefined;
        list_reply?: {
            id: string;
            title: string;
            description?: string | undefined;
        } | undefined;
    } | undefined;
    text?: {
        body: string;
    } | undefined;
}>;
export type WhatsappInboundMessage = z.infer<typeof whatsappInboundMessageSchema>;
/**
 * Builds standard named parameters for Meta WABA template body components.
 */
export declare function buildWhatsappNamedParameters(context?: Record<string, unknown>): Array<{
    type: "text";
    parameter_name: string;
    text: string;
}>;
/**
 * Builds Meta Cloud API template message payload.
 */
export declare function buildWhatsappTemplatePayload(toNumber: string, templateName: string, languageCode: string, parameters: Array<{
    type: string;
    parameter_name?: string;
    text: string;
}>): {
    messaging_product: string;
    recipient_type: string;
    to: string;
    type: string;
    template: {
        name: string;
        language: {
            code: string;
        };
        components: {
            type: string;
            parameters: {
                type: string;
                parameter_name?: string;
                text: string;
            }[];
        }[];
    };
};
/**
 * Builds Meta interactive 1..3 button quick reply message payload.
 */
export declare function buildWhatsappInteractiveButtons(toNumber: string, bodyText: string, buttons: WhatsappInteractiveButton[], headerText?: string, footerText?: string): WhatsappInteractiveButtonMessage;
/**
 * Builds Meta interactive section list message payload.
 */
export declare function buildWhatsappInteractiveList(toNumber: string, bodyText: string, buttonTitle: string, sections: WhatsappInteractiveSection[], headerText?: string, footerText?: string): WhatsappInteractiveListMessage;
