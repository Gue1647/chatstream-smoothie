import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const formatMessage = (text: string) => {
  return text
    .replace(/\\n\\n/g, '<br><br>') 
    .replace(/\\n/g, '<br>') 
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
    .replace(/\\"/g, '"') 
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch("https://stream-breeze-921c.hoxepid178.workers.dev/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      setCurrentResponse("");
      
      let buffer = "";
      const processChunk = async () => {
        const { done, value } = await reader.read();
        if (done) return true;

        const text = new TextDecoder().decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line) continue;
          
          if (line.startsWith("0:")) {
            setIsTyping(false);
            const content = line.slice(2).replace(/^"|"$/g, "");
            buffer += content;
            
            // Add a small delay between characters for a more natural typing effect
            await new Promise(resolve => setTimeout(resolve, 25));
            setCurrentResponse(buffer);
          } else if (line.startsWith("e:") || line.startsWith("d:")) {
            setCurrentResponse((prev) => {
              setMessages((msgs) => [...msgs, { role: "assistant", content: prev }]);
              return "";
            });
          }
        }
        return false;
      };

      while (true) {
        const isDone = await processChunk();
        if (isDone) break;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-white dark:bg-gray-700 shadow-sm"
                )}
                dangerouslySetInnerHTML={{
                  __html: formatMessage(message.content)
                }}
              />
            </div>
          ))}
          {isTyping && !currentResponse && (
            <div className="flex w-full justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-white dark:bg-gray-700 shadow-sm flex items-center space-x-2">
                <span>Bot is typing</span>
                <span className="flex space-x-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>
            </div>
          )}
          {currentResponse && (
            <div className="flex w-full justify-start">
              <div 
                className="max-w-[80%] rounded-lg px-4 py-2 bg-white dark:bg-gray-700 shadow-sm"
                dangerouslySetInnerHTML={{
                  __html: formatMessage(currentResponse)
                }}
              >
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>
      
      <footer className="border-t bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="bg-white dark:bg-gray-700"
            />
            <Button type="submit" disabled={isLoading} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default Index;