export function validateRepositoryUrl(url) {
  if (!url || typeof url !== "string") {
    return "Repository URL is required.";
  }

  const value = url.trim();

  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol !== "https:") {
      return "Repository URL must use HTTPS.";
    }

    if (parsedUrl.hostname !== "github.com") {
      return "Only GitHub repositories are supported.";
    }

    const parts = parsedUrl.pathname.split("/").filter(Boolean);

    if (parts.length !== 2) {
      return "Invalid GitHub repository URL.";
    }

    const [owner, repositoryName] = parts;

    if (!owner || !repositoryName) {
      return "Invalid GitHub repository URL.";
    }

    return null;
  } catch {
    return "Invalid repository URL.";
  }
}
