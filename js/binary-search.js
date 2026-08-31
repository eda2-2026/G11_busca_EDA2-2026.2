import { assertValidRange } from "./linear-search.js";

export function binarySearch(minimum, maximum, capacity) {
  const range = assertValidRange(minimum, maximum);

  if (!Number.isInteger(capacity) || capacity < range.minimum || capacity > range.maximum) {
    throw new RangeError("A capacidade deve ser um inteiro dentro do intervalo de cargas.");
  }

  const attempts = [];
  let lowestLoad = range.minimum;
  let highestLoad = range.maximum;
  let highestSupported = range.minimum - 1;
  let brokenAt = null;

  while (lowestLoad <= highestLoad) {
    const trialLoad = Math.floor((lowestLoad + highestLoad) / 2);
    const supported = trialLoad <= capacity;

    attempts.push({
      load: trialLoad,
      supported,
      result: supported ? "supported" : "broken",
    });

    if (supported) {
      highestSupported = trialLoad;
      lowestLoad = trialLoad + 1;
    } else {
      brokenAt = trialLoad;
      highestLoad = trialLoad - 1;
    }
  }

  const bridgeBroke = brokenAt !== null;

  return {
    minimum: range.minimum,
    maximum: range.maximum,
    capacity,
    attempts,
    attemptCount: attempts.length,
    highestSupported: bridgeBroke ? Math.max(highestSupported, capacity) : capacity,
    bridgeBroke,
    brokenAt,
    completedWithoutBreak: !bridgeBroke,
  };
}
