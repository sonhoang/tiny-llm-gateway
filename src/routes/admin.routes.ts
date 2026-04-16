import { Router } from "express";
import {
  loginPage,
  loginSubmit,
  logout,
  dashboard,
  apiCreateKey,
  apiRevokeKey,
  logsPage,
  apiCallLogsJson
} from "../controllers/admin.controller";
import {
  providersPage,
  providersAdd,
  providersUpdateMeta,
  providersToggle,
  providersPriority,
  providersDelete,
  providersReactivate,
  providersRotateKey
} from "../controllers/adminProviders.controller";
import { chatPage, chatTestApi } from "../controllers/adminChat.controller";
import { adminAuthMiddleware } from "../middlewares/adminAuth.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/login", loginPage);
router.post("/login", loginSubmit);
router.get("/logout", logout);

router.get("/", adminAuthMiddleware, dashboard);
router.get("/logs", adminAuthMiddleware, logsPage);
router.get("/api/call-logs", adminAuthMiddleware, apiCallLogsJson);
router.post("/keys/create", adminAuthMiddleware, apiCreateKey);
router.post("/keys/revoke", adminAuthMiddleware, apiRevokeKey);

router.get("/providers", adminAuthMiddleware, providersPage);
router.post("/providers/add", adminAuthMiddleware, providersAdd);
router.post("/providers/update-meta", adminAuthMiddleware, providersUpdateMeta);
router.post("/providers/toggle", adminAuthMiddleware, providersToggle);
router.post("/providers/priority", adminAuthMiddleware, providersPriority);
router.post("/providers/delete", adminAuthMiddleware, providersDelete);
router.post("/providers/reactivate", adminAuthMiddleware, providersReactivate);
router.post("/providers/rotate-key", adminAuthMiddleware, providersRotateKey);

router.get("/chat", adminAuthMiddleware, chatPage);
router.post("/api/chat-test", adminAuthMiddleware, authMiddleware, chatTestApi);

export default router;
