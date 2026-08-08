import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

type Hole = { hole: number; par: number; si: number };

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const INSTRUCTION = `You are reading a golf scorecard. Extract, for all 18 holes:
- hole number (1-18)
- par (3, 4, or 5)
- stroke index / handicap ranking for the hole (1-18, each used exactly once)

The stroke index is the row usually labelled "Handicap", "HCP", "H'cap", "Index" or "SI".
Do NOT confuse it with yardage or par. Every stroke index 1-18 must appear exactly once.

Respond with ONLY raw JSON, no markdown fences, no commentary, in this exact shape:
{"holes":[{"hole":1,"par":4,"si":7}, ... 18 entries ...],"tee":"Blue","confidence":"high"}
If you cannot read a value, use null for it and set "confidence":"low".`;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validate(holes: unknown): { holes: Hole[]; issues: string[] } {
  const issues: string[] = [];
  const list = Array.isArray(holes) ? (holes as Record<string, unknown>[]) : [];
  const parsed: Hole[] = list.map((h) => ({
    hole: Number(h.hole),
    par: Number(h.par),
    si: Number(h.si),
  }));
  if (parsed.length !== 18) issues.push(`Read ${parsed.length} holes, expected 18.`);
  const sis = parsed.map((h) => h.si).filter((n) => Number.isFinite(n));
  const uniqueSis = new Set(sis);
  if (uniqueSis.size !== sis.length) issues.push("Stroke indexes repeat - each 1-18 should appear once.");
  parsed.forEach((h) => {
    if (![3, 4, 5].includes(h.par)) issues.push(`Hole ${h.hole}: par ${h.par} looks wrong.`);
    if (!(h.si >= 1 && h.si <= 18)) issues.push(`Hole ${h.hole}: stroke index ${h.si} out of range.`);
  });
  return { holes: parsed, issues };
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "Scorecard reading isn't set up yet (missing API key)." },
      { status: 500 }
    );
  }

  let body: { imageBase64?: string; mediaType?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const content: Anthropic.MessageParam["content"] = [];
    if (body.imageBase64) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: (body.mediaType || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp",
          data: body.imageBase64,
        },
      });
      content.push({ type: "text", text: INSTRUCTION });
    } else if (body.text) {
      content.push({
        type: "text",
        text: `${INSTRUCTION}\n\nHere is the scorecard data the user typed:\n${body.text}`,
      });
    } else {
      return NextResponse.json({ ok: false, error: "Send a photo or the hole details." }, { status: 400 });
    }

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content }],
    });

    const text = msg.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .filter(Boolean)
      .join("\n");

    const data = extractJson(text) as { holes?: unknown; tee?: string; confidence?: string };
    const { holes, issues } = validate(data.holes);

    return NextResponse.json({
      ok: true,
      holes,
      tee: data.tee ?? null,
      confidence: data.confidence ?? "unknown",
      issues,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn't read that scorecard.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
