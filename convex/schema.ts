import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema(
  {
    categories: defineTable(v.any()),
    evaluations: defineTable(v.any())
      .index("by_category", ["category_id"])
      .index("by_archived", ["is_archived"]),
    questions: defineTable(v.any()).index("by_evaluation", ["evaluation_id"]),
  },
  { schemaValidation: false }
);

