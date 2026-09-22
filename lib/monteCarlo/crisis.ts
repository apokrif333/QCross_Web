export type CrisisEpisode = {
  maximumDrawdown: number;
  peakMonth: number;
  timeToTroughMonths: number;
  timeToRecoveryMonths: number | null;
};

/**
 * Finds complete peak-to-trough-to-recovery cycles in a return-only market
 * index. Episodes are ranked after detection, so each path can contribute its
 * first, second, and later deepest events without imposing a crisis schedule.
 */
export function detectDrawdownEpisodes(marketIndexValues: Float64Array): CrisisEpisode[] {
  if (marketIndexValues.length < 2) {
    return [];
  }

  const episodes: CrisisEpisode[] = [];
  let peakValue = marketIndexValues[0];
  let peakMonth = 0;
  let troughValue = peakValue;
  let troughMonth = peakMonth;
  let inDrawdown = false;

  for (let month = 1; month < marketIndexValues.length; month += 1) {
    const value = marketIndexValues[month];

    if (!inDrawdown) {
      if (value >= peakValue) {
        peakValue = value;
        peakMonth = month;
      } else {
        inDrawdown = true;
        troughValue = value;
        troughMonth = month;
      }
      continue;
    }

    if (value < troughValue) {
      troughValue = value;
      troughMonth = month;
    }

    if (value >= peakValue) {
      episodes.push({
        maximumDrawdown: troughValue / peakValue - 1,
        peakMonth,
        timeToTroughMonths: troughMonth - peakMonth,
        timeToRecoveryMonths: month - peakMonth,
      });
      peakValue = value;
      peakMonth = month;
      troughValue = value;
      troughMonth = month;
      inDrawdown = false;
    }
  }

  if (inDrawdown) {
    episodes.push({
      maximumDrawdown: troughValue / peakValue - 1,
      peakMonth,
      timeToTroughMonths: troughMonth - peakMonth,
      timeToRecoveryMonths: null,
    });
  }

  return episodes.sort((left, right) => left.maximumDrawdown - right.maximumDrawdown);
}
