import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-950 text-gray-500">
            <div className="bg-gray-800 p-6 rounded-full mb-6 relative">
                <MessageSquare className="w-12 h-12 text-blue-500" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white">WhatsApp Clone</h2>
            <p className="max-w-md">
                Select a chat to start messaging. Send and receive messages without keeping your phone online.
            </p>
        </div>
    );
}
