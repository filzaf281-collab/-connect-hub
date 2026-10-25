import React from "react";

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  online: boolean;
}

type ChatListProps = {
  onChatSelect: (chatId: string) => void;
  chats: Chat[];
};

const ChatList: React.FC<ChatListProps> = ({ onChatSelect, chats }) => {
  // Sample chat data - in a real app, this would come from Supabase
  // (using fallback if props are empty)
  const chatData = chats.length > 0 ? chats : [
    {
      id: "1",
      name: "John Doe",
      avatar: "https://via.placeholder.com/40",
      lastMessage: "Hey, how are you?",
      lastTime: "2:15 PM",
      online: true,
    },
    {
      id: "2",
      name: "Jane Smith",
      avatar: "https://via.placeholder.com/40",
      lastMessage: "What's up for tonight?",
      lastTime: "Yesterday",
      online: false,
    },
    {
      id: "3",
      name: "Team ConnectHub",
      avatar: "https://via.placeholder.com/40",
      lastMessage: "Project update due Friday",
      lastTime: "Nov 1",
      online: true,
    },
    {
      id: "4",
      name: "Alice Johnson",
      avatar: "https://via.placeholder.com/40",
      lastMessage: "Running late, be there soon",
      lastTime: "Oct 30",
      online: false,
    },
  ];

  return (
    <div className="space-y-1">
      {chatData.map((chat) => (
        <div
          key={chat.id}
          className={`
            flex items-start gap-3 p-3 rounded-md hover:bg-gray-800 cursor-pointer
            ${chat.online ? "bg-gray-800" : "bg-gray-750"}
            ${chat.id === "1" ? "border-l-2 border-blue-500" : ""}
          `}
          onClick={() => onChatSelect(chat.id)}
        >
          <img
            src={chat.avatar}
            alt={chat.name}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-1">{chat.name}</p>
            <p className="text-xs text-gray-500 line-clamp-1">{chat.lastMessage}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400">{chat.lastTime}</span>
            {chat.online ? (
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 border-2 border-gray-900 ml-1" />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatList;