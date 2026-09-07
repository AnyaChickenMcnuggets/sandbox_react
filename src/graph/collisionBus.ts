// Лёгкая шина "столкновений" между нодами холста: пока одна нода тащится мышью и приближается
// к другой, соседняя нода получает короткий направленный импульс сжатия/отскока — визуально
// читается как "желейные объекты бампают друг друга". Не завязано на React state специально —
// событие мгновенное и одноразовое (не нужно перерендеривать дерево нод на каждый тик драга).

type BumpListener = (pushAngleDeg?: number) => void;

const listenersByNode = new Map<string, Set<BumpListener>>();

export const collisionBus = {
  subscribe(nodeId: string, listener: BumpListener): () => void {
    let set = listenersByNode.get(nodeId);
    if (!set) {
      set = new Set();
      listenersByNode.set(nodeId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set?.size === 0) listenersByNode.delete(nodeId);
    };
  },
  /** pushAngleDeg — направление "толчка" (градусы, atan2 от толкающей ноды к этой). */
  bump(nodeId: string, pushAngleDeg?: number) {
    listenersByNode.get(nodeId)?.forEach((listener) => listener(pushAngleDeg));
  },
};
