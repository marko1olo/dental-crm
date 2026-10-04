import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";

export const staffChatChannels = pgTable(
	"staff_chat_channels",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		type: text("type").notNull().default("channel"), // "channel" | "direct"
		slug: text("slug"), // e.g. "general", "reception", "intercom_assistants", "lab_ztl"
		name: text("name").notNull(),
		description: text("description"),
		icon: text("icon"), // e.g. "hospital", "bell", "chair", "tooth", "user"
		isDefault: boolean("is_default").notNull().default(false),
		directUser1Id: uuid("direct_user1_id").references(() => users.id),
		directUser2Id: uuid("direct_user2_id").references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		orgSlugIdx: index("staff_chat_channels_org_slug_idx").on(
			table.organizationId,
			table.slug,
		),
		orgTypeIdx: index("staff_chat_channels_org_type_idx").on(
			table.organizationId,
			table.type,
		),
		directPairUnique: unique("staff_chat_channels_direct_pair_unique").on(
			table.organizationId,
			table.directUser1Id,
			table.directUser2Id,
		),
	}),
);

export const staffChatMessages = pgTable(
	"staff_chat_messages",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		channelId: uuid("channel_id")
			.notNull()
			.references(() => staffChatChannels.id),
		senderUserId: uuid("sender_user_id").references(() => users.id),
		senderName: text("sender_name").notNull(),
		senderRole: text("sender_role").notNull(),
		messageType: text("message_type").notNull().default("text"), // "text" | "intercom_ping" | "patient_card"
		content: text("content").notNull(),
		urgency: text("urgency").notNull().default("normal"), // "normal" | "urgent" | "critical"
		pinned: boolean("pinned").notNull().default(false),
		patientAttachment: jsonb("patient_attachment"), // PatientCardAttachment
		intercomPreset: text("intercom_preset"), // IntercomPresetKey
		targetAudience: text("target_audience"), // e.g. "all_assistants", "reception", "xray_tech", "dental_lab"
		intercomAcks: jsonb("intercom_acks").notNull().default(sql`'[]'::jsonb`), // IntercomAck[]
		metadata: jsonb("metadata"),
		readByStaffIds: jsonb("read_by_staff_ids").notNull().default(sql`'[]'::jsonb`),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		orgChannelCreatedIdx: index("staff_chat_messages_org_channel_created_idx").on(
			table.organizationId,
			table.channelId,
			table.createdAt,
		),
		orgSenderIdx: index("staff_chat_messages_org_sender_idx").on(
			table.organizationId,
			table.senderUserId,
		),
	}),
);
