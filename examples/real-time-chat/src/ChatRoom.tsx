import { useRef, useState } from "react";
import type { ChatMessage } from "./message.js";
import { useChatMessages, useSendMessage } from "./useChat.js";

const MessageItem = ({
  message,
}: {
  readonly message: ChatMessage;
}): React.ReactNode => {
  const isMe = message.sender === "me";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMe ? "flex-end" : "flex-start",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: "8px 12px",
          borderRadius: "12px",
          backgroundColor: isMe ? "#1976d2" : "#e0e0e0",
          color: isMe ? "#fff" : "#000",
        }}
      >
        <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "4px" }}>
          {isMe ? "You" : "Echo Server"}
        </div>
        <div>{message.text}</div>
      </div>
    </div>
  );
};

/**
 * Chat room component with message list and input form.
 *
 * Demonstrates:
 * - `useChatMessages` for reactive message list (accumulated via Stream.mapAccum)
 * - `useSendMessage` for fire-and-forget message sending
 * - Auto-scroll to latest message
 */
export const ChatRoom = (): React.ReactNode => {
  const messages = useChatMessages();
  const sendMessage = useSendMessage();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length > 0) {
      sendMessage(trimmed);
      setInput("");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "400px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center" }}>
            No messages yet. Send a message to start chatting!
          </p>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "8px",
          padding: "12px",
          borderTop: "1px solid #ddd",
          backgroundColor: "#fafafa",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
        <button
          type="submit"
          disabled={input.trim().length === 0}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};
