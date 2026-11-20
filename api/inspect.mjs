import { handler as inspectHandler } from "../netlify/functions/inspect.mjs";

export default async function vercelInspect(req, res) {
  const body = typeof req.body === "string"
    ? req.body
    : JSON.stringify(req.body ?? {});

  const result = await inspectHandler({
    httpMethod: req.method,
    body
  });

  for (const [name, value] of Object.entries(result.headers ?? {})) {
    res.setHeader(name, value);
  }

  res.status(result.statusCode || 200).send(result.body || "");
}
