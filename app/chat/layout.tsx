import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ChatList from '@/components/chat/ChatList';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'ChatApp | Mensajes',
    description: 'Experiencia de mensajería premium',
};

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`flex h-screen bg-[#020617] text-slate-100 overflow-hidden ${inter.className}`}>
            {/* Sidebar - Chat List */}
            <aside className="hidden md:flex flex-col shrink-0">
                <ChatList />
            </aside>

            {/* Main Content - Chat Window */}
            <main className="flex-1 flex flex-col bg-[#020617] relative">
                {children}
            </main>
        </div>
    );
}
