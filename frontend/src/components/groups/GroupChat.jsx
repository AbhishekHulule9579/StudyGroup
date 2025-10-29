import React, { useState, useRef, useEffect } from "react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import {
  IconSend,
  IconTrash,
  IconPin,
  IconReply,
  IconPoll,
  IconClip,
  IconSearch,
  IconEmoji,
} from "./SvgIcons";
import EmojiPicker from "emoji-picker-react"; // Make sure to install: npm i emoji-picker-react

const PinnedMessage = ({ msg, onUnpin }) => (
  <div className="bg-yellow-100 border-l-4 border-yellow-400 px-3 py-2 mb-3 text-sm flex items-center justify-between rounded">
    <span>
      <strong className="text-purple-700">{msg.user}:</strong> {msg.message}
    </span>
    <button
      className="ml-3 text-xs text-yellow-700"
      onClick={() => onUnpin(msg.id)}
    >
      Unpin
    </button>
  </div>
);

const PollWidget = ({ poll, onVote }) => (
  <div className="bg-blue-50 border-l-4 border-blue-400 px-4 py-2 my-2 rounded">
    <div className="font-semibold text-blue-800">{poll.question}</div>
    <ul>
      {poll.options.map((opt, idx) => (
        <li key={idx}>
          <button
            className="my-1 px-2 py-1 rounded bg-blue-100 text-blue-800"
            onClick={() => onVote(poll.id, idx)}
          >
            {opt} ({poll.votes[idx] || 0})
          </button>
        </li>
      ))}
    </ul>
  </div>
);

const GroupChat = ({ groupId, currentUser, userRole }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [polls, setPolls] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  const isAdmin = userRole === 'admin';
  const canPinMessage = (message) => isAdmin || message.senderId === currentUser?.id;
  const canDeleteMessage = (message) => message.senderId === currentUser?.id;
  const [openReactionPickerFor, setOpenReactionPickerFor] = useState(null);

  // helper: decode unified string (e.g. "1F44D") -> emoji char(s)
  const decodeUnified = (unified) => {
    try {
      return unified
        .split('-')
        .map((u) => String.fromCodePoint(parseInt(u, 16)))
        .join('');
    } catch (e) {
      return '';
    }
  };

  const normalizeMessage = (m) => {
    return {
      id: m.id ?? m.messageId ?? Date.now(),
      content: m.content ?? m.message ?? m.text ?? '',
      senderId: m.senderId ?? m.userId ?? m.from ?? null,
      senderName: m.senderName ?? m.user ?? m.fromName ?? 'Unknown',
      timestamp: m.timestamp ?? m.createdAt ?? null,
      type: m.messageType ?? m.type ?? (m.fileName ? 'file' : 'TEXT'),
      replyTo: m.replyTo
        ? {
            messageId: m.replyTo.messageId ?? m.replyTo.id,
            senderName: m.replyTo.senderName ?? m.replyTo.user ?? 'Unknown',
            content: m.replyTo.content ?? m.replyTo.message ?? '',
          }
        : null,
      reactions: Array.isArray(m.reactions)
        ? m.reactions
        : Object.entries(m.reactions || {}).map(([emoji, users]) => ({ emoji, users })),
    };
  };

  // Connect to WebSocket and load message history
  useEffect(() => {
    // Load message history
    const token = sessionStorage.getItem("token");
    
    

    const loadMessageHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:8145/api/groups/${groupId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          // Normalize messages
          const normalized = Array.isArray(data) ? data.map(normalizeMessage) : [];
          setMessages(normalized);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    let stomp = null;

    // Connect to WebSocket
    const connectWebSocket = () => {
      try {
        const socket = new SockJS('http://localhost:8145/ws');
  stomp = Stomp.over(() => socket);

  // Disable debug logs safely — stompjs expects a function
  // setting to null causes `this.debug is not a function` errors
  stomp.debug = () => {};

        const headers = {
          Authorization: `Bearer ${token}`
        };

        stomp.connect(
          headers,
          () => {
            console.log('WebSocket Connected Successfully');
            setConnectionError(null);
            setStompClient(stomp);

            // Subscribe to group chat topic
            stomp.subscribe(`/topic/group/${groupId}`, (message) => {
              try {
                const receivedMessage = JSON.parse(message.body);
                const messageData = normalizeMessage(receivedMessage);
                setMessages(prevMessages => [...prevMessages, messageData]);
              } catch (error) {
                console.error('Error processing message:', error);
              }
            });

            // Load message history after connection
            loadMessageHistory();
          },
          (error) => {
            console.error('WebSocket connection error:', error);
            // Attempt to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
          }
        );
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      }
    };

    // Initial connection
    connectWebSocket();

    return () => {
      if (stomp) {
        try {
          stomp.disconnect(() => {
            console.log('WebSocket Connection Closed');
            setStompClient(null);
          });
        } catch (error) {
          console.error('Error disconnecting WebSocket:', error);
        }
      }
    };
  }, [groupId]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pinned]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleSendFile = () => {
    if (!uploadFile) return;
    setMessages([
      ...messages,
      {
        id: Date.now(),
        user: "You",
        type: "file",
        fileName: uploadFile.name,
        fileSize: `${(uploadFile.size / 1024).toFixed(2)} KB`,
      },
    ]);
    setUploadFile(null);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !stompClient) return;

    // Ensure we have the currentUser available
    if (!currentUser || !currentUser.id) {
      console.error('Cannot send message: currentUser is not available yet');
      setConnectionError('You must be signed in to send messages.');
      return;
    }

    const token = sessionStorage.getItem("token");
    const messageData = {
      groupId: groupId,
      senderId: currentUser.id,
      senderName: currentUser.name || 'Unknown',
      content: input,
      messageType: 'TEXT',
      replyTo: replyTo ? {
        messageId: replyTo.id,
        senderName: replyTo.user,
        content: replyTo.message
      } : null
    };

    try {
      stompClient.send(
        `/app/chat.sendMessage/${groupId}`,
        { Authorization: `Bearer ${token}` },
        JSON.stringify(messageData)
      );
      setInput("");
      setReplyTo(null);
      setShowEmoji(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionError('Failed to send message. Please try again.');
    }
  };

  const handlePin = (id) => {
    const msgToPin = messages.find((m) => m.id === id);
    if (msgToPin && !pinned.find((m) => m.id === id)) {
      setPinned([msgToPin, ...pinned]);
    }
  };

  const handleUnpin = (id) => setPinned(pinned.filter((m) => m.id !== id));
  const handleDelete = (id) => setMessages(messages.filter((m) => m.id !== id));
  const handleReply = (msg) => {
    const replyData = {
      id: msg.id,
      user: msg.senderName || 'Unknown',
      message: msg.content || msg.message,
      originalMessage: msg
    };
    setReplyTo(replyData);
  };

  const scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth' });
      messageElement.classList.add('bg-yellow-50');
      setTimeout(() => messageElement.classList.remove('bg-yellow-50'), 2000);
    }
  };

  const filteredMessages = search
    ? messages.filter(
        (m) =>
          m.content?.toLowerCase().includes(search.toLowerCase()) ||
          m.senderName?.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  const handleEmojiClick = (emojiObj) => {
    // emojiObj may have different shapes depending on version: {emoji}, {native}, or unified string
    let ch = '';
    if (!emojiObj) return;
    if (typeof emojiObj === 'string') ch = emojiObj;
    else ch = emojiObj.emoji ?? emojiObj.native ?? (emojiObj.unified ? decodeUnified(emojiObj.unified) : '');
    setInput((prev) => prev + ch);
  };

  // Reaction handling: optimistic update + persist via REST
  const commonEmojis = ['👍', '❤️', '😂', '🎉', '😮', '😢', '👏'];

  const toggleReactionPicker = (messageId) => {
    setOpenReactionPickerFor((prev) => (prev === messageId ? null : messageId));
  };

  const handleToggleReaction = async (messageId, emoji) => {
    if (!currentUser) return;
    const token = sessionStorage.getItem('token');

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = Array.isArray(m.reactions) ? [...m.reactions] : [];
        const idx = existing.findIndex((r) => r.emoji === emoji);
        if (idx === -1) {
          // add reaction
          existing.push({ emoji, users: [currentUser.name || currentUser.id] });
        } else {
          // toggle user in reaction
          const users = existing[idx].users || [];
          const has = users.includes(currentUser.name || currentUser.id);
          existing[idx].users = has ? users.filter((u) => u !== (currentUser.name || currentUser.id)) : [...users, (currentUser.name || currentUser.id)];
          if (existing[idx].users.length === 0) existing.splice(idx, 1);
        }
        return { ...m, reactions: existing };
      })
    );

    // Persist to backend (assumes endpoints exist)
    try {
      // Check whether user already reacted (from the optimistic state)
      const res = await fetch(`http://localhost:8145/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        // Try DELETE if POST not allowed (server may expect toggle semantics)
        await fetch(`http://localhost:8145/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Failed to persist reaction', err);
      // On failure, we could optionally refresh messages from server. For now, leave optimistic.
    }
  };

  const handleCreatePoll = (question, options) => {
    setPolls([
      ...polls,
      {
        id: Date.now(),
        question,
        options,
        votes: Array(options.length).fill(0),
      },
    ]);
    setShowPollForm(false);
  };

  const handleVote = (pollId, optionIdx) => {
    setPolls(
      polls.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              votes: poll.votes.map((v, i) => (i === optionIdx ? v + 1 : v)),
            }
          : poll
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 bg-white">
      {/* Search + file/poll controls row */}
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search message or user..."
        />
        <label className="p-2 cursor-pointer">
          <IconClip />
          <input type="file" className="hidden" onChange={handleFileChange} />
        </label>
        <button className="p-2" onClick={() => setShowPollForm((v) => !v)}>
          <IconPoll />
        </button>
      </div>
      {/* Emoji picker below form if open */}
      {showEmoji && (
        <div className="mb-2 mt-2 z-30 relative">
          <EmojiPicker
            onEmojiClick={(_, emojiObj) => handleEmojiClick(emojiObj)}
          />
        </div>
      )}
      {/* File preview */}
      {uploadFile && (
        <div className="mb-2 flex items-center gap-2 bg-gray-100 rounded px-2 py-1">
          <span>{uploadFile.name}</span>
          <span className="text-xs text-gray-500">
            ({(uploadFile.size / 1024).toFixed(2)} KB)
          </span>
          <button
            className="bg-purple-600 text-white px-3 py-1 rounded"
            onClick={handleSendFile}
          >
            Send file
          </button>
        </div>
      )}
      {/* Poll form */}
      {showPollForm && <PollForm onCreate={handleCreatePoll} />}
      {/* Pinned messages */}
      {pinned.length > 0 && (
        <div>
          <div className="text-xs font-bold text-yellow-700 mb-1">
            📌 Pinned messages
          </div>
          {pinned.map((msg) => (
            <PinnedMessage key={msg.id} msg={msg} onUnpin={handleUnpin} />
          ))}
        </div>
      )}
      {/* Chat + polls */}
      <div className="flex-grow space-y-3 overflow-y-auto mb-4 pr-2 p-3 bg-gray-50 rounded-lg">
        {polls.map((poll) => (
          <PollWidget key={poll.id} poll={poll} onVote={handleVote} />
        ))}
        {filteredMessages.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          filteredMessages.map((chat) => {
            const isOwnMessage = chat.senderId === currentUser?.id;
            return (
              <div
                key={chat.id}
                id={`message-${chat.id}`}
                className={`py-2 px-3 bg-white shadow-sm rounded-lg max-w-[60%] border border-gray-200 relative group transition-all ${
                  isOwnMessage ? 'ml-auto bg-purple-50' : ''
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs text-purple-700 mb-0.5">
                    {isOwnMessage ? 'You' : chat.senderName || 'Unknown'}
                    {chat.type === "file" ? (
                      <span className="ml-1 text-gray-600">(file)</span>
                    ) : null}
                  </span>
                  
                  {/* Reply Reference */}
                  {chat.replyTo && (
                    <div 
                      className="text-xs bg-gray-50 rounded p-1 mb-1 cursor-pointer hover:bg-gray-100"
                      onClick={() => scrollToMessage(chat.replyTo.messageId)}
                    >
                      <div className="flex items-center gap-1">
                        <IconReply className="w-3 h-3" />
                        <span className="font-medium text-gray-600">{chat.replyTo.senderName}</span>
                      </div>
                      <div className="text-gray-500 truncate">{chat.replyTo.content}</div>
                    </div>
                  )}
                  
                  {/* Message Content */}
                  <div className="text-gray-800 text-sm">
                    {chat.type === "file" ? (
                      <a
                        href="#"
                        className="text-purple-700 underline"
                        download={chat.fileName}
                        title={`Download ${chat.fileName}`}
                      >
                        📎 {chat.fileName}{" "}
                        <span className="text-xs text-gray-400">
                          ({chat.fileSize})
                        </span>
                      </a>
                    ) : (
                      chat.content
                    )}
                  </div>
                  {/* Reactions display */}
                  {chat.reactions && chat.reactions.length > 0 && (
                    <div className="mt-1 flex gap-2 items-center">
                      {chat.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          title={(r.users || []).join(', ')}
                          className="text-sm bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1"
                          onClick={() => handleToggleReaction(chat.id, r.emoji)}
                        >
                          <span className="leading-none">{r.emoji}</span>
                          <span className="text-xs text-gray-600">{(r.users || []).length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons - Only visible on hover */}
                <div className="absolute right-0 top-0 transform translate-x-full opacity-0 group-hover:opacity-100 flex items-center gap-1 pl-2">
                  {/* Reaction picker toggle */}
                  <div className="relative">
                    <button
                      className="p-1 text-xl leading-none bg-white rounded-full shadow-sm hover:shadow transition-all"
                      onClick={() => toggleReactionPicker(chat.id)}
                      title="React"
                    >
                      😊
                    </button>
                    {openReactionPickerFor === chat.id && (
                      <div className="absolute right-0 mt-2 bg-white border rounded shadow p-1 flex gap-1 z-40">
                        {commonEmojis.map((e) => (
                          <button
                            key={e}
                            className="p-1 text-sm hover:bg-gray-100 rounded"
                            onClick={() => { handleToggleReaction(chat.id, e); setOpenReactionPickerFor(null); }}
                            title={`React ${e}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="p-1 text-blue-500 hover:text-blue-700 bg-white rounded-full shadow-sm hover:shadow transition-all"
                    onClick={() => handleReply(chat)}
                    title="Reply"
                  >
                    <IconReply className="w-4 h-4" />
                  </button>
                  {canPinMessage(chat) && (
                    <button
                      className="p-1 text-yellow-600 hover:text-yellow-800 bg-white rounded-full shadow-sm hover:shadow transition-all"
                      onClick={() => handlePin(chat.id)}
                      title="Pin message"
                    >
                      <IconPin className="w-4 h-4" />
                    </button>
                  )}
                  {canDeleteMessage(chat) && (
                    <button
                      className="p-1 text-red-600 hover:text-red-800 bg-white rounded-full shadow-sm hover:shadow transition-all"
                      onClick={() => handleDelete(chat.id)}
                      title="Delete message"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Replying bar */}
      {replyTo && (
        <div className="mb-2 p-2 bg-gray-100 rounded flex items-center justify-between">
          <span>
            Replying to <strong>{replyTo.user}</strong>: {replyTo.message}
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-xs p-1 text-gray-500"
          >
            Cancel reply
          </button>
        </div>
      )}
      {/* Message form, emoji button left of Send */}
      <form className="flex gap-2 mt-1 items-center" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type your message..."
          className="flex-grow p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 transition"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="button"
          className="px-2 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-100 flex items-center"
          onClick={() => setShowEmoji((v) => !v)}
          aria-label="Open emoji picker"
        >
          <IconEmoji />
        </button>
        <button
          type="submit"
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold shadow-md hover:opacity-90 transition flex items-center"
        >
          <IconSend />
          <span className="ml-2">Send</span>
        </button>
      </form>
      {/* EmojiPicker pops up below the input box if triggered - see above */}
      {showEmoji && (
        <div className="mb-2 mt-2 z-30 relative">
          <EmojiPicker
            onEmojiClick={(_, emojiObj) => handleEmojiClick(emojiObj)}
          />
        </div>
      )}
    </div>
  );
};

function PollForm({ onCreate }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const addOption = () => setOptions([...options, ""]);
  const updateOption = (i, val) =>
    setOptions(options.map((opt, idx) => (idx === i ? val : opt)));
  const submitPoll = (e) => {
    e.preventDefault();
    if (!question.trim() || options.filter((opt) => opt.trim()).length < 2)
      return;
    onCreate(
      question,
      options.filter((opt) => opt.trim())
    );
    setQuestion("");
    setOptions(["", ""]);
  };
  return (
    <form className="bg-blue-100 p-3 rounded mb-3" onSubmit={submitPoll}>
      <input
        type="text"
        placeholder="Poll Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full mb-2 px-2 py-1 border rounded"
      />
      {options.map((opt, i) => (
        <input
          key={i}
          type="text"
          placeholder={`Option ${i + 1}`}
          className="w-full mb-1 px-2 py-1 border rounded"
          value={opt}
          onChange={(e) => updateOption(i, e.target.value)}
        />
      ))}
      <button
        type="button"
        className="text-blue-800 mt-1 mb-1"
        onClick={addOption}
      >
        + Add Option
      </button>
      <button
        type="submit"
        className="block mt-2 px-3 py-1 bg-blue-600 text-white rounded"
      >
        Create Poll
      </button>
    </form>
  );
}

export default GroupChat;
