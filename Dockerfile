# ---- Stage 1: build the static React/Vite bundle -------------------------
FROM node:24-alpine as builder
WORKDIR /app

# Copy just the dependency manifests first so Docker can cache "yarn install"
# and skip re-running it on every code change (only re-runs if these 2 files change).
COPY ./package.json .
COPY ./yarn.lock .
RUN yarn install

# Now copy the rest of the application source code.
COPY . .

# --- Build-time secrets --------------------------------------------------
# The pipeline passes both API credentials in via --build-arg (see the
# Jenkinsfile / pipeline.txt "Docker Build & Push" stage). ARG makes them
# available DURING this build stage only; ENV then exposes them to the
# "yarn build" command below as VITE_APP_* variables, which is the naming
# convention Vite requires to inline a value into the client-side bundle.
#
#   Build command run by the pipeline:
#     docker build \
#       --build-arg VITE_APP_TRAKT_CLIENT_ID=<your-trakt-client-id> \
#       --build-arg VITE_APP_OMDB_API_KEY=<your-omdb-key> \
#       -t netflix .
ARG VITE_APP_TRAKT_CLIENT_ID
ARG VITE_APP_OMDB_API_KEY
ENV VITE_APP_TRAKT_API_URL="https://api.trakt.tv"
ENV VITE_APP_TRAKT_CLIENT_ID=${VITE_APP_TRAKT_CLIENT_ID}
ENV VITE_APP_OMDB_API_URL="https://www.omdbapi.com"
ENV VITE_APP_OMDB_API_KEY=${VITE_APP_OMDB_API_KEY}

# Compile TypeScript and produce the optimized static build in /app/dist.
RUN yarn build

# ---- Stage 2: serve the static build with nginx --------------------------
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Clear out nginx's default sample site.
RUN rm -rf ./*

# Copy ONLY the compiled static files from the builder stage - keeps the
# final image small and free of source code / node_modules / build tools.
COPY --from=builder /app/dist .

# The container listens on port 80 internally. The pipeline maps this to
# host port 8081 (docker run -p 8081:80) and to Kubernetes NodePort 30007
# (see Kubernetes/service.yml), so this value must stay 80.
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
