import ChatClient from './ChatClient';

export function generateStaticParams() {
    return [{ id: '1' }, { id: '2' }, { id: '3' }];
}

export default async function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return <ChatClient id={resolvedParams.id} />;
}
