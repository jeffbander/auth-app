import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  patients: defineTable({
    userId: v.string(),
    name: v.string(),
    mrn: v.optional(v.string()),
    insurance: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_mrn", ["mrn"]),

  analyses: defineTable({
    userId: v.string(),
    patientId: v.optional(v.id("patients")),
    patientName: v.string(),
    mrn: v.optional(v.string()),
    insurance: v.optional(v.string()),
    provider: v.optional(v.string()),
    rawNotes: v.string(),
    qualificationStatus: v.string(), // "Qualified" | "Not Qualified" | "Review Needed"
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
    confidenceLevel: v.string(), // "High" | "Medium" | "Low"
    manualOverride: v.optional(v.boolean()),
    manualNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_patient", ["patientId"])
    .index("by_status", ["qualificationStatus"])
    .index("by_created", ["createdAt"]),

  settings: defineTable({
    userId: v.string(),
    anonymizeExports: v.boolean(),
    defaultInsurance: v.optional(v.string()),
    autoSaveHistory: v.boolean(),
    dataRetentionDays: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
