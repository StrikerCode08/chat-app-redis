import React, { useState, useEffect, useRef } from "react";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  Navigate,
} from "react-router-dom";
import Cookies from "js-cookie";
import Login from "./Components/Login";
import Chat from "./Components/Chat";
import ChatsList from "./Components/ChatsList";
import "./App.css";

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const isAuthenticated = (): boolean => {
    const token = Cookies.get("token");
    return !!token;
  };

  useEffect(() => {
    if (isAuthenticated()) {
      const token = Cookies.get("token");
      const socket = new WebSocket(
        `${import.meta.env.VITE_WS_URL}?token=${token}`
      );
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connection established");
        setWs(socket);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");
      };

      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated() ? <Navigate to="/chats" replace /> : <Login />
          }
        />
        <Route
          path="/chats"
          element={
            isAuthenticated() ? <ChatsList /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/chat/:chatId"
          element={
            isAuthenticated() ? <Chat ws={ws} /> : <Navigate to="/" replace />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
