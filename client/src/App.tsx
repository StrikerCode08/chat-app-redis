import React, { useState, useEffect } from 'react';

interface Message {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
}

const ChatApp: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const register = async (username: string, password: string): Promise<void> => {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    console.log('User registered:', data);
  };

  const login = async (username: string, password: string): Promise<void> => {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    setToken(data.token);
  };

  const fetchMessages = async (): Promise<void> => {
    const response = await fetch('/messages', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data: Message[] = await response.json();
    setMessages(data);
  };

  useEffect(() => {
    if (token) {
      const socket = new WebSocket('ws://localhost:3000');
      socket.onopen = () => {
        console.log('WebSocket connection established');
        setWs(socket);
      };
      socket.onmessage = (event) => {
        const message: Message = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, message]);
      };
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      socket.onclose = () => {
        console.log('WebSocket connection closed');
      };

      // Cleanup on component unmount
      return () => {
        socket.close();
      };
    }
  }, [token]);

  const sendMessage = (content: string): void => {
    if (ws && token) {
      ws.send(JSON.stringify({
        token: token,
        content: content,
      }));
    }
  };

  return (
    <div>
      {/* Registration and login forms */}
      <button onClick={() => register('exampleUser', 'examplePassword')}>Register</button>
      <button onClick={() => login('exampleUser', 'examplePassword')}>Login</button>

      {/* Fetch cached messages */}
      <button onClick={fetchMessages}>Fetch Cached Messages</button>

      {/* Display messages */}
      <ul>
        {messages.map((msg) => (
          <li key={msg.id}>{msg.content}</li>
        ))}
      </ul>

      {/* Send a message */}
      <button onClick={() => sendMessage('Hello, World!')}>Send Message</button>
    </div>
  );
};

export default ChatApp;
