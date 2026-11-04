/** 编辑器撤销 / 重做历史：纯逻辑，无 DOM 依赖，方便直接验证 */

export interface EditorSnapshot {
  /** 快照对应的正文 */
  value: string;
  /** 光标起止位置，恢复快照时一并还原 */
  selectionStart: number;
  selectionEnd: number;
}

/** typing：键盘输入（可按时间窗口合并成一步）；action：工具栏插入、清空、恢复示例等一次性操作 */
export type EditKind = 'typing' | 'action';

export interface EditorHistoryOptions {
  /** 最多保留多少步，超出后丢弃最早的（默认 100） */
  limit?: number;
  /** 连续输入合并为一步的时间窗口，毫秒（默认 600） */
  coalesceMs?: number;
}

export class EditorHistory {
  private past: EditorSnapshot[] = [];
  private future: EditorSnapshot[] = [];
  private lastKind: EditKind | null = null;
  private lastPushAt = 0;
  private readonly limit: number;
  private readonly coalesceMs: number;

  constructor({ limit = 100, coalesceMs = 600 }: EditorHistoryOptions = {}) {
    this.limit = Math.max(1, limit);
    this.coalesceMs = Math.max(0, coalesceMs);
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** 历史步数，仅用于调试 / 验证 */
  get depth(): number {
    return this.past.length;
  }

  /**
   * 记录一次编辑：current 为编辑前快照，next 为编辑后快照。
   * 连续输入在 coalesceMs 内合并成一步，返回是否真正压入了新的一步。
   */
  record(current: EditorSnapshot, next: EditorSnapshot, kind: EditKind = 'action', now = Date.now()): boolean {
    if (current.value === next.value) return false;
    const merge = kind === 'typing' && this.lastKind === 'typing' && now - this.lastPushAt <= this.coalesceMs;
    // 新编辑一旦发生，之前「重做」的分支就失效
    this.future = [];
    if (merge) return false;
    this.past.push(current);
    if (this.past.length > this.limit) this.past.splice(0, this.past.length - this.limit);
    this.lastKind = kind;
    this.lastPushAt = now;
    return true;
  }

  /** 撤销：返回要恢复的快照，无可撤销时返回 null */
  undo(current: EditorSnapshot): EditorSnapshot | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(current);
    this.resetCoalesce();
    return previous;
  }

  /** 重做：返回要恢复的快照，无可重做时返回 null */
  redo(current: EditorSnapshot): EditorSnapshot | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(current);
    this.resetCoalesce();
    return next;
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.resetCoalesce();
  }

  /** 撤销 / 重做会打断连续输入的分组，之后敲字重新算一步 */
  private resetCoalesce(): void {
    this.lastKind = null;
    this.lastPushAt = 0;
  }
}
