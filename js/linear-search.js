export const MIN_ALLOWED_LOAD = 1;
export const MAX_ALLOWED_LOAD = 10_000;

const INTEGER_PATTERN = /^-?\d+$/;

function parseInteger(value) {
  const normalized = String(value ?? "").trim();

  if (normalized === "") {
    return { valid: false, reason: "empty" };
  }

  if (!INTEGER_PATTERN.test(normalized)) {
    return { valid: false, reason: "not-integer" };
  }

  const number = Number(normalized);

  if (!Number.isSafeInteger(number)) {
    return { valid: false, reason: "not-integer" };
  }

  return { valid: true, value: number };
}

export function validateLoadRange(minimumValue, maximumValue) {
  const minimum = parseInteger(minimumValue);
  const maximum = parseInteger(maximumValue);

  if (minimum.reason === "empty" || maximum.reason === "empty") {
    return {
      valid: false,
      error: "Preencha as cargas mínima e máxima.",
      code: "EMPTY_VALUE",
    };
  }

  if (!minimum.valid || !maximum.valid) {
    return {
      valid: false,
      error: "Use apenas números inteiros.",
      code: "NON_INTEGER_VALUE",
    };
  }

  if (
    minimum.value < MIN_ALLOWED_LOAD ||
    maximum.value > MAX_ALLOWED_LOAD ||
    maximum.value < MIN_ALLOWED_LOAD ||
    minimum.value > MAX_ALLOWED_LOAD
  ) {
    return {
      valid: false,
      error: `As cargas devem estar entre ${MIN_ALLOWED_LOAD} kg e ${MAX_ALLOWED_LOAD.toLocaleString("pt-BR")} kg.`,
      code: "OUT_OF_BOUNDS",
    };
  }

  if (maximum.value <= minimum.value) {
    return {
      valid: false,
      error: "A carga máxima deve ser maior que a carga mínima.",
      code: "INVALID_INTERVAL",
    };
  }

  return {
    valid: true,
    minimum: minimum.value,
    maximum: maximum.value,
  };
}

function assertValidRange(minimum, maximum) {
  const validation = validateLoadRange(minimum, maximum);

  if (!validation.valid) {
    throw new RangeError(validation.error);
  }

  return validation;
}

export function generateSecretCapacity(minimum, maximum, random = Math.random) {
  const range = assertValidRange(minimum, maximum);
  const randomValue = Number(random());

  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue > 1) {
    throw new RangeError("O gerador aleatório deve retornar um valor entre 0 e 1.");
  }

  if (randomValue === 1) {
    return range.maximum;
  }

  const possibilities = range.maximum - range.minimum + 1;
  return range.minimum + Math.floor(randomValue * possibilities);
}

export function linearSearch(minimum, maximum, capacity) {
  const range = assertValidRange(minimum, maximum);

  if (!Number.isInteger(capacity) || capacity < range.minimum || capacity > range.maximum) {
    throw new RangeError("A capacidade deve ser um inteiro dentro do intervalo de cargas.");
  }

  const attempts = [];

  for (let load = range.minimum; load <= range.maximum; load += 1) {
    const supported = load <= capacity;
    attempts.push({
      load,
      supported,
      result: supported ? "supported" : "broken",
    });

    if (!supported) {
      break;
    }
  }

  const lastAttempt = attempts.at(-1);
  const bridgeBroke = lastAttempt.result === "broken";

  return {
    minimum: range.minimum,
    maximum: range.maximum,
    capacity,
    attempts,
    attemptCount: attempts.length,
    highestSupported: capacity,
    bridgeBroke,
    brokenAt: bridgeBroke ? lastAttempt.load : null,
    completedWithoutBreak: !bridgeBroke,
  };
}

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
