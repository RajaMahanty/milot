import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const apiKey = config.ai.openRouterApiKey;
    if (!apiKey) {
      console.error("AI API Key is missing in configuration.");
      return NextResponse.json({ error: "AI service is currently unavailable" }, { status: 503 });
    }

    const prompt = `You are an expert project manager. Break down the following task into a list of concise, actionable sub-steps. 
Task Title: ${title}
Task Description: ${description || "No description provided"}

Respond ONLY with a valid JSON object matching this structure:
{
  "substeps": ["string", "string", "string"]
}
Include 3 to 5 sub-steps. Do not include markdown formatting or backticks.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://taskmatrix.prodesk.in",
        "X-Title": "TaskMatrix",
      },
      body: JSON.stringify({
        model: config.ai.defaultModel,
        messages: [
          { role: "system", content: "You are a helpful assistant that returns only JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`OpenRouter API error (${response.status}):`, errorData);
      return NextResponse.json({ error: "AI service error" }, { status: response.status });
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error("Malformed AI response:", data);
      return NextResponse.json({ error: "Invalid response from AI service" }, { status: 502 });
    }

    const content = data.choices[0].message.content;

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      return NextResponse.json({ error: "AI service returned incompatible format" }, { status: 502 });
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("AI request timed out");
      return NextResponse.json({ error: "AI request timed out" }, { status: 504 });
    }
    console.error("AI Route Exception:", error);
    return NextResponse.json({ error: "Internal server error in AI route" }, { status: 500 });
  }
}

