import { getRepositoryFiles } from "../service/repositoryFileService.js";

export async function getRepositoryFilesController(req, res) {
  try {
    const { repositoryId } = req.params;

    const files = await getRepositoryFiles(repositoryId);

    return res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error("Failed to get repository files:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get repository files",
    });
  }
}
