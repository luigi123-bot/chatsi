'use client';

import { format } from 'date-fns';
import clsx from 'clsx';
import { Check, CheckCheck } from 'lucide-react';

interface MessageProps {
    content: string;
    senderId: string;
    timestamp: Date;
    isMe: boolean;
    status?: 'sent' | 'delivered' | 'read';
    type?: 'text' | 'image' | 'video';
    fileUrl?: string;
}

export default function Message({ content, isMe, timestamp, status = 'sent', type = 'text', fileUrl }: MessageProps) {
    const formattedTime = isValidDate(timestamp) ? format(timestamp, 'HH:mm') : '--:--';

    function isValidDate(d: any) {
        return d instanceof Date && !isNaN(d.getTime());
    }

    return (
        <div
            className={clsx(
                "flex flex-col mb-1 group max-w-[85%] sm:max-w-[70%] transition-all duration-300",
                isMe ? "ml-auto items-end" : "mr-auto items-start"
            )}
        >
            <div
                className={clsx(
                    "relative shadow-2xl transition-all duration-300 overflow-hidden",
                    isMe
                        ? "bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 text-white rounded-[24px] rounded-tr-none shadow-indigo-600/10"
                        : "bg-white/[0.04] backdrop-blur-md text-slate-100 rounded-[24px] rounded-tl-none border border-white/5 shadow-black/20",
                    type === 'text' ? "px-5 py-3" : "p-1.5"
                )}
            >
                {type === 'text' && (
                    <p className="text-[14px] leading-relaxed font-medium tracking-tight whitespace-pre-wrap break-words">
                        {content}
                    </p>
                )}

                {type === 'image' && fileUrl && (
                    <div className="w-[280px] h-[180px] sm:w-[320px] sm:h-[180px] rounded-[18px] overflow-hidden group-hover:scale-[1.01] transition-transform duration-500 bg-slate-900/50">
                        <img src={fileUrl} alt="shared" className="w-full h-full object-cover" />
                    </div>
                )}

                {type === 'video' && fileUrl && (
                    <div className="w-[280px] h-[180px] sm:w-[320px] sm:h-[180px] rounded-[18px] overflow-hidden group-hover:scale-[1.01] transition-transform duration-500 bg-black/50">
                        <video
                            src={fileUrl}
                            controls
                            className="w-full h-full object-cover"
                            preload="metadata"
                            playsInline
                        />
                    </div>
                )}

                <div className={clsx(
                    "flex items-center space-x-2 mt-1",
                    isMe ? "justify-end text-indigo-100/60" : "justify-start text-slate-500",
                    type !== 'text' && "px-2 pb-1"
                )}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{formattedTime}</span>
                    {isMe && (
                        <div className="transition-transform duration-300">
                            {status === 'read' ? (
                                <CheckCheck size={14} className="text-cyan-400 stroke-[3]" />
                            ) : status === 'delivered' ? (
                                <CheckCheck size={14} className="stroke-[2.5]" />
                            ) : (
                                <Check size={14} className="stroke-[2.5]" />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Optional interaction hint on hover */}
            <div className={clsx(
                "h-0 overflow-hidden group-hover:h-4 transition-all duration-300 px-2",
                isMe ? "text-right" : "text-left"
            )}>
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Entregado</span>
            </div>
        </div>
    );
}
