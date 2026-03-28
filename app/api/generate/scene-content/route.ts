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

import type { GeneratedInteractiveContent } from '@/lib/types/generation';

const log = createLogger('Scene Content API');

export const maxDuration = 300;

/**
 * Validate that generated interactive HTML is actually interactive.
 * Checks for proper structure, JavaScript, and interactive elements.
 * Returns null if valid, or a reason string if invalid.
 */
function validateInteractiveHtml(content: unknown): string | null {
  const ic = content as GeneratedInteractiveContent | null;
  if (!ic?.html) return 'no html field';

  const html = ic.html;

  // Must be a reasonable size (a real interactive page is at least 1KB)
  if (html.length < 500) return `too short (${html.length} chars)`;

  // Must have basic HTML structure
  if (!html.includes('<html') || !html.includes('</html>'))
    return 'missing <html> structure';

  // Must have a <script> tag with actual code
  const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch || scriptMatch[1].trim().length < 50)
    return 'missing or empty <script> tag';

  // Must have at least one interactive element or API
  const interactiveSignals = [
    'addEventListener', 'onclick', 'oninput', 'onchange', 'onmousemove',
    'onmousedown', 'ontouchstart', 'ondrag',
    '<input', '<button', '<select', '<range', '<canvas', '<svg',
    'requestAnimationFrame', 'setInterval', 'getContext',
    'slider', 'drag', 'click',
  ];
  const hasInteractive = interactiveSignals.some((s) => html.toLowerCase().includes(s.toLowerCase()));
  if (!hasInteractive) return 'no interactive elements found';

  return null; // valid
}

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
      const MAX_RETRIES = 2; // attempts per model before moving to next

      for (let i = 0; i < interactiveModelChain.length; i++) {
        const ms = interactiveModelChain[i];

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const resolved = resolveModel({ modelString: ms });
            const { aiCall, hasVision, modelString: mStr } = buildAiCall(resolved);
            log.info(`Interactive scene — ${ms} attempt ${attempt}/${MAX_RETRIES} (model ${i + 1}/${interactiveModelChain.length})`);

            const result = await generateSceneContent(
              effectiveOutline, aiCall, assignedImages, imageMapping,
              effectiveOutline.type === 'pbl' ? resolved.model : undefined,
              hasVision, generatedMediaMapping, agents,
            );

            if (!result) {
              log.warn(`Interactive ${ms} attempt ${attempt}: returned null`);
              continue;
            }

            // Validate the HTML has actual interactive elements
            const issue = validateInteractiveHtml(result);
            if (issue) {
              log.warn(`Interactive ${ms} attempt ${attempt}: validation failed — ${issue}`);
              continue;
            }

            // Passed validation
            content = result;
            usedModelString = mStr;
            log.info(`Interactive scene validated OK with ${ms} (attempt ${attempt})`);
            break;
          } catch (err) {
            log.warn(`Interactive ${ms} attempt ${attempt}: error — ${err instanceof Error ? err.message : err}`);
          }
        }

        if (content) break; // found a good one, stop trying models
      }

      // Final fallback: default model from headers (no validation — best effort)
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
