import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query optimisée pour la liste (Dashboard et Archives)
// Renvoie uniquement les métadonnées nécessaires sans charger les questions complètes (textes, HTML, corrigés)
// Réduit la bande passante (Egress) et les lectures base de données (I/O) de plus de 95%
export const get = query({
  args: {},
  handler: async (ctx) => {
    const evaluations = await ctx.db.query("evaluations").collect();
    
    // Si question_count est déjà présent sur le document, aucune lecture supplémentaire n'est requise
    return Promise.all(
      evaluations.map(async (ev) => {
        let count = ev.question_count;
        if (typeof count !== "number") {
          // Fallback de transition pour les anciens enregistrements non encore re-sauvegardés
          const questions = await ctx.db
            .query("questions")
            .withIndex("by_evaluation", (q) => q.eq("evaluation_id", ev._id))
            .collect();
          count = questions.length;
        }

        return {
          id: ev._id,
          _id: ev._id,
          title: ev.title,
          category_id: ev.category_id,
          is_archived: ev.is_archived ?? false,
          question_count: count,
          created_at: new Date(ev._creationTime).toISOString(),
        };
      })
    );
  },
});

// Query ciblée pour charger UNIQUEMENT l'évaluation en cours d'édition ou de prévisualisation
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    if (!args.id) return null;
    try {
      const ev = await ctx.db.get(args.id as any);
      if (!ev) return null;

      const questions = await ctx.db
        .query("questions")
        .withIndex("by_evaluation", (q) => q.eq("evaluation_id", ev._id))
        .collect();

      return {
        id: ev._id,
        _id: ev._id,
        title: ev.title,
        category_id: ev.category_id,
        is_archived: ev.is_archived ?? false,
        question_count: questions.length,
        created_at: new Date(ev._creationTime).toISOString(),
        questions: questions
          .map((q) => ({ ...q, id: q._id }))
          .sort((a, b) => a.order_index - b.order_index),
      };
    } catch {
      return null;
    }
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.string()),
    title: v.string(),
    category_id: v.string(),
    is_archived: v.optional(v.boolean()),
    questions: v.array(
      v.object({
        id: v.optional(v.string()),
        section_name: v.string(),
        question_text: v.string(),
        teacher_answer: v.string(),
        student_prompt: v.optional(v.union(v.string(), v.null())),
        order_index: v.number(),
        points: v.optional(v.number()),
        is_mcq: v.optional(v.boolean()),
        mcq_options: v.optional(
          v.array(
            v.object({
              text: v.string(),
              is_correct: v.boolean(),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    let evalId: any = null;
    const questionCount = args.questions.length;

    if (args.id) {
      try {
        const existing = await ctx.db.get(args.id as any);
        if (existing) {
          evalId = existing._id;
        }
      } catch {
        evalId = null;
      }
    }

    if (evalId) {
      // Mise à jour de l'évaluation avec le nombre de questions pour éviter tout scan ultérieur
      await ctx.db.patch(evalId, {
        title: args.title,
        category_id: args.category_id,
        is_archived: args.is_archived ?? false,
        question_count: questionCount,
      });

      // Récupération des questions existantes pour synchroniser avec un minimum de writes (I/O)
      const oldQuestions = await ctx.db
        .query("questions")
        .withIndex("by_evaluation", (q) => q.eq("evaluation_id", evalId))
        .collect();

      const existingById = new Map(oldQuestions.map((q) => [q._id.toString(), q]));
      const processedOldIds = new Set<string>();

      for (const q of args.questions) {
        let isExisting = false;
        if (q.id && existingById.has(q.id)) {
          try {
            await ctx.db.patch(q.id as any, {
              section_name: q.section_name,
              question_text: q.question_text,
              teacher_answer: q.teacher_answer,
              student_prompt: q.student_prompt ?? null,
              order_index: q.order_index,
              points: q.points ?? 2,
              is_mcq: q.is_mcq ?? false,
              mcq_options: q.mcq_options ?? [],
              evaluation_id: evalId,
            });
            processedOldIds.add(q.id);
            isExisting = true;
          } catch {
            isExisting = false;
          }
        }

        if (!isExisting) {
          await ctx.db.insert("questions", {
            section_name: q.section_name,
            question_text: q.question_text,
            teacher_answer: q.teacher_answer,
            student_prompt: q.student_prompt ?? null,
            order_index: q.order_index,
            points: q.points ?? 2,
            is_mcq: q.is_mcq ?? false,
            mcq_options: q.mcq_options ?? [],
            evaluation_id: evalId,
          });
        }
      }

      // Supprimer uniquement les questions qui ont été retirées
      for (const oldQ of oldQuestions) {
        if (!processedOldIds.has(oldQ._id.toString())) {
          await ctx.db.delete(oldQ._id);
        }
      }
    } else {
      // Nouvelle évaluation
      evalId = await ctx.db.insert("evaluations", {
        title: args.title,
        category_id: args.category_id,
        is_archived: args.is_archived ?? false,
        question_count: questionCount,
      });

      // Insertion des questions
      for (const q of args.questions) {
        await ctx.db.insert("questions", {
          section_name: q.section_name,
          question_text: q.question_text,
          teacher_answer: q.teacher_answer,
          student_prompt: q.student_prompt ?? null,
          order_index: q.order_index,
          points: q.points ?? 2,
          is_mcq: q.is_mcq ?? false,
          mcq_options: q.mcq_options ?? [],
          evaluation_id: evalId,
        });
      }
    }

    return evalId;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    if (!args.id) return;
    try {
      const existing = await ctx.db.get(args.id as any);
      if (!existing) return;
      await ctx.db.delete(existing._id);
      const oldQuestions = await ctx.db
        .query("questions")
        .withIndex("by_evaluation", (q) => q.eq("evaluation_id", existing._id))
        .collect();
      for (const q of oldQuestions) {
        await ctx.db.delete(q._id);
      }
    } catch {
      // ignore
    }
  },
});

export const toggleArchive = mutation({
  args: { id: v.string(), is_archived: v.boolean() },
  handler: async (ctx, args) => {
    if (!args.id) return;
    try {
      const existing = await ctx.db.get(args.id as any);
      if (!existing) return;
      await ctx.db.patch(existing._id, { is_archived: args.is_archived });
    } catch {
      // ignore
    }
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
