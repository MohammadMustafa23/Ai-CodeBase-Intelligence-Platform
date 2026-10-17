export function validateRepositoryUrl(req, res, next) {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      message: "Repository URL is required.",
    });
  }

  const value = url.trim();

  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol !== "https:") {
      return res.status(400).json({
        success: false,
        message: "Repository URL must use HTTPS.",
      });
    }

    if (parsedUrl.hostname.toLowerCase() !== "github.com") {
      return res.status(400).json({
        success: false,
        message: "Only GitHub repositories are supported.",
      });
    }

    const parts = parsedUrl.pathname.split("/").filter(Boolean);

    if (parts.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Invalid GitHub repository URL.",
      });
    }

    const [owner, repositoryNameWithGit] = parts;

    const repositoryName = repositoryNameWithGit.replace(/\.git$/, "");

    if (!owner || !repositoryName) {
      return res.status(400).json({
        success: false,
        message: "Invalid GitHub repository URL.",
      });
    }

    req.repository = {
      owner,
      repositoryName,
      githubUrl: `https://github.com/${owner}/${repositoryName}`,
    };

    next();
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid repository URL.",
    });
  }
}
