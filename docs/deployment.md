# Production and deployment

Build with `npm run build` and run the framework-owned server with `npm start`. JST deliberately uses `react-router-serve`; it does not carry an Express wrapper or duplicate React Router SSR behavior.

The included multi-stage Dockerfile installs from the lockfile, builds once, runs as a non-root user, exposes port 3000, and checks the public root route. Configure platform secrets outside the image. Terminate TLS and add infrastructure-specific logging, tracing, rate limits, and health aggregation at the deployment boundary when the product needs them.

JST does not prescribe a hosting vendor. Any platform that can run the Node 24 production command or the provided container is suitable.
