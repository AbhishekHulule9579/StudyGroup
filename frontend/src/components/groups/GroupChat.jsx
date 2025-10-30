import React, { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import EmojiPicker from "emoji-picker-react"; // npm i emoji-picker-react

// ----- SVG ICONS (kept as you provided) -----
const IconSend = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
  </svg>
);
const IconTrash = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
  </svg>
);
const IconPin = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 10c0 1-1.6 3-3 3h-2v5l-4 4v-4H8v-5H6c-1.4 0-3-2-3-3s1.6-3 3-3h12c1.4 0 3 2 3 3Z" />
    <path d="M9 21v-5M15 21v-5" />
  </svg>
);
const IconReply = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);
const IconPoll = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 17v-4M12 17v-8M8 17v-12" />
    <rect width="20" height="16" x="2" y="3" rx="2" />
  </svg>
);
const IconClip = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);
const IconEmoji = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" x2="9.01" y1="9" y2="9" />
    <line x1="15" x2="15.01" y1="9" y2="9" />
  </svg>
);
// ----- END SVG ICONS -----

// ----- SUB-COMPONENTS -----
const PinnedMessage = ({ msg, onUnpin }) => (
  <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 mb-3 text-sm flex items-center justify-between rounded-lg shadow-sm sticky top-0 z-20 backdrop-blur-sm">
    <span>
      <strong className="text-blue-700">{msg.senderName || msg.user}:</strong>{" "}
      {msg.content || msg.message}
    </span>
    <button
      className="ml-3 text-xs font-semibold text-blue-700 hover:text-blue-900"
      onClick={() => onUnpin(msg.id)}
    >
      ✕ Unpin
    </button>
  </div>
);

const PollWidget = ({ poll, onVote }) => {
  // Support two shapes:
  // - local: { id, question, options: [text], votes: [numbers] }
  // - from server: { pollId, pollOptions: [{id, optionText, voteCount}] }
  const serverOptions = poll.pollOptions;
  return (
    <div className="bg-white border-l-4 border-blue-500 px-4 py-3 my-3 rounded-xl shadow">
      <div className="font-semibold text-blue-800 mb-2">{poll.question || poll.content}</div>
      <div className="flex flex-col gap-2">
        {serverOptions
          ? serverOptions.map((opt) => (
              <button
                key={opt.id}
                className="flex items-center justify-between w-full px-3 py-2 rounded bg-gray-50 hover:bg-gray-100"
                onClick={() => onVote(poll.pollId || poll.id, opt.id)}
              >
                <span className="text-left">{opt.optionText}</span>
                <span className="text-sm text-gray-600">{opt.voteCount || 0}</span>
              </button>
            ))
          : (poll.options || []).map((opt, idx) => (
              <button
                key={(poll.id || poll.pollId) + "-" + idx}
                className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-medium hover:bg-blue-200 transition shadow-sm"
                onClick={() => onVote(poll.id, idx)}
              >
                {opt} ({(poll.votes && poll.votes[idx]) || 0})
              </button>
            ))}
      </div>
    </div>
  );
};

// ----- MAIN COMPONENT -----
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

  const messagesEndRef = useRef(null);
  const isAdmin = userRole === "admin";
  const canPinMessage = (message) =>
    isAdmin || message.senderId === currentUser?.id;
  const canDeleteMessage = (message) => message.senderId === currentUser?.id;

  // helpers
  const decodeUnified = (unified) => {
    try {
      return unified
        .split("-")
        .map((u) => String.fromCodePoint(parseInt(u, 16)))
        .join("");
    } catch {
      return "";
    }
  };

  const normalizeMessage = (m) => ({
    id: m.id ?? m.messageId ?? Date.now(),
    content: m.content ?? m.message ?? m.text ?? "",
    senderId: m.senderId ?? m.userId ?? m.from ?? null,
    senderName: m.senderName ?? m.user ?? m.fromName ?? "Unknown",
    timestamp: m.timestamp ?? m.createdAt ?? Date.now(),
    type: m.messageType ?? m.type ?? (m.fileName ? "file" : "TEXT"),
    // support reply info from backend (replyToMessageId / replyToContent / replyToSenderName)
    replyTo: m.replyTo
      ? {
          messageId: m.replyTo.messageId ?? m.replyTo.id,
          senderName: m.replyTo.senderName ?? m.replyTo.user ?? "Unknown",
          content: m.replyTo.content ?? m.replyTo.message ?? "",
        }
      : m.replyToMessageId
      ? {
          messageId: m.replyToMessageId,
          senderName: m.replyToSenderName ?? "Unknown",
          content: m.replyToContent ?? "",
        }
      : null,
    reactions: Array.isArray(m.reactions)
      ? m.reactions
      : Object.entries(m.reactions || {}).map(([emoji, users]) => ({
          emoji,
          users,
        })),
    fileName: m.fileName || "",
    fileSize: m.fileSize || "",
    // poll support - accept multiple server shapes
    pollId: m.pollId ?? m.poll?.id ?? null,
    // server may send poll options as `pollOptions`, or nested under `poll.options` or `poll.pollOptions`
    pollOptions:
      m.pollOptions ?? m.poll?.pollOptions ?? m.poll?.options ?? null,
  });

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const loadMessageHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:8145/api/groups/${groupId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          const normalized = Array.isArray(data) ? data.map(normalizeMessage) : [];
          // Merge history with any messages already received via websocket to avoid
          // losing broadcasts that arrived between subscribe() and history fetch.
          setMessages((prev) => {
            const map = new Map();
            // include previous (real-time) messages first
            for (const m of prev) {
              if (m && (m.id ?? m.messageId)) map.set(m.id ?? m.messageId, m);
            }
            // then include history (overwrite/ensure canonical data from server)
            for (const h of normalized) {
              if (h && (h.id ?? h.messageId)) map.set(h.id ?? h.messageId, h);
            }
            // produce array sorted by timestamp so chat order is correct
            const merged = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            return merged;
          });
        }
      } catch (error) {
        // ignore for now
      }
    };

    let stomp = null;
    const connectWebSocket = () => {
      try {
        const socket = new SockJS("http://localhost:8145/ws");
        stomp = Stomp.over(() => socket);
        stomp.debug = () => {};
        stomp.connect(
          { Authorization: `Bearer ${token}` },
          () => {
            setConnectionError(null);
            setStompClient(stomp);
            stomp.subscribe(`/topic/group/${groupId}`, (message) => {
              try {
                const receivedMessage = JSON.parse(message.body);
                    // handle poll vote update events
                    if (receivedMessage && receivedMessage.messageType === "POLL_VOTE") {
                      const pv = receivedMessage; // { pollId, optionId, voteCount }
                      setMessages((prev) =>
                        prev.map((m) => {
                          if (m.pollId && m.pollId === pv.pollId) {
                            const newOptions = (m.pollOptions || []).map((o) =>
                              o.id === pv.optionId ? { ...o, voteCount: pv.voteCount } : o
                            );
                            return { ...m, pollOptions: newOptions };
                          }
                          return m;
                        })
                      );
                      return;
                    }

                    const messageData = normalizeMessage(receivedMessage);
                    setMessages((prevMessages) => [...prevMessages, messageData]);
              } catch {
                // ignore
              }
            });
            loadMessageHistory();
          },
          () => setTimeout(connectWebSocket, 5000)
        );
      } catch {
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (stomp) {
        try {
          stomp.disconnect(() => setStompClient(null));
        } catch {}
      }
    };
  }, [groupId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pinned]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setUploadFile(e.target.files[0]);
  };

  const handleSendFile = async () => {
    if (!uploadFile) return;

    // local UI preview
    const fileMessage = {
      id: Date.now(),
      senderName: currentUser?.name || "You",
      senderId: currentUser?.id || "You",
      type: "file",
      fileName: uploadFile.name,
      fileSize: `${(uploadFile.size / 1024).toFixed(2)} KB`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, fileMessage]);
    setUploadFile(null);

    // OPTIONAL: implement actual upload to backend here if you want
    // const token = sessionStorage.getItem("token");
    // const form = new FormData();
    // form.append("file", uploadFile);
    // try {
    //   await fetch(`http://localhost:8145/api/groups/${groupId}/files`, {
    //     method: "POST",
    //     body: form,
    //     headers: { Authorization: `Bearer ${token}` },
    //   });
    // } catch (err) {}
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !stompClient) return;
    if (!currentUser || !currentUser.id) {
      setConnectionError("You must be signed in to send messages.");
      return;
    }
    const token = sessionStorage.getItem("token");
    const messageData = {
      groupId,
      senderId: currentUser.id,
      senderName: currentUser.name || "Unknown",
      content: input,
      messageType: "TEXT",
      // backend expects replyToMessageId for persistence
      replyToMessageId: replyTo ? replyTo.id : null,
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
      setConnectionError("Failed to send message. Please try again.");
    }
  };

  const handlePin = (id) => {
    const msgToPin = messages.find((m) => m.id === id);
    if (msgToPin && !pinned.find((m) => m.id === id)) {
      setPinned((prev) => [msgToPin, ...prev]);
    }
  };
  const handleUnpin = (id) =>
    setPinned((prev) => prev.filter((m) => m.id !== id));
  const handleDelete = (id) =>
    (async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(
          `http://localhost:8145/api/groups/${groupId}/messages/${id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== id));
        } else {
          console.error("Failed to delete message", await res.text());
        }
      } catch (err) {
        console.error(err);
      }
    })();
  const handleReply = (msg) => {
    setReplyTo({
      id: msg.id,
      user: msg.senderName || "Unknown",
      message: msg.content || msg.message,
      originalMessage: msg,
    });
  };

  const scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth" });
      messageElement.classList.add("bg-yellow-100");
      setTimeout(() => messageElement.classList.remove("bg-yellow-100"), 2000);
    }
  };

  const getIsMatch = (msg) => {
    if (!search) return false;
    const s = search.toLowerCase();
    return (
      msg.content?.toLowerCase().includes(s) ||
      msg.senderName?.toLowerCase().includes(s)
    );
  };

  // EMOJI + REACTION logic
  const [openReactionPickerFor, setOpenReactionPickerFor] = useState(null);
  const commonEmojis = ["👍", "❤️", "😂", "🎉", "😮", "😢", "👏"];
  const toggleReactionPicker = (messageId) =>
    setOpenReactionPickerFor((prev) => (prev === messageId ? null : messageId));

  const handleToggleReaction = async (messageId, emoji) => {
    if (!currentUser) return;
    const token = sessionStorage.getItem("token");
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = Array.isArray(m.reactions) ? [...m.reactions] : [];
        const idx = existing.findIndex((r) => r.emoji === emoji);
        if (idx === -1) {
          existing.push({ emoji, users: [currentUser.name || currentUser.id] });
        } else {
          const users = existing[idx].users || [];
          const has = users.includes(currentUser.name || currentUser.id);
          existing[idx].users = has
            ? users.filter((u) => u !== (currentUser.name || currentUser.id))
            : [...users, currentUser.name || currentUser.id];
          if (existing[idx].users.length === 0) existing.splice(idx, 1);
        }
        return { ...m, reactions: existing };
      })
    );

    try {
      const res = await fetch(
        `http://localhost:8145/api/messages/${messageId}/reactions/${encodeURIComponent(
          emoji
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        // revert on failure or call DELETE to cleanup (best-effort)
        await fetch(
          `http://localhost:8145/api/messages/${messageId}/reactions/${encodeURIComponent(
            emoji
          )}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    } catch (err) {
      // ignore network errors
    }
  };

  const handleEmojiClick = (emojiObj, event) => {
    // emoji-picker-react may pass different shapes; accept both
    let ch = "";
    if (!emojiObj) return;
    if (typeof emojiObj === "string") ch = emojiObj;
    else
      ch =
        emojiObj.emoji ??
        emojiObj.native ??
        (emojiObj.unified ? decodeUnified(emojiObj.unified) : "");
    setInput((prev) => prev + ch);
  };

  // Poll functions
  const handleCreatePoll = (question, optionsArr) => {
    (async () => {
      try {
        const token = sessionStorage.getItem("token");
        const body = {
          creatorId: currentUser?.id,
          question,
          options: optionsArr,
        };
        const res = await fetch(`http://localhost:8145/api/groups/${groupId}/polls`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          // server will broadcast poll to group via websocket; just close form locally
          setShowPollForm(false);
        } else {
          console.error("Failed to create poll", await res.text());
        }
      } catch (err) {
        console.error(err);
      }
    })();
  };

  const handleVote = (pollId, optionIdx) => {
    (async () => {
      try {
        const token = sessionStorage.getItem("token");
        // optionIdx may be an index or an optionId depending on caller; if optionIdx is numeric > 0 and pollId refers to poll, we need optionId
        // In our polling UI we call handleVote(pollId, optionId)
        const optionId = optionIdx;
        const res = await fetch(`http://localhost:8145/api/groups/polls/${pollId}/options/${optionId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ voterId: currentUser?.id }),
        });
        if (res.ok) {
          const updated = await res.json();
          // Update local messages to reflect new vote count
          setMessages((prev) =>
            prev.map((m) => {
              if (m.pollId && m.pollId === pollId) {
                const newOptions = (m.pollOptions || []).map((o) => (o.id === updated.id ? { ...o, voteCount: updated.voteCount } : o));
                return { ...m, pollOptions: newOptions };
              }
              return m;
            })
          );
        } else {
          console.error("Failed to vote", await res.text());
        }
      } catch (err) {
        console.error(err);
      }
    })();
  };

  const formatTimestamp = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return "";
    }
  };

  const getDayLabel = (dateObj) => {
    const today = new Date();
    const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diff = Math.round((t - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return dateObj.toLocaleDateString();
  };

  // ------ UI -------
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div
        className="flex-none bg-white px-6 py-5 flex items-center border-b border-gray-200"
        style={{ minHeight: 72 }}
      >
        <h2 className="text-2xl font-bold text-gray-800 mr-auto flex items-center gap-2">
          💬 Group Chat
        </h2>
        <input
          type="text"
          placeholder="🔍 Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-base rounded-lg border border-gray-300 bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64 shadow-sm"
        />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="mx-6 mt-2 mb-2 relative z-30">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* File preview */}
      {uploadFile && (
        <div className="mx-6 mb-2 flex items-center gap-2 bg-blue-50 rounded px-2 py-1 text-blue-800">
          <span>{uploadFile.name}</span>
          <span className="text-xs text-gray-400">
            ({(uploadFile.size / 1024).toFixed(2)} KB)
          </span>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            onClick={handleSendFile}
          >
            Send file
          </button>
        </div>
      )}

      {/* Poll Form */}
      {showPollForm && <PollForm onCreate={handleCreatePoll} />}

      {/* Pinned Messages */}
      {pinned.length > 0 && (
        <div className="mx-6 mt-2">
          <div className="text-xs font-bold text-blue-700 mb-1">📌 Pinned</div>
          {pinned.map((msg) => (
            <PinnedMessage key={msg.id} msg={msg} onUnpin={handleUnpin} />
          ))}
        </div>
      )}

      {/* Polls */}
      {polls.length > 0 && (
        <div className="mx-6 mt-2">
          {polls.map((p) => (
            <PollWidget key={p.id} poll={p} onVote={handleVote} />
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-center text-gray-400 italic text-xl">
                No messages yet 💭
              </p>
            </div>
          ) : (
            (() => {
              const elems = [];
              let lastDay = null;
              for (let idx = 0; idx < messages.length; idx++) {
                const chat = messages[idx];
                const msgDate = new Date(chat.timestamp);
                const dayKey = msgDate.toDateString();
                if (dayKey !== lastDay) {
                  lastDay = dayKey;
                  elems.push(
                    <div
                      key={`sep-${dayKey}`}
                      className="text-center text-xs text-gray-400 my-3"
                    >
                      {getDayLabel(msgDate)}
                    </div>
                  );
                }

                const isOwn = chat.senderId === currentUser?.id;
                const matched = getIsMatch(chat);
                const isPinned = !!pinned.find((m) => m.id === chat.id);

                elems.push(
                  <div
                    key={chat.id + "-" + idx}
                    id={`message-${chat.id}`}
                    className={`relative flex items-center group ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-xl shadow-md px-4 py-3 min-w-[80px] break-words transition
                      ${
                        isPinned
                          ? "bg-blue-100 border-l-4 border-blue-500 text-gray-800"
                          : isOwn
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-800 border"
                      }
                      ${matched ? "ring-4 ring-blue-400 border-blue-500" : ""}
                    `}
                      style={{ maxWidth: 340 }}
                    >
                      {!isOwn && !isPinned && (
                        <span className="block text-xs font-bold text-blue-700 mb-1">
                          {chat.senderName || "Unknown"}
                        </span>
                      )}

                      {chat.replyTo && (
                        <div
                          className={`text-xs rounded p-2 mb-2 cursor-pointer ${
                            isOwn
                              ? "bg-white/20 hover:bg-white/30"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                          onClick={() => scrollToMessage(chat.replyTo.messageId)}
                        >
                          <span
                            className={`font-medium ${
                              isOwn ? "text-white" : "text-blue-800"
                            }`}
                          >
                            {chat.replyTo.senderName}
                          </span>
                          <div
                            className={`truncate ${
                              isOwn ? "text-gray-200" : "text-gray-700"
                            }`}
                          >
                            {chat.replyTo.content}
                          </div>
                        </div>
                      )}

                      <div className="text-base">{chat.content}</div>

                      <div
                        className={`text-[0.8em] mt-1 ${
                          isOwn ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {formatTimestamp(chat.timestamp)}
                      </div>
                    </div>

                    <div
                      className={`
                      absolute ${
                        isOwn ? "right-full mr-2" : "left-full ml-2"
                      } top-1/2 -translate-y-1/2
                      flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      flex-row bg-white rounded-xl shadow border border-gray-200
                    `}
                    >
                      <button
                        className="p-2 hover:bg-gray-100 rounded-xl"
                        onClick={() => handleReply(chat)}
                        title="Reply"
                      >
                        <IconReply className="w-5 h-5 text-gray-500" />
                      </button>
                      {canPinMessage(chat) && (
                        <button
                          className="p-2 hover:bg-blue-50 rounded-xl"
                          onClick={() => handlePin(chat.id)}
                          title="Pin"
                        >
                          <IconPin className="w-5 h-5 text-blue-500" />
                        </button>
                      )}
                      {canDeleteMessage(chat) && (
                        <button
                          className="p-2 hover:bg-red-50 rounded-xl"
                          onClick={() => handleDelete(chat.id)}
                          title="Delete"
                        >
                          <IconTrash className="w-5 h-5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              return elems;
            })()
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Bar */}
      {replyTo && (
        <div className="mx-6 mb-2 p-2 bg-blue-50 rounded flex items-center justify-between text-sm">
          <span>
            Replying to{" "}
            <strong className="text-blue-700">{replyTo.user}</strong>:{" "}
            <span className="text-gray-700">{replyTo.message}</span>
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-xs p-1 text-blue-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex-none bg-white border-t border-gray-200 px-6 py-4">
        <form className="flex gap-2 items-center" onSubmit={handleSend}>
          {/* moved buttons */}
          <label className="p-2 cursor-pointer text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100">
            <IconClip />
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
            onClick={() => setShowPollForm((v) => !v)}
            title="Create Poll"
          >
            <IconPoll />
          </button>

          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="button"
            className="p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-gray-100 flex items-center"
            onClick={() => setShowEmoji((v) => !v)}
            aria-label="Open emoji picker"
          >
            <IconEmoji />
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            <IconSend />
            <span className="ml-2 hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

function PollForm({ onCreate }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const addOption = () => setOptions((prev) => [...prev, ""]);
  const updateOption = (i, val) =>
    setOptions((opts) => opts.map((opt, idx) => (idx === i ? val : opt)));
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
    <form
      className="bg-gray-100 p-3 rounded mb-3 mx-6 border border-gray-200"
      onSubmit={submitPoll}
    >
      <input
        type="text"
        placeholder="Poll Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full mb-2 px-2 py-1 border border-gray-300 rounded"
      />
      {options.map((opt, i) => (
        <input
          key={i}
          type="text"
          placeholder={`Option ${i + 1}`}
          className="w-full mb-1 px-2 py-1 border border-gray-300 rounded"
          value={opt}
          onChange={(e) => updateOption(i, e.target.value)}
        />
      ))}
      <button
        type="button"
        className="text-blue-600 mt-1 mb-1 text-sm font-medium"
        onClick={addOption}
      >
        + Add Option
      </button>
      <button
        type="submit"
        className="block mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Create Poll
      </button>
    </form>
  );
}

export default GroupChat;
