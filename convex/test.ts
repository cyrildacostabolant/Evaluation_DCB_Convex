import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const testNormalize = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      console.log("Testing normalizeId with:", args.id);
      const result = ctx.db.normalizeId("evaluations", args.id);
      console.log("Result:", result);
      return result;
    } catch (e: any) {
      console.log("normalizeId THREW:", e.message);
      throw e;
    }
  },
});
