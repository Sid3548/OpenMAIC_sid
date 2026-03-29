import { callLLM } from '@/lib/ai/llm';
import { resolveVerificationModelFromHeaders } from '@/lib/server/resolve-model';
import type { NextRequest } from 'next/server';

export async function callQuizLLM(
  req: NextRequest,
  system: string,
  prompt: string,
  source: string,
) {
  const { model } = resolveVerificationModelFromHeaders(req);
  return callLLM({ model, system, prompt }, source, { retries: 1 });
}
