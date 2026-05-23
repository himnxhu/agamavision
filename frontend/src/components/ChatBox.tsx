import { useState, useRef, useEffect } from 'react';

interface Message {
  text: string;
  sender: 'me' | 'stranger' | 'system';
}

interface ChatBoxProps {
  onSendMessage: (text: string) => void;
  messages: Message[];
}

export const ChatBox = ({ onSendMessage, messages }: ChatBoxProps) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-2 flex flex-col"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
              msg.sender === 'me' 
                ? 'bg-indigo-600 text-white self-end rounded-tr-none' 
                : msg.sender === 'stranger'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 self-start rounded-tl-none'
                : 'text-zinc-400 text-center text-xs self-center w-full py-1'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border-t dark:border-zinc-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button 
          type="submit"
          className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
    </div>
  );
};
