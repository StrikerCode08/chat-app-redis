import { useState, useEffect } from "react";
import LabeledInput from "./LabeledInput";

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
  const [data, setData] = useState({
    username: "",
    password: "",
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await login(data.username, data.password);
    } else {
      await register(data.username, data.password);
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
    const response = await fetch(`${import.meta.env.VITE_URL}/messages`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data: Message[] = await response.json();
    setMessages(data);
  };
  const handlechange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  useEffect(() => {
    if (token) {
      const socketUrl = import.meta.env.WEBSOCKET_URL || "ws://localhost:3000";
      const socket = new WebSocket(socketUrl);
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
    <div className="flex justify-center h-screen items-center">
      <div className="flex flex-col gap-y-8 items-center">
        <h1 className="mb-4 text-2xl font-bold leading-none tracking-tight text-black-600">
          {isLogin ? "Login" : "Register"}
        </h1>
        <div>
          {isLogin
            ? "Enter your credentials to login."
            : "Create a new account."}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="gap-y-8 flex flex-col">
            <LabeledInput
              type={"text"}
              onChange={handlechange}
              placeholder={"Enter User Name"}
              name={"username"}
              label={"User Name"}
              value={data.username}
            />
            <LabeledInput
              type={"password"}
              onChange={handlechange}
              placeholder={"Enter Password"}
              name={"password"}
              label={"Password"}
              value={data.password}
            />
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-full">
                <span className="text-xs mx-5">
                  {isLogin ? "Switch to Register" : "Switch to Login"}
                </span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="toggle"
                    className="sr-only peer"
                    checked={!isLogin}
                    onChange={() => setIsLogin(!isLogin)}
                  />
                  <div className="block relative bg-blue-900 w-16 h-9 p-1 rounded-full before:absolute before:bg-blue-600 before:w-7 before:h-7 before:p-1 before:rounded-full before:transition-all before:duration-500 before:left-1 peer-checked:before:left-8 peer-checked:before:bg-white"></div>
                </label>
              </div>
              <label htmlFor="auth-mode"></label>
            </div>
            <button
              type="submit"
              className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
            >
              {isLogin ? "Login" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
