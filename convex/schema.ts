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
  }),
  questions: defineTable({
    evaluation_id: v.string(),
    section_name: v.string(),
    question_text: v.string(),
    teacher_answer: v.string(),
    student_prompt: v.optional(v.union(v.string(), v.null())),
    order_index: v.number(),
    points: v.optional(v.number()),
  }).index("by_evaluation", ["evaluation_id"]),
});
