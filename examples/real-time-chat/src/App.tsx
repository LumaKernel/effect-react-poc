import { EffectProvider } from "@effect-react/react";
import { WebSocketServiceLive } from "./WebSocketService.js";
import { ChatRoom } from "./ChatRoom.js";
import { ConnectionStatus } from "./ConnectionStatus.js";

/**
 * Root App component for the real-time chat example.
 *
 * Demonstrates:
 * - `EffectProvider` with a service Layer (WebSocketServiceLive)
 * - WebSocket lifecycle managed by the Layer (auto-connect, auto-reconnect)
 * - Multiple components sharing the same WebSocket service instance
 */
export const App = (): React.ReactNode => (
  <EffectProvider layer={WebSocketServiceLive}>
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1>effect-react Real-time Chat</h1>
      <p>
        This example demonstrates WebSocket-like communication using Effect.ts
        PubSub, Stream, and automatic reconnection with Schedule.exponential.
      </p>

      <div style={{ marginBottom: "16px" }}>
        <ConnectionStatus />
      </div>

      <ChatRoom />

      <div style={{ marginTop: "16px", fontSize: "12px", color: "#999" }}>
        <h3>Concepts demonstrated:</h3>
        <ul>
          <li>
            <strong>PubSub</strong>: Message distribution between producers and
            consumers
          </li>
          <li>
            <strong>Stream</strong>: Reactive message and connection state
            streams
          </li>
          <li>
            <strong>Schedule.exponential</strong>: Auto-reconnect with
            exponential backoff
          </li>
          <li>
            <strong>SubscriptionRef</strong>: Connection state tracking
          </li>
          <li>
            <strong>Layer/Context.Tag</strong>: WebSocket service abstraction
            and DI
          </li>
        </ul>
      </div>
    </div>
  </EffectProvider>
);
