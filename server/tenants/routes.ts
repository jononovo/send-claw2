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

router.get("/heartbeat.md", (req: Request, res: Response) => {
  const tenant = getTenantFromHost(req.hostname || "");
  const heartbeatPath = path.join(TENANTS_DIR, tenant, "heartbeat.md");
  
  if (!fs.existsSync(heartbeatPath)) {
    res.status(404).type("text/plain").send(`heartbeat.md not found for tenant: ${tenant}`);
    return;
  }
  
  res.type("text/markdown").sendFile(heartbeatPath);
});

router.get("/skill.json", (req: Request, res: Response) => {
  const tenant = getTenantFromHost(req.hostname || "");
  const skillJsonPath = path.join(TENANTS_DIR, tenant, "skill.json");
  
  if (!fs.existsSync(skillJsonPath)) {
    res.status(404).type("text/plain").send(`skill.json not found for tenant: ${tenant}`);
    return;
  }
  
  res.type("application/json").sendFile(skillJsonPath);
});

export function registerTenantRoutes(app: Router): void {
  app.use(router);
}

export default router;
