import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return settings;
  },
});

export const upsert = mutation({
  args: {
    anonymizeExports: v.optional(v.boolean()),
    defaultInsurance: v.optional(v.string()),
    autoSaveHistory: v.optional(v.boolean()),
    dataRetentionDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    const now = Date.now();

    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (args.anonymizeExports !== undefined)
        updates.anonymizeExports = args.anonymizeExports;
      if (args.defaultInsurance !== undefined)
        updates.defaultInsurance = args.defaultInsurance;
      if (args.autoSaveHistory !== undefined)
        updates.autoSaveHistory = args.autoSaveHistory;
      if (args.dataRetentionDays !== undefined)
        updates.dataRetentionDays = args.dataRetentionDays;

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      return await ctx.db.insert("settings", {
        userId: identity.subject,
        anonymizeExports: args.anonymizeExports ?? false,
        defaultInsurance: args.defaultInsurance,
        autoSaveHistory: args.autoSaveHistory ?? true,
        dataRetentionDays: args.dataRetentionDays ?? 365,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
