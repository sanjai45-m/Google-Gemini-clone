import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./ChatApp.css";
import { Clipboard } from "lucide-react";
const genai = new GoogleGenerativeAI("AIzaSyB3J2rGZuqCmpNVEE4sXWZaFMUY-tO7x20");
const model = genai.getGenerativeModel({ model: "gemini-1.5-pro" });

function ChatApp() {
  const [messages, setMessages] = useState([
    { sender: "user", text: "Hello" },
    { sender: "ai", text: "Hello! How are you?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messageEndRef = useRef(null);
  const chatSessionRef = useRef(null);

  const scrollDown = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setInput("");
    setIsTyping(true);

    try {
      let fullResponse = "";
      const result = await chatSessionRef.current.sendMessageStream(input);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "", isGenerating: true },
      ]);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { sender: "ai", text: fullResponse, isGenerating: true },
        ]);
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { sender: "ai", text: fullResponse, isGenerating: false },
      ]);
      setIsTyping(false);
    } catch (e) {
      console.error(e);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Sorry, an error occurred.", isGenerating: false },
      ]);
    }
  };

  useEffect(() => {
    scrollDown();
    if (!chatSessionRef.current) {
      chatSessionRef.current = model.startChat({
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
        history: [],
      });
    }
  }, [messages]);

  const MarkdownComponent = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <div style={{ position: "relative" }}>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="pre"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
          <button
  className="copy-button"
  onClick={() => copyToClipboard(String(children))}
  title="Copy to Clipboard"
>
  <Clipboard size={16} />
  Copy
</button>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  // Function to copy the code to the clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Code copied to clipboard!");
    });
  };

  return (
    <div className="chat-app">
      <header className="chat-header">
        <h1>Gemini Chat</h1>
      </header>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${
              message.sender === "user" ? "chat-message-user" : "chat-message-ai"
            }`}
          >
            <div className="chat-bubble">
              {message.sender === "user" ? (
                message.text
              ) : (
                <ReactMarkdown
                  components={MarkdownComponent}
                  className={`markdown ${
                    message.isGenerating ? "typing-animation" : ""
                  }`}
                >
                  {message.text || "Thinking..."}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message chat-message-ai">
            <div className="chat-bubble">typing...</div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          className="chat-input"
          value={input}
          placeholder="Type your message here"
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="chat-send-button">
          <Send size={24} />
        </button>
      </form>
    </div>
  );
}

export default ChatApp;
