'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            // Save the user ID in sessionStorage for the specific tab
            sessionStorage.setItem('chat_current_user_id', data.user.id);

            // Redirect to chat
            router.push('/chat');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 mb-6 shadow-2xl shadow-indigo-500/20 p-[2px]">
                        <div className="w-full h-full bg-[#020617] rounded-[22px] flex items-center justify-center">
                            <MessageSquare className="text-indigo-500 w-10 h-10" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">ChatApp</h1>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.2em]">Inicia Sesión</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 bg-white/[0.03] backdrop-blur-xl p-10 rounded-[40px] border border-white/5 shadow-2xl relative group">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-2xl animate-shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/10 transition-all outline-none font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                            <button type="button" className="text-[10px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-widest">¿Olvido?</button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/10 transition-all outline-none font-medium text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center space-x-3 group active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-sm italic"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span>Entrar Ahora</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center mt-10 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
                    ¿No tienes cuenta?{' '}
                    <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4">Regístrate</Link>
                </p>
            </div>
        </div>
    );
}
