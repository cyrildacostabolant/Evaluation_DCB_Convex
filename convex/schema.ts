// Trigger re-sync
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    color: v.string(),
    user_id: v.optional(v.string()),
  }),
  evaluations: defineTable({
    title: v.string(),
    category_id: v.string(),
    is_archived: v.optional(v.boolean()),
    question_count: v.optional(v.number()),
    coverImageId: v.optional(v.id("_storage")),
  })
    .index("by_category", ["category_id"])
    .index("by_archived", ["is_archived"]),
  questions: defineTable({
    evaluation_id: v.id("evaluations"),
    section_name: v.string(),
    question_text: v.string(),
    teacher_answer: v.string(),
    student_prompt: v.optional(v.union(v.string(), v.null())),
    order_index: v.number(),
    points: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
    is_mcq: v.optional(v.boolean()),
    mcq_options: v.optional(v.array(v.object({
      text: v.string(),
      is_correct: v.boolean(),
    }))),
  }).index("by_evaluation", ["evaluation_id"]),
});
