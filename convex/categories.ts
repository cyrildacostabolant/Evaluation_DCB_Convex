import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    return categories.map(c => ({ ...c, id: c._id }));
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    user_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("categories", args);
    const newCat = await ctx.db.get(id);
    return { ...newCat, id: newCat!._id };
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
