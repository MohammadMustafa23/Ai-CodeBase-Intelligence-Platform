import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getRepositoryFiles } from "../service/Repo_Show/repositoryApi";
import "./Workspace.css";

function Workspace() {
  const { repositoryId } = useParams();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFiles() {
      try {
        setLoading(true);
        setError("");

        const data = await getRepositoryFiles(repositoryId);

        setFiles(data);
      } catch (error) {
        console.error(error);
        setError("Failed to load repository files.");
      } finally {
        setLoading(false);
      }
    }

    loadFiles();
  }, [repositoryId]);

  if (loading) {
    return <div>Loading repository...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const filePaths = files.map((file) => file.relative_path);

  // Your existing buildTree() and FileTree() logic
  // should now use filePaths.

  return <section className="workspace">{/* existing workspace UI */}</section>;
}

export default Workspace;
