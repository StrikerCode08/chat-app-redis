import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import Cookies from "js-cookie";
import api from "../utils/api";

interface Message {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  chatId: number;
}

interface ChatProps {
  ws: WebSocket | null;
}

const Chat: React.FC<ChatProps> = ({ ws }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatId } = useParams<{ chatId: string }>();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/api/${chatId}/messages`);
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [chatId]);

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const message: Message = JSON.parse(event.data);
        if (message.chatId === parseInt(chatId!)) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
      };
    }
  }, [ws, chatId]);

  const sendMessage = (content: string): void => {
    if (ws && chatId) {
      const token = Cookies.get("token");
      const message = {
        token,
        content,
        chatId: parseInt(chatId),
      };
      ws.send(JSON.stringify(message));

      // Create a temporary message while waiting for server response
      const tempMessage: Message = {
        id: Date.now(), // temporary id
        content,
        senderId: parseInt(token?.split(".")[1] ?? "0"), // Get userId from token, default to 0 if token undefined
        chatId: parseInt(chatId),
        createdAt: new Date().toISOString(),
      };

      setMessages((prevMessages) => [...prevMessages, tempMessage]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage("");
    }
  };

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const message: Message = JSON.parse(event.data);
        if (message.chatId === parseInt(chatId!)) {
          // Replace temporary message if it exists
          setMessages((prevMessages) =>
            prevMessages
              .map((msg) => (msg.id === message.id ? message : msg))
              .filter((msg) => !msg.id.toString().includes("."))
          );
        }
      };
    }
  }, [ws, chatId]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.senderId === (messages[0]?.senderId || 0)
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                message.senderId === (messages[0]?.senderId || 0)
                  ? "bg-blue-500 text-white"
                  : "bg-white"
              }`}
            >
              <p>{message.content}</p>
              <span className="text-xs opacity-50">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
