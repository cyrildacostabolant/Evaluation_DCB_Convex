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

// Fonctions utilitaires pour extraire les IDs de fichiers stockés dans Convex Storage
function extractStorageIds(text: string | null | undefined): string[] {
  if (!text) return [];
  const ids: string[] = [];
  // Reconnaît les URLs standard Convex (/api/storage/<storageId> ou /storage/<storageId>)
  const storageRegex = /\/(?:api\/)?storage\/([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = storageRegex.exec(text)) !== null) {
    if (match[1] && !ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
}

function extractAllStorageIdsFromEvaluation(evalDoc: any, questions: any[]): Set<string> {
  const ids = new Set<string>();
  if (evalDoc?.coverImageId) {
    ids.add(evalDoc.coverImageId.toString());
  }
  for (const q of questions) {
    for (const field of [q.question_text, q.teacher_answer, q.student_prompt]) {
      for (const id of extractStorageIds(field)) {
        ids.add(id);
      }
    }
    if (Array.isArray(q.mcq_options)) {
      for (const opt of q.mcq_options) {
        for (const id of extractStorageIds(opt?.text)) {
          ids.add(id);
        }
      }
    }
  }
  return ids;
}

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
    let existingDoc: any = null;
    const questionCount = args.questions.length;

    if (args.id) {
      try {
        existingDoc = await ctx.db.get(args.id as any);
        if (existingDoc) {
          evalId = existingDoc._id;
        }
      } catch {
        evalId = null;
        existingDoc = null;
      }
    }

    if (evalId && existingDoc) {
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

      // Nettoyer les fichiers de stockage supprimés lors de l'édition
      try {
        const oldStorageIds = extractAllStorageIdsFromEvaluation(existingDoc, oldQuestions);
        const newStorageIds = extractAllStorageIdsFromEvaluation(
          { ...existingDoc, ...args },
          args.questions
        );

        for (const oldId of oldStorageIds) {
          if (!newStorageIds.has(oldId)) {
            try {
              await ctx.storage.delete(oldId as any);
            } catch (err) {
              console.warn("Impossible de supprimer le fichier supprimé de l'éditeur:", oldId, err);
            }
          }
        }
      } catch (err) {
        console.warn("Erreur lors du nettoyage des fichiers lors de la sauvegarde:", err);
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

      // 1. Récupérer les questions pour extraire tous les fichiers images stockés
      const oldQuestions = await ctx.db
        .query("questions")
        .withIndex("by_evaluation", (q) => q.eq("evaluation_id", existing._id))
        .collect();

      // 2. Extraire et supprimer tous les fichiers dans Convex Storage
      const storageIds = extractAllStorageIdsFromEvaluation(existing, oldQuestions);
      for (const storageId of storageIds) {
        try {
          await ctx.storage.delete(storageId as any);
        } catch (err) {
          console.warn("Fichier de stockage introuvable ou déjà supprimé:", storageId, err);
        }
      }

      // 3. Supprimer les questions
      for (const q of oldQuestions) {
        await ctx.db.delete(q._id);
      }

      // 4. Supprimer l'évaluation
      await ctx.db.delete(existing._id);
    } catch {
      // ignore
    }
  },
});

// Mutation pour nettoyer tous les anciens fichiers orphelins dans File Storage
export const cleanOrphanedFiles = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Récupérer toutes les évaluations et questions existantes
    const allEvaluations = await ctx.db.query("evaluations").collect();
    const allQuestions = await ctx.db.query("questions").collect();

    // 2. Extraire tous les IDs de fichiers activement référencés
    const activeStorageIds = new Set<string>();
    for (const ev of allEvaluations) {
      if ((ev as any).coverImageId) {
        activeStorageIds.add((ev as any).coverImageId.toString());
      }
    }
    for (const q of allQuestions) {
      for (const field of [q.question_text, q.teacher_answer, q.student_prompt]) {
        for (const id of extractStorageIds(field)) {
          activeStorageIds.add(id);
        }
      }
      if (Array.isArray(q.mcq_options)) {
        for (const opt of q.mcq_options) {
          for (const id of extractStorageIds(opt?.text)) {
            activeStorageIds.add(id);
          }
        }
      }
    }

    // 3. Récupérer tous les fichiers stockés dans Convex _storage
    const allStoredFiles = await ctx.db.system.query("_storage").collect();
    let deletedCount = 0;

    for (const file of allStoredFiles) {
      const fileIdStr = file._id.toString();
      if (!activeStorageIds.has(fileIdStr)) {
        try {
          await ctx.storage.delete(file._id);
          deletedCount++;
        } catch (err) {
          console.warn("Erreur lors de la suppression du fichier orphelin:", fileIdStr, err);
        }
      }
    }

    return {
      totalStored: allStoredFiles.length,
      deletedCount,
      activeCount: activeStorageIds.size,
    };
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
