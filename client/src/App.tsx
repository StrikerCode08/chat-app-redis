import React, { useState, useEffect } from "react";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  Navigate,
} from "react-router-dom";
import Login from "./Components/Login";
import "./App.css";
interface Message {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
}

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const register = async (
    username: string,
    password: string
  ): Promise<void> => {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    console.log("User registered:", data);
  };

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error("No token received");
      }

      setToken(data.token);
    } catch (error) {
      console.error("Login error:", error);
      throw error; // Re-throw to be handled by the Login component
    }
  };

  const fetchMessages = async (): Promise<void> => {
    const response = await fetch("/messages", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data: Message[] = await response.json();
    setMessages(data);
  };

  useEffect(() => {
    if (token) {
      const socket = new WebSocket("ws://localhost:3000");
      socket.onopen = () => {
        console.log("WebSocket connection established");
        setWs(socket);
      };
      socket.onmessage = (event) => {
        const message: Message = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, message]);
      };
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      socket.onclose = () => {
        console.log("WebSocket connection closed");
      };

      // Cleanup on component unmount
      return () => {
        socket.close();
      };
    }
  }, [token]);

  const sendMessage = (content: string): void => {
    if (ws && token) {
      ws.send(
        JSON.stringify({
          token: token,
          content: content,
        })
      );
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            token ? <Navigate to="/chat" replace /> : <Login onLogin={login} />
          }
        />
        <Route
          path="/chat"
          element={
            token ? (
              <div>Chat Component Will Go Here</div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
