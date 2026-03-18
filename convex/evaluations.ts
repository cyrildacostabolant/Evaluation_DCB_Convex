import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const evaluations = await ctx.db.query("evaluations").collect();
    const result = [];
    for (const ev of evaluations) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_evaluation", (q) => q.eq("evaluation_id", ev._id))
        .collect();
      
      result.push({
        ...ev,
        id: ev._id,
        created_at: new Date(ev._creationTime).toISOString(),
        questions: questions.map(q => ({ ...q, id: q._id })).sort((a, b) => a.order_index - b.order_index),
      });
    }
    return result;
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("evaluations")),
    title: v.string(),
    category_id: v.string(),
    is_archived: v.optional(v.boolean()),
    questions: v.array(v.object({
      id: v.optional(v.string()),
      section_name: v.string(),
      question_text: v.string(),
      teacher_answer: v.string(),
      student_prompt: v.optional(v.union(v.string(), v.null())),
      order_index: v.number(),
      points: v.optional(v.number()),
      is_mcq: v.optional(v.boolean()),
      mcq_options: v.optional(v.array(v.object({
        text: v.string(),
        is_correct: v.boolean(),
      }))),
    })),
  },
  handler: async (ctx, args) => {
    let evalId;
    
    if (args.id) {
      evalId = args.id;
      const existing = await ctx.db.get(evalId);
      if (!existing) {
        throw new Error("Evaluation not found");
      }
      
      // update
      await ctx.db.patch(evalId, {
        title: args.title,
        category_id: args.category_id,
        is_archived: args.is_archived ?? false,
      });
      
      // delete old questions
      const oldQuestions = await ctx.db
        .query("questions")
        .withIndex("by_evaluation", (q) => q.eq("evaluation_id", evalId))
        .collect();
      for (const q of oldQuestions) {
        await ctx.db.delete(q._id);
      }
    } else {
      // insert
      evalId = await ctx.db.insert("evaluations", {
        title: args.title,
        category_id: args.category_id,
        is_archived: args.is_archived ?? false,
      });
    }

    // insert new questions
    for (const q of args.questions) {
      const { id, ...rest } = q;
      await ctx.db.insert("questions", {
        ...rest,
        evaluation_id: evalId,
      });
    }
    
    return evalId;
  },
});

export const remove = mutation({
  args: { id: v.id("evaluations") },
  handler: async (ctx, args) => {
    const evalId = args.id;
    await ctx.db.delete(evalId);
    const oldQuestions = await ctx.db
      .query("questions")
      .withIndex("by_evaluation", (q) => q.eq("evaluation_id", evalId))
      .collect();
    for (const q of oldQuestions) {
      await ctx.db.delete(q._id);
    }
  },
});

export const toggleArchive = mutation({
  args: { id: v.id("evaluations"), is_archived: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_archived: args.is_archived });
  },
});

export const ping = query({
  args: {},
  handler: async () => {
    return "pong-" + Date.now();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
