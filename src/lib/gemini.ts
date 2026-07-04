import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

export interface AiAnalysisInput {
  area: string;
  district?: string;
  urgency: string;
  familiesAffected: number;
  description: string;
  items: string[];
  imageUrls?: string[];
  recentNearbyRequests?: { area: string; createdAt: string; familiesAffected: number }[];
}

export interface AiAnalysisResult {
  score: number; // 0 - 10
  flags: string[];
  reasoning: string;
  recommendation: 'approve' | 'reject' | 'review';
}

/**
 * Uses Gemini (free tier) to score a relief request's urgency/credibility,
 * flag possible duplicates, and give a human-readable reasoning summary.
 * Falls back to a safe heuristic if the API call fails (e.g. no key set),
 * so the app remains usable during local development.
 */
export async function analyzeRequest(input: AiAnalysisInput): Promise<AiAnalysisResult> {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY set');

    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = `You are an AI relief-verification assistant for a flood disaster relief platform.
Analyze the following relief request submitted by a field "focal person" and return STRICT JSON only
(no markdown, no backticks, no commentary) matching this shape:
{"score": number (0-10, one decimal, higher = more urgent/credible),
 "flags": string[] (short flags like "Possible Duplicate", "High Water Level Detected", "Vague Description"),
 "reasoning": string (2-3 sentences explaining the score, written for an admin reviewer),
 "recommendation": "approve" | "reject" | "review"}

Request details:
Area: ${input.area}${input.district ? ', ' + input.district : ''}
Self-reported urgency: ${input.urgency}
Families affected: ${input.familiesAffected}
Items requested: ${input.items.join(', ') || 'none listed'}
Description: ${input.description}
Number of photos attached: ${input.imageUrls?.length ?? 0}
Recent nearby requests (last 48h, for duplicate detection): ${
      input.recentNearbyRequests?.length
        ? JSON.stringify(input.recentNearbyRequests)
        : 'none found'
    }

Scoring guidance: weigh urgency level, families affected, description detail/specificity, presence of
photo evidence, and duplicate risk against nearby requests. Be conservative - only recommend "approve"
when the request is clearly detailed and credible; use "review" when uncertain; use "reject" only for
clear duplicates or spam.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```json\s*|^```\s*|```$/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      score: Number(parsed.score) || 5,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      reasoning: parsed.reasoning || 'No reasoning provided.',
      recommendation: ['approve', 'reject', 'review'].includes(parsed.recommendation)
        ? parsed.recommendation
        : 'review'
    };
  } catch (err) {
    console.error('Gemini analysis failed, using fallback heuristic:', err);
    return fallbackHeuristic(input);
  }
}

function fallbackHeuristic(input: AiAnalysisInput): AiAnalysisResult {
  const urgencyWeight: Record<string, number> = { low: 2, medium: 5, high: 7.5, critical: 9 };
  let score = urgencyWeight[input.urgency] ?? 5;
  const flags: string[] = [];

  if (input.familiesAffected > 100) score += 0.7;
  if (input.description.length < 40) {
    flags.push('Vague Description');
    score -= 1;
  }
  if (!input.imageUrls || input.imageUrls.length === 0) {
    flags.push('No Photo Evidence');
    score -= 0.5;
  }
  if (input.recentNearbyRequests && input.recentNearbyRequests.length > 0) {
    flags.push('Possible Duplicate');
    score -= 1.5;
  }

  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

  const recommendation: AiAnalysisResult['recommendation'] =
    flags.includes('Possible Duplicate') ? 'review' : score >= 7 ? 'approve' : score >= 4 ? 'review' : 'reject';

  return {
    score,
    flags,
    reasoning: `Automated fallback scoring used (Gemini API unavailable). Based on urgency (${input.urgency}), ${input.familiesAffected} families affected, and description length, this request scored ${score}/10.`,
    recommendation
  };
}
