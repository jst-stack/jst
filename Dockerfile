FROM node:24.15.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/install-git-hooks.mjs ./scripts/install-git-hooks.mjs
RUN npm install --global npm@$(node -p "require('./package.json').packageManager.split('@')[1]") \
	&& npm ci
COPY . .
RUN npm run build

FROM node:24.15.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --global npm@$(node -p "require('./package.json').packageManager.split('@')[1]") \
	&& npm ci --omit=dev --ignore-scripts \
	&& npm cache clean --force
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["npm", "start"]
