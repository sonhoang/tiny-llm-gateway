import express from "express";
import session from "express-session";
import openaiRoutes from "./routes/openai.routes";
import adminRoutes from "./routes/admin.routes";
import { authMiddleware } from "./middlewares/auth.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { rateLimitMiddleware } from "./middlewares/rateLimit.middleware";

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "changeme",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }
  })
);

app.use("/admin", adminRoutes);

app.use("/v1", rateLimitMiddleware, authMiddleware, openaiRoutes);

app.use(errorMiddleware);

export default app;
