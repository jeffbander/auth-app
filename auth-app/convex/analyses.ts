import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    patientName: v.string(),
    mrn: v.optional(v.string()),
    insurance: v.optional(v.string()),
    provider: v.optional(v.string()),
    rawNotes: v.string(),
    qualificationStatus: v.string(),
    primaryIndication: v.optional(v.string()),
    supportingFindings: v.array(v.string()),
    clinicalCitations: v.array(
      v.object({
        finding: v.string(),
        specialty: v.string(),
        provider: v.optional(v.string()),
        date: v.optional(v.string()),
        priority: v.number(),
      })
    ),
    conflictingInfo: v.array(
      v.object({
        finding: v.string(),
        sources: v.array(
          v.object({
            specialty: v.string(),
            assessment: v.string(),
            date: v.optional(v.string()),
          })
        ),
      })
    ),
    confidenceLevel: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    return await ctx.db.insert("analyses", {
      userId: identity.subject,
      patientName: args.patientName,
      mrn: args.mrn,
      insurance: args.insurance,
      provider: args.provider,
      rawNotes: args.rawNotes,
      qualificationStatus: args.qualificationStatus,
      primaryIndication: args.primaryIndication,
      supportingFindings: args.supportingFindings,
      clinicalCitations: args.clinicalCitations,
      conflictingInfo: args.conflictingInfo,
      confidenceLevel: args.confidenceLevel,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let query = ctx.db
      .query("analyses")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc");

    const analyses = await query.collect();

    let filtered = analyses;
    if (args.status) {
      filtered = analyses.filter((a) => a.qualificationStatus === args.status);
    }

    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

export const getById = query({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const analysis = await ctx.db.get(args.id);
    if (!analysis || analysis.userId !== identity.subject) {
      return null;
    }

    return analysis;
  },
});

export const update = mutation({
  args: {
    id: v.id("analyses"),
    qualificationStatus: v.optional(v.string()),
    primaryIndication: v.optional(v.string()),
    manualOverride: v.optional(v.boolean()),
    manualNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.qualificationStatus !== undefined)
      updates.qualificationStatus = args.qualificationStatus;
    if (args.primaryIndication !== undefined)
      updates.primaryIndication = args.primaryIndication;
    if (args.manualOverride !== undefined)
      updates.manualOverride = args.manualOverride;
    if (args.manualNotes !== undefined) updates.manualNotes = args.manualNotes;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Not found");
    }

    await ctx.db.delete(args.id);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { total: 0, qualified: 0, notQualified: 0, reviewNeeded: 0 };
    }

    const analyses = await ctx.db
      .query("analyses")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return {
      total: analyses.length,
      qualified: analyses.filter((a) => a.qualificationStatus === "Qualified")
        .length,
      notQualified: analyses.filter(
        (a) => a.qualificationStatus === "Not Qualified"
      ).length,
      reviewNeeded: analyses.filter(
        (a) => a.qualificationStatus === "Review Needed"
      ).length,
    };
  },
});
