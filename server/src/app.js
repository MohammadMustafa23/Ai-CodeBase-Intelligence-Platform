import express from "express";
import cors from "cors";
import repositoryRoutes from "./Feature/linkGeting/routes/repository.Routes.js";
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

app.use("/api/repositories", repositoryRoutes);

export default app;
