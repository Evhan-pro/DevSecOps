/**
 * DevSecOps Test Dashboard
 * UI web pour lancer les tasks du Taskfile.yml et afficher les résultats.
 *
 * Lancement :
 *   node tools/test-dashboard/server.js
 * Puis :
 *   http://localhost:5050
 */

const express = require("express");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
app.use(express.json({ limit: "256kb" }));

// Servir l'UI
app.use("/", express.static(path.join(__dirname, "public")));

// ✅ Whitelist stricte : impossible d'exécuter des commandes arbitraires
const TASKS = [
  {
    id: "lint",
    label: "Lint (ESLint)",
    task: "lint",
    description: "Qualité code + règles",
    tags: ["quality"],
  },
  {
    id: "test",
    label: "Unit tests (Jest)",
    task: "test",
    description: "Tests unitaires + non-régression sécu",
    tags: ["tests", "security"],
  },
  {
    id: "secrets",
    label: "Secrets scan (TruffleHog)",
    task: "secrets",
    description: "Détection secrets / tokens",
    tags: ["security"],
  },
  {
    id: "sca",
    label: "SCA (Trivy FS)",
    task: "sca",
    description: "Dépendances + misconfig + secrets + vuln",
    tags: ["security"],
  },
  {
    id: "sast",
    label: "SAST (SonarQube)",
    task: "sast",
    description: "Analyse statique (nécessite SONAR_TOKEN)",
    tags: ["security", "quality"],
  },
  {
    id: "dast",
    label: "DAST (OWASP ZAP baseline)",
    task: "dast",
    description: "Scan dynamique (nécessite ENABLE_DAST=1)",
    tags: ["security"],
  },
  {
    id: "pre-commit",
    label: "Phase: pre-commit",
    task: "pre-commit",
    description: "Gate rapide avant commit",
    tags: ["pipeline"],
  },
  {
    id: "branch-feature",
    label: "Phase: branch-feature",
    task: "branch-feature",
    description: "Gate branche feature",
    tags: ["pipeline"],
  },
  {
    id: "pull-request",
    label: "Phase: pull-request",
    task: "pull-request",
    description: "Gate PR (quality + security)",
    tags: ["pipeline"],
  },
  {
    id: "staging",
    label: "Phase: staging",
    task: "staging",
    description: "Gate staging (inclut DAST si activé)",
    tags: ["pipeline"],
  },
  {
    id: "production",
    label: "Phase: production",
    task: "production",
    description: "Gate prod (safe)",
    tags: ["pipeline"],
  },
  {
    id: "nightly",
    label: "Phase: nightly",
    task: "nightly",
    description: "Scans lourds (SCA/DAST/SAST)",
    tags: ["pipeline"],
  },
];

let isRunning = false;

app.get("/api/tasks", (_req, res) => {
  res.json({
    ok: true,
    tasks: TASKS,
    meta: {
      cwd: process.cwd(),
      node: process.version,
    },
  });
});

app.post("/api/run", async (req, res) => {
  if (isRunning) {
    return res.status(409).json({
      ok: false,
      error: "Un test tourne déjà. Termine-le avant d'en relancer un autre.",
    });
  }

  const { id } = req.body || {};
  const entry = TASKS.find((t) => t.id === id);
  if (!entry) {
    return res.status(400).json({ ok: false, error: "Task inconnue." });
  }

  // Lancement task via go-task
  // Pas de shell, args contrôlés => pas d'injection
  const startedAt = Date.now();
  isRunning = true;

  const child = spawn("task", [entry.task], {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (buf) => (stdout += buf.toString("utf-8")));
  child.stderr.on("data", (buf) => (stderr += buf.toString("utf-8")));

  child.on("close", (code) => {
    isRunning = false;
    const endedAt = Date.now();
    const durationMs = endedAt - startedAt;

    res.json({
      ok: code === 0,
      id: entry.id,
      task: entry.task,
      label: entry.label,
      durationMs,
      exitCode: code,
      stdout,
      stderr,
    });
  });

  child.on("error", (err) => {
    isRunning = false;
    res.status(500).json({
      ok: false,
      error: "Impossible de lancer la commande `task` (go-task installé ?).",
      details: String(err?.message || err),
    });
  });
});

const PORT = Number(process.env.TEST_DASHBOARD_PORT || 5050);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✅ Test Dashboard prêt : http://localhost:${PORT}`);
});
