import app from "./server/app.js";

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 4173);
  app.listen(port, () => console.log(`Jyotish server listening on http://localhost:${port}`));
}
