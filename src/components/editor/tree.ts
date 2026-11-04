import type { Block, ConditionalBlock, LoopBlock } from "@/lib/documents/types";

export function cloneWithNewIds(block: Block): Block {
  const clone = structuredClone(block);
  const renew = (current: Block): Block => {
    const next = { ...current, id: `${current.type}_${Math.random().toString(36).slice(2, 10)}` };
    if (next.type === "loop") {
      next.blocks = next.blocks.map(renew);
    }
    if (next.type === "conditional") {
      next.blocks = next.blocks.map(renew);
      next.elseBlocks = next.elseBlocks.map(renew);
    }
    return next;
  };
  return renew(clone);
}

export function findBlock(blocks: Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.type === "loop") {
      const found = findBlock(block.blocks, id);
      if (found) return found;
    }
    if (block.type === "conditional") {
      const found = findBlock(block.blocks, id) ?? findBlock(block.elseBlocks, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateBlock(
  blocks: Block[],
  id: string,
  updater: (block: Block) => Block,
): Block[] {
  return blocks.map((block) => {
    if (block.id === id) {
      return updater(block);
    }
    if (block.type === "loop") {
      const nextBlocks = updateBlock(block.blocks, id, updater);
      if (nextBlocks !== block.blocks) return { ...block, blocks: nextBlocks };
    }
    if (block.type === "conditional") {
      const nextBlocks = updateBlock(block.blocks, id, updater);
      const nextElse = updateBlock(block.elseBlocks, id, updater);
      if (nextBlocks !== block.blocks || nextElse !== block.elseBlocks) {
        return { ...block, blocks: nextBlocks, elseBlocks: nextElse };
      }
    }
    return block;
  });
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) => {
      if (block.type === "loop") {
        return { ...block, blocks: removeBlock(block.blocks, id) };
      }
      if (block.type === "conditional") {
        return {
          ...block,
          blocks: removeBlock(block.blocks, id),
          elseBlocks: removeBlock(block.elseBlocks, id),
        };
      }
      return block;
    });
}

export function duplicateBlock(blocks: Block[], id: string): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index !== -1) {
    const copy = cloneWithNewIds(blocks[index]);
    return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
  }
  return blocks.map((block) => {
    if (block.type === "loop") {
      return { ...block, blocks: duplicateBlock(block.blocks, id) };
    }
    if (block.type === "conditional") {
      return {
        ...block,
        blocks: duplicateBlock(block.blocks, id),
        elseBlocks: duplicateBlock(block.elseBlocks, id),
      };
    }
    return block;
  });
}

export function moveBlock(blocks: Block[], id: string, direction: -1 | 1): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index !== -1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return blocks;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  return blocks.map((block) => {
    if (block.type === "loop") {
      return { ...block, blocks: moveBlock(block.blocks, id, direction) };
    }
    if (block.type === "conditional") {
      return {
        ...block,
        blocks: moveBlock(block.blocks, id, direction),
        elseBlocks: moveBlock(block.elseBlocks, id, direction),
      };
    }
    return block;
  });
}

export function insertAfter(blocks: Block[], id: string, newBlocks: Block[]): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index !== -1) {
    return [...blocks.slice(0, index + 1), ...newBlocks, ...blocks.slice(index + 1)];
  }
  return blocks.map((block) => {
    if (block.type === "loop") {
      return { ...block, blocks: insertAfter(block.blocks, id, newBlocks) };
    }
    if (block.type === "conditional") {
      return {
        ...block,
        blocks: insertAfter(block.blocks, id, newBlocks),
        elseBlocks: insertAfter(block.elseBlocks, id, newBlocks),
      };
    }
    return block;
  });
}

export function insertInside(
  blocks: Block[],
  id: string,
  newBlocks: Block[],
  branch: "then" | "else" = "then",
): Block[] {
  return blocks.map((block) => {
    if (block.id === id && block.type === "loop") {
      const loop = block as LoopBlock;
      return { ...loop, blocks: [...loop.blocks, ...newBlocks] };
    }
    if (block.id === id && block.type === "conditional") {
      const conditional = block as ConditionalBlock;
      return branch === "else"
        ? { ...conditional, elseBlocks: [...conditional.elseBlocks, ...newBlocks] }
        : { ...conditional, blocks: [...conditional.blocks, ...newBlocks] };
    }
    if (block.type === "loop") {
      return { ...block, blocks: insertInside(block.blocks, id, newBlocks, branch) };
    }
    if (block.type === "conditional") {
      return {
        ...block,
        blocks: insertInside(block.blocks, id, newBlocks, branch),
        elseBlocks: insertInside(block.elseBlocks, id, newBlocks, branch),
      };
    }
    return block;
  });
}

export function appendBlock(blocks: Block[], block: Block): Block[] {
  return [...blocks, block];
}
