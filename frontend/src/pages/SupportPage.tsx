import { useState, useRef, useEffect } from "react";
import { apiClient } from "../services/apiClient";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

type ChatState = "normal" | "asking_human_help" | "collecting_message";

export function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [chatState, setChatState] = useState<ChatState>("normal");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar && window.innerWidth >= 768) {
        setSidebarWidth(sidebar.getBoundingClientRect().width);
      } else {
        setSidebarWidth(0);
      }
    };

    updateSidebarWidth();
    window.addEventListener('resize', updateSidebarWidth);
    return () => window.removeEventListener('resize', updateSidebarWidth);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const quickSuggestions = [
    "Mostrar alertas críticas activas",
    "Estado de servicios AWS/Azure/GCP",
    "Incidentes de las últimas 24 horas",
    "Análisis de latencia y rendimiento",
    "Configuración de umbrales de alerta",
  ];

  const handleQuickSuggestion = (suggestion: string) => {
    setInputText(suggestion);
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);


  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText("");
    setIsTyping(true);

    try {
      // Lógica de ayuda humana
      if (chatState === "asking_human_help") {
        const affirmativeKeywords = ["si", "sí", "yes", "claro", "por favor", "ok", "vale", "adelante", "quiero", "me gustaría", "sí por favor", "si por favor"];
        const isAffirmative = affirmativeKeywords.some(keyword => 
          currentInput.toLowerCase().trim().includes(keyword)
        );
        
        if (isAffirmative) {
          setChatState("collecting_message");
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Perfecto. Por favor, escribe aquí el mensaje detallado que deseas enviar a los administradores. Incluye toda la información relevante sobre tu consulta.",
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMessage]);
          setIsTyping(false);
          return;
        } else {
          setChatState("normal");
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Entendido. Continuaré ayudándote con el asistente virtual. ¿En qué más puedo ayudarte?",
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMessage]);
          setIsTyping(false);
          return;
        }
      }

      if (chatState === "collecting_message") {
        // Enviar correo a administradores
        try {
          const response = await apiClient.post('/api/support/human-help', {
            message: currentInput
          });

          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: response.data.message,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMessage]);
          setChatState("normal");
        } catch (error) {
          console.error('Error in human help request:', error);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.",
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
        setIsTyping(false);
        return;
      }

      // Detectar solicitud de ayuda humana en el frontend
      const humanHelpKeywords = [
        "ayuda humana", "asesoría humana", "ayuda personalizada", "asesoría personalizada",
        "hablar con humano", "hablar con persona", "soporte humano", "contacto humano",
        "atención personalizada", "personalizada"
      ];
      
      const containsHumanHelpRequest = humanHelpKeywords.some(keyword => 
        currentInput.toLowerCase().includes(keyword)
      );

      if (containsHumanHelpRequest) {
        setChatState("asking_human_help");
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "Entiendo que deseas ayuda personalizada de un humano. ¿Te gustaría que te conecte con un administrador para que te ayude directamente?",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);
        return;
      }

      // Chat normal con IA
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
          message: currentInput,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      {/* Chat Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto pb-40">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          {messages.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-8 animate-fade-in-up">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/30 animate-pulse">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <h1 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">
                Asistente de Monitoreo Cloud
              </h1>
              <p className="mb-8 text-slate-600 dark:text-slate-400 sm:text-lg">
                Monitorea alertas, analiza incidentes y optimiza tu infraestructura cloud en tiempo real
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    onClick={() => handleQuickSuggestion(suggestion)}
                    className="group rounded-lg border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 transition-all duration-300 hover:border-emerald-500/50 hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-cyan-500/10 hover:text-emerald-700 dark:hover:text-white hover:shadow-lg hover:shadow-emerald-500/20"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-6 flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] ${message.isUser ? "text-right" : "text-left"}`}>
                    {!message.isUser && (
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/20">
                          <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cloud Alert Hub</span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-5 py-4 ${
                        message.isUser
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="mb-6 flex justify-start">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/20">
                      <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl bg-white dark:bg-slate-800 px-4 py-3 border border-slate-200 dark:border-slate-700">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0.1s" }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 right-0 z-50 border-t border-slate-200 dark:border-slate-800/50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-4" style={{ left: `${sidebarWidth}px` }}>
        <div className="mx-auto max-w-4xl">
          <div className="relative flex items-center gap-3 rounded-2xl border border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 px-5 py-4 shadow-lg shadow-emerald-500/10 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all duration-300">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Consulta alertas, incidentes, estados de servicios o realiza preguntas técnicas..."
              rows={1}
              className="flex-1 resize-none border-0 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 sm:text-base"
              style={{ minHeight: "24px", maxHeight: "200px" }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:from-emerald-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-base"
            >
              {isTyping ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <span className="hidden sm:inline">Enviar</span>
                  <svg className="h-5 w-5 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-500">
            Asistente de IA de Cloud Alert Hub • Monitoreo inteligente en tiempo real
          </p>
        </div>
      </div>
    </div>
  );
}
