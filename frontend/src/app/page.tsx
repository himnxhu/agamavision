'use client';

import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ChatBox } from '@/components/ChatBox';
import { useState, useEffect } from 'react';

const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Punjabi'];

interface Message {
  text: string;
  sender: 'me' | 'stranger' | 'system';
}

export default function Home() {
  const socket = useSocket();
  const { localStream, remoteStream, startCall, endCall, cleanup } = useWebRTC(socket);
  
  const [isSearching, setIsSearching] = useState(false);
  const [matched, setMatched] = useState(false);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('match_found', async ({ peerId, initiator }) => {
      console.log('Match found with:', peerId);
      setPeerId(peerId);
      setIsSearching(false);
      setMatched(true);
      setMessages([{ text: 'You are now chatting with a stranger.', sender: 'system' }]);
      if (initiator) {
        setTimeout(() => startCall(peerId), 1000);
      }
    });

    socket.on('call_ended', () => {
      setMatched(false);
      setPeerId(null);
      setMessages(prev => [...prev, { text: 'Stranger has disconnected.', sender: 'system' }]);
    });

    socket.on('receive_message', ({ message }) => {
      setMessages(prev => [...prev, { text: message, sender: 'stranger' }]);
    });

    socket.on('error', ({ message }) => {
      alert(message);
      setMatched(false);
      setIsSearching(false);
    });

    return () => {
      socket.off('match_found');
      socket.off('call_ended');
      socket.off('receive_message');
      socket.off('error');
    };
  }, [socket, startCall]);

  const findNewMatch = () => {
    if (!socket) return;
    endCall();
    setMatched(false);
    setPeerId(null);
    setMessages([]);
    setIsSearching(true);
    socket.emit('find_match', { language });
  };

  const skipMatch = () => {
    findNewMatch();
  };

  const handleSendMessage = (text: string) => {
    if (socket && peerId) {
      socket.emit('send_message', { to: peerId, message: text });
      setMessages(prev => [...prev, { text, sender: 'me' }]);
    }
  };

  const reportUser = () => {
    if (peerId) {
      socket?.emit('report_user', { targetId: peerId });
      alert('User reported. Skipping to next match.');
      skipMatch();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 font-sans">
      <header className="w-full max-w-7xl flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black tracking-tight text-indigo-600">AGAMA VISION</h1>
        <div className="flex gap-3 items-center">
          <select 
            className="p-2 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-zinc-100 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isSearching || matched}
          >
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          {matched && (
            <div className="flex gap-2">
              <button 
                onClick={reportUser}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Report
              </button>
              <button 
                onClick={skipMatch}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
              >
                Next (Esc)
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-[calc(100vh-180px)]">
        {/* Video Section */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full">
          <div className="relative flex-1 bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-900">
            {matched ? (
              <VideoPlayer stream={remoteStream} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                {isSearching ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xl font-bold text-white tracking-wide">LOOKING FOR STRANGER...</p>
                    <button 
                      onClick={() => { setIsSearching(false); socket?.emit('cancel_search'); }}
                      className="text-zinc-500 hover:text-white underline font-medium"
                    >
                      Cancel Search
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={findNewMatch}
                    className="px-12 py-5 bg-indigo-600 text-white rounded-2xl text-2xl font-black hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-95"
                  >
                    START CHATTING
                  </button>
                )}
              </div>
            )}
            
            {/* Local Thumbnail */}
            <div className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-zinc-800 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20 z-10">
              <VideoPlayer stream={localStream} muted className="w-full h-full" />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
                You
              </div>
            </div>

            {matched && (
              <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-xl text-white text-sm font-bold uppercase tracking-widest border border-white/10">
                Stranger
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="lg:col-span-4 h-full">
          {matched || messages.length > 0 ? (
            <ChatBox 
              messages={messages} 
              onSendMessage={handleSendMessage} 
            />
          ) : (
            <div className="h-full rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center p-8 text-center gap-4 shadow-xl">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Live Chat</h3>
                <p className="text-zinc-500 text-sm mt-1">Chat instantly with people who match your language.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-6 flex gap-6 text-zinc-400 text-xs font-bold uppercase tracking-widest">
        <span>Anonymous & Instant</span>
        <span className="text-zinc-200 dark:text-zinc-800">•</span>
        <span>Secure Peer Connection</span>
        <span className="text-zinc-200 dark:text-zinc-800">•</span>
        <span>Be Respectful</span>
      </footer>
    </div>
  );
}
