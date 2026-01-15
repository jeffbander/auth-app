// Specialist Credibility Hierarchy for Clinical Note Processing

export interface SpecialistInfo {
  name: string;
  variations: string[];
  priority: number;
  weight: number;
}

export const SPECIALIST_HIERARCHY: SpecialistInfo[] = [
  // HIGH PRIORITY (Weight: 10)
  {
    name: "Cardiologist",
    variations: [
      "cardiologist",
      "cardiology",
      "cardiology consult",
      "cardiology note",
      "cardiac specialist",
      "heart specialist",
    ],
    priority: 1,
    weight: 10,
  },
  {
    name: "Interventional Cardiologist",
    variations: [
      "interventional cardiologist",
      "interventional cardiology",
      "cath lab",
      "cardiac catheterization",
    ],
    priority: 1,
    weight: 10,
  },
  {
    name: "Electrophysiologist",
    variations: [
      "electrophysiologist",
      "electrophysiology",
      "ep study",
      "ep lab",
      "cardiac ep",
    ],
    priority: 1,
    weight: 10,
  },
  {
    name: "Cardiac Surgeon",
    variations: [
      "cardiac surgeon",
      "cardiothoracic surgeon",
      "ct surgery",
      "cardiac surgery",
      "cardiothoracic surgery",
      "heart surgeon",
    ],
    priority: 1,
    weight: 10,
  },

  // MEDIUM-HIGH PRIORITY (Weight: 8)
  {
    name: "Emergency Department",
    variations: [
      "emergency department",
      "ed",
      "emergency medicine",
      "er",
      "emergency room",
      "emergency visit",
      "ed visit",
      "emergency physician",
    ],
    priority: 2,
    weight: 8,
  },
  {
    name: "Hospital Admission",
    variations: [
      "hospital admission",
      "inpatient",
      "admission note",
      "admitted",
      "hospitalized",
      "inpatient note",
      "discharge summary",
    ],
    priority: 2,
    weight: 8,
  },
  {
    name: "Intensivist",
    variations: [
      "intensivist",
      "icu",
      "critical care",
      "intensive care",
      "ccu",
      "cardiac icu",
      "micu",
      "critical care medicine",
    ],
    priority: 2,
    weight: 8,
  },
  {
    name: "Pulmonologist",
    variations: [
      "pulmonologist",
      "pulmonary",
      "pulmonology",
      "pulmonary medicine",
      "lung specialist",
    ],
    priority: 2,
    weight: 8,
  },
  {
    name: "Internal Medicine",
    variations: [
      "internal medicine",
      "internist",
      "medicine",
      "im",
      "internal med",
    ],
    priority: 2,
    weight: 8,
  },
  {
    name: "Hospitalist",
    variations: [
      "hospitalist",
      "hospital medicine",
      "inpatient medicine",
    ],
    priority: 2,
    weight: 8,
  },

  // MEDIUM PRIORITY (Weight: 5)
  {
    name: "Primary Care Physician",
    variations: [
      "primary care physician",
      "pcp",
      "primary care",
      "primary care provider",
      "primary doctor",
    ],
    priority: 3,
    weight: 5,
  },
  {
    name: "Family Medicine",
    variations: [
      "family medicine",
      "family practice",
      "family physician",
      "family doctor",
      "fp",
    ],
    priority: 3,
    weight: 5,
  },
  {
    name: "General Practice",
    variations: [
      "general practice",
      "general practitioner",
      "gp",
    ],
    priority: 3,
    weight: 5,
  },

  // LOW PRIORITY (Weight: 2)
  {
    name: "Other Specialist",
    variations: [
      "urology",
      "urologist",
      "dermatology",
      "dermatologist",
      "orthopedics",
      "orthopedic",
      "ophthalmology",
      "ophthalmologist",
      "neurology",
      "neurologist",
      "gastroenterology",
      "gastroenterologist",
      "endocrinology",
      "endocrinologist",
      "rheumatology",
      "rheumatologist",
      "psychiatry",
      "psychiatrist",
      "routine follow-up",
      "follow up visit",
      "follow-up",
    ],
    priority: 4,
    weight: 2,
  },
];

export interface DetectedSpecialist {
  name: string;
  priority: number;
  weight: number;
  matchedText: string;
}

/**
 * Detect specialist from note text
 */
export function detectSpecialist(text: string): DetectedSpecialist | null {
  const lowerText = text.toLowerCase();

  for (const specialist of SPECIALIST_HIERARCHY) {
    for (const variation of specialist.variations) {
      if (lowerText.includes(variation)) {
        return {
          name: specialist.name,
          priority: specialist.priority,
          weight: specialist.weight,
          matchedText: variation,
        };
      }
    }
  }

  return null;
}

/**
 * Get specialist by name
 */
export function getSpecialistInfo(name: string): SpecialistInfo | null {
  const lowerName = name.toLowerCase();

  for (const specialist of SPECIALIST_HIERARCHY) {
    if (specialist.name.toLowerCase() === lowerName) {
      return specialist;
    }
    for (const variation of specialist.variations) {
      if (variation === lowerName) {
        return specialist;
      }
    }
  }

  return null;
}

/**
 * Compare two specialists and return the higher priority one
 */
export function compareSpecialists(
  specialist1: DetectedSpecialist | null,
  specialist2: DetectedSpecialist | null
): DetectedSpecialist | null {
  if (!specialist1) return specialist2;
  if (!specialist2) return specialist1;

  // Lower priority number = higher priority
  if (specialist1.priority < specialist2.priority) return specialist1;
  if (specialist2.priority < specialist1.priority) return specialist2;

  // Same priority, compare weights
  if (specialist1.weight > specialist2.weight) return specialist1;
  if (specialist2.weight > specialist1.weight) return specialist2;

  return specialist1;
}

/**
 * Resolve conflicts based on specialist priority
 */
export interface ConflictResolution {
  resolved: boolean;
  winner: "first" | "second" | "manual_review";
  reason: string;
}

export function resolveSpecialistConflict(
  specialist1: DetectedSpecialist | null,
  specialist2: DetectedSpecialist | null,
  date1?: Date | null,
  date2?: Date | null
): ConflictResolution {
  // If one is null, the other wins
  if (!specialist1 && specialist2) {
    return { resolved: true, winner: "second", reason: "Only second source available" };
  }
  if (specialist1 && !specialist2) {
    return { resolved: true, winner: "first", reason: "Only first source available" };
  }
  if (!specialist1 && !specialist2) {
    return { resolved: false, winner: "manual_review", reason: "No specialist information" };
  }

  // Both exist - compare priorities
  if (specialist1!.priority < specialist2!.priority) {
    return {
      resolved: true,
      winner: "first",
      reason: `Higher priority: ${specialist1!.name} (priority ${specialist1!.priority}) vs ${specialist2!.name} (priority ${specialist2!.priority})`,
    };
  }
  if (specialist2!.priority < specialist1!.priority) {
    return {
      resolved: true,
      winner: "second",
      reason: `Higher priority: ${specialist2!.name} (priority ${specialist2!.priority}) vs ${specialist1!.name} (priority ${specialist1!.priority})`,
    };
  }

  // Same priority - check dates (prefer more recent, within 6 months)
  if (date1 && date2) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const date1Recent = date1 >= sixMonthsAgo;
    const date2Recent = date2 >= sixMonthsAgo;

    if (date1Recent && !date2Recent) {
      return {
        resolved: true,
        winner: "first",
        reason: "More recent note (within 6 months)",
      };
    }
    if (date2Recent && !date1Recent) {
      return {
        resolved: true,
        winner: "second",
        reason: "More recent note (within 6 months)",
      };
    }

    // Both recent or both old - prefer newer
    if (date1 > date2) {
      return {
        resolved: true,
        winner: "first",
        reason: "More recent date",
      };
    }
    if (date2 > date1) {
      return {
        resolved: true,
        winner: "second",
        reason: "More recent date",
      };
    }
  }

  // Same priority, same weight, no date resolution - needs manual review
  return {
    resolved: false,
    winner: "manual_review",
    reason: `Conflicting assessments at same priority level (${specialist1!.name})`,
  };
}
