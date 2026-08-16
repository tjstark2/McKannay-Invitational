import { NextResponse } from "next/server";
import { guardAiRoute } from "@/lib/server/aiGuard";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function instruction(names: string[], holes: number[]) {
  return `You are reading a golf scorecard or a screenshot from a golf app (18Birdies, Grint, GolfShot or similar).

Extract each player's GROSS score on each hole. Ignore net scores, points, putts and stats.

The players in this group are: ${names.join(", ")}.
Match what you read to these names even if the card shows a nickname, a first name only,
initials, or a misspelling. If a row clearly is not one of these players, leave it out.

Holes to report: ${holes.join(", ")}.

Respond with ONLY raw JSON, no markdown fences, no commentary:
{"players":[{"name":"<one of the names above>","holes":[{"hole":1,"strokes":5}]}],"confidence":"high"}
Use only whole numbers for strokes. If a hole is blank or unreadable, leave it out rather
than guessing. Set "confidence":"low" if the card is hard to read.`;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(req: Request) {
  // Signed in, and within their hourly budget. Costs money past this point.
  const guard = await guardAiRoute(req, "parse-scores", 30);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "Photo scoring isn't set up yet (missing API key)." },
      { status: 500 }
    );
  }

  let body: { imageBase64?: string; mediaType?: string; names?: string[]; holes?: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  if (!body.imageBase64) {
    return NextResponse.json({ ok: false, error: "Send a photo." }, { status: 400 });
  }

  const names = body.names ?? [];
  const holes = body.holes ?? Array.from({ length: 18 }, (_, i) => i + 1);

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: (body.mediaType || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp",
                data: body.imageBase64,
              },
            },
            { type: "text", text: instruction(names, holes) },
          ],
        },
      ],
    });

    const text = msg.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .filter(Boolean)
      .join("\n");

    const data = extractJson(text) as {
      players?: { name?: string; holes?: { hole?: number; strokes?: number }[] }[];
      confidence?: string;
    };

    const allowed = new Set(names.map((n) => n.toLowerCase()));
    const players = (data.players ?? [])
      .filter((p) => p.name && allowed.has(String(p.name).toLowerCase()))
      .map((p) => ({
        name: String(p.name),
        holes: (p.holes ?? [])
          .map((h) => ({ hole: Number(h.hole), strokes: Number(h.strokes) }))
          .filter(
            (h) =>
              Number.isFinite(h.hole) &&
              Number.isFinite(h.strokes) &&
              holes.includes(h.hole) &&
              h.strokes >= 1 &&
              h.strokes <= 20
          ),
      }))
      .filter((p) => p.holes.length > 0);

    const unmatched = (data.players ?? [])
      .map((p) => String(p.name ?? ""))
      .filter((n) => n && !allowed.has(n.toLowerCase()));

    return NextResponse.json({
      ok: true,
      players,
      unmatched,
      confidence: data.confidence ?? "unknown",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn't read that scorecard.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
