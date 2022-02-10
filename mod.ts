import { Allocator } from "./allocator.ts";

interface WebAssemblyExports {
  toCamel(ptr: number, length: number, writePtr: number): number;
}

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

const memory = new WebAssembly.Memory({ initial: 1 });
const allocator = new Allocator(memory.buffer);

const module = await WebAssembly.instantiateStreaming(
  fetch(new URL("./mod.wasm", import.meta.url)),
  {
    env: {
      memory,
    },
  },
);

const wasmFunctions = module.instance.exports as unknown as WebAssemblyExports;

export function bufferToCamel(data: Uint8Array): Uint8Array {
  const ptr = allocator.alloc(data.length);
  const valuePtr = allocator.alloc(data.length);

  const buffer = new Uint8Array(allocator.buffer);
  buffer.set(data, ptr);

  const length = wasmFunctions.toCamel(ptr, data.length, valuePtr);
  allocator.drop(ptr);

  const val = buffer.slice(valuePtr, valuePtr + length);

  allocator.drop(valuePtr);

  return val;
}

export function bufferToCamelUnsafe(data: Uint8Array): Uint8Array {
  const ptr = allocator.alloc(data.length);

  const buffer = new Uint8Array(allocator.buffer);
  buffer.set(data, ptr);

  const length = wasmFunctions.toCamel(ptr, data.length, ptr);

  const val = buffer.slice(ptr, ptr + length);

  allocator.drop(ptr);

  return val;
}

export function toCamel(data: string): string {
  return TEXT_DECODER.decode(bufferToCamel(TEXT_ENCODER.encode(data)));
}

export function toCamelUnsafe(data: string): string {
  return TEXT_DECODER.decode(bufferToCamelUnsafe(TEXT_ENCODER.encode(data)));
}
