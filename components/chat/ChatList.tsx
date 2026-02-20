'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, MoreHorizontal, Settings, LogOut, MessageSquare, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    name: string;
    avatarUrl?: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;
    online?: boolean;
}

export default function ChatList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchUsers() {
            try {
                const res = await fetch('/api/users');
                if (res.ok) {
                    const data: User[] = await res.json();
                    setUsers(data);

                    // Identify who I am from the current session
                    const storedId = sessionStorage.getItem('chat_current_user_id');
                    if (storedId) {
                        const me = data.find(u => u.id === storedId);
                        if (me) {
                            setCurrentUser(me);
                        } else {
                            // If user not found in DB but ID exists, clear it
                            sessionStorage.removeItem('chat_current_user_id');
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, []);

    // Filter out the current user from the contact list
    const filteredUsers = users
        .filter(user => user.id !== currentUser?.id)
        .filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleLogout = () => {
        sessionStorage.removeItem('chat_current_user_id');
        router.push('/login');
    };

    return (
        <div className="w-full md:w-[400px] h-full flex flex-col bg-[#020617] border-r border-white/5 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="p-6 pb-4 space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <MessageSquare className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">ChatApp</h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button className="p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-300">
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-red-400 transition-all duration-300"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar conversaciones..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-[14px] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.08] transition-all duration-300 shadow-inner"
                    />
                </div>
            </header>

            {/* Filters/Tabs */}
            <div className="px-6 flex items-center space-x-6 border-b border-white/5 pb-2 overflow-x-auto no-scrollbar relative z-10">
                <button className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 border-b-2 border-indigo-400 pb-2 flex-shrink-0">Mensajes</button>
                <button className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300 transition pb-2 flex-shrink-0">Grupos</button>
                <button className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300 transition pb-2 flex-shrink-0">Archivados</button>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1 relative z-10">
                <div className="px-3 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Contactos</h2>
                    </div>

                    <div className="space-y-1">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="flex items-center space-x-4 p-3 rounded-2xl animate-pulse">
                                    <div className="w-12 h-12 rounded-[18px] bg-slate-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-24 bg-slate-800 rounded" />
                                        <div className="h-3 w-40 bg-slate-900 rounded" />
                                    </div>
                                </div>
                            ))
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <Link
                                    key={user.id}
                                    href={`/chat/${user.id}`}
                                    className="flex items-center space-x-4 p-3.5 rounded-[22px] hover:bg-white/5 transition-all duration-300 group cursor-pointer border border-transparent hover:border-white/5"
                                >
                                    <div className="relative">
                                        <div className="w-13 h-13 rounded-[20px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-black text-xl border border-white/5 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3 shadow-lg">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-[19px]" />
                                            ) : (
                                                <span>{user.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#020617] shadow-lg shadow-green-500/20" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h4 className="font-bold text-slate-100 truncate text-[15px] group-hover:text-indigo-400 transition-colors uppercase italic">{user.name}</h4>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Online</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[13px] text-slate-500 truncate font-medium">¡Conectado!</p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                                <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/5">
                                    <UserPlus className="w-10 h-10 text-slate-700 mx-auto" />
                                </div>
                                <div>
                                    <p className="text-slate-400 font-bold text-base tracking-tight">No hay otros contactos</p>
                                    <p className="text-slate-600 text-xs mt-1">Invita a alguien para empezar.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* My Profile Section */}
            <div className="mt-auto p-4 bg-white/5 border-t border-white/5 backdrop-blur-xl relative z-20">
                <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-white/5 shadow-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-[2px]">
                                <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-white text-sm overflow-hidden text-center">
                                    {currentUser?.avatarUrl ? (
                                        <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                                    ) : (
                                        currentUser?.name?.charAt(0) || '?'
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-0.5">Mi Perfil</p>
                            <p className="text-sm font-bold text-white truncate max-w-[150px] uppercase italic">
                                {currentUser ? currentUser.name : 'Invitado'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Cerrar Sesión"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 transition-all active:scale-95"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
