import type { TopicData, TopicKey, TopicParams } from "./topics.js";

export type TopicStatus = "loading" | "connected" | "error";

export interface TopicState<K extends TopicKey> {
  data: TopicData<K> | undefined;
  status: TopicStatus;
  error: Error | null;
}

/**
 * The InterestManager owns all realtime actor connections and cached state.
 *
 * Multiple subscribers to the same topic share one connection and one cache
 * entry. After the last subscriber leaves, a short grace period keeps the
 * connection warm so navigation does not thrash actor connections.
 */
export interface InterestManager {
  subscribe<K extends TopicKey>(topicKey: K, params: TopicParams<K>, listener: () => void): () => void;
  getSnapshot<K extends TopicKey>(topicKey: K, params: TopicParams<K>): TopicData<K> | undefined;
  getStatus<K extends TopicKey>(topicKey: K, params: TopicParams<K>): TopicStatus;
  getError<K extends TopicKey>(topicKey: K, params: TopicParams<K>): Error | null;
  dispose(): void;
}
