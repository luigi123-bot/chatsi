import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users
export const users = sqliteTable('users', {
    id: text('id').primaryKey(), // We'll use UUIDs generated in JS
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    password: text('password').notNull(), // Hashed
    avatarUrl: text('avatar_url'),
    createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

// Conversations (Chats / Groups)
export const conversations = sqliteTable('conversations', {
    id: text('id').primaryKey(),
    name: text('name'), // For groups, or empty for DM
    isGroup: integer('is_group', { mode: 'boolean' }).default(false),
    lastMessageAt: integer('last_message_at', { mode: 'timestamp' }).defaultNow(),
    createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

// Participants in a conversation
export const participants = sqliteTable('participants', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').references(() => users.id).notNull(),
    conversationId: text('conversation_id').references(() => conversations.id).notNull(),
    role: text('role').default('member'), // admin, member
    joinedAt: integer('joined_at', { mode: 'timestamp' }).defaultNow(),
});

// Messages
export const messages = sqliteTable('messages', {
    id: text('id').primaryKey(),
    content: text('content'),
    senderId: text('sender_id').references(() => users.id).notNull(),
    conversationId: text('conversation_id').references(() => conversations.id).notNull(),
    type: text('type').default('text'), // text, image, video
    fileUrl: text('file_url'),
    createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    participants: many(participants),
    messages: many(messages),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
    participants: many(participants),
    messages: many(messages),
}));

export const participantsRelations = relations(participants, ({ one }) => ({
    user: one(users, {
        fields: [participants.userId],
        references: [users.id],
    }),
    conversation: one(conversations, {
        fields: [participants.conversationId],
        references: [conversations.id],
    }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    sender: one(users, {
        fields: [messages.senderId],
        references: [users.id],
    }),
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
    }),
}));
