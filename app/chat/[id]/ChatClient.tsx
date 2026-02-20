'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Video, MoreVertical, Smile, Loader2, ChevronLeft, Phone, Info, Camera, X, Tv } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Message from '@/components/chat/Message';
import CinemaRoom from '@/components/chat/CinemaRoom';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import clsx from 'clsx';

export default function ChatClient({ id }: { id: string }) {
    const [mounted, setMounted] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [receiver, setReceiver] = useState<{ id: string; name: string; email: string; avatarUrl?: string } | null>(null);
    const [currentUserObj, setCurrentUserObj] = useState<{ id: string; name: string; email: string; avatarUrl?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>('me');
    const [showCamera, setShowCamera] = useState(false);
    const [showCinema, setShowCinema] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        setMounted(true);
        const storedId = sessionStorage.getItem('chat_current_user_id');
        if (storedId) setCurrentUserId(storedId);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        async function initChat() {
            setLoadingHistory(true);
            try {
                const userRes = await fetch('/api/users');
                if (userRes.ok) {
                    const users = await userRes.json();
                    const found = users.find((u: any) => u.id === id);
                    if (found) setReceiver(found);

                    const me = users.find((u: any) => u.id === currentUserId);
                    if (me) setCurrentUserObj(me);
                }

                const historyRes = await fetch(`/api/messages/${id}?currentUserId=${currentUserId}`);
                if (historyRes.ok) {
                    const history = await historyRes.json();
                    setMessages(history);
                }
            } catch (err) {
                console.error('Error initializing chat:', err);
            } finally {
                setLoading(false);
                setLoadingHistory(false);
            }
        }

        initChat();
    }, [id, mounted, currentUserId]);

    useEffect(() => {
        if (!mounted) return;

        socketRef.current = io(window.location.origin, {
            transports: ['polling', 'websocket'],
        });

        socketRef.current.on('receiveMessage', (message: any) => {
            const isRelevant =
                (message.receiverId === currentUserId && message.senderId === id) ||
                (message.senderId === currentUserId && message.receiverId === id);

            if (isRelevant) {
                setMessages((prev) => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [id, mounted, currentUserId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (mounted && !loadingHistory) {
            scrollToBottom();
        }
    }, [messages, mounted, loadingHistory]);

    const handleSendMessage = (e?: React.FormEvent, customData?: any) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() && !customData) return;

        const messageData = customData || {
            id: uuidv4(),
            content: newMessage,
            senderId: currentUserId,
            receiverId: id,
            createdAt: new Date().toISOString(),
            status: 'sent',
            type: 'text'
        };

        setMessages((prev) => [...prev, messageData]);
        if (!customData) setNewMessage('');
        socketRef.current?.emit('sendMessage', messageData);
    };

    const uploadFile = async (file: File | Blob, fileName: string) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file, fileName);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Error al subir archivo');

            const data = await res.json();
            const typeValue = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'text';

            const messageData = {
                id: uuidv4(),
                content: `Sent a ${typeValue}`,
                senderId: currentUserId,
                receiverId: id,
                createdAt: new Date().toISOString(),
                status: 'sent',
                type: typeValue,
                fileUrl: data.url
            };

            handleSendMessage(undefined, messageData);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Error al subir el archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation for videos
        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = function () {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 10.5) { // Allowance for small margins
                    alert('El vídeo no puede durar más de 10 segundos.');
                } else {
                    uploadFile(file, file.name);
                }
            }
            video.src = URL.createObjectURL(file);
        } else {
            uploadFile(file, file.name);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setShowCamera(true);
            }
        } catch (err) {
            alert('No se pudo acceder a la cámara.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const takePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                uploadFile(blob, `photo-${Date.now()}.jpg`);
                stopCamera();
            }
        }, 'image/jpeg', 0.8);
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col h-full bg-[#020617] relative overflow-hidden flex-1 border-l border-white/5 shadow-2xl">
            {/* Header */}
            <header className="flex items-center justify-between p-4 px-6 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
                <div className="flex items-center space-x-4">
                    <Link href="/chat" className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition">
                        <ChevronLeft size={24} />
                    </Link>
                    <div className="relative group cursor-pointer">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg">
                            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-white font-bold text-lg overflow-hidden border border-white/10">
                                {receiver?.avatarUrl ? <img src={receiver.avatarUrl} alt={receiver.name} className="w-full h-full object-cover" /> : receiver?.name?.charAt(0) || '?'}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-50 text-[15px] tracking-tight uppercase italic">{loading ? 'Cargando...' : receiver?.name || 'Usuario'}</h3>
                        <div className="flex items-center space-x-1.5"><span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] text-slate-500 font-bold uppercase">Online Now</span></div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowCinema(true)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                        title="Sala de Pareja"
                    >
                        <Tv size={20} />
                    </button>
                    <button className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-white/5"><Phone size={20} /></button>
                    <button className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-white/5"><Video size={20} /></button>
                    <button className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"><MoreVertical size={20} /></button>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 font-bold text-slate-500 tracking-widest uppercase"><Loader2 className="animate-spin" /><span>Encriptando...</span></div>
                ) : messages.map((msg) => (
                    <Message key={msg.id} content={msg.content} isMe={msg.senderId === currentUserId} timestamp={new Date(msg.createdAt)} type={msg.type} fileUrl={msg.fileUrl} senderId={msg.senderId} />
                ))}
                {uploading && <div className="text-right text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Subiendo multimedia...</div>}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Camera Overlay */}
            {showCamera && (
                <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
                    <button onClick={stopCamera} className="absolute top-6 right-6 p-4 text-white hover:bg-white/10 rounded-full transition"><X size={32} /></button>
                    <div className="relative w-full max-w-2xl aspect-video bg-slate-900 rounded-[40px] overflow-hidden border-2 border-white/10 shadow-2xl">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    </div>
                    <div className="mt-10 flex items-center space-x-8">
                        <button onClick={takePhoto} className="w-20 h-20 rounded-full bg-white p-1 shadow-2xl active:scale-95 transition">
                            <div className="w-full h-full rounded-full border-4 border-black/10 bg-white" />
                        </button>
                    </div>
                </div>
            )}

            {showCinema && receiver && currentUserObj && socketRef.current && (
                <CinemaRoom
                    receiver={receiver}
                    currentUser={currentUserObj}
                    onExit={() => setShowCinema(false)}
                    socket={socketRef.current}
                />
            )}

            {/* Input Area */}
            <footer className="p-6 bg-[#020617]/80 backdrop-blur-2xl border-t border-white/5">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,video/*" />
                <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center space-x-3 max-w-5xl mx-auto">
                    <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-2xl border border-white/5">
                        <button type="button" onClick={startCamera} className="text-slate-400 hover:text-white p-2.5 hover:bg-white/5 rounded-xl transition"><Camera size={22} /></button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-white p-2.5 hover:bg-white/5 rounded-xl transition"><ImageIcon size={22} /></button>
                    </div>
                    <div className="flex-1">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="w-full bg-white/5 text-slate-100 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border border-white/5 text-[14px] font-medium" />
                    </div>
                    <button type="submit" disabled={!newMessage.trim() && !uploading} className={clsx("p-3.5 rounded-2xl transition-all shadow-lg", newMessage.trim() ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-600")}><Send size={20} /></button>
                </form>
            </footer>
        </div>
    );
}
