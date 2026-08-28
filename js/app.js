import {
  generateSecretCapacity,
  linearSearch,
  validateLoadRange,
} from "./linear-search.js";

const DEFAULT_ANIMATION_DELAY = 22;
const MAX_ANIMATION_FRAMES = 52;

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
    secretCapacity: required(documentRef, "#secret-capacity"),
    bridgeVisual: required(documentRef, "#bridge-visual"),
    bridgeStatus: required(documentRef, "#bridge-status"),
    testedLoad: required(documentRef, "#tested-load"),
    attemptCount: required(documentRef, "#attempt-count"),
    highestSupported: required(documentRef, "#highest-supported"),
    trialResult: required(documentRef, "#trial-result"),
    attemptLog: required(documentRef, "#attempt-log"),
    truck: required(documentRef, ".test-truck"),
    truckLoad: required(documentRef, ".truck-load"),
  };

  const state = {
    minimum: null,
    maximum: null,
    secretCapacity: null,
    running: false,
    result: null,
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
  }

  function resetMetrics() {
    elements.testedLoad.textContent = "—";
    elements.attemptCount.textContent = "0";
    elements.highestSupported.textContent = "—";
    elements.trialResult.textContent = "Aguardando";
    elements.attemptLog.textContent = "Nenhuma tentativa executada.";
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
    elements.runButton.disabled = true;
    elements.runButton.textContent = "Iniciar busca linear";
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
    elements.validationMessage.textContent = error;
    elements.bridgeStatus.textContent = "Entrada inválida. Revise o intervalo informado.";
    elements.secretCapacity.textContent = "?? kg";
    elements.runButton.disabled = true;
    elements.runButton.textContent = "Iniciar busca linear";
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

    elements.validationMessage.textContent = "";
    elements.secretCapacity.textContent = "Capacidade definida";
    elements.bridgeStatus.textContent =
      "Ponte pronta. A capacidade permanece secreta até o fim do teste.";
    elements.runButton.disabled = false;
    elements.runButton.textContent = "Iniciar busca linear";
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

  function renderAttempt(attempt, number, skippedCount = 0) {
    const supported = attempt.supported;
    elements.testedLoad.textContent = formatLoad(attempt.load);
    elements.attemptCount.textContent = String(number);
    elements.trialResult.textContent = supported ? "Suportou" : "Quebrou";
    elements.truckLoad.textContent = formatLoad(attempt.load);
    elements.highestSupported.textContent = supported
      ? formatLoad(attempt.load)
      : formatLoad(attempt.load - 1);
    elements.attemptLog.textContent = skippedCount
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
    elements.attemptLog.textContent = "Preparando a primeira carga…";

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
        renderAttempt(frame.attempt, frame.index + 1, skippedCount);
        previousIndex = frame.index;
        await delay(animationDelay);
      }

      state.result = result;
      elements.attemptCount.textContent = String(result.attemptCount);
      elements.highestSupported.textContent = formatLoad(result.highestSupported);
      elements.secretCapacity.textContent = formatLoad(result.capacity);
      elements.runButton.textContent = "Executar novamente";

      if (result.bridgeBroke) {
        elements.testedLoad.textContent = formatLoad(result.brokenAt);
        elements.trialResult.textContent = "Quebrou";
        elements.bridgeStatus.textContent =
          `Limite encontrado: ${formatLoad(result.highestSupported)}. ` +
          `A primeira ruptura ocorreu em ${formatLoad(result.brokenAt)}.`;
        elements.attemptLog.textContent =
          `${result.attemptCount.toLocaleString("pt-BR")} tentativas · ` +
          `primeira carga não suportada: ${formatLoad(result.brokenAt)}.`;
        setVisualState("broken");
      } else {
        elements.testedLoad.textContent = formatLoad(result.maximum);
        elements.trialResult.textContent = "Concluída";
        elements.bridgeStatus.textContent =
          `A ponte suportou a carga máxima de ${formatLoad(result.maximum)} sem quebrar.`;
        elements.attemptLog.textContent =
          `${result.attemptCount.toLocaleString("pt-BR")} tentativas · ` +
          "intervalo concluído sem tentativa de ruptura.";
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
  elements.minimumInput.addEventListener("input", invalidateGeneratedBridge);
  elements.maximumInput.addEventListener("input", invalidateGeneratedBridge);

  elements.runButton.disabled = true;
  resetMetrics();

  return {
    generateBridge,
    runLinearSimulation,
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
