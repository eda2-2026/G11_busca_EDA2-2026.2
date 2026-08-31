import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createBridgeSimulator } from "../js/app.js";
import { createFakeSimulatorDocument } from "./helpers/fake-dom.js";

test("HTML contém todos os controles obrigatórios e o cartão pendente", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const requiredIds = [
    "min-load",
    "max-load",
    "generate-bridge",
    "run-linear",
    "run-binary",
    "bridge-visual",
    "bridge-status",
    "tested-load",
    "attempt-count",
    "highest-supported",
    "trial-result",
    "binary-search-card",
    "algorithm-comparison",
  ];

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  assert.doesNotMatch(html, /Etapa\s*\d|etapa\s*\d|Etapa do Aluno/i);
  assert.doesNotMatch(html, /binary-search\.js/);
});

test("botões de busca começam desabilitados", () => {
  const fakeDom = createFakeSimulatorDocument();

  createBridgeSimulator(fakeDom.document);

  assert.equal(fakeDom.get("#run-linear").disabled, true);
  assert.equal(fakeDom.get("#run-binary").disabled, true);
});

test("interface exibe erro e mantém a busca bloqueada para campo vazio", () => {
  const fakeDom = createFakeSimulatorDocument({ minimum: "", maximum: "2000" });
  const simulator = createBridgeSimulator(fakeDom.document);
  const result = simulator.generateBridge();

  assert.equal(result.valid, false);
  assert.match(fakeDom.get("#validation-message").textContent, /Preencha/);
  assert.equal(fakeDom.get("#run-linear").disabled, true);
  assert.equal(fakeDom.document.body.dataset.state, "invalid");
});

test("interface libera as buscas depois de gerar uma ponte válida", () => {
  const fakeDom = createFakeSimulatorDocument({ minimum: "500", maximum: "505" });
  const simulator = createBridgeSimulator(fakeDom.document, { random: () => 0 });
  const result = simulator.generateBridge();

  assert.deepEqual(result, {
    valid: true,
    minimum: 500,
    maximum: 505,
    capacity: 500,
  });
  assert.equal(fakeDom.get("#run-linear").disabled, false);
  assert.equal(fakeDom.get("#run-binary").disabled, false);
  assert.equal(fakeDom.document.body.dataset.state, "ready");
});

test("controles permanecem bloqueados durante a execução", async () => {
  const fakeDom = createFakeSimulatorDocument({ minimum: "500", maximum: "503" });
  let releaseAnimation;
  const animationGate = new Promise((resolve) => {
    releaseAnimation = resolve;
  });
  const simulator = createBridgeSimulator(fakeDom.document, {
    random: () => 0,
    delay: () => animationGate,
  });

  simulator.generateBridge();
  const running = simulator.runLinearSimulation();
  await Promise.resolve();

  assert.equal(fakeDom.get("#min-load").disabled, true);
  assert.equal(fakeDom.get("#max-load").disabled, true);
  assert.equal(fakeDom.get("#generate-bridge").disabled, true);
  assert.equal(fakeDom.get("#run-linear").disabled, true);

  releaseAnimation();
  await running;

  assert.equal(fakeDom.get("#generate-bridge").disabled, false);
  assert.equal(fakeDom.get("#run-linear").disabled, false);
});

test("interface exibe corretamente o resultado da busca", async () => {
  const fakeDom = createFakeSimulatorDocument({ minimum: "500", maximum: "505" });
  const simulator = createBridgeSimulator(fakeDom.document, {
    random: () => 0.4,
    delay: async () => {},
  });

  simulator.generateBridge();
  const result = await simulator.runLinearSimulation();

  assert.equal(result.capacity, 502);
  assert.equal(result.brokenAt, 503);
  assert.equal(fakeDom.get("#tested-load").textContent, "503 kg");
  assert.equal(fakeDom.get("#attempt-count").textContent, "4");
  assert.equal(fakeDom.get("#highest-supported").textContent, "502 kg");
  assert.equal(fakeDom.get("#trial-result").textContent, "Quebrou");
  assert.equal(fakeDom.get("#secret-capacity").textContent, "502 kg");
  assert.match(fakeDom.get("#bridge-status").textContent, /Limite encontrado/);
});

test("painel de comparação mostra o estado pendente corretamente quando só a busca binária foi executada", async () => {
  const fakeDom = createFakeSimulatorDocument({ minimum: "500", maximum: "2000" });
  const simulator = createBridgeSimulator(fakeDom.document, {
    random: () => 0.5,
    delay: async () => {},
  });

  simulator.generateBridge();
  await simulator.runBinarySimulation();

  assert.equal(fakeDom.get("#binary-attempts").textContent, "10 tentativas");
  assert.equal(fakeDom.get("#comparison-winner").textContent, "Aguardando busca linear");
  assert.match(fakeDom.get("#comparison-difference").textContent, /linear/i);
});

test("cada algoritmo mantém seu próprio log de tentativas", async () => {
  const fakeDom = createFakeSimulatorDocument({ minimum: "500", maximum: "505" });
  const simulator = createBridgeSimulator(fakeDom.document, {
    random: () => 0.4,
    delay: async () => {},
  });

  simulator.generateBridge();
  await simulator.runLinearSimulation();

  assert.notEqual(
    fakeDom.get("#attempt-log").textContent,
    fakeDom.get("#binary-search-log").textContent,
  );
});

test("executar uma busca depois da outra preserva os logs separados de cada algoritmo", async () => {
  const fakeDom = createFakeSimulatorDocument({ minimum: "500", maximum: "505" });
  const simulator = createBridgeSimulator(fakeDom.document, {
    random: () => 0.4,
    delay: async () => {},
  });

  simulator.generateBridge();
  await simulator.runLinearSimulation();
  const linearAfterFirstRun = fakeDom.get("#attempt-log").textContent;

  await simulator.runBinarySimulation();
  const linearAfterSecondRun = fakeDom.get("#attempt-log").textContent;
  const binaryAfterSecondRun = fakeDom.get("#binary-search-log").textContent;

  assert.match(linearAfterFirstRun, /tentativas/i);
  assert.match(binaryAfterSecondRun, /tentativas/i);
  assert.equal(linearAfterSecondRun, linearAfterFirstRun);
  assert.notEqual(linearAfterSecondRun, binaryAfterSecondRun);
});

test("busca binaria retorna o caminhão à origem antes de executar novamente", async () => {
  const fakeDom = createFakeSimulatorDocument({ minimum: "500", maximum: "505" });
  const positionsAtDelay = [];
  const simulator = createBridgeSimulator(fakeDom.document, {
    random: () => 0.4,
    delay: async () => {
      positionsAtDelay.push(fakeDom.get(".test-truck").style.left);
    },
  });

  simulator.generateBridge();
  await simulator.runBinarySimulation();
  positionsAtDelay.length = 0;

  await simulator.runBinarySimulation();

  assert.equal(positionsAtDelay[0], "8%");
  assert.notEqual(positionsAtDelay[1], "8%");
});
