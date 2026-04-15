import "express-session";

declare module "express-session" {
  interface SessionData {
    adminLoggedIn?: boolean;
    pendingNewKey?: string;
  }
}
