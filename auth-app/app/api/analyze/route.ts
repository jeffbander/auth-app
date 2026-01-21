import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for medical chart analysis - CRITICAL for preventing hallucination
const SYSTEM_PROMPT = `You are a medical chart analysis assistant specialized in determining echocardiogram qualification. Your role is to extract ONLY explicitly documented clinical findings from medical charts.

## CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:

### 1. NO HALLUCINATION
- ONLY extract information that is EXPLICITLY written in the chart
- If something is not clearly documented, do NOT assume it exists
- Do NOT infer, guess, or make assumptions about patient conditions
- Do NOT "fill in the gaps" with what might typically be true

### 2. NEGATION AWARENESS - THIS IS CRITICAL
You must correctly interpret negations. A negated condition means the patient does NOT have it:
- "no chest pain" = patient does NOT have chest pain
- "denies shortness of breath" = patient does NOT have shortness of breath
- "nonsmoker" or "non-smoker" = patient does NOT smoke
- "no history of MI" = patient does NOT have history of MI
- "chest pain ruled out" = patient does NOT have chest pain
- "negative for edema" = patient does NOT have edema
- "without dyspnea" = patient does NOT have dyspnea
- "asymptomatic" = patient has NO symptoms

NEVER mark a negated condition as present. The words "chest pain" appearing after "no" or "denies" means ABSENT, not present.

### 3. UNCERTAINTY HANDLING
If a finding is uncertain, mark it as uncertain - NOT as confirmed:
- "possible CHF" = uncertain, NOT confirmed CHF
- "rule out MI" = being investigated, NOT confirmed MI
- "? chest pain" = questionable, NOT confirmed
- "likely has" = probable, NOT confirmed
- "concerning for" = suspected, NOT confirmed

### 4. INSUFFICIENT INFORMATION
If the chart does not contain enough explicit clinical data to determine qualification, you MUST say so. It is better to say "insufficient information" than to guess.

## OUTPUT FORMAT
Respond with a JSON object (no markdown, just raw JSON):
{
  "confirmedFindings": [
    {
      "finding": "string - the clinical finding",
      "category": "symptom" | "history" | "cardiacFinding" | "riskFactor",
      "evidence": "string - exact quote from chart that confirms this",
      "confidence": "high" | "medium"
    }
  ],
  "negatedFindings": [
    {
      "finding": "string - the negated condition",
      "evidence": "string - exact quote showing negation"
    }
  ],
  "uncertainFindings": [
    {
      "finding": "string - the uncertain condition",
      "evidence": "string - exact quote showing uncertainty",
      "reason": "string - why it's uncertain (possible, rule out, etc.)"
    }
  ],
  "primaryIndication": "string or null - the main reason for echo if qualified",
  "qualificationStatus": "Qualified" | "Not Qualified" | "Review Needed" | "Insufficient Information",
  "qualificationReason": "string - brief explanation of why qualified or not",
  "confidence": "high" | "medium" | "low",
  "warnings": ["array of any concerns about data quality or ambiguity"]
}

## QUALIFICATION CRITERIA
Patient qualifies for echocardiogram if they have ANY of:
- Confirmed cardiac history (MI, CHF, valve disease, cardiomyopathy, etc.)
- Confirmed cardiac findings (abnormal EKG, elevated troponin, cardiomegaly, etc.)
- 2+ confirmed cardiac symptoms (chest pain, dyspnea, syncope, palpitations, etc.)
- 1 cardiac symptom from cardiologist or ED documentation

Patient does NOT qualify if:
- Only risk factors (HTN, DM, smoking) without symptoms
- Only negated findings
- Only uncertain/suspected findings without confirmation
- Insufficient documentation

Remember: When in doubt, mark as "Insufficient Information" or "Review Needed" - NEVER guess.`;

export async function POST(request: NextRequest) {
  try {
    const { clinicalNotes } = await request.json();

    if (!clinicalNotes || typeof clinicalNotes !== "string") {
      return NextResponse.json(
        { error: "Clinical notes are required" },
        { status: 400 }
      );
    }

    if (clinicalNotes.trim().length < 20) {
      return NextResponse.json({
        confirmedFindings: [],
        negatedFindings: [],
        uncertainFindings: [],
        primaryIndication: null,
        qualificationStatus: "Insufficient Information",
        qualificationReason: "The provided clinical notes are too brief to analyze.",
        confidence: "low",
        warnings: ["Input text is very short - please provide complete clinical documentation"],
      });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Analyze the following clinical notes for echocardiogram qualification. Remember: NO hallucination, respect ALL negations, and say "Insufficient Information" if the data is unclear.

CLINICAL NOTES:
---
${clinicalNotes}
---

Extract findings and determine qualification status. Return ONLY the JSON object, no other text.`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text content from response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse the JSON response
    let analysisResult;
    try {
      // Remove any markdown code blocks if present
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      analysisResult = JSON.parse(jsonText.trim());
    } catch {
      console.error("Failed to parse Claude response:", textContent.text);
      return NextResponse.json(
        { error: "Failed to parse analysis result", raw: textContent.text },
        { status: 500 }
      );
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
