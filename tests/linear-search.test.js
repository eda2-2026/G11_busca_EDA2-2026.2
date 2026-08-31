import assert from "node:assert/strict";
import test from "node:test";

import { generateSecretCapacity, linearSearch, validateLoadRange } from "../js/linear-search.js";
import { binarySearch } from "../js/binary-search.js";

test("rejeita campo vazio", () => {
  const result = validateLoadRange("", "2000");

  assert.equal(result.valid, false);
  assert.equal(result.code, "EMPTY_VALUE");
});

test("rejeita valor decimal", () => {
  const result = validateLoadRange("500.5", "2000");

  assert.equal(result.valid, false);
  assert.equal(result.code, "NON_INTEGER_VALUE");
});

test("rejeita intervalo invertido ou sem diferença", () => {
  assert.equal(validateLoadRange("2000", "500").code, "INVALID_INTERVAL");
  assert.equal(validateLoadRange("500", "500").code, "INVALID_INTERVAL");
});

test("rejeita valores fora dos limites permitidos", () => {
  assert.equal(validateLoadRange("0", "2000").code, "OUT_OF_BOUNDS");
  assert.equal(validateLoadRange("500", "10001").code, "OUT_OF_BOUNDS");
});

test("aceita intervalo válido de números inteiros", () => {
  assert.deepEqual(validateLoadRange("500", "2000"), {
    valid: true,
    minimum: 500,
    maximum: 2000,
  });
});

test("gera a capacidade secreta incluindo as duas extremidades", () => {
  assert.equal(generateSecretCapacity(500, 2000, () => 0), 500);
  assert.equal(generateSecretCapacity(500, 2000, () => 1), 2000);
});

test("busca linear encerra na primeira carga não suportada", () => {
  const result = linearSearch(500, 510, 503);

  assert.equal(result.highestSupported, 503);
  assert.equal(result.brokenAt, 504);
  assert.equal(result.attemptCount, 5);
  assert.equal(result.attempts.at(-1).supported, false);
  assert.deepEqual(
    result.attempts.map(({ load }) => load),
    [500, 501, 502, 503, 504],
  );
});

test("capacidade igual à carga máxima conclui sem tentativa de quebra", () => {
  const result = linearSearch(500, 505, 505);

  assert.equal(result.bridgeBroke, false);
  assert.equal(result.brokenAt, null);
  assert.equal(result.completedWithoutBreak, true);
  assert.equal(result.attemptCount, 6);
  assert.equal(result.attempts.at(-1).load, 505);
});

test("busca binária localiza a carga limite com menos tentativas", () => {
  const result = binarySearch(500, 510, 503);

  assert.equal(result.highestSupported, 503);
  assert.equal(result.brokenAt, 504);
  assert.equal(result.attemptCount, 4);
  assert.equal(result.attempts.at(-1).supported, false);
  assert.deepEqual(
    result.attempts.map(({ load }) => load),
    [505, 502, 503, 504],
  );
});

test("capacidade fora do intervalo lança erro", () => {
  assert.throws(() => linearSearch(500, 2000, 499), RangeError);
  assert.throws(() => linearSearch(500, 2000, 2001), RangeError);
  assert.throws(() => binarySearch(500, 2000, 499), RangeError);
  assert.throws(() => binarySearch(500, 2000, 2001), RangeError);
});
