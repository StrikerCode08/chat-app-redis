import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

interface Chat {
  id: number;
  participants: {
    id: number;
    username: string;
  }[];
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

const ChatsList: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const token = Cookies.get("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/chats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const createNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = Cookies.get("token");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      const chat = await response.json();
      setChats([...chats, chat]);
      setShowNewChatModal(false);
      setUsername("");
      setError("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create chat"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Chats</h1>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            New Chat
          </button>
        </div>

        <div className="space-y-4">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold">
                    {chat.participants
                      .map((participant) => participant.username)
                      .join(", ")}
                  </h2>
                  {chat.lastMessage && (
                    <p className="text-gray-600 text-sm mt-1">
                      {chat.lastMessage.content}
                    </p>
                  )}
                </div>
                {chat.lastMessage && (
                  <span className="text-xs text-gray-500">
                    {new Date(chat.lastMessage.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* New Chat Modal */}
        {showNewChatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h2 className="text-xl font-bold mb-4">Start New Chat</h2>
              {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
              <form onSubmit={createNewChat}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full border p-2 rounded mb-4"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewChatModal(false);
                      setError("");
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsList;
