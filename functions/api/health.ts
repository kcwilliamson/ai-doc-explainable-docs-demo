interface Env {
  OPENAI_API_KEY?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return Response.json({
    ok: true,
    service: "ai-doc-explainable-demo",
    hasOpenAiKey: Boolean(env.OPENAI_API_KEY),
    timestamp: new Date().toISOString(),
  });
};
