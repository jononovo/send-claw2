import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { getTenantFromHost } from "./index";

const router = Router();

const TENANTS_DIR = path.join(process.cwd(), "client", "public", "tenants");

router.get("/skill.md", (req: Request, res: Response) => {
  const tenant = getTenantFromHost(req.hostname || "");
  const skillPath = path.join(TENANTS_DIR, tenant, "skill.md");
  
  if (!fs.existsSync(skillPath)) {
    res.status(404).type("text/plain").send(`skill.md not found for tenant: ${tenant}`);
    return;
  }
  
  res.type("text/markdown").sendFile(skillPath);
});

export function registerTenantRoutes(app: Router): void {
  app.use(router);
}

export default router;
