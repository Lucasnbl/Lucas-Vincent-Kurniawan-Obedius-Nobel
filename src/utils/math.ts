import { Alternative, Criterion, TOPSISResult, TOPSISMatrixes, WASPASResult, WASPASMatrixes, CombinedResult } from '../types';



/**
 * Calculates scores and ranks using TOPSIS based on pre-calculated weights
 */
export function calculateTOPSIS(
  alternatives: Alternative[],
  weights: number[],
  criteria: Criterion[]
): { results: TOPSISResult[]; matrixes: TOPSISMatrixes } {
  const m = alternatives.length;
  const n = criteria.length;

  if (m === 0) {
    return { results: [], matrixes: { normalized: [], weighted: [], positiveIdeal: [], negativeIdeal: [], distanceToPositive: [], distanceToNegative: [], preferences: [] } };
  }

  // 1. Gather original score matrix (m x n)
  const originalMatrix: number[][] = alternatives.map(alt => [
    alt.scores.C1,
    alt.scores.C2,
    alt.scores.C3,
    alt.scores.C4,
    alt.scores.C5,
    alt.scores.C6
  ]);

  // 2. Compute denominator for vector normalization of each criterion
  // denom_j = sqrt( sum_i (x_ij ^ 2) )
  const denominators = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let sumSq = 0;
    for (let i = 0; i < m; i++) {
      sumSq += originalMatrix[i][j] * originalMatrix[i][j];
    }
    denominators[j] = Math.sqrt(sumSq);
  }

  // 3. Build Normalized Decision Matrix (R)
  const normalized: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      normalized[i][j] = denominators[j] > 0 ? (originalMatrix[i][j] / denominators[j]) : 0;
    }
  }

  // 4. Build Weighted Normalized Decision Matrix (Y)
  const weighted: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      weighted[i][j] = normalized[i][j] * weights[j];
    }
  }

  // 5. Determine Positive Ideal Solution (A+) and Negative Ideal Solution (A-)
  const positiveIdeal = Array(n).fill(0);
  const negativeIdeal = Array(n).fill(0);

  for (let j = 0; j < n; j++) {
    const criterion = criteria[j];
    const vals = weighted.map(row => row[j]);

    if (criterion.type === 'benefit') {
      positiveIdeal[j] = Math.max(...vals);
      negativeIdeal[j] = Math.min(...vals);
    } else {
      // Cost criterion (C1: Biaya Sewa, C5: Jumlah Kompetitor)
      positiveIdeal[j] = Math.min(...vals);
      negativeIdeal[j] = Math.max(...vals);
    }
  }

  // 6. Calculate separation metrics (D+ and D-)
  const distanceToPositive = Array(m).fill(0);
  const distanceToNegative = Array(m).fill(0);
  const preferences = Array(m).fill(0);

  for (let i = 0; i < m; i++) {
    let sumSqPos = 0;
    let sumSqNeg = 0;
    for (let j = 0; j < n; j++) {
      sumSqPos += Math.pow(weighted[i][j] - positiveIdeal[j], 2);
      sumSqNeg += Math.pow(weighted[i][j] - negativeIdeal[j], 2);
    }
    distanceToPositive[i] = Math.sqrt(sumSqPos);
    distanceToNegative[i] = Math.sqrt(sumSqNeg);

    const totalDist = distanceToPositive[i] + distanceToNegative[i];
    preferences[i] = totalDist > 0 ? (distanceToNegative[i] / totalDist) : 0;
  }

  // 7. Compose and sort output
  const results: TOPSISResult[] = alternatives.map((alt, index) => {
    return {
      alternativeId: alt.id,
      name: alt.name,
      scores: originalMatrix[index],
      normalizedScores: normalized[index],
      weightedNormalized: weighted[index],
      distanceToIdeal: distanceToPositive[index],
      distanceToNegativeIdeal: distanceToNegative[index],
      preference: preferences[index],
      rank: 1 // assigned below
    };
  });

  // Calculate ranks
  const sortedIndices = [...results.keys()].sort((a, b) => results[b].preference - results[a].preference);
  sortedIndices.forEach((originalIndex, sortedRankIndex) => {
    results[originalIndex].rank = sortedRankIndex + 1;
  });

  return {
    results,
    matrixes: {
      normalized,
      weighted,
      positiveIdeal,
      negativeIdeal,
      distanceToPositive,
      distanceToNegative,
      preferences
    }
  };
}

/**
 * Calculates scores and ranks using WASPAS based on pre-calculated weights
 */
export function calculateWASPAS(
  alternatives: Alternative[],
  weights: number[],
  criteria: Criterion[],
  lambda: number = 0.5
): { results: WASPASResult[]; matrixes: WASPASMatrixes } {
  const m = alternatives.length;
  const n = criteria.length;

  if (m === 0) {
    return { results: [], matrixes: { normalized: [], wsmTerms: [], wpmTerms: [] } };
  }

  // 1. Gather original score matrix (m x n)
  const originalMatrix: number[][] = alternatives.map(alt => [
    alt.scores.C1,
    alt.scores.C2,
    alt.scores.C3,
    alt.scores.C4,
    alt.scores.C5,
    alt.scores.C6
  ]);

  // 2. Build Normalized Decision Matrix (R) for WASPAS
  const normalized: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    const criterion = criteria[j];
    const vals = originalMatrix.map(row => row[j]);
    const maxVal = Math.max(...vals);
    const minVal = Math.min(...vals);

    for (let i = 0; i < m; i++) {
      const cell = originalMatrix[i][j];
      if (criterion.type === 'benefit') {
        normalized[i][j] = maxVal > 0 ? (cell / maxVal) : 0;
      } else {
        // Cost criterion (e.g. C1 Biaya Sewa, C5 Kompetitor)
        if (minVal === 0) {
          normalized[i][j] = (minVal + 1) / (cell + 1);
        } else {
          normalized[i][j] = cell > 0 ? (minVal / cell) : 1;
        }
      }
    }
  }

  // 3. Compute WSM and WPM terms
  const wsmTerms: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
  const wpmTerms: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const w_ij = normalized[i][j];
      const W_j = weights[j];
      wsmTerms[i][j] = w_ij * W_j;
      wpmTerms[i][j] = Math.pow(w_ij, W_j);
    }
  }

  // 4. Calculate final score
  const results: WASPASResult[] = alternatives.map((alt, i) => {
    const wsm = wsmTerms[i].reduce((sum, val) => sum + val, 0);
    const wpm = wpmTerms[i].reduce((prod, val) => prod * val, 1);
    const waspasScore = lambda * wsm + (1 - lambda) * wpm;

    return {
      alternativeId: alt.id,
      name: alt.name,
      scores: originalMatrix[i],
      normalizedScores: normalized[i],
      wsmTerms: wsmTerms[i],
      wpmTerms: wpmTerms[i],
      wsm,
      wpm,
      waspasScore,
      rank: 1
    };
  });

  // Calculate ranks
  const sortedIndices = [...results.keys()].sort((a, b) => results[b].waspasScore - results[a].waspasScore);
  sortedIndices.forEach((originalIndex, sortedRankIndex) => {
    results[originalIndex].rank = sortedRankIndex + 1;
  });

  return {
    results,
    matrixes: {
      normalized,
      wsmTerms,
      wpmTerms
    }
  };
}

/**
 * Combines TOPSIS and WASPAS rankings into an aggregated recommendation ranking
 */
export function calculateCombined(
  topsisResults: TOPSISResult[],
  waspasResults: WASPASResult[]
): CombinedResult[] {
  const combined: CombinedResult[] = topsisResults.map(t => {
    const w = waspasResults.find(r => r.alternativeId === t.alternativeId)!;
    const combinedScore = (t.preference + w.waspasScore) / 2;

    return {
      alternativeId: t.alternativeId,
      name: t.name,
      topsisPref: t.preference,
      topsisRank: t.rank,
      waspasScore: w.waspasScore,
      waspasRank: w.rank,
      averageRank: (t.rank + w.rank) / 2,
      combinedScore,
      finalRank: 1
    };
  });

  // Rank based on combinedScore (higher is better)
  const sortedIndices = [...combined.keys()].sort((a, b) => {
    if (combined[b].combinedScore !== combined[a].combinedScore) {
      return combined[b].combinedScore - combined[a].combinedScore;
    }
    return combined[a].averageRank - combined[b].averageRank;
  });

  sortedIndices.forEach((originalIndex, sortedRankIndex) => {
    combined[originalIndex].finalRank = sortedRankIndex + 1;
  });

  return combined;
}
