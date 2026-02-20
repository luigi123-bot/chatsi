'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, MoreHorizontal, Settings, LogOut, MessageSquare, Loader2, Key, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
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
    const [showSettings, setShowSettings] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);
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

    const handleChangePassword = async () => {
        if (!newPassword || !currentUser) return;
        setIsUpdating(true);
        try {
            const res = await fetch('/api/users/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, newPassword })
            });
            if (res.ok) {
                setUpdateSuccess(true);
                setTimeout(() => {
                    setUpdateSuccess(false);
                    setShowSettings(false);
                    setNewPassword('');
                }, 1500);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdating(false);
        }
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
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-all duration-300"
                        >
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

            {/* Password Settings Modal */}
            {showSettings && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16" />

                        <button
                            onClick={() => setShowSettings(false)}
                            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                                <Key className="text-indigo-400" size={28} />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Security Node</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Update Access Key</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] ml-2">New Payload Password</label>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new key..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono"
                                    />
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleChangePassword}
                                disabled={!newPassword || isUpdating || updateSuccess}
                                className={clsx(
                                    "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center space-x-3",
                                    updateSuccess ? "bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]" :
                                        (newPassword && !isUpdating ? "bg-indigo-600 text-white hover:scale-[1.02] shadow-lg shadow-indigo-600/20" : "bg-white/5 text-slate-600 opacity-50")
                                )}
                            >
                                {isUpdating ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : updateSuccess ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        <span>Key Injected</span>
                                    </>
                                ) : (
                                    <span>Sync Credentials</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
