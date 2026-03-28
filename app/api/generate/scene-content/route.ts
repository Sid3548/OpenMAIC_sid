/**
 * Scene Content Generation API
 *
 * Generates scene content (slides/quiz/interactive/pbl) from an outline.
 * This is the first half of the two-step scene generation pipeline.
 * Does NOT generate actions — use /api/generate/scene-actions for that.
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import {
  applyOutlineFallbacks,
  generateSceneContent,
  buildVisionUserContent,
} from '@/lib/generation/generation-pipeline';
import type { AgentInfo } from '@/lib/generation/generation-pipeline';
import type { SceneOutline, PdfImage, ImageMapping } from '@/lib/types/generation';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveModelFromHeaders, resolveModel } from '@/lib/server/resolve-model';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit';

const log = createLogger('Scene Content API');

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 401, 'Sign in to use this feature');
    }
    const rl = await checkRateLimit('scene-content', session.user.id, 30, 60);
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = await req.json();
    const {
      outline: rawOutline,
      allOutlines,
      pdfImages,
      imageMapping,
      stageInfo,
      stageId,
      agents,
    } = body as {
      outline: SceneOutline;
      allOutlines: SceneOutline[];
      pdfImages?: PdfImage[];
      imageMapping?: ImageMapping;
      stageInfo: {
        name: string;
        description?: string;
        language?: string;
        style?: string;
      };
      stageId: string;
      agents?: AgentInfo[];
    };

    // Validate required fields
    if (!rawOutline) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'outline is required');
    }
    if (!allOutlines || allOutlines.length === 0) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'allOutlines is required and must not be empty',
      );
    }
    if (!stageId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'stageId is required');
    }

    // Ensure outline has language from stageInfo (fallback for older outlines)
    const outline: SceneOutline = {
      ...rawOutline,
      language: rawOutline.language || (stageInfo?.language as 'zh-CN' | 'en-US' | 'hi-IN') || 'zh-CN',
    };

    // ── Model resolution ──
    // Interactive scenes need strong code generation — try a chain of models
    const interactiveModelsEnv = process.env.DEFAULT_INTERACTIVE_MODEL;
    const isInteractive = outline.type === 'interactive' && interactiveModelsEnv;
    const interactiveModelChain = isInteractive
      ? interactiveModelsEnv.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // Helper: build aiCall + generate for a given resolved model
    const buildAiCall = (lm: ReturnType<typeof resolveModel>) => {
      const hasVis = !!lm.modelInfo?.capabilities?.vision;
      const fn = async (
        systemPrompt: string,
        userPrompt: string,
        images?: Array<{ id: string; src: string }>,
      ): Promise<string> => {
        if (images?.length && hasVis) {
          const result = await callLLM(
            {
              model: lm.model,
              system: systemPrompt,
              messages: [
                { role: 'user' as const, content: buildVisionUserContent(userPrompt, images) },
              ],
              maxOutputTokens: lm.modelInfo?.outputWindow,
            },
            'scene-content',
          );
          return result.text;
        }
        const result = await callLLM(
          { model: lm.model, system: systemPrompt, prompt: userPrompt, maxOutputTokens: lm.modelInfo?.outputWindow },
          'scene-content',
        );
        return result.text;
      };
      return { aiCall: fn, hasVision: hasVis, model: lm.model, modelString: lm.modelString };
    };

    // ── Apply fallbacks ──
    const defaultResolved = resolveModelFromHeaders(req);
    const effectiveOutline = applyOutlineFallbacks(outline, !!defaultResolved.model);

    // ── Filter images assigned to this outline ──
    let assignedImages: PdfImage[] | undefined;
    if (
      pdfImages &&
      pdfImages.length > 0 &&
      effectiveOutline.suggestedImageIds &&
      effectiveOutline.suggestedImageIds.length > 0
    ) {
      const suggestedIds = new Set(effectiveOutline.suggestedImageIds);
      assignedImages = pdfImages.filter((img) => suggestedIds.has(img.id));
    }

    const generatedMediaMapping: ImageMapping = {};

    // ── Generate content (with fallback chain for interactive) ──
    let content;
    let usedModelString: string;

    if (isInteractive && interactiveModelChain.length > 0) {
      // Try each model in the chain until one succeeds
      for (let i = 0; i < interactiveModelChain.length; i++) {
        const ms = interactiveModelChain[i];
        try {
          const resolved = resolveModel({ modelString: ms });
          const { aiCall, hasVision, modelString: mStr } = buildAiCall(resolved);
          log.info(`Interactive scene — trying ${ms} (${i + 1}/${interactiveModelChain.length})`);

          content = await generateSceneContent(
            effectiveOutline, aiCall, assignedImages, imageMapping,
            effectiveOutline.type === 'pbl' ? resolved.model : undefined,
            hasVision, generatedMediaMapping, agents,
          );

          if (content) {
            usedModelString = mStr;
            log.info(`Interactive scene succeeded with ${ms}`);
            break;
          }
          log.warn(`Interactive scene returned null with ${ms}, trying next`);
        } catch (err) {
          log.warn(`Interactive scene failed with ${ms}: ${err instanceof Error ? err.message : err}`);
        }
      }

      // Final fallback: use the default model from headers
      if (!content) {
        log.info(`Interactive fallback chain exhausted, trying default model`);
        const { aiCall, hasVision } = buildAiCall(defaultResolved);
        usedModelString = defaultResolved.modelString;
        content = await generateSceneContent(
          effectiveOutline, aiCall, assignedImages, imageMapping,
          effectiveOutline.type === 'pbl' ? defaultResolved.model : undefined,
          hasVision, generatedMediaMapping, agents,
        );
      }
    } else {
      // Non-interactive: use default model from headers
      const { aiCall, hasVision } = buildAiCall(defaultResolved);
      usedModelString = defaultResolved.modelString;
      log.info(
        `Generating content: "${effectiveOutline.title}" (${effectiveOutline.type}) [model=${usedModelString}]`,
      );
      content = await generateSceneContent(
        effectiveOutline, aiCall, assignedImages, imageMapping,
        effectiveOutline.type === 'pbl' ? defaultResolved.model : undefined,
        hasVision, generatedMediaMapping, agents,
      );
    }

    if (!content) {
      log.error(`Failed to generate content for: "${effectiveOutline.title}"`);
      return apiError(
        'GENERATION_FAILED', 500,
        `Failed to generate content: ${effectiveOutline.title}`,
      );
    }

    log.info(`Content generated successfully: "${effectiveOutline.title}" [model=${usedModelString!}]`);

    return apiSuccess({ content, effectiveOutline });
  } catch (error) {
    log.error('Scene content generation error:', error);
    return apiError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : String(error));
  }
}
