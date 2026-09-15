import { createRepository } from "../services/Create_Repo.js";
export async function createRepositoryController(req, res) {
  try {
    const { url } = req.body;

    const result = await createRepository(url);

    if (result.exists) {
      return res.status(409).json({
        success: false,
        message: result.message,
        data: result.repository,
      });
    }

    return res.status(201).json({
      success: true,
      data: result.repository,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}
