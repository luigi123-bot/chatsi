'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, X, Loader2, PlayCircle, Users, Key, ShieldCheck, Mail, Share2, FileText, ImageIcon, Activity, Download, RefreshCw, Radio, Volume2, Database, Wifi, Monitor, Info, Bug, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Socket } from 'socket.io-client';

const CHUNK_SIZE = 65536; // Larger chunks for speed (64KB)

interface User {
    id: string;
    name: string;
    email: string;
    image?: string;
}

export default function CinemaRoom({ receiver, currentUser, onExit, socket }: { receiver: User, currentUser: User, onExit: () => void, socket: Socket }) {
    const [mode, setMode] = useState<'selection' | 'owner_setup' | 'guest_join' | 'cinema'>('selection');
    const [roomCode, setRoomCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'video' | 'image' | 'pdf' | null>(null);
    const [fileName, setFileName] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [guestSocketId, setGuestSocketId] = useState<string | null>(null);
    const [transferProgress, setTransferProgress] = useState(0);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [showUserList, setShowUserList] = useState(false);
    const [transferComplete, setTransferComplete] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const isOwnerState = useRef(false);
    const guestSocketIdRef = useRef<string | null>(null);
    const receivedChunks = useRef<ArrayBuffer[]>([]);
    const receivedSize = useRef(0);
    const expectedSize = useRef(0);
    const currentFileRef = useRef<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const realMimeRef = useRef('');

    const addLog = (msg: string) => {
        console.log(`[CINEMA] ${msg}`);
        setLog((prev: string[]) => [...prev.slice(-3), msg]);
    };

    useEffect(() => { guestSocketIdRef.current = guestSocketId; }, [guestSocketId]);

    const initWebRTC = useCallback(async (creator: boolean, targetSocketId: string) => {
        if (peerRef.current) return peerRef.current;
        addLog(`Link: ${creator ? 'HOST' : 'GUEST'}`);

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', { to: targetSocketId, signal: { candidate: event.candidate } });
            }
        };

        pc.onconnectionstatechange = () => {
            addLog(`Bridge: ${pc.connectionState}`);
            if (pc.connectionState === 'connected') setConnectionStatus('connected');
            if (pc.connectionState === 'failed') setConnectionStatus('error');
        };

        if (creator) {
            const dc = pc.createDataChannel('cinema-transfer', { ordered: true });
            setupDataChannel(dc);
            dataChannelRef.current = dc;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('signal', { to: targetSocketId, signal: offer });
        } else {
            pc.ondatachannel = (event) => {
                addLog('Bridge Linked');
                setupDataChannel(event.channel);
                dataChannelRef.current = event.channel;
            };
        }

        peerRef.current = pc;
        return pc;
    }, [socket]);

    const handleSignal = useCallback(async (data: { from: string, signal: any }) => {
        let pc = peerRef.current || await initWebRTC(false, data.from);
        if (!pc || (pc.signalingState as string) === 'closed') return;

        try {
            if (data.signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('signal', { to: data.from, signal: answer });
            } else if (data.signal.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            } else if (data.signal.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
            }
        } catch (e) { addLog('Handshake Fail'); }
    }, [socket, initWebRTC]);

    useEffect(() => {
        fetch('/api/users').then(res => res.json()).then((data: User[]) => setAllUsers(data.filter((u: User) => u.id !== currentUser.id)));
    }, [currentUser.id]);

    useEffect(() => {
        if (!socket) return;
        socket.on('roomCreated', ({ code }) => {
            setRoomCode(code);
            setMode('owner_setup');
            isOwnerState.current = true;
            addLog('Bridge ID Generated');
        });
        socket.on('joinSuccess', () => {
            setMode('cinema');
            isOwnerState.current = false;
            addLog('Successfully Joined');
        });
        socket.on('joinError', ({ message }) => {
            setIsConnecting(false);
            addLog(`Error: ${message}`);
            alert(message);
        });
        socket.on('guestJoined', ({ socketId }) => {
            setGuestSocketId(socketId);
            setConnectionStatus('connecting');
            initWebRTC(true, socketId);
            addLog('Peer Detected');
        });
        socket.on('signal', handleSignal);
        socket.on('syncCinema', (data) => {
            if (videoRef.current) {
                if (data.action === 'play') videoRef.current.play().catch(() => { });
                else if (data.action === 'pause') videoRef.current.pause();
                else if (data.action === 'seek') videoRef.current.currentTime = data.time;
                else if (data.action === 'heartbeat') {
                    const diff = Math.abs(videoRef.current.currentTime - data.time);
                    if (diff > 1.5) videoRef.current.currentTime = data.time; // Aggressive drift correction
                }
            }
        });
        socket.on('roomClosed', () => { onExit(); });

        return () => {
            socket.off('roomCreated'); socket.off('joinSuccess'); socket.off('joinError'); socket.off('guestJoined');
            socket.off('signal'); socket.off('syncCinema'); socket.off('roomClosed');
            peerRef.current?.close();
        };
    }, [socket, onExit, handleSignal, initWebRTC]);

    // Added Sync Heartbeat for Host
    useEffect(() => {
        if (!isOwnerState.current || mode !== 'cinema' || !videoRef.current) return;
        const interval = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                handleSync('heartbeat');
            }
        }, 3000); // Heartbeat every 3s
        return () => clearInterval(interval);
    }, [mode, roomCode]);

    const handleCreateRoom = () => {
        if (!guestEmail) return;
        addLog(`🛠️ Establishing Bridge for ${guestEmail}`);
        socket.emit('createPrivateRoom', { ownerId: currentUser.id, guestEmail });
    };

    const handleJoinRoom = () => {
        if (!inputCode) return;
        setIsConnecting(true);
        addLog(`🔑 Linking to ID ${inputCode}`);
        socket.emit('joinPrivateRoom', {
            code: inputCode,
            guestEmail: currentUser.email,
            guestId: currentUser.id
        });
    };

    const setupDataChannel = (dc: RTCDataChannel) => {
        dc.binaryType = 'arraybuffer';
        dc.onmessage = (e) => {
            if (typeof e.data === 'string') {
                const data = JSON.parse(e.data);
                if (data.type === 'metadata') {
                    addLog(`Receiving ${data.fileName}`);
                    setFileType(data.fileType);
                    setFileName(data.fileName);
                    realMimeRef.current = data.mime || (data.fileType === 'image' ? 'image/jpeg' : data.fileType === 'video' ? 'video/mp4' : 'application/pdf');
                    expectedSize.current = data.size;
                    receivedChunks.current = [];
                    receivedSize.current = 0;
                    setTransferProgress(0);
                    setTransferComplete(false);
                    setMode('cinema');
                }
            } else {
                receivedChunks.current.push(e.data);
                receivedSize.current += (e.data as ArrayBuffer).byteLength;
                if (receivedSize.current % (CHUNK_SIZE * 20) === 0 || receivedSize.current >= expectedSize.current) {
                    const progress = Math.round((receivedSize.current / expectedSize.current) * 100);
                    setTransferProgress(progress);
                }

                if (receivedSize.current >= expectedSize.current) {
                    addLog('Payload Verified');
                    const blob = new Blob(receivedChunks.current, { type: realMimeRef.current });
                    setFileUrl(URL.createObjectURL(blob));
                    setTransferComplete(true);
                }
            }
        };
    };

    const processFile = async (file: File) => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
            addLog('Waiting for Peer...');
            return;
        }

        const dc = dataChannelRef.current;
        // High-Performance Optimization: Use backpressure management
        dc.bufferedAmountLowThreshold = 65536 * 2; // 128KB threshold

        try {
            addLog('Initiating Protocol...');
            const fType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'pdf';
            const meta = {
                type: 'metadata',
                fileType: fType,
                fileName: file.name,
                size: file.size,
                mime: file.type // Send EXACT mime type for guest compatibility
            };
            dc.send(JSON.stringify(meta));

            // Synchronization Delay
            await new Promise(r => setTimeout(r, 100));

            const buffer = await file.arrayBuffer();
            let offset = 0;

            const sendBatch = () => {
                // Optimized buffer size (1MB) to keep the UI perfectly fluid while transferring
                while (offset < buffer.byteLength && dc.bufferedAmount < 1024 * 1024) {
                    const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
                    dc.send(chunk);
                    offset += chunk.byteLength;

                    if (offset % (CHUNK_SIZE * 35) === 0 || offset >= buffer.byteLength) {
                        setTransferProgress(Math.round((offset / buffer.byteLength) * 100));
                    }
                }

                if (offset < buffer.byteLength) {
                    // Wait for the WebRTC stack to drain before sending more
                    dc.onbufferedamountlow = () => {
                        dc.onbufferedamountlow = null;
                        sendBatch();
                    };
                } else {
                    setTransferProgress(100);
                    setTransferComplete(true);
                    addLog('Payload Injected');
                }
            };

            sendBatch();
        } catch (e) {
            addLog('Transfer Failed');
            console.error(e);
        }
    };

    useEffect(() => {
        if (isOwnerState.current && connectionStatus === 'connected' && currentFileRef.current) {
            // If we are connected and have a file, but transfer isn't complete (or just started), try pushing it
            const dc = dataChannelRef.current;
            if (dc && dc.readyState === 'open' && !transferComplete) {
                processFile(currentFileRef.current);
            }
        }
    }, [connectionStatus, transferComplete]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        currentFileRef.current = file;
        setFileName(file.name);
        setFileType(file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'pdf');
        setFileUrl(URL.createObjectURL(file));
        setMode('cinema');
        setTransferComplete(false);
        setTransferProgress(0);

        processFile(file);
    };

    const handleSync = (action: 'play' | 'pause' | 'seek' | 'heartbeat') => {
        if (!isOwnerState.current || !videoRef.current) return;
        socket.emit('syncCinema', {
            code: roomCode,
            action,
            time: videoRef.current.currentTime
        });
    };

    return (
        <div className="fixed inset-0 z-[110] bg-[#020617] flex flex-col font-sans select-none tracking-tight overflow-hidden text-slate-100">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept="video/*,application/pdf,image/*"
            />
            {/* Real-time Status Hub */}
            <div className="absolute bottom-10 left-10 z-[150] flex flex-col space-y-3 pointer-events-none opacity-40">
                {log.map((l: string, i: number) => (
                    <div key={i} className="bg-black/80 text-[10px] text-indigo-400 font-bold px-4 py-2 rounded-2xl border border-white/10 uppercase tracking-[0.2em] shadow-3xl animate-in slide-in-from-left-4">
                        {l}
                    </div>
                ))}
            </div>

            <header className="flex items-center justify-between p-6 bg-transparent z-[120]">
                <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 rounded-[20px] bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-xl">
                        <Radio size={24} className="text-white animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-0.5">Cinema Sync</h2>
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_indigo]" />
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em]">Direct Payload Bridge</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-5">
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-4 px-8 rounded-[24px] flex items-center space-x-4 shadow-xl">
                        {connectionStatus === 'connected' ? (
                            <ShieldCheck className="text-green-500" size={20} />
                        ) : connectionStatus === 'connecting' ? (
                            <Loader2 className="text-indigo-400 animate-spin" size={20} />
                        ) : (
                            <Wifi className="text-slate-500" size={20} />
                        )}
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Bridge Interface</span>
                            <span className={`text-sm font-black uppercase tracking-wider ${connectionStatus === 'connected' ? 'text-green-500' : 'text-slate-400'}`}>
                                {connectionStatus === 'connected' ? 'Established' : connectionStatus === 'connecting' ? 'Negotiating' : 'Protocol Idle'}
                            </span>
                        </div>
                    </div>
                    <button onClick={onExit} className="w-12 h-12 rounded-[18px] bg-red-500/10 hover:bg-red-500 text-slate-400 hover:text-white transition-all border border-white/5 flex items-center justify-center shadow-lg">
                        <X size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center p-12 relative overflow-y-auto">
                {mode === 'selection' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full px-4 animate-in fade-in zoom-in-95 duration-700">
                        <button onClick={() => setMode('owner_setup')} className="group relative p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 transition-all text-center shadow-2xl overflow-hidden hover:translate-y-[-4px] duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition duration-500">
                                <Monitor className="text-indigo-400" size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-3 italic tracking-tight uppercase text-white">Host Center</h3>
                            <p className="text-slate-400 text-xs leading-relaxed max-w-[200px] mx-auto font-medium opacity-80">Inject high-quality media directly into your guest's local cache.</p>
                        </button>
                        <button onClick={() => setMode('guest_join')} className="group relative p-8 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-purple-500/50 transition-all text-center shadow-2xl overflow-hidden hover:translate-y-[-4px] duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition duration-500">
                                <Key className="text-purple-400" size={28} />
                            </div>
                            <h3 className="text-xl font-black mb-3 italic tracking-tight uppercase text-white">Guest Peer</h3>
                            <p className="text-slate-400 text-xs leading-relaxed max-w-[200px] mx-auto font-medium opacity-80">Link with a host and receive full-quality co-watching payloads.</p>
                        </button>
                    </div>
                )}

                {mode === 'owner_setup' && !roomCode && (
                    <div className="max-w-md w-full p-10 rounded-[40px] bg-white/[0.02] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-700 backdrop-blur-3xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30" />
                        <ShieldAlert className="text-indigo-500 mx-auto mb-7" size={52} />
                        <h3 className="text-2xl font-black mb-8 text-center tracking-tighter italic uppercase text-white">Peer Authentication</h3>
                        <div className="space-y-8">
                            <div className="relative group">
                                <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                <input
                                    type="text" value={guestEmail}
                                    onChange={(e) => { setGuestEmail(e.target.value); setShowUserList(true); }}
                                    onFocus={() => setShowUserList(true)}
                                    placeholder="Select authorized node..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700 font-bold text-base shadow-inner"
                                />
                                {showUserList && guestEmail.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-[#0a0f25] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-[240px] overflow-y-auto animate-in slide-in-from-top-4 duration-500">
                                        {allUsers.filter((u: User) => u.name?.toLowerCase().includes(guestEmail.toLowerCase()) || u.email?.toLowerCase().includes(guestEmail.toLowerCase())).map((user: User) => (
                                            <button key={user.id} onClick={() => { setGuestEmail(user.email); setShowUserList(false); }} className="w-full flex items-center space-x-5 p-4 hover:bg-white/5 transition-all text-left group">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm group-hover:bg-indigo-500 group-hover:text-white transition-all transform group-hover:scale-105">
                                                    {user.name?.[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-white font-black text-sm mb-0.5">{user.name}</div>
                                                    <div className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em]">{user.email}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={handleCreateRoom} disabled={!guestEmail.includes('@')} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-20 uppercase tracking-[0.4em] text-xs">
                                Open Sync Channel
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'owner_setup' && roomCode && (
                    <div className="max-w-xl w-full text-center p-10 rounded-[48px] bg-white/[0.02] border border-white/10 shadow-xl mt-6">
                        <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-[8px] mb-8 italic opacity-50">Handshake ID Output</p>
                        <div className="flex justify-center space-x-3 mb-12">
                            {roomCode.split('').map((char, i) => (
                                <div key={i} className="w-12 h-16 rounded-[16px] bg-black border border-indigo-500/30 flex items-center justify-center text-3xl font-black text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                    {char}
                                </div>
                            ))}
                        </div>
                        <label onClick={() => fileInputRef.current?.click()} className="block w-full py-12 rounded-[40px] border-2 border-dashed border-white/5 hover:border-indigo-500/40 bg-white/[0.01] cursor-pointer transition-all group overflow-hidden relative shadow-lg active:scale-95 duration-700">
                            <div className="absolute inset-0 bg-indigo-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />
                            <PlayCircle className="text-indigo-500 mx-auto mb-6 group-hover:scale-110 transition-transform duration-1000 shadow-lg" size={80} />
                            <span className="text-3xl font-black block italic tracking-tighter uppercase text-white mb-1">Inject Sync</span>
                            <span className="text-slate-700 text-[8px] font-black uppercase tracking-[0.4em] mt-4 block leading-none">High-Speed Bitstream Transfer</span>
                        </label>
                    </div>
                )}

                {mode === 'guest_join' && (
                    <div className="max-w-md w-full p-10 rounded-[40px] bg-white/[0.02] border border-white/10 text-center shadow-2xl animate-in zoom-in-95 duration-700 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-30" />
                        <Key className="text-purple-500 mx-auto mb-7 animate-pulse" size={52} />
                        <h3 className="text-2xl font-black mb-8 tracking-tighter italic uppercase text-white">Guest Pair Node</h3>
                        <input
                            type="text" maxLength={6} value={inputCode} onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="0 0 0 0 0 0"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-6 text-center text-5xl font-black tracking-[0.4em] text-white focus:border-purple-500/50 outline-none mb-8 placeholder:text-slate-800 shadow-inner"
                        />
                        <button
                            onClick={handleJoinRoom}
                            disabled={isConnecting}
                            className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-[0.4em] text-xs flex items-center justify-center space-x-3"
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Pairing...</span>
                                </>
                            ) : (
                                <span>Establish Link</span>
                            )}
                        </button>
                    </div>
                )}

                {mode === 'cinema' && (
                    <div className="w-full max-w-5xl animate-in zoom-in-95 duration-1000 flex flex-col h-[82vh] relative px-4 mx-auto gap-4">
                        <div className="relative group rounded-[32px] overflow-hidden border border-white/5 shadow-2xl bg-black flex-1 flex items-center justify-center group overflow-hidden">
                            {transferComplete && fileUrl ? (
                                <>
                                    {fileType === 'video' ? (
                                        <>
                                            <video
                                                ref={videoRef}
                                                src={fileUrl}
                                                className="w-full h-full object-contain shadow-2xl transition-all duration-700 hover:scale-[1.01]"
                                                controls={true}
                                                onPlay={() => handleSync('play')}
                                                onPause={() => handleSync('pause')}
                                                onSeeked={() => handleSync('seek')}
                                                autoPlay
                                                muted={!isOwnerState.current && isMuted}
                                            />
                                            {/* Active Peer Badge */}
                                            <div className="absolute top-6 left-6 z-[160] flex items-center space-x-3 bg-black/40 backdrop-blur-xl p-2 px-4 rounded-full border border-white/10 animate-in slide-in-from-left-4">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black">{receiver.name[0]}</div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-white">{receiver.name}</span>
                                                    <span className="text-[7px] font-bold text-indigo-400 uppercase tracking-widest">Watching Now</span>
                                                </div>
                                            </div>

                                            {!isOwnerState.current && isMuted && (
                                                <button
                                                    onClick={() => { setIsMuted(false); if (videoRef.current) { videoRef.current.muted = false; videoRef.current.play(); } }}
                                                    className="absolute inset-0 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center space-y-8 z-[150] animate-in fade-in duration-500"
                                                >
                                                    <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center shadow-[0_0_60px_rgba(79,70,229,0.6)] border-4 border-white/5 hover:scale-110 transition-transform duration-500 active:scale-95 group">
                                                        <Volume2 className="text-white group-hover:animate-bounce" size={32} />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-white font-black text-3xl tracking-tighter uppercase italic block mb-2">Unmute Social Sync</span>
                                                        <span className="text-indigo-400 font-bold text-[8px] uppercase tracking-[0.5em] opacity-80">Connected to Host Stream</span>
                                                    </div>
                                                </button>
                                            )}
                                        </>
                                    ) : fileType === 'image' ? (
                                        <div className="p-8 w-full h-full flex items-center justify-center bg-[#0a0f1e]">
                                            <img src={fileUrl} className="max-w-full max-h-full object-contain drop-shadow-2xl animate-in zoom-in-95 duration-1000" />
                                        </div>
                                    ) : (
                                        <iframe src={fileUrl} className="w-full h-full bg-white border-0 animate-in fade-in duration-700" />
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-10 relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent" />
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-indigo-600 blur-[80px] opacity-20 animate-pulse" />
                                        <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/10 flex items-center justify-center relative backdrop-blur-xl shadow-inner">
                                            {fileType === 'image' ? <ImageIcon className="text-indigo-400 animate-pulse" size={40} /> : <FileText className="text-indigo-400 animate-pulse" size={40} />}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black mb-6 tracking-tight italic text-white uppercase opacity-90">{fileName || 'Sync Protocol...'}</h3>
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="w-56 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_10px_indigo]" style={{ width: `${transferProgress}%` }} />
                                        </div>
                                        <div className="flex items-center space-x-3 text-slate-500 font-black uppercase tracking-[0.3em] text-[7px]">
                                            <Loader2 size={12} className="text-indigo-500 animate-spin" />
                                            <span>Injected: {transferProgress}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sync Status Badge */}
                            <div className="absolute top-6 right-6 flex items-center">
                                <div className="p-2 px-5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center space-x-3 shadow-xl group">
                                    <div className={`w-1.5 h-1.5 rounded-full ${transferComplete ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-amber-500 shadow-[0_0_8px_orange]'} animate-pulse`} />
                                    <span className="text-[7px] font-black text-white uppercase tracking-[0.3em] group-hover:text-indigo-400 transition-colors">
                                        {transferComplete ? 'V-SYNC ACTIVE' : 'BUFFERING NODE'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <footer className="flex items-center justify-between px-8 py-4 bg-white/[0.02] rounded-[28px] border border-white/5 backdrop-blur-2xl shadow-xl">
                            <div className="flex items-center space-x-5">
                                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shadow-lg group relative overflow-hidden transition-transform hover:scale-105">
                                    <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {fileType === 'video' ? <Monitor className="text-indigo-400" size={20} /> : fileType === 'pdf' ? <FileText className="text-amber-400" size={20} /> : <ImageIcon className="text-pink-400" size={20} />}
                                </div>
                                <div>
                                    <h4 className="text-base font-black tracking-tight italic uppercase text-white line-clamp-1 opacity-90">{fileName || 'Bridge Pulse...'}</h4>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-2 bg-indigo-500/10 p-0.5 px-2 rounded-full border border-indigo-500/10 shadow-inner">
                                            <Activity size={10} className="text-indigo-400" />
                                            <span className="text-[6px] font-black text-indigo-400 uppercase tracking-widest leading-none">P-Sync v9.8</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-slate-600">
                                            <Database size={10} />
                                            <span className="text-[6px] font-black uppercase tracking-[0.3em]">ID: {(roomCode || '---').slice(0, 6)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-6">
                                {!transferComplete && (
                                    <div className="bg-indigo-600/10 p-2 px-4 rounded-lg text-indigo-400 border border-indigo-500/10 flex items-center space-x-3 animate-pulse">
                                        <span className="font-black text-sm italic">{transferProgress}%</span>
                                    </div>
                                )}
                                {transferComplete && (
                                    <div className="flex items-center space-x-2 bg-green-500/5 p-2 px-4 rounded-xl border border-green-500/10">
                                        <CheckCircle2 size={12} className="text-green-500" />
                                        <span className="font-black text-[7px] text-green-500 uppercase tracking-widest">In Sync</span>
                                    </div>
                                )}
                                {isOwnerState.current && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-indigo-600 hover:bg-indigo-500 p-2.5 px-6 rounded-xl text-white shadow-lg flex items-center space-x-3 transition-all hover:scale-105 active:scale-95 group"
                                    >
                                        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-1000" />
                                        <span className="font-black text-[8px] uppercase tracking-[0.4em]">Switch</span>
                                    </button>
                                )}
                                <div className="text-right border-l border-white/5 pl-6">
                                    <div className="flex items-center justify-end space-x-2 text-indigo-400 mb-0.5">
                                        <Wifi size={12} className="animate-pulse" />
                                        <span className="font-black text-[9px] uppercase tracking-[0.2em] italic leading-none">Healthy</span>
                                    </div>
                                    <p className="text-slate-600 text-[6px] font-black uppercase tracking-[0.4em]">Node Established</p>
                                </div>
                            </div>
                        </footer>
                    </div>
                )}
            </main>
        </div>
    );
}
