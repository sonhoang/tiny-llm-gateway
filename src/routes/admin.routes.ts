import { Router } from "express";
import {
  loginPage,
  loginSubmit,
  logout,
  dashboard,
  apiCreateKey,
  apiRevokeKey,
  logsPage
} from "../controllers/admin.controller";
import { adminAuthMiddleware } from "../middlewares/adminAuth.middleware";

const router = Router();

router.get("/login", loginPage);
router.post("/login", loginSubmit);
router.get("/logout", logout);

router.get("/", adminAuthMiddleware, dashboard);
router.get("/logs", adminAuthMiddleware, logsPage);
router.post("/keys/create", adminAuthMiddleware, apiCreateKey);
router.post("/keys/revoke", adminAuthMiddleware, apiRevokeKey);

export default router;
