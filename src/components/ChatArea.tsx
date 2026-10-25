import React from "react";

interface Message {
  id: string;
  user: "me" | "them";
  text: string;
  time: string;
  avatar?: string;
}

interface ChatAreaProps {
  contactName: string;
  contactAvatar?: string;
}

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const bubbleClassName = `
    p-3 rounded-md mb-2 max-w-[80%]
    ${message.user === "me" ? "bg-blue-600 text-white items-end" : "bg-gray-800 text-white items-start"}
    ${message.user === "me" ? "ml-8" : "mr-8"}
  `;

  return (
    <div className={bubbleClassName}>
      {message.user === "me" ? (
        <p className="font-medium truncate">{message.text}</p>
      ) : (
        <>
          {message.avatar ? (
            <img
              src={message.avatar}
              alt="avatar"
              className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
            />
          ) : null}
          <p className="text-sm truncate">{message.text}</p>
        </>
      )}
      <span className="text-xs opacity-70">{message.time}</span>
    </div>
  );
};

const ChatArea: React.FC<ChatAreaProps> = ({ contactName, contactAvatar }) => {
  // Sample messages - in a real app, these would come from Supabase
  const messages: Message[] = [
    { id: "1", user: "them", text: "Hey there! How can I help you today?", time: "9:30 AM" },
    { id: "2", user: "me", text: "Hi! I'm doing well, thanks!", time: "9:31 AM" },
    { id: "3", user: "them", text: "What would you like to talk about?", time: "9:33 AM" },
    { id: "4", user: "me", text: "Just checking in and saying hi!", time: "9:35 AM" },
  ];

  return (
    <section className="space-y-4">
      {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
    </section>
  );
};

export default ChatArea;