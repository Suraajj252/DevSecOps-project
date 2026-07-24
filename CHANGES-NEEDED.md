# Places YOU must edit before this works

Everything else in this repo is finished and correct. These are the only spots
that need your own values — search-and-replace or edit these exact locations.

## 1. `.env` (local dev / manual testing only)
Currently has placeholder `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` for both keys.
```
VITE_APP_TRAKT_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX   ← your real Trakt Client ID
VITE_APP_OMDB_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX      ← your real OMDb key
```
Get them here (also explained in `.env.example`):
- Trakt: https://trakt.tv → sign up → https://trakt.tv/oauth/applications → New Application → copy Client ID
- OMDb: https://www.omdbapi.com/apikey.aspx → free tier → verify email → copy key

**Note:** `.env` is only used if you run the app locally with `npm run dev`. The Jenkins
pipeline does NOT read this file — it uses Jenkins credentials instead (see #3 below).

## 2. `Jenkinsfile` — one line
```groovy
git branch: 'main', url: 'https://github.com/Suraajj252/DevSecOps-project.git'
```
This already points at your repo. Only change it if you fork/rename the repository.

```groovy
to: 'your-email@example.com',
```
Near the bottom, in the `post { always { emailext ... } }` block — replace with your
real email address to receive build notifications.

## 3. Jenkins UI — credentials (not a file, but required, so listing here)
Manage Jenkins → Credentials → (global) → Add Credentials — create these exactly:

| Kind | ID (must match exactly) | Value |
|---|---|---|
| Secret text | `trakt-client-id` | your Trakt Client ID |
| Secret text | `omdb-api-key` | your OMDb API key |
| Secret text | `Sonar-token` | token generated inside SonarQube (My Account → Security → Generate Tokens) |
| Secret file | `k8s` | contents of `/etc/rancher/k3s/k3s.yaml` from your EC2 box, after installing k3s |

## 4. Jenkins UI — Tools config (not a file)
Manage Jenkins → Tools — these exact names, or the pipeline fails on step 1:
- JDK → name: `jdk21`
- NodeJS → name: `node24`
- SonarQube Scanner → name: `sonar-scanner`
- Dependency-Check → name: `DP-Check`

## 5. Jenkins UI — SonarQube server config (not a file, separate from #4)
Manage Jenkins → System → SonarQube servers → Add SonarQube:
- Name: `sonar-server`
- Server URL: `http://localhost:9000` (or your SonarQube box's address if different)
- Token: select the `Sonar-token` credential from #3

## What you do NOT need to touch
- `Kubernetes/deployment.yml` and `service.yml` — already correct (local image, NodePort, no registry)
- `Dockerfile` — already correct, takes the two API keys as build args
- `.dockerignore`, `.gitignore` — unchanged, fine as-is
- `vercel.json` — already configured for SPA routing if you deploy the frontend separately to Vercel
