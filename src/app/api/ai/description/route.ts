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

    let prompt = "";
    if (description && description.trim().length > 0) {
      prompt = `You are an expert product manager. Refine the following task description to make it professional, clear, and well-formatted. 
Task Title: ${title}
Current Description: ${description}

Respond ONLY with a valid JSON object matching this structure:
{
  "description": "The refined description text here"
}
Do not include markdown formatting like backticks around the json.`;
    } else {
      prompt = `You are an expert product manager. Write a detailed, professional, and clear task description based on the title.
Task Title: ${title}

Respond ONLY with a valid JSON object matching this structure:
{
  "description": "The generated description text here"
}
Do not include markdown formatting like backticks around the json.`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://taskmatrix.prodesk.in", // Optional, for OpenRouter tracking
        "X-Title": "TaskMatrix", // Optional
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [
          { role: "system", content: "You are a helpful assistant that returns only JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenRouter Error:", data);
      return NextResponse.json({ error: "Failed to generate description" }, { status: response.status });
    }

    const content = data.choices[0]?.message?.content;
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
