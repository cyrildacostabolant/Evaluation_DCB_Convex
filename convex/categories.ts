import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    try {
      const categories = await ctx.db.query("categories").collect();
      return categories.map((c: any) => ({
        id: c._id ? c._id.toString() : (c.id || ""),
        _id: c._id ? c._id.toString() : (c.id || ""),
        name: c.name || "Matière",
        color: c.color || "#6366f1",
        user_id: c.user_id,
      }));
    } catch (e) {
      console.error("Error in categories:get:", e);
      return [];
    }
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
    return { id, _id: id, ...args };
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const existing = await ctx.db.get(args.id as any);
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: args.name,
          color: args.color,
        });
      }
    } catch (e) {
      console.error("Error updating category:", e);
    }
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      const existing = await ctx.db.get(args.id as any);
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    } catch (e) {
      console.error("Error removing category:", e);
    }
  },
});

