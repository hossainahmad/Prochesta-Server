import app from "./app";

const PORT = Number(process.env.PORT) || 3001;

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set in the environment");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`🚀ProChesta API listening on http://localhost:${PORT}`);
  console.log(
    `   Client origin allowed: ${process.env.CLIENT_URL ?? "http://localhost:3000"}`,
  );
});
export default app;
