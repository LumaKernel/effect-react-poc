import { Context, Data, Effect, Layer, Ref, SubscriptionRef } from "effect";
import type { Stream } from "effect";

// --- Error types ---

export class ConnectionError extends Data.TaggedError("ConnectionError")<{
  readonly message: string;
}> {}

// --- Connection interface (simulated database connection) ---

export interface Connection {
  readonly id: number;
  readonly query: (sql: string) => Effect.Effect<string, ConnectionError>;
}

// --- Pool state (observable via SubscriptionRef) ---

export interface PoolState {
  readonly totalConnections: number;
  readonly activeConnections: number;
  readonly idleConnections: number;
  readonly logs: ReadonlyArray<string>;
}

const initialPoolState: PoolState = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  logs: [],
};

// eslint-disable-next-line luma-ts/no-date -- Temporal API not available in all environments
const getNow = (): number => Date.now();

const formatTime = (ts: number): string => {
  // eslint-disable-next-line luma-ts/no-date -- Temporal API not available in all environments
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0") satisfies string}:${String(d.getMinutes()).padStart(2, "0") satisfies string}:${String(d.getSeconds()).padStart(2, "0") satisfies string}`;
};

const addLog = (
  ref: SubscriptionRef.SubscriptionRef<PoolState>,
  message: string,
): Effect.Effect<void> =>
  SubscriptionRef.update(ref, (state) => ({
    ...state,
    logs: [
      ...state.logs.slice(-49),
      `[${formatTime(getNow()) satisfies string}] ${message satisfies string}`,
    ],
  }));

// --- Connection pool service interface ---

export interface ConnectionPoolService {
  /** Acquire a connection, run the effect, then release it back to the pool */
  readonly withConnection: <A>(
    use: (conn: Connection) => Effect.Effect<A, ConnectionError>,
  ) => Effect.Effect<A, ConnectionError>;
  /** Stream of pool state changes */
  readonly poolState: Stream.Stream<PoolState>;
  /** Get current pool state snapshot */
  readonly getPoolState: Effect.Effect<PoolState>;
}

export class ConnectionPool extends Context.Tag("ConnectionPool")<
  ConnectionPool,
  ConnectionPoolService
>() {}

// --- Connection pool Layer (Layer.scoped) ---

/**
 * Creates a connection pool using Layer.scoped.
 *
 * Demonstrates:
 * - `Layer.scoped` ties the pool lifecycle to the Layer scope (= Provider)
 * - `Effect.acquireRelease` manages pre-created connections
 * - `SubscriptionRef` provides reactive pool state observation
 * - When the Provider unmounts, all connections are automatically cleaned up
 *
 * @param poolSize - Number of pre-created connections in the pool
 */
export const makeConnectionPoolLive = (
  poolSize: number,
): Layer.Layer<ConnectionPool> =>
  Layer.scoped(
    ConnectionPool,
    Effect.gen(function* () {
      const stateRef = yield* SubscriptionRef.make<PoolState>(initialPoolState);
      const nextId = yield* Ref.make(0);
      const idlePool = yield* Ref.make<ReadonlyArray<number>>([]);

      // Helper: create a single simulated connection
      const createConnection = Effect.gen(function* () {
        const id = yield* Ref.getAndUpdate(nextId, (n) => n + 1);
        yield* Effect.sleep("100 millis");
        yield* addLog(
          stateRef,
          `Connection #${String(id) satisfies string} created`,
        );
        return id;
      });

      // Pre-create connections using acquireRelease.
      // Acquire: create all connections and populate the idle pool.
      // Release: close all connections when the scope closes (Provider unmounts).
      const connectionIds = yield* Effect.acquireRelease(
        Effect.gen(function* () {
          yield* addLog(
            stateRef,
            `Initializing pool with ${String(poolSize) satisfies string} connections...`,
          );
          const ids: Array<number> = [];
          for (let i = 0; i < poolSize; i++) {
            const id = yield* createConnection;
            ids.push(id);
          }
          yield* Ref.set(idlePool, ids);
          yield* SubscriptionRef.set(stateRef, {
            totalConnections: poolSize,
            activeConnections: 0,
            idleConnections: poolSize,
            logs: [],
          });
          yield* addLog(
            stateRef,
            `Pool ready: ${String(poolSize) satisfies string} connections available`,
          );
          return ids;
        }),
        (ids) =>
          Effect.gen(function* () {
            yield* addLog(
              stateRef,
              `Closing pool: releasing ${String(ids.length) satisfies string} connections...`,
            );
            for (const id of ids) {
              yield* Effect.sleep("50 millis");
              yield* addLog(
                stateRef,
                `Connection #${String(id) satisfies string} closed`,
              );
            }
            yield* SubscriptionRef.set(stateRef, {
              ...initialPoolState,
              logs: [],
            });
          }),
      );

      // Ensure connectionIds is referenced
      void connectionIds;

      // withConnection: acquire an idle connection, run the effect, then release
      const withConnection = <A>(
        use: (conn: Connection) => Effect.Effect<A, ConnectionError>,
      ): Effect.Effect<A, ConnectionError> =>
        Effect.gen(function* () {
          const pool = yield* Ref.get(idlePool);
          const first = pool[0];
          if (first === undefined) {
            return yield* Effect.fail(
              new ConnectionError({
                message: "No idle connections available",
              }),
            );
          }
          const connId = first;
          yield* Ref.set(idlePool, pool.slice(1));
          yield* SubscriptionRef.update(stateRef, (s) => ({
            ...s,
            activeConnections: s.activeConnections + 1,
            idleConnections: s.idleConnections - 1,
          }));
          yield* addLog(
            stateRef,
            `Connection #${String(connId) satisfies string} acquired`,
          );

          const conn: Connection = {
            id: connId,
            query: (sql: string) =>
              Effect.gen(function* () {
                yield* Effect.sleep("50 millis");
                return `Result of "${sql satisfies string}" from conn #${String(connId) satisfies string}`;
              }),
          };

          // Run the user's effect with the connection, ensuring release
          const result = yield* use(conn).pipe(
            Effect.ensuring(
              Effect.gen(function* () {
                yield* Ref.update(idlePool, (p) => [...p, connId]);
                yield* SubscriptionRef.update(stateRef, (s) => ({
                  ...s,
                  activeConnections: s.activeConnections - 1,
                  idleConnections: s.idleConnections + 1,
                }));
                yield* addLog(
                  stateRef,
                  `Connection #${String(connId) satisfies string} released`,
                );
              }),
            ),
          );
          return result;
        });

      return {
        withConnection,
        poolState: stateRef.changes,
        getPoolState: SubscriptionRef.get(stateRef),
      };
    }),
  );
