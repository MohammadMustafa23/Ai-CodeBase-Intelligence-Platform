import { useState } from "react";
import { submitLink } from "../service/linkService.js";
import "./LinkInput.css";

function LinkInput() {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!link.trim()) {
      setError("Please paste a link.");
      return;
    }

    try {
      new URL(link);
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const result = await submitLink(link);
      console.log("Backend response:", result);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="link-input">
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          placeholder="Paste your link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={loading}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>

      {error && <p>{error}</p>}
    </div>
  );
}

export default LinkInput;
