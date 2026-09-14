import { validateRepositoryUrl } from "../validators/repositoryValidator.js";
import { createRepository } from "../services/repositoryService.js";

export async function createRepositoryController(req, res) {
  const { url } = req.body;

  const validationError = validateRepositoryUrl(url);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  try {
    const repository = await createRepository(url);

    return res.status(201).json({
      success: true,
      data: repository,
    });
  } catch (error) {
    console.error("Create repository error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Repository already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create repository.",
    });
  }
}
