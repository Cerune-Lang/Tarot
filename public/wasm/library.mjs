export const metadata = freezeTree({"schema":"cerune-wat-library-v1","exports":[{"name":"draw_index","function":0,"internal_name":"module_1_draw_index","wrapper":"cerune_export_0","parameters":[{"cerune":"i32","wasm":"i32","internal":"i64"},{"cerune":"i32","wasm":"i32","internal":"i64"}],"result":{"cerune":"i32","wasm":"i32","internal":"i64"},"origin":{"file":1,"start":184,"end":194}},{"name":"is_reversed","function":1,"internal_name":"module_1_is_reversed","wrapper":"cerune_export_1","parameters":[{"cerune":"i32","wasm":"i32","internal":"i64"}],"result":{"cerune":"i32","wasm":"i32","internal":"i64"},"origin":{"file":1,"start":318,"end":329}},{"name":"rank_fragment","function":2,"internal_name":"module_1_rank_fragment","wrapper":"cerune_export_2","parameters":[{"cerune":"i32","wasm":"i32","internal":"i64"},{"cerune":"i32","wasm":"i32","internal":"i64"},{"cerune":"i32","wasm":"i32","internal":"i64"}],"result":{"cerune":"i32","wasm":"i32","internal":"i64"},"origin":{"file":1,"start":381,"end":394}}]});
// Generated checked binding for the accompanying Cerune WAT library.
// metadata is immutable observation data; it does not invoke the program.
function freezeTree(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}

export class CeruneHostError extends Error {
  constructor(phase, message, details = {}) {
    super(message, {cause: details.cause});
    this.name = 'CeruneHostError';
    this.phase = phase;
    this.functionName = details.functionName;
    this.record = details.record;
    this.failure = details.failure;
    Object.freeze(this);
  }
}

function runtimeFailure(diagnostic) {
  const record = diagnostic.trim().replace(/^cerune: /, '');
  const match = /^runtime-v1 code=([a-z][a-z0-9-]*) node=(\d+)(?: file=(\d+))? bytes=(\d+)\.\.(\d+)$/.exec(record);
  if (!match) return undefined;
  const [node, file, start, end] = [match[2], match[3] ?? '0', match[4], match[5]].map(Number);
  if (![node, file, start, end].every(Number.isSafeInteger) || start > end) return undefined;
  return {record, failure: Object.freeze({code: match[1], node, file, start, end})};
}

function valid(value, type) {
  return typeof value === 'number' && (type === 'f64' ||
    (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647 && !Object.is(value, -0)));
}

export async function createLibrary(bytes) {
  let module;
  try {
    // Accept bytes only: callers explicitly fetch/read the accompanying artifact.
    if (!(bytes instanceof Uint8Array)) throw new TypeError('expected Uint8Array');
    module = await WebAssembly.compile(bytes);
  } catch (cause) {
    throw new CeruneHostError('compile', 'Wasm compilation failed', {cause});
  }
  const exports = WebAssembly.Module.exports(module);
  const imports = WebAssembly.Module.imports(module);
  if (exports.length !== metadata.exports.length ||
      metadata.exports.some(e => !exports.some(x => x.name === e.name && x.kind === 'function')) ||
      imports.length > 1 ||
      imports.some(i => i.module !== 'cerune' || i.name !== 'write_error_byte' || i.kind !== 'function')) {
    throw new CeruneHostError('link', 'Wasm exports or imports do not match the binding');
  }

  let diagnostic = '';
  let instance;
  try {
    instance = await WebAssembly.instantiate(module, {
      cerune: {write_error_byte(byte) {
        if (!Number.isInteger(byte) || byte < 0 || byte > 127 || diagnostic.length >= 4096) {
          throw new Error('invalid runtime diagnostic bytes');
        }
        diagnostic += String.fromCharCode(byte);
      }}
    });
    if (diagnostic) throw new Error('unexpected diagnostic during instantiation');
  } catch (cause) {
    throw new CeruneHostError('instantiate', 'Wasm instantiation failed', {cause});
  }

  let closed = false;
  const functions = Object.create(null);
  for (const entry of metadata.exports) {
    functions[entry.name] = (...args) => {
      const details = {functionName: entry.name};
      if (closed) throw new CeruneHostError('closed', 'library handle is closed', details);
      if (args.length !== entry.parameters.length) {
        throw new CeruneHostError('arguments', 'incorrect argument count', details);
      }
      for (let i = 0; i < args.length; i++) {
        if (!valid(args[i], entry.parameters[i].cerune)) {
          throw new CeruneHostError('arguments', 'incorrect argument type or range at index ' + i, details);
        }
      }
      diagnostic = '';
      let value;
      try {
        value = instance.exports[entry.name](...args);
      } catch (cause) {
        closed = true;
        const failure = runtimeFailure(diagnostic);
        if (cause instanceof WebAssembly.RuntimeError && failure) {
          throw new CeruneHostError('language', 'Cerune execution stopped', {...details, ...failure, cause});
        }
        const phase = diagnostic || !(cause instanceof WebAssembly.RuntimeError) ? 'host' : 'trap';
        throw new CeruneHostError(phase, 'Wasm execution failed', {...details, cause});
      }
      if (diagnostic || !valid(value, entry.result.cerune)) {
        closed = true;
        throw new CeruneHostError('host', 'Wasm result or diagnostic violates the binding contract', details);
      }
      return value;
    };
  }
  return Object.freeze({functions: Object.freeze(functions)});
}
