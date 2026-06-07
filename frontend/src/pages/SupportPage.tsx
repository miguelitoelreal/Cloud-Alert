import { useState } from "react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "¡Hola! 👋 Soy el asistente de soporte de Cloud Alert Hub. Estoy aquí para ayudarte con cualquier duda o problema que tengas con la plataforma. ¿En qué puedo ayudarte hoy?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      // Convert messages to API format
      const conversationHistory = messages.slice(1).map(msg => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text
      }));

      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputText,
          conversationHistory: conversationHistory
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al comunicarse con el asistente');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Lo siento, hubo un error al procesar tu mensaje. Por favor, verifica tu conexión a internet.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <svg
              className="h-5 w-5 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Soporte Técnico</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Asistente virtual 24/7</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.isUser
                    ? "bg-purple-600 text-white"
                    : "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                }`}
              >
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                />
                <p
                  className={`mt-1 text-xs ${
                    message.isUser ? "text-purple-200" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-800">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0.1s" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta o problema..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-purple-400 dark:focus:ring-purple-400/20"
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed dark:disabled:bg-slate-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Puedes preguntar sobre monitoreo, alertas, estado cloud, integraciones, SLA, y más.
          </p>
        </div>
      </div>
    </div>
  );
}
