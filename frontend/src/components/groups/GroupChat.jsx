import React, { useState, useRef, useEffect } from "react";
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

const GroupChat = ({ chatMessages = [] }) => {
  const [messages, setMessages] = useState(chatMessages);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [polls, setPolls] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

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
    if (!input.trim()) return;
    setMessages([
      ...messages,
      {
        id: Date.now(),
        user: "You",
        message: input,
        replyTo: replyTo,
      },
    ]);
    setInput("");
    setReplyTo(null);
    setShowEmoji(false);
  };

  const handlePin = (id) => {
    const msgToPin = messages.find((m) => m.id === id);
    if (msgToPin && !pinned.find((m) => m.id === id)) {
      setPinned([msgToPin, ...pinned]);
    }
  };

  const handleUnpin = (id) => setPinned(pinned.filter((m) => m.id !== id));
  const handleDelete = (id) => setMessages(messages.filter((m) => m.id !== id));
  const handleReply = (msg) => setReplyTo(msg);

  const filteredMessages = search
    ? messages.filter(
        (m) =>
          m.message?.toLowerCase().includes(search.toLowerCase()) ||
          m.user?.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  const handleEmojiClick = (emojiObj) => setInput(input + emojiObj.emoji);

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
          filteredMessages.map((chat) => (
            <div
              key={chat.id}
              className="p-3 bg-white shadow-sm rounded-lg max-w-[80%] border border-gray-200 flex flex-col relative group"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-700 text-sm">
                  {chat.user}:
                  {chat.type === "file" ? (
                    <span className="ml-1 text-xs text-gray-600">(file)</span>
                  ) : null}
                </span>
                <button
                  className="ml-2 p-1 text-blue-500 hover:text-blue-700"
                  onClick={() => handleReply(chat)}
                >
                  <IconReply />
                </button>
                <button
                  className="ml-1 p-1 text-yellow-600 hover:text-yellow-800"
                  onClick={() => handlePin(chat.id)}
                >
                  <IconPin />
                </button>
                <button
                  className="ml-1 p-1 text-red-600 hover:text-red-800"
                  onClick={() => handleDelete(chat.id)}
                >
                  <IconTrash />
                </button>
              </div>
              {chat.replyTo && (
                <div className="ml-3 pl-2 border-l-2 border-gray-300 text-xs text-gray-600 mb-1">
                  Reply to <strong>{chat.replyTo.user}</strong>:{" "}
                  {chat.replyTo.message}
                </div>
              )}
              <span className="text-gray-800">
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
                  chat.message
                )}
              </span>
            </div>
          ))
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
