import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI API Key not configured" }, { status: 500 });
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
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://taskmatrix.prodesk.in", // Optional, for OpenRouter tracking
        "X-Title": "TaskMatrix", // Optional
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [


          { role: "system", content: "You are a helpful assistant that returns only JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenRouter Error:", data);
      return NextResponse.json({ error: "Failed to generate subtasks" }, { status: response.status });
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Unexpected response structure:", data);
      return NextResponse.json({ error: "Unexpected response from AI" }, { status: 500 });
    }

    const content = data.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch (parseError) {
      // Fallback if AI didn't return perfect JSON despite prompt
      console.error("JSON Parse Error:", content);
      return NextResponse.json({ error: "AI returned invalid format" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
