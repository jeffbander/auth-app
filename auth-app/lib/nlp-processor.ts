// NLP Processor for Clinical Notes Analysis

import {
  ALL_CLINICAL_TERMS,
  ClinicalTerm,
  NEGATION_PATTERNS,
  PRESENCE_PATTERNS,
  UNCERTAIN_PATTERNS,
  COMPOUND_NEGATION_PREFIXES,
  NEGATED_COMPOUND_TERMS,
  CARDIAC_SYMPTOMS,
  CARDIAC_HISTORY,
  CARDIAC_FINDINGS,
  RISK_FACTORS,
} from "./clinical-terms";
import {
  detectSpecialist,
  DetectedSpecialist,
  resolveSpecialistConflict,
} from "./specialist-hierarchy";

export interface DetectedFinding {
  term: ClinicalTerm;
  matchedText: string;
  isPresent: boolean;
  isNegated: boolean;
  isUncertain: boolean;  // True if finding is mentioned but uncertain (possible, likely, r/o, etc.)
  isExplicitlyConfirmed: boolean;  // True only if explicit presence pattern found
  context: string;
  specialist: DetectedSpecialist | null;
  providerName: string | null;
  date: Date | null;
  dateString: string | null;
  confidence: number;
}

export interface NoteSection {
  text: string;
  specialist: DetectedSpecialist | null;
  providerName: string | null;
  date: Date | null;
  dateString: string | null;
}

export interface AnalysisResult {
  qualificationStatus: "Qualified" | "Not Qualified" | "Review Needed" | "Insufficient Information";
  primaryIndication: string | null;
  supportingFindings: string[];
  clinicalCitations: {
    finding: string;
    specialty: string;
    provider: string | null;
    date: string | null;
    priority: number;
  }[];
  conflictingInfo: {
    finding: string;
    sources: {
      specialty: string;
      assessment: string;
      date: string | null;
    }[];
  }[];
  confidenceLevel: "High" | "Medium" | "Low";
  allFindings: DetectedFinding[];
  // Extracted patient information
  extractedInfo: ExtractedPatientInfo;
  // Explanation when insufficient information
  insufficientReason?: string;
}

// Date extraction patterns - ordered by specificity
const DATE_PATTERNS: RegExp[] = [
  /(\d{1,2}\/\d{1,2}\/\d{2,4})/g, // MM/DD/YYYY or M/D/YY
  /(\d{1,2}-\d{1,2}-\d{2,4})/g, // MM-DD-YYYY
  /(\d{4}-\d{2}-\d{2})/g, // YYYY-MM-DD
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/gi,
  /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
];

// Labeled date patterns - these take priority as they're explicitly labeled
const LABELED_DATE_PATTERNS: RegExp[] = [
  /(?:Appointment|Appt)[\s:]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
  /(?:Date|Visit\s*Date|DOS|Date\s+of\s+Service|Service\s+Date)[\s:]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
  /(?:Date|Visit\s*Date|DOS|Date\s+of\s+Service|Service\s+Date)[\s:]+(\d{1,2}-\d{1,2}-\d{2,4})/gi,
  /(?:Encounter\s+Date|Exam\s+Date|Visit)[\s:]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
  /(?:Appointment|Appt)[\s:]+(\d{1,2}-\d{1,2}-\d{2,4})/gi,
];

// Provider name patterns - ordered by specificity (most specific first)
const PROVIDER_PATTERNS: RegExp[] = [
  // Attestation patterns (most reliable for ordering provider)
  /Provider\s+Attestation:\s*I,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:MD|DO|NP|PA|ARNP|APRN)/gi,
  /presence\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:MD|DO|NP|PA|ARNP|APRN)/gi,
  /direction\s+(?:of|and\s+in\s+the\s+presence\s+of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:MD|DO|NP|PA|ARNP|APRN)/gi,
  // Ordering provider patterns
  /(?:Ordering\s+(?:Provider|Physician)):\s*(?:Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  /(?:Referred\s+by|Referral\s+from):\s*(?:Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  // Standard patterns
  /(?:Attending|Consultant|Primary\s+(?:Care\s+)?Physician):\s*(?:Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  /(?:Signed|Authenticated|Electronically\s+signed)\s+(?:by\s+)?(?:Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  // Name followed by credentials (but exclude department names - must have proper name capitalization)
  /(?:^|[\s,])([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:MD|DO|NP|PA|ARNP|APRN)(?:[\s,]|$)/gm,
  // Dr. prefix patterns
  /(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
];

// MRN extraction patterns
const MRN_PATTERNS: RegExp[] = [
  /(?:MRN|Medical\s+Record\s+(?:Number|No\.?|#))[\s:]*([A-Z0-9-]+)/gi,
  /(?:Patient\s+(?:ID|Identifier|Number))[\s:]*([A-Z0-9-]+)/gi,
  /(?:Chart\s+(?:Number|No\.?|#))[\s:]*([A-Z0-9-]+)/gi,
  /(?:Account\s+(?:Number|No\.?|#))[\s:]*([A-Z0-9-]+)/gi,
];

/**
 * Parse a date string into a Date object
 */
function parseDate(dateStr: string): Date | null {
  try {
    // Try various formats
    const cleaned = dateStr.trim();

    // MM/DD/YYYY or M/D/YY
    const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slashMatch) {
      let year = parseInt(slashMatch[3]);
      if (year < 100) year += 2000;
      return new Date(year, parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
    }

    // YYYY-MM-DD
    const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }

    // Try native parsing as fallback
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract dates from text
 * Prioritizes labeled dates (Appointment, Date:, etc.) over unlabeled dates
 */
function extractDates(text: string): { date: Date; dateString: string; isLabeled: boolean }[] {
  const dates: { date: Date; dateString: string; isLabeled: boolean }[] = [];
  const seenDates = new Set<string>();

  // First, try to find labeled dates (these are more reliable)
  for (const pattern of LABELED_DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      // The date is in capture group 1
      const dateStr = match[1];
      if (dateStr && !seenDates.has(dateStr)) {
        const parsed = parseDate(dateStr);
        if (parsed) {
          dates.push({ date: parsed, dateString: dateStr, isLabeled: true });
          seenDates.add(dateStr);
        }
      }
    }
  }

  // Then look for any other dates in the text
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const dateStr = match[0];
      if (!seenDates.has(dateStr)) {
        const parsed = parseDate(dateStr);
        if (parsed) {
          dates.push({ date: parsed, dateString: dateStr, isLabeled: false });
          seenDates.add(dateStr);
        }
      }
    }
  }

  // Sort: labeled dates first, then by date (most recent first)
  dates.sort((a, b) => {
    if (a.isLabeled !== b.isLabeled) {
      return a.isLabeled ? -1 : 1;
    }
    return b.date.getTime() - a.date.getTime();
  });

  return dates;
}

/**
 * Check if a string looks like a department/location name rather than a person name
 */
function isDepartmentName(name: string): boolean {
  const departmentKeywords = [
    'ambulatory', 'department', 'clinic', 'center', 'unit', 'hospital',
    'medical', 'health', 'care', 'services', 'surgery', 'cardiology',
    'emergency', 'inpatient', 'outpatient', 'lab', 'laboratory'
  ];
  const lowerName = name.toLowerCase();
  return departmentKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Check if a string looks like a proper person name
 */
function isProperName(name: string): boolean {
  // Must have at least 2 characters and start with capital
  if (name.length < 2 || !/^[A-Z]/.test(name)) return false;
  // Should not be all uppercase (likely an acronym or department)
  if (name === name.toUpperCase() && name.length > 3) return false;
  // Should not contain department keywords
  if (isDepartmentName(name)) return false;
  return true;
}

/**
 * Extract provider names from text
 */
function extractProviderNames(text: string): string[] {
  const providers: string[] = [];

  for (const pattern of PROVIDER_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[1]) {
        const name = match[1].trim();
        // Filter out department/location names
        if (isProperName(name)) {
          providers.push(name);
        }
      }
    }
  }

  return Array.from(new Set(providers));
}

/**
 * Extract MRN from text
 */
function extractMRN(text: string): string | null {
  for (const pattern of MRN_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract ordering/attesting provider from text
 * Returns the most authoritative provider name found
 */
function extractOrderingProvider(text: string): string | null {
  // Specific attestation patterns (highest priority)
  const attestationPatterns = [
    /Provider\s+Attestation:\s*I,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:MD|DO|NP|PA|ARNP|APRN)/i,
    /presence\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:MD|DO)/i,
    /direction\s+(?:of|and\s+in\s+the\s+presence\s+of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:MD|DO)/i,
    /Ordering\s+(?:Provider|Physician):\s*(?:Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];

  for (const pattern of attestationPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && isProperName(match[1].trim())) {
      return match[1].trim();
    }
  }

  // Fall back to general provider extraction
  const providers = extractProviderNames(text);
  return providers.length > 0 ? providers[0] : null;
}

export interface ExtractedPatientInfo {
  mrn: string | null;
  orderingProvider: string | null;
  allProviders: string[];
}

/**
 * Extract patient information from clinical notes
 */
export function extractPatientInfo(text: string): ExtractedPatientInfo {
  const mrn = extractMRN(text);
  const orderingProvider = extractOrderingProvider(text);
  const allProviders = extractProviderNames(text);

  return {
    mrn,
    orderingProvider,
    allProviders,
  };
}

/**
 * Split notes into sections (each note/visit)
 */
export function splitIntoSections(text: string): NoteSection[] {
  // Common section delimiters
  const delimiters = [
    /(?:^|\n)[-=]{3,}(?:\n|$)/g,
    /(?:^|\n)(?:Note|Visit|Encounter|Progress Note|Consult|Assessment)[\s:]+/gi,
    /(?:^|\n)(?:Date of Service|DOS|Visit Date)[\s:]+/gi,
  ];

  let sections: string[] = [text];

  // Try to split by delimiters
  for (const delimiter of delimiters) {
    const newSections: string[] = [];
    for (const section of sections) {
      const parts = section.split(delimiter).filter((s) => s.trim().length > 50);
      if (parts.length > 1) {
        newSections.push(...parts);
      } else {
        newSections.push(section);
      }
    }
    sections = newSections;
  }

  // Process each section
  return sections.map((sectionText) => {
    const specialist = detectSpecialist(sectionText);
    const dates = extractDates(sectionText);
    const providers = extractProviderNames(sectionText);

    return {
      text: sectionText,
      specialist,
      providerName: providers[0] || null,
      date: dates[0]?.date || null,
      dateString: dates[0]?.dateString || null,
    };
  });
}

/**
 * Check if the matched text itself is a negated compound term
 * e.g., "nonsmoker", "non-smoker", "asymptomatic"
 */
function isNegatedCompoundTerm(matchedText: string): boolean {
  const lowerMatch = matchedText.toLowerCase();

  // Check against known negated compound terms
  for (const term of NEGATED_COMPOUND_TERMS) {
    if (lowerMatch.includes(term) || term.includes(lowerMatch)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a finding is negated in context
 * IMPROVED: Larger context window, checks compound terms, handles word boundaries
 */
function isNegated(text: string, matchStart: number, matchedText: string): boolean {
  // First, check if the matched text itself is a negated compound term
  if (isNegatedCompoundTerm(matchedText)) {
    return true;
  }

  // Look at the 80 characters before the match for negation patterns
  const contextStart = Math.max(0, matchStart - 80);
  const contextBefore = text.substring(contextStart, matchStart).toLowerCase();

  // Also check the immediate preceding word for compound negation prefixes
  // This catches cases like "non-smoker" when we matched "smoker"
  const immediateContext = text.substring(Math.max(0, matchStart - 10), matchStart).toLowerCase();
  for (const prefix of COMPOUND_NEGATION_PREFIXES) {
    // Check if the word immediately before is a negation prefix
    if (immediateContext.trim().endsWith(prefix) || immediateContext.includes(prefix + "-")) {
      return true;
    }
  }

  // Check for negation patterns in the preceding context
  for (const negation of NEGATION_PATTERNS) {
    // Look for the negation pattern
    const negationIndex = contextBefore.lastIndexOf(negation);
    if (negationIndex !== -1) {
      // Make sure there's no intervening sentence break (period, newline, etc.)
      // between the negation and the match
      const textAfterNegation = contextBefore.substring(negationIndex + negation.length);
      if (!textAfterNegation.includes(".") &&
          !textAfterNegation.includes("\n") &&
          !textAfterNegation.includes(";") &&
          !textAfterNegation.includes(" but ") &&
          !textAfterNegation.includes(" however ")) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a finding is uncertain (possible, rule out, etc.)
 * Findings marked as uncertain should NOT be treated as confirmed present
 */
function isUncertain(text: string, matchStart: number): boolean {
  const contextStart = Math.max(0, matchStart - 60);
  const context = text.substring(contextStart, matchStart).toLowerCase();

  for (const uncertain of UNCERTAIN_PATTERNS) {
    if (context.includes(uncertain)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a finding is EXPLICITLY confirmed present
 * IMPORTANT: A finding should only be marked as present if there's explicit
 * confirmation - not just because the words appear in the chart
 */
function isExplicitlyPresent(text: string, matchStart: number): boolean {
  const contextStart = Math.max(0, matchStart - 60);
  const context = text.substring(contextStart, matchStart).toLowerCase();

  // First check if it's uncertain - uncertain findings are NOT explicitly present
  if (isUncertain(text, matchStart)) {
    return false;
  }

  for (const presence of PRESENCE_PATTERNS) {
    const presenceIndex = context.lastIndexOf(presence);
    if (presenceIndex !== -1) {
      // Make sure no sentence break between presence indicator and the match
      const textAfterPresence = context.substring(presenceIndex + presence.length);
      if (!textAfterPresence.includes(".") &&
          !textAfterPresence.includes("\n") &&
          !textAfterPresence.includes(";")) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get surrounding context for a match
 */
function getContext(text: string, matchStart: number, matchEnd: number): string {
  const contextStart = Math.max(0, matchStart - 100);
  const contextEnd = Math.min(text.length, matchEnd + 100);
  return text.substring(contextStart, contextEnd).trim();
}

/**
 * Detect clinical findings in a note section
 * IMPROVED: Requires explicit confirmation to mark as present
 * Does NOT assume presence just because words appear in chart
 */
function detectFindingsInSection(section: NoteSection): DetectedFinding[] {
  const findings: DetectedFinding[] = [];
  const lowerText = section.text.toLowerCase();

  for (const term of ALL_CLINICAL_TERMS) {
    for (const variation of term.variations) {
      const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      let match;

      while ((match = regex.exec(lowerText)) !== null) {
        const negated = isNegated(lowerText, match.index, match[0]);
        const uncertain = isUncertain(lowerText, match.index);
        const explicitlyConfirmed = isExplicitlyPresent(lowerText, match.index);

        // CRITICAL LOGIC CHANGE:
        // A finding is only marked as "present" if:
        // 1. It is EXPLICITLY confirmed by a presence pattern, AND
        // 2. It is NOT negated, AND
        // 3. It is NOT marked as uncertain
        //
        // If the term just appears in the chart without explicit confirmation,
        // it should NOT be marked as present (prevents hallucination)
        const isPresent = explicitlyConfirmed && !negated && !uncertain;

        // Calculate confidence based on context
        let confidence = 0.5; // Base confidence is now lower
        if (explicitlyConfirmed && !negated && !uncertain) {
          confidence = 0.9; // High confidence for explicitly confirmed
        } else if (negated) {
          confidence = 0.85; // We're confident it's negated
        } else if (uncertain) {
          confidence = 0.4; // Low confidence for uncertain findings
        } else {
          // Term appears but not explicitly confirmed - very low confidence
          confidence = 0.3;
        }
        if (section.specialist) confidence += 0.1 * (1 - section.specialist.priority / 5);

        findings.push({
          term,
          matchedText: match[0],
          isPresent,
          isNegated: negated,
          isUncertain: uncertain,
          isExplicitlyConfirmed: explicitlyConfirmed,
          context: getContext(section.text, match.index, match.index + match[0].length),
          specialist: section.specialist,
          providerName: section.providerName,
          date: section.date,
          dateString: section.dateString,
          confidence: Math.min(confidence, 1),
        });
      }
    }
  }

  return findings;
}

/**
 * Resolve conflicts between findings
 */
function resolveConflicts(findings: DetectedFinding[]): {
  resolved: DetectedFinding[];
  conflicts: AnalysisResult["conflictingInfo"];
} {
  const findingsByTerm = new Map<string, DetectedFinding[]>();

  // Group findings by term
  for (const finding of findings) {
    const key = finding.term.term;
    if (!findingsByTerm.has(key)) {
      findingsByTerm.set(key, []);
    }
    findingsByTerm.get(key)!.push(finding);
  }

  const resolved: DetectedFinding[] = [];
  const conflicts: AnalysisResult["conflictingInfo"] = [];

  for (const [termName, termFindings] of Array.from(findingsByTerm.entries())) {
    // Separate present and negated findings
    const presentFindings = termFindings.filter((f: DetectedFinding) => f.isPresent);
    const negatedFindings = termFindings.filter((f: DetectedFinding) => !f.isPresent);

    if (presentFindings.length > 0 && negatedFindings.length > 0) {
      // There's a conflict - apply resolution logic
      const bestPresent = presentFindings.reduce((best: DetectedFinding, current: DetectedFinding) =>
        (current.specialist?.priority ?? 99) < (best.specialist?.priority ?? 99) ? current : best
      );
      const bestNegated = negatedFindings.reduce((best: DetectedFinding, current: DetectedFinding) =>
        (current.specialist?.priority ?? 99) < (best.specialist?.priority ?? 99) ? current : best
      );

      const resolution = resolveSpecialistConflict(
        bestPresent.specialist,
        bestNegated.specialist,
        bestPresent.date,
        bestNegated.date
      );

      if (resolution.resolved) {
        if (resolution.winner === "first") {
          resolved.push(bestPresent);
        } else {
          resolved.push(bestNegated);
        }
      } else {
        // Manual review needed
        conflicts.push({
          finding: termName,
          sources: [
            {
              specialty: bestPresent.specialist?.name || "Unknown",
              assessment: "Present",
              date: bestPresent.dateString,
            },
            {
              specialty: bestNegated.specialist?.name || "Unknown",
              assessment: "Absent/Denied",
              date: bestNegated.dateString,
            },
          ],
        });
        // Still include the higher-priority finding
        resolved.push(bestPresent);
      }
    } else if (presentFindings.length > 0) {
      // Only present findings - use the best one
      const best = presentFindings.reduce((best: DetectedFinding, current: DetectedFinding) =>
        (current.specialist?.priority ?? 99) < (best.specialist?.priority ?? 99) ? current : best
      );
      resolved.push(best);
    } else if (negatedFindings.length > 0) {
      // Only negated findings - use the best one
      const best = negatedFindings.reduce((best: DetectedFinding, current: DetectedFinding) =>
        (current.specialist?.priority ?? 99) < (best.specialist?.priority ?? 99) ? current : best
      );
      resolved.push(best);
    }
  }

  return { resolved, conflicts };
}

/**
 * Determine qualification status based on findings
 * IMPROVED: Returns "Insufficient Information" when there's not enough
 * explicit clinical data to make a determination
 */
function determineQualification(
  findings: DetectedFinding[],
  conflicts: AnalysisResult["conflictingInfo"]
): {
  status: AnalysisResult["qualificationStatus"];
  primaryIndication: string | null;
  confidence: AnalysisResult["confidenceLevel"];
  insufficientReason?: string;
} {
  // Only count findings that are EXPLICITLY confirmed as present
  // This prevents "hallucinating" findings just because words appear in the chart
  const presentFindings = findings.filter((f) => f.isPresent && f.isExplicitlyConfirmed);
  const uncertainFindings = findings.filter((f) => f.isUncertain && !f.isNegated);
  const negatedFindings = findings.filter((f) => f.isNegated);

  // Count by category - ONLY explicitly confirmed findings
  const symptomCount = presentFindings.filter(
    (f) => CARDIAC_SYMPTOMS.some((s) => s.term === f.term.term)
  ).length;
  const historyCount = presentFindings.filter(
    (f) => CARDIAC_HISTORY.some((h) => h.term === f.term.term)
  ).length;
  const findingsCount = presentFindings.filter(
    (f) => CARDIAC_FINDINGS.some((c) => c.term === f.term.term)
  ).length;
  const riskFactorCount = presentFindings.filter(
    (f) => RISK_FACTORS.some((r) => r.term === f.term.term)
  ).length;

  // Calculate total weight
  const totalWeight = presentFindings.reduce((sum, f) => sum + f.term.weight, 0);

  // Find highest weight finding for primary indication
  const sortedByWeight = [...presentFindings].sort((a, b) => b.term.weight - a.term.weight);
  const primaryIndication = sortedByWeight[0]?.term.term || null;

  // Determine confidence based on source quality
  let confidence: AnalysisResult["confidenceLevel"] = "Medium";
  const hasHighPrioritySource = presentFindings.some(
    (f) => f.specialist && f.specialist.priority <= 2
  );
  const hasConflicts = conflicts.length > 0;

  if (hasHighPrioritySource && !hasConflicts) {
    confidence = "High";
  } else if (hasConflicts || !hasHighPrioritySource) {
    confidence = hasHighPrioritySource ? "Medium" : "Low";
  }

  // INSUFFICIENT INFORMATION CHECK
  // If we have NO explicitly confirmed present findings and only:
  // - Negated findings (patient denies chest pain, nonsmoker, etc.)
  // - Uncertain findings (possible, rule out, etc.)
  // - Unconfirmed mentions (words appear but no explicit confirmation)
  // Then we don't have enough information to make a qualification decision
  if (presentFindings.length === 0) {
    // Check if we have some uncertain findings that need clarification
    if (uncertainFindings.length > 0) {
      const uncertainTerms = Array.from(new Set(uncertainFindings.map(f => f.term.term))).join(", ");
      return {
        status: "Insufficient Information",
        primaryIndication: null,
        confidence: "Low",
        insufficientReason: `The chart mentions possible/suspected conditions (${uncertainTerms}) but does not explicitly confirm them. Cannot determine qualification without confirmed clinical findings.`
      };
    }

    // Check if we only have negated findings
    if (negatedFindings.length > 0 && findings.length === negatedFindings.length) {
      return {
        status: "Insufficient Information",
        primaryIndication: null,
        confidence: "Low",
        insufficientReason: "The chart only contains denied or negated findings. No positive cardiac indications were explicitly documented."
      };
    }

    // No meaningful clinical findings at all
    return {
      status: "Insufficient Information",
      primaryIndication: null,
      confidence: "Low",
      insufficientReason: "The chart does not contain explicitly confirmed cardiac symptoms, history, or findings. Cannot determine qualification without documented clinical evidence."
    };
  }

  // Qualification logic (same as before, but now only using confirmed findings)
  // Qualified if:
  // - Any cardiac history (MI, CHF, valve disease, etc.) OR
  // - Any cardiac findings (abnormal EKG, elevated troponin, etc.) OR
  // - 2+ cardiac symptoms OR
  // - 1 cardiac symptom from high-priority source OR
  // - 3+ risk factors combined with any symptom

  if (historyCount > 0 || findingsCount > 0) {
    return { status: "Qualified", primaryIndication, confidence };
  }

  if (symptomCount >= 2) {
    return { status: "Qualified", primaryIndication, confidence };
  }

  if (symptomCount >= 1 && hasHighPrioritySource) {
    return { status: "Qualified", primaryIndication, confidence };
  }

  if (riskFactorCount >= 3 && symptomCount >= 1) {
    return { status: "Qualified", primaryIndication, confidence };
  }

  // Review needed if:
  // - Has conflicts OR
  // - Has 1 symptom but not from high-priority source OR
  // - Has only risk factors (multiple)
  // - Has uncertain findings that should be clarified
  if (conflicts.length > 0) {
    return { status: "Review Needed", primaryIndication, confidence: "Low" };
  }

  if (symptomCount === 1) {
    return { status: "Review Needed", primaryIndication, confidence: "Low" };
  }

  if (riskFactorCount >= 2 && totalWeight >= 6) {
    return { status: "Review Needed", primaryIndication, confidence: "Low" };
  }

  // If we have uncertain findings alongside confirmed ones, flag for review
  if (uncertainFindings.length > 0) {
    return { status: "Review Needed", primaryIndication, confidence: "Low" };
  }

  return { status: "Not Qualified", primaryIndication: null, confidence };
}

/**
 * Main analysis function
 */
export function analyzeNotes(rawNotes: string): AnalysisResult {
  // Check for minimal input
  if (!rawNotes || rawNotes.trim().length < 20) {
    return {
      qualificationStatus: "Insufficient Information",
      primaryIndication: null,
      supportingFindings: [],
      clinicalCitations: [],
      conflictingInfo: [],
      confidenceLevel: "Low",
      allFindings: [],
      extractedInfo: { mrn: null, orderingProvider: null, allProviders: [] },
      insufficientReason: "The provided clinical notes are too brief to analyze. Please provide complete clinical documentation.",
    };
  }

  // Extract patient information from the full notes
  const extractedInfo = extractPatientInfo(rawNotes);

  // Split into sections
  const sections = splitIntoSections(rawNotes);

  // Detect findings in all sections
  const allFindings: DetectedFinding[] = [];
  for (const section of sections) {
    const sectionFindings = detectFindingsInSection(section);
    allFindings.push(...sectionFindings);
  }

  // Resolve conflicts
  const { resolved, conflicts } = resolveConflicts(allFindings);

  // Determine qualification
  const { status, primaryIndication, confidence, insufficientReason } = determineQualification(resolved, conflicts);

  // Build supporting findings list (only EXPLICITLY CONFIRMED present findings)
  const presentFindings = resolved.filter((f) => f.isPresent && f.isExplicitlyConfirmed);
  const supportingFindings = Array.from(new Set(presentFindings.map((f) => f.term.term)));

  // Build clinical citations - only for confirmed findings
  const clinicalCitations = presentFindings.map((f) => ({
    finding: f.term.term,
    specialty: f.specialist?.name || "Unknown",
    provider: f.providerName,
    date: f.dateString,
    priority: f.specialist?.priority ?? 99,
  }));

  // Remove duplicates from citations (keep highest priority)
  const uniqueCitations = clinicalCitations.reduce(
    (acc, citation) => {
      const existing = acc.find((c) => c.finding === citation.finding);
      if (!existing || citation.priority < existing.priority) {
        return [...acc.filter((c) => c.finding !== citation.finding), citation];
      }
      return acc;
    },
    [] as typeof clinicalCitations
  );

  return {
    qualificationStatus: status,
    primaryIndication,
    supportingFindings,
    clinicalCitations: uniqueCitations,
    conflictingInfo: conflicts,
    confidenceLevel: confidence,
    allFindings,
    extractedInfo,
    insufficientReason,
  };
}

/**
 * Format citations as a string
 */
export function formatCitations(
  citations: {
    finding: string;
    specialty: string;
    provider?: string | null;
    date?: string | null;
    priority: number;
  }[]
): string {
  return citations
    .map((c) => {
      let citation = `${c.finding} from ${c.specialty}`;
      if (c.provider) citation += ` with Dr. ${c.provider}`;
      if (c.date) citation += ` on ${c.date}`;
      return citation;
    })
    .join("; ");
}
