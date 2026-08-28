class FakeElement {
  constructor({ value = "", textContent = "", disabled = false } = {}) {
    this.value = value;
    this.textContent = textContent;
    this.disabled = disabled;
    this.dataset = {};
    this.style = {};
    this.listeners = new Map();
    this.attributes = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    event.target = this;

    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }

    return true;
  }

  click() {
    return this.dispatchEvent({ type: "click" });
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeDocument {
  constructor(elements) {
    this.elements = elements;
    this.body = new FakeElement();
    this.readyState = "complete";
  }

  querySelector(selector) {
    return this.elements.get(selector) ?? null;
  }
}

export function createFakeSimulatorDocument({ minimum = "500", maximum = "2000" } = {}) {
  const elements = new Map([
    ["#range-form", new FakeElement()],
    ["#min-load", new FakeElement({ value: minimum })],
    ["#max-load", new FakeElement({ value: maximum })],
    ["#validation-message", new FakeElement()],
    ["#generate-bridge", new FakeElement()],
    ["#run-linear", new FakeElement({ disabled: true })],
    ["#secret-capacity", new FakeElement({ textContent: "?? kg" })],
    ["#bridge-visual", new FakeElement()],
    ["#bridge-status", new FakeElement()],
    ["#tested-load", new FakeElement()],
    ["#attempt-count", new FakeElement()],
    ["#highest-supported", new FakeElement()],
    ["#trial-result", new FakeElement()],
    ["#attempt-log", new FakeElement()],
    [".test-truck", new FakeElement()],
    [".truck-load", new FakeElement()],
  ]);
  const document = new FakeDocument(elements);

  return {
    document,
    get: (selector) => elements.get(selector),
  };
}
