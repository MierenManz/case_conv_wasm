type Ptr = number;

interface Block {
  size: number;
}

export class Allocator {
  #buffer: SharedArrayBuffer | ArrayBuffer;
  #blockSize: number;
  #emptyBlocks: Map<Ptr, Block>;
  #blocks: Map<Ptr, Block>;

  get blockSize(): number {
    return this.#blockSize;
  }

  get buffer(): SharedArrayBuffer | ArrayBuffer {
    return this.#buffer;
  }

  constructor(size: number);
  constructor(ab: ArrayBuffer, blockSize?: number);
  constructor(
    abOrSize: number | ArrayBuffer,
    blockSize?: number,
  ) {
    this.#blockSize = blockSize || 4;
    if (
      abOrSize instanceof ArrayBuffer
    ) {
      this.#buffer = abOrSize;
    } else {
      // deno-fmt-ignore
      const aligned = (abOrSize + this.#blockSize - 1) &~(this.#blockSize - 1);
      this.#buffer = new ArrayBuffer(aligned);
    }

    this.#emptyBlocks = new Map([[0, { size: this.#buffer.byteLength }]]);
    this.#blocks = new Map();
  }

  alloc(size: number): Ptr {
    const alignedSize = (size + this.#blockSize - 1) & ~(this.#blockSize - 1);

    for (const [ptr, emptyBlock] of this.#emptyBlocks) {
      if (emptyBlock.size >= alignedSize) {
        this.#emptyBlocks.delete(ptr);
        emptyBlock.size -= alignedSize;
        const f = Object.create(null);
        f.size = alignedSize;
        this.#blocks.set(ptr, f);
        if (emptyBlock.size > 0) {
          this.#emptyBlocks.set(ptr + alignedSize, emptyBlock);
        }

        return ptr;
      }
    }
    throw new Error(
      `Cannot allocate: ${alignedSize} bytes (raw bytes: ${size})`,
    );
  }

  drop(ptr: Ptr) {
    const baseBlockRef = this.#blocks.get(ptr);
    if (!baseBlockRef) throw new Error("Invalid pointer");

    this.#blocks.delete(ptr);
    this.#emptyBlocks.set(ptr, baseBlockRef);
    if (this.#emptyBlocks.size > this.#blocks.size) this.#mergeEmpty(ptr);
  }

  realloc(ptr: Ptr, newLength: number): Ptr {
    const block = this.#blocks.get(ptr);
    if (!block) throw "Invalid pointer";

    const maybeNextBlock = this.#emptyBlocks.get(ptr + block.size);

    if (maybeNextBlock) {
      this.#emptyBlocks.delete(ptr);
      maybeNextBlock.size -= newLength - block.size;

      this.#blocks.set(ptr, { size: newLength });

      if (maybeNextBlock.size > 0) {
        this.#emptyBlocks.set(ptr + newLength, maybeNextBlock);
      }

      return ptr;
    }

    const newPtr = this.alloc(newLength);
    const copy = new Uint8Array(this.#buffer).subarray(ptr, block.size);
    new Uint8Array(this.#buffer).set(copy, newPtr);
    this.drop(ptr);
    return newPtr;
  }

  #mergeEmpty(ptr: Ptr) {
    const baseBlockRef = this.#emptyBlocks.get(ptr);
    if (!baseBlockRef) return;

    let nextPtr = baseBlockRef.size + ptr;
    let nextBlock = this.#emptyBlocks.get(nextPtr);

    while (nextBlock) {
      this.#emptyBlocks.delete(nextPtr);
      nextPtr += nextBlock.size;
      nextBlock = this.#emptyBlocks.get(nextPtr);
    }

    baseBlockRef.size = nextPtr - ptr;
  }
}
