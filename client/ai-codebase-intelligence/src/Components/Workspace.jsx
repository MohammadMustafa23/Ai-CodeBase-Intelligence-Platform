import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getRepositoryFiles } from "../service/Repo_Show/repositoryApi";
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

  useEffect(() => {
    async function loadFiles() {
      try {
        setLoading(true);
        setError("");

        const data = await getRepositoryFiles(repositoryId);

        console.log("Fetched files:", data);

        setFiles(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        console.error("Failed to load repository files:", error);

        setError("Failed to load repository files.");
      } finally {
        setLoading(false);
      }
    }

    loadFiles();
  }, [repositoryId]);

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
        </main>
      </div>
    </section>
  );
}

export default Workspace;
