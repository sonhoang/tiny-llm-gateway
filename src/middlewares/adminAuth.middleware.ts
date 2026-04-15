import { Request, Response, NextFunction } from "express";

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.session.adminLoggedIn) {
    next();
    return;
  }
  res.redirect("/admin/login");
}
