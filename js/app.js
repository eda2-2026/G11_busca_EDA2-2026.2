import {
  generateSecretCapacity,
  linearSearch,
  validateLoadRange,
} from "./linear-search.js";
import { binarySearch } from "./binary-search.js";

const DEFAULT_ANIMATION_DELAY = 22;
const MAX_ANIMATION_FRAMES = 52;
const TRUCK_RESET_DELAY = 140;

const sleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

function required(documentRef, selector) {
  const element = documentRef.querySelector(selector);

  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
  }

  return element;
}

function formatLoad(value) {
  return `${value.toLocaleString("pt-BR")} kg`;
}

function selectAnimationFrames(attempts) {
  if (attempts.length <= MAX_ANIMATION_FRAMES) {
    return attempts.map((attempt, index) => ({ attempt, index }));
  }

  const selectedIndexes = new Set();
  const edgeFrames = 8;

  for (let index = 0; index < edgeFrames; index += 1) {
    selectedIndexes.add(index);
    selectedIndexes.add(attempts.length - 1 - index);
  }

  const middleSlots = MAX_ANIMATION_FRAMES - selectedIndexes.size;
  const middleStart = edgeFrames;
  const middleEnd = attempts.length - edgeFrames - 1;
  const middleSpan = middleEnd - middleStart;

  for (let slot = 0; slot < middleSlots; slot += 1) {
    const ratio = middleSlots === 1 ? 0 : slot / (middleSlots - 1);
    selectedIndexes.add(Math.round(middleStart + middleSpan * ratio));
  }

  return [...selectedIndexes]
    .sort((left, right) => left - right)
    .map((index) => ({ attempt: attempts[index], index }));
}

export function createBridgeSimulator(
  documentRef,
  {
    random = Math.random,
    delay = (milliseconds) => sleep(milliseconds),
    animationDelay = DEFAULT_ANIMATION_DELAY,
  } = {},
) {
  const elements = {
    body: documentRef.body,
    form: required(documentRef, "#range-form"),
    minimumInput: required(documentRef, "#min-load"),
    maximumInput: required(documentRef, "#max-load"),
    validationMessage: required(documentRef, "#validation-message"),
    generateButton: required(documentRef, "#generate-bridge"),
    runButton: required(documentRef, "#run-linear"),
    runBinaryButton: required(documentRef, "#run-binary"),
    binarySearchLog: required(documentRef, "#binary-search-log"),
    secretCapacity: required(documentRef, "#secret-capacity"),
    bridgeVisual: required(documentRef, "#bridge-visual"),
    bridgeStatus: required(documentRef, "#bridge-status"),
    testedLoad: required(documentRef, "#tested-load"),
    attemptCount: required(documentRef, "#attempt-count"),
    highestSupported: required(documentRef, "#highest-supported"),
    trialResult: required(documentRef, "#trial-result"),
    attemptLog: required(documentRef, "#attempt-log"),
    linearAttempts: required(documentRef, "#linear-attempts"),
    binaryAttempts: required(documentRef, "#binary-attempts"),
    comparisonWinner: required(documentRef, "#comparison-winner"),
    comparisonDifference: required(documentRef, "#comparison-difference"),
    truck: required(documentRef, ".test-truck"),
    truckLoad: required(documentRef, ".truck-load"),
  };

  const state = {
    minimum: null,
    maximum: null,
    secretCapacity: null,
    running: false,
    result: null,
    linearResult: null,
    binaryResult: null,
    linearLogText: "Nenhuma tentativa executada.",
    binaryLogText: "Nenhuma tentativa executada.",
  };

  function setVisualState(visualState) {
    elements.body.dataset.state = visualState;
    elements.bridgeVisual.dataset.state = visualState;
  }

  function setControlsLocked(locked) {
    elements.minimumInput.disabled = locked;
    elements.maximumInput.disabled = locked;
    elements.generateButton.disabled = locked;
    elements.runButton.disabled = locked || state.secretCapacity === null;
    elements.runBinaryButton.disabled = locked || state.secretCapacity === null;
  }

  function updateComparisonPanel() {
    const linearCount = state.linearResult?.attemptCount ?? null;
    const binaryCount = state.binaryResult?.attemptCount ?? null;

    if (linearCount === null && binaryCount === null) {
      elements.linearAttempts.textContent = "Aguardando";
      elements.binaryAttempts.textContent = "Aguardando";
      elements.comparisonWinner.textContent = "—";
      elements.comparisonDifference.textContent = "Execute as duas buscas para comparar.";
      return;
    }

    elements.linearAttempts.textContent =
      linearCount === null ? "Aguardando" : `${linearCount.toLocaleString("pt-BR")} tentativas`;
    elements.binaryAttempts.textContent =
      binaryCount === null ? "Aguardando" : `${binaryCount.toLocaleString("pt-BR")} tentativas`;

    if (linearCount === null || binaryCount === null) {
      elements.comparisonWinner.textContent =
        linearCount === null ? "Aguardando busca linear" : "Aguardando busca binária";
      elements.comparisonDifference.textContent =
        linearCount === null
          ? "Execute a busca linear para comparar o desempenho."
          : "Execute a busca binária para comparar o desempenho.";
      return;
    }

    if (linearCount === binaryCount) {
      elements.comparisonWinner.textContent = "Empate";
      elements.comparisonDifference.textContent = "Mesma quantidade de tentativas";
      return;
    }

    const winner = linearCount < binaryCount ? "Busca linear" : "Busca binária";
    const difference = Math.abs(linearCount - binaryCount);
    elements.comparisonWinner.textContent = winner;
    elements.comparisonDifference.textContent =
      difference === 1
        ? "1 tentativa de diferença"
        : `${difference.toLocaleString("pt-BR")} tentativas de diferença`;
  }

  function resetMetrics() {
    state.linearLogText = "Nenhuma tentativa executada.";
    state.binaryLogText = "Nenhuma tentativa executada.";

    elements.testedLoad.textContent = "—";
    elements.attemptCount.textContent = "0";
    elements.highestSupported.textContent = "—";
    elements.trialResult.textContent = "Aguardando";
    elements.attemptLog.textContent = state.linearLogText;
    elements.binarySearchLog.textContent = state.binaryLogText;
    elements.linearAttempts.textContent = "Aguardando";
    elements.binaryAttempts.textContent = "Aguardando";
    elements.comparisonWinner.textContent = "—";
    elements.comparisonDifference.textContent = "Execute as duas buscas para comparar.";
    elements.truckLoad.textContent = "0 kg";
    elements.truck.style.left = "8%";
  }

  function invalidateGeneratedBridge() {
    if (state.running || state.secretCapacity === null) {
      return;
    }

    state.minimum = null;
    state.maximum = null;
    state.secretCapacity = null;
    state.result = null;
    state.linearResult = null;
    state.binaryResult = null;
    elements.runButton.disabled = true;
    elements.runBinaryButton.disabled = true;
    elements.runButton.textContent = "Iniciar busca linear";
    elements.runBinaryButton.textContent = "Iniciar busca binária";
    elements.secretCapacity.textContent = "?? kg";
    elements.bridgeStatus.textContent = "Intervalo alterado. Gere uma nova ponte.";
    setVisualState("ready");
    resetMetrics();
  }

  function showInvalidInput(error) {
    state.minimum = null;
    state.maximum = null;
    state.secretCapacity = null;
    state.result = null;
    state.linearResult = null;
    state.binaryResult = null;
    elements.validationMessage.textContent = error;
    elements.bridgeStatus.textContent = "Entrada inválida. Revise o intervalo informado.";
    elements.secretCapacity.textContent = "?? kg";
    elements.runButton.disabled = true;
    elements.runBinaryButton.disabled = true;
    elements.runButton.textContent = "Iniciar busca linear";
    elements.runBinaryButton.textContent = "Iniciar busca binária";
    setVisualState("invalid");
    resetMetrics();
  }

  function generateBridge() {
    if (state.running) {
      return { valid: false, error: "A simulação está em execução." };
    }

    const validation = validateLoadRange(
      elements.minimumInput.value,
      elements.maximumInput.value,
    );

    if (!validation.valid) {
      showInvalidInput(validation.error);
      return validation;
    }

    state.minimum = validation.minimum;
    state.maximum = validation.maximum;
    state.secretCapacity = generateSecretCapacity(
      state.minimum,
      state.maximum,
      random,
    );
    state.result = null;
    state.linearResult = null;
    state.binaryResult = null;

    elements.validationMessage.textContent = "";
    elements.secretCapacity.textContent = "Capacidade definida";
    elements.bridgeStatus.textContent =
      "Ponte pronta. A capacidade permanece secreta até o fim do teste.";
    elements.runButton.disabled = false;
    elements.runBinaryButton.disabled = false;
    elements.runButton.textContent = "Iniciar busca linear";
    elements.runBinaryButton.textContent = "Iniciar busca binária";
    setVisualState("ready");
    resetMetrics();

    return {
      valid: true,
      minimum: state.minimum,
      maximum: state.maximum,
      capacity: state.secretCapacity,
    };
  }

  function updateTruckPosition(load) {
    const rangeSize = Math.max(1, state.maximum - state.minimum);
    const progress = (load - state.minimum) / rangeSize;
    const left = 8 + Math.min(1, Math.max(0, progress)) * 68;
    elements.truck.style.left = `${left}%`;
  }

  async function resetTruckAnimation() {
    elements.truck.style.left = "8%";
    elements.truckLoad.textContent = "0 kg";
    await delay(Math.max(animationDelay, TRUCK_RESET_DELAY));
  }

  function renderAttempt(attempt, number, skippedCount = 0, targetLog = elements.attemptLog) {
    const supported = attempt.supported;
    elements.testedLoad.textContent = formatLoad(attempt.load);
    elements.attemptCount.textContent = String(number);
    elements.trialResult.textContent = supported ? "Suportou" : "Quebrou";
    elements.truckLoad.textContent = formatLoad(attempt.load);
    elements.highestSupported.textContent = supported
      ? formatLoad(attempt.load)
      : formatLoad(attempt.load - 1);
    targetLog.textContent = skippedCount
      ? `Tentativa ${number}: ${formatLoad(attempt.load)} — ${supported ? "suportou" : "quebrou"} · animação acelerou ${skippedCount} testes intermediários.`
      : `Tentativa ${number}: ${formatLoad(attempt.load)} — ${supported ? "suportou" : "quebrou"}.`;
    elements.bridgeStatus.textContent = supported
      ? `A ponte suportou ${formatLoad(attempt.load)}.`
      : `A ponte quebrou com ${formatLoad(attempt.load)}.`;
    updateTruckPosition(attempt.load);
    setVisualState(supported ? "supported" : "broken");
  }

  async function runLinearSimulation() {
    if (state.running || state.secretCapacity === null) {
      return null;
    }

    state.running = true;
    state.result = null;
    setControlsLocked(true);
    setVisualState("testing");
    elements.validationMessage.textContent = "";
    elements.secretCapacity.textContent = "Testando…";
    elements.bridgeStatus.textContent = "Busca linear em execução.";
    elements.trialResult.textContent = "Testando";
    state.linearLogText = "Preparando a primeira carga…";
    elements.attemptLog.textContent = state.linearLogText;

    try {
      const result = linearSearch(
        state.minimum,
        state.maximum,
        state.secretCapacity,
      );
      const frames = selectAnimationFrames(result.attempts);
      let previousIndex = -1;

      for (const frame of frames) {
        const skippedCount = Math.max(0, frame.index - previousIndex - 1);
        renderAttempt(frame.attempt, frame.index + 1, skippedCount, elements.attemptLog);
        previousIndex = frame.index;
        await delay(animationDelay);
      }

      state.result = result;
      state.linearResult = result;
      elements.attemptCount.textContent = String(result.attemptCount);
      elements.highestSupported.textContent = formatLoad(result.highestSupported);
      elements.secretCapacity.textContent = formatLoad(result.capacity);
      elements.runButton.textContent = "Executar novamente";
      updateComparisonPanel();

      if (result.bridgeBroke) {
        elements.testedLoad.textContent = formatLoad(result.brokenAt);
        elements.trialResult.textContent = "Quebrou";
        elements.bridgeStatus.textContent =
          `Limite encontrado: ${formatLoad(result.highestSupported)}. ` +
          `A primeira ruptura ocorreu em ${formatLoad(result.brokenAt)}.`;
        state.linearLogText =
          `${result.attemptCount.toLocaleString("pt-BR")} tentativas · ` +
          `primeira carga não suportada: ${formatLoad(result.brokenAt)}.`;
        elements.attemptLog.textContent = state.linearLogText;
        setVisualState("broken");
      } else {
        elements.testedLoad.textContent = formatLoad(result.maximum);
        elements.trialResult.textContent = "Concluída";
        elements.bridgeStatus.textContent =
          `A ponte suportou a carga máxima de ${formatLoad(result.maximum)} sem quebrar.`;
        state.linearLogText =
          `${result.attemptCount.toLocaleString("pt-BR")} tentativas · ` +
          "intervalo concluído sem tentativa de ruptura.";
        elements.attemptLog.textContent = state.linearLogText;
        setVisualState("completed");
      }

      return result;
    } finally {
      state.running = false;
      setControlsLocked(false);
    }
  }

  async function runBinarySimulation() {
    if (state.running || state.secretCapacity === null) {
      return null;
    }

    state.running = true;
    state.result = null;
    setControlsLocked(true);
    setVisualState("testing");
    elements.validationMessage.textContent = "";
    elements.secretCapacity.textContent = "Testando…";
    elements.bridgeStatus.textContent = "Busca binária em execução.";
    elements.trialResult.textContent = "Testando";
    state.binaryLogText = "Preparando a primeira avaliação do meio do intervalo…";
    elements.binarySearchLog.textContent = state.binaryLogText;

    try {
      await resetTruckAnimation();

      const result = binarySearch(
        state.minimum,
        state.maximum,
        state.secretCapacity,
      );
      const frames = selectAnimationFrames(result.attempts);
      let previousIndex = -1;

      for (const frame of frames) {
        const skippedCount = Math.max(0, frame.index - previousIndex - 1);
        renderAttempt(frame.attempt, frame.index + 1, skippedCount, elements.binarySearchLog);
        previousIndex = frame.index;
        await delay(animationDelay);
      }

      state.result = result;
      state.binaryResult = result;
      elements.attemptCount.textContent = String(result.attemptCount);
      elements.highestSupported.textContent = formatLoad(result.highestSupported);
      elements.secretCapacity.textContent = formatLoad(result.capacity);
      elements.runBinaryButton.textContent = "Executar novamente";
      updateComparisonPanel();

      if (result.bridgeBroke) {
        elements.testedLoad.textContent = formatLoad(result.brokenAt);
        elements.trialResult.textContent = "Quebrou";
        elements.bridgeStatus.textContent =
          `Limite encontrado por busca binária: ${formatLoad(result.highestSupported)}. ` +
          `A primeira ruptura ocorreu em ${formatLoad(result.brokenAt)}.`;
        state.binaryLogText =
          `${result.attemptCount.toLocaleString("pt-BR")} tentativas · ` +
          `primeira carga não suportada: ${formatLoad(result.brokenAt)}.`;
        elements.binarySearchLog.textContent = state.binaryLogText;
        setVisualState("broken");
      } else {
        elements.testedLoad.textContent = formatLoad(result.maximum);
        elements.trialResult.textContent = "Concluída";
        elements.bridgeStatus.textContent =
          `A ponte suportou a carga máxima de ${formatLoad(result.maximum)} sem quebrar.`;
        state.binaryLogText =
          `${result.attemptCount.toLocaleString("pt-BR")} tentativas · ` +
          "intervalo concluído sem tentativa de ruptura.";
        elements.binarySearchLog.textContent = state.binaryLogText;
        setVisualState("completed");
      }

      return result;
    } finally {
      state.running = false;
      setControlsLocked(false);
    }
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    generateBridge();
  });
  elements.runButton.addEventListener("click", () => {
    void runLinearSimulation();
  });
  elements.runBinaryButton.addEventListener("click", () => {
    void runBinarySimulation();
  });
  elements.minimumInput.addEventListener("input", invalidateGeneratedBridge);
  elements.maximumInput.addEventListener("input", invalidateGeneratedBridge);

  elements.runButton.disabled = true;
  elements.runBinaryButton.disabled = true;
  resetMetrics();

  return {
    generateBridge,
    runLinearSimulation,
    runBinarySimulation,
    getState: () => ({ ...state }),
  };
}

if (typeof document !== "undefined") {
  const start = () => createBridgeSimulator(document);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
