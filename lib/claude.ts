import Anthropic from '@anthropic-ai/sdk';
import type { RecipeInsert } from '@/types/recipe';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
});

const EXTRACT_PROMPT = `You are a recipe extraction assistant.
Given a cooking video URL (YouTube or Instagram), extract the recipe and return it as JSON.

Return ONLY valid JSON with this exact shape:
{
  "title": "string",
  "ingredients": ["string"],
  "steps": ["string"]
}

- ingredients: each item is a single ingredient with quantity (e.g. "2 cups flour")
- steps: each item is a single numbered instruction, plain text, no numbering prefix
- If the video URL cannot be resolved or has no recipe, return { "error": "reason" }`;

export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  steps: string[];
}

export async function extractRecipe(videoUrl: string): Promise<ExtractedRecipe> {
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from this video: ${videoUrl}`,
      },
    ],
    system: EXTRACT_PROMPT,
  });

  const text = message.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = JSON.parse(text);

  if ('error' in parsed) {
    throw new Error(parsed.error);
  }

  return parsed as ExtractedRecipe;
}

export function sourcePlatform(url: string): RecipeInsert['source_platform'] {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
}
