import { Data } from "effect";

/**
 * Chat message type.
 * - `id`: unique identifier (timestamp-based)
 * - `sender`: "me" for local messages, "echo" for echoed responses
 * - `text`: message content
 * - `timestamp`: when the message was sent/received
 */
export interface ChatMessage {
  readonly id: string;
  readonly sender: "me" | "echo";
  readonly text: string;
  readonly timestamp: number;
}

/**
 * WebSocket connection state.
 */
export type ConnectionState = "connected" | "disconnected" | "reconnecting";

/**
 * Error for WebSocket connection failures.
 */
export class WebSocketError extends Data.TaggedError("WebSocketError")<{
  readonly message: string;
}> {}
