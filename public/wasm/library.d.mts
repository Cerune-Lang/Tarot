export type HostErrorPhase = 'compile' | 'link' | 'instantiate' | 'arguments' | 'language' | 'trap' | 'host' | 'closed';
export interface RuntimeFailure {
  readonly code: string;
  readonly node: number;
  readonly file: number;
  readonly start: number;
  readonly end: number;
}
export class CeruneHostError extends Error {
  readonly phase: HostErrorPhase;
  readonly functionName: string | undefined;
  readonly record: string | undefined;
  readonly failure: RuntimeFailure | undefined;
  constructor(phase: HostErrorPhase, message: string, details?: {
    functionName?: string; record?: string; failure?: RuntimeFailure; cause?: unknown;
  });
}
export interface AbiType {
  readonly cerune: 'i32' | 'f64';
  readonly wasm: 'i32' | 'f64';
  readonly internal: 'i64' | 'f64';
}
export interface ExportDescriptor {
  readonly name: string;
  readonly function: number;
  readonly internal_name: string;
  readonly wrapper: string;
  readonly parameters: readonly AbiType[];
  readonly result: AbiType;
  readonly origin: {readonly file: number; readonly start: number; readonly end: number};
}
export const metadata: {
  readonly schema: 'cerune-wat-library-v1';
  readonly exports: readonly ExportDescriptor[];
};
export interface Library {
  readonly functions: LibraryFunctions;
}
export function createLibrary(bytes: Uint8Array): Promise<Library>;

export interface LibraryFunctions {
  readonly "draw_index": (arg0: number, arg1: number) => number;
  readonly "is_reversed": (arg0: number) => number;
  readonly "rank_fragment": (arg0: number, arg1: number, arg2: number) => number;
}
