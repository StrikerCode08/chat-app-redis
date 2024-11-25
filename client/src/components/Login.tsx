import { useState, useEffect } from "react";

export default function Login() {
  interface Message {
    id: number;
    content: string;
    senderId: number;
    createdAt: string;
  }
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await login(username, password);
    } else {
      await register(username, password);
    }
  };
  const register = async (
    username: string,
    password: string
  ): Promise<void> => {
    const response = await fetch(`${import.meta.env.VITE_URL}/auth/register`, {
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
    const response = await fetch(`${import.meta.env.VITE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    setToken(data.token);
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
    <div className="w-[350px]">
      <div>
        <div>{isLogin ? "Login" : "Register"}</div>
        <div>
          {isLogin
            ? "Enter your credentials to login."
            : "Create a new account."}
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            {/* <switch 
              id="auth-mode" 
              checked={!isLogin}
              onCheckedChange={() => setIsLogin(!isLogin)}
            /> */}
            <label htmlFor="auth-mode">
              {isLogin ? "Switch to Register" : "Switch to Login"}
            </label>
          </div>
        </div>
        <div>
          <button type="submit" className="w-full">
            {isLogin ? "Login" : "Register"}
          </button>
        </div>
      </form>
    </div>
  );
}
