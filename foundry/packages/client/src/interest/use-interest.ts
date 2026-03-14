import { useMemo, useRef, useSyncExternalStore } from "react";
import type { InterestManager, TopicState } from "./manager.js";
import { topicDefinitions, type TopicKey, type TopicParams } from "./topics.js";

/**
 * React bridge for the interest manager.
 *
 * `null` params disable the subscription entirely, which is how screens express
 * conditional interest in task/session/sandbox topics.
 */
export function useInterest<K extends TopicKey>(manager: InterestManager, topicKey: K, params: TopicParams<K> | null): TopicState<K> {
  const paramsKey = params ? (topicDefinitions[topicKey] as any).key(params) : null;
  const paramsRef = useRef<TopicParams<K> | null>(params);
  paramsRef.current = params;

  const subscribe = useMemo(() => {
    return (listener: () => void) => {
      const currentParams = paramsRef.current;
      if (!currentParams) {
        return () => {};
      }
      return manager.subscribe(topicKey, currentParams, listener);
    };
  }, [manager, topicKey, paramsKey]);

  const getSnapshot = useMemo(() => {
    let lastSnapshot: TopicState<K> | null = null;

    return (): TopicState<K> => {
      const currentParams = paramsRef.current;
      const nextSnapshot: TopicState<K> = currentParams
        ? {
            data: manager.getSnapshot(topicKey, currentParams),
            status: manager.getStatus(topicKey, currentParams),
            error: manager.getError(topicKey, currentParams),
          }
        : {
            data: undefined,
            status: "loading",
            error: null,
          };

      // `useSyncExternalStore` requires referentially-stable snapshots when the
      // underlying store has not changed. Reuse the previous object whenever
      // the topic data/status/error triplet is unchanged.
      if (lastSnapshot && lastSnapshot.data === nextSnapshot.data && lastSnapshot.status === nextSnapshot.status && lastSnapshot.error === nextSnapshot.error) {
        return lastSnapshot;
      }

      lastSnapshot = nextSnapshot;
      return nextSnapshot;
    };
  }, [manager, topicKey, paramsKey]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
