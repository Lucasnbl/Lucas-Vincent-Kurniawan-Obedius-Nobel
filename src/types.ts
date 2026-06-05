export type ThemeType = 'Light' | 'Dark' | 'Coffee' | 'Chocolate';

export type CriterionType = 'benefit' | 'cost';

export interface Criterion {
  id: string;
  code: string;
  name: string;
  type: CriterionType;
  description: string;
}

export interface Alternative {
  id: string;
  name: string;
  scores: {
    C1: number; // Biaya Sewa Tahunan (Juta Rupiah) - Cost
    C2: number; // Kepadatan Lalu Lintas (Skala 1-100) - Benefit
    C3: number; // Kedekatan Pusat Kota (Skala 1-5) - Benefit
    C4: number; // Tingkat Keamanan Lingkungan (Skala 1-5) - Benefit (Subjective)
    C5: number; // Jumlah Kompetitor Sekitar (Unit) - Cost
    C6: number; // Potensi Ekonomi Warga (Skala 1-5) - Benefit (Subjective)
  };
}



export interface TOPSISResult {
  alternativeId: string;
  name: string;
  scores: number[];
  normalizedScores: number[];
  weightedNormalized: number[];
  distanceToIdeal: number;
  distanceToNegativeIdeal: number;
  preference: number;
  rank: number;
}

export interface TOPSISMatrixes {
  normalized: number[][]; // size m x n
  weighted: number[][]; // size m x n
  positiveIdeal: number[]; // size n
  negativeIdeal: number[]; // size n
  distanceToPositive: number[]; // size m
  distanceToNegative: number[]; // size m
  preferences: number[]; // size m
}

export interface WASPASResult {
  alternativeId: string;
  name: string;
  scores: number[];
  normalizedScores: number[]; // w_ij
  wsmTerms: number[]; // w_ij * W_j (contributions per criterion)
  wpmTerms: number[]; // w_ij ^ W_j (contributions per criterion)
  wsm: number; // Sum of wsmTerms
  wpm: number; // Product of wpmTerms
  waspasScore: number; // Combined: lambda * wsm + (1 - lambda) * wpm
  rank: number;
}

export interface WASPASMatrixes {
  normalized: number[][]; // m x n
  wsmTerms: number[][]; // m x n
  wpmTerms: number[][]; // m x n
}

export interface CombinedResult {
  alternativeId: string;
  name: string;
  topsisPref: number;
  topsisRank: number;
  waspasScore: number;
  waspasRank: number;
  averageRank: number;
  combinedScore: number; // (topsisPref + waspasScore) / 2
  finalRank: number;
}
