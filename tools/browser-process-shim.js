const browserProcess = globalThis.process || { env: {} };
browserProcess.env = browserProcess.env || {};
globalThis.process = browserProcess;

export { browserProcess as process };
