import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getRepositoryFiles } from "../service/Repo_Show/repositoryApi";
import {
  createConversation,
  getConversationMessages,
  sendMessage,
} from "../service/chatService/chatService.js";

import "./Workspace.css";

function buildTree(files) {
  const root = {};

  for (const file of files) {
    const parts = file.relative_path.split("/");
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;

      if (!current[part]) {
        current[part] = isFile ? file : {};
      }

      if (!isFile) {
        current = current[part];
      }
    });
  }

  return root;
}

function FileTree({ tree, level = 0, onFileClick, selectedFile }) {
  return (
    <>
      {Object.entries(tree).map(([name, value]) => {
        const isFile = value && value.relative_path;

        if (isFile) {
          const isSelected = selectedFile?.file_id === value.file_id;

          return (
            <div
              key={value.file_id}
              className={`tree-item ${isSelected ? "selected" : ""}`}
              style={{
                paddingLeft: `${16 + level * 18}px`,
              }}
              onClick={() => onFileClick(value)}
            >
              <span className="tree-icon">📄</span>
              <span>{name}</span>
            </div>
          );
        }

        return (
          <div key={name}>
            <div
              className="tree-item folder"
              style={{
                paddingLeft: `${16 + level * 18}px`,
              }}
            >
              <span className="tree-icon">📁</span>
              <span>{name}</span>
            </div>

            <FileTree
              tree={value}
              level={level + 1}
              onFileClick={onFileClick}
              selectedFile={selectedFile}
            />
          </div>
        );
      })}
    </>
  );
}

function Workspace() {
  const { repositoryId } = useParams();

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ----------------------------------------
  // Chat state
  // ----------------------------------------

  const [conversationId, setConversationId] = useState(null);

  const [messages, setMessages] = useState([]);

  const [messageInput, setMessageInput] = useState("");

  const [chatLoading, setChatLoading] = useState(false);

  const [chatError, setChatError] = useState("");

  // ----------------------------------------
  // Load repository files
  // ----------------------------------------

  useEffect(() => {
    async function loadFiles() {
      try {
        setLoading(true);
        setError("");

        const data = await getRepositoryFiles(repositoryId);

        console.log("Fetched files:", data);

        setFiles(Array.isArray(data?.data) ? data.data : []);
      } catch (error) {
        console.error("Failed to load repository files:", error);

        setError("Failed to load repository files.");
      } finally {
        setLoading(false);
      }
    }

    if (repositoryId) {
      loadFiles();
    }
  }, [repositoryId]);

  // ----------------------------------------
  // Create / restore conversation
  // ----------------------------------------

  useEffect(() => {
    async function setupConversation() {
      if (!repositoryId) {
        return;
      }

      try {
        setChatError("");

        const storageKey = `conversation_${repositoryId}`;

        const savedConversationId = localStorage.getItem(storageKey);

        let activeConversationId = savedConversationId;

        // Existing conversation
        if (activeConversationId) {
          try {
            const response =
              await getConversationMessages(activeConversationId);

            setMessages(Array.isArray(response?.data) ? response.data : []);

            setConversationId(activeConversationId);

            return;
          } catch (error) {
            console.log("Saved conversation unavailable. Creating a new one.");

            localStorage.removeItem(storageKey);
            activeConversationId = null;
          }
        }

        // First conversation for this repository
        if (!activeConversationId) {
          const response = await createConversation({
            repositoryId,
            title: "Repository Chat",
          });

          activeConversationId = response?.data?.conversation_id;

          if (!activeConversationId) {
            throw new Error("Conversation ID was not returned.");
          }

          localStorage.setItem(storageKey, activeConversationId);

          setConversationId(activeConversationId);

          setMessages([]);
        }
      } catch (error) {
        console.error("Failed to setup conversation:", error);

        setChatError("Failed to start conversation.");
      }
    }

    setupConversation();
  }, [repositoryId]);

  // ----------------------------------------
  // Send message
  // ----------------------------------------

  async function handleSendMessage(event) {
    event.preventDefault();

    const content = messageInput.trim();

    if (!content || !conversationId) {
      return;
    }

    try {
      setChatLoading(true);
      setChatError("");

      const response = await sendMessage({
        conversationId,
        content,
      });

      const userMessage = response?.data?.userMessage;

      const assistantMessage = response?.data?.assistantMessage;

      if (userMessage) {
        setMessages((current) => [...current, userMessage]);
      }

      if (assistantMessage) {
        setMessages((current) => [...current, assistantMessage]);
      }

      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);

      setChatError(error.message || "Failed to send message.");
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return <div className="workspace-state">Loading repository...</div>;
  }

  if (error) {
    return <div className="workspace-state workspace-error">{error}</div>;
  }

  const tree = buildTree(files);

  return (
    <section className="workspace">
      {/* Header */}

      <header className="workspace-header">
        <div>
          <h1>Repository Workspace</h1>

          <p>Repository ID: {repositoryId}</p>
        </div>

        <div className="workspace-status">Ready</div>
      </header>

      {/* Main */}

      <div className="workspace-body">
        {/* Left Sidebar */}

        <aside className="file-sidebar">
          <div className="sidebar-title">Files</div>

          <div className="file-count">{files.length} files</div>

          <div className="file-tree">
            <FileTree
              tree={tree}
              onFileClick={setSelectedFile}
              selectedFile={selectedFile}
            />
          </div>
        </aside>

        {/* Right Side */}

        <main className="workspace-content">
          {/* File information */}

          <div className="workspace-file-area">
            {!selectedFile ? (
              <div className="empty-workspace">
                <div className="empty-icon">⌘</div>

                <h2>Select a file</h2>

                <p>
                  Select a file from the workspace to inspect its information.
                </p>
              </div>
            ) : (
              <div className="file-details">
                <div className="file-details-header">
                  <div>
                    <h2>{selectedFile.file_name}</h2>

                    <p>{selectedFile.relative_path}</p>
                  </div>
                </div>

                <div className="file-meta">
                  <div className="meta-item">
                    <span>Type</span>
                    <strong>{selectedFile.file_type}</strong>
                  </div>

                  <div className="meta-item">
                    <span>Language</span>
                    <strong>{selectedFile.language || "—"}</strong>
                  </div>

                  <div className="meta-item">
                    <span>Extension</span>
                    <strong>{selectedFile.extension || "—"}</strong>
                  </div>

                  <div className="meta-item">
                    <span>Size</span>
                    <strong>{selectedFile.size_bytes} bytes</strong>
                  </div>

                  <div className="meta-item">
                    <span>Lines</span>
                    <strong>{selectedFile.line_count ?? "—"}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Basic Chat */}

          <div className="basic-chat">
            <div className="basic-chat-header">
              <h2>Repository Chat</h2>

              {conversationId && <span>Connected</span>}
            </div>

            <div className="basic-chat-messages">
              {messages.length === 0 ? (
                <div className="basic-chat-empty">
                  Ask something about this repository.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.message_id}
                    className={`chat-message ${message.role}`}
                  >
                    <strong>{message.role === "user" ? "You" : "AI"}</strong>

                    <p>{message.content}</p>
                  </div>
                ))
              )}
            </div>

            {chatError && <div className="basic-chat-error">{chatError}</div>}

            <form className="basic-chat-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Ask something..."
                disabled={chatLoading}
              />

              <button
                type="submit"
                disabled={
                  chatLoading || !messageInput.trim() || !conversationId
                }
              >
                {chatLoading ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </section>
  );
}

export default Workspace;
