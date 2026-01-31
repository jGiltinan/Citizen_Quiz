import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = "vs_697bfe2441908191a6e27ed1418c43ef";

// Prompts
const PROMPT_QUESTIONER = `You are a practice questioner for the US naturalization test. Return one question based on the document in plain English. You may alter the wording slightly as a questioner would do on the test. You are to return a question and just the question.`;

const PROMPT_PARSER = `Instructions
You are a practice examiner for the US naturalization test.

You just asked the user a question and the test taker responded. Tell the test taker if it is incorrect or not, and if they are incorrect, explain why the answer is incorrect.`;


// Helper: Find or Create the Assistant
async function getOrCreateAssistant() {
    const assistants = await openai.beta.assistants.list({ limit: 50 });
    const existing = assistants.data.find(a =>
        a.metadata && (a.metadata as any).app === "citizen-quiz" &&
        a.tool_resources?.file_search?.vector_store_ids?.includes(VECTOR_STORE_ID)
    );

    if (existing) return existing.id;

    // Create new
    const created = await openai.beta.assistants.create({
        name: "Citizen Quiz AI",
        model: "gpt-4o",
        instructions: "You are a US Civics Test helper.", // Default instruction, overridden per run
        tools: [{ type: "file_search" }],
        tool_resources: {
            file_search: {
                vector_store_ids: [VECTOR_STORE_ID]
            }
        },
        metadata: { app: "citizen-quiz" }
    });

    return created.id;
}

// Helper: Run Assistant with Override
async function runWithInstructions(threadId: string, assistantId: string, instructions: string) {
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        instructions: instructions // OVERRIDE here
    });

    // Poll
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
    while (runStatus.status !== 'completed') {
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
            throw new Error(`Run failed: ${runStatus.last_error?.message || runStatus.status}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
    }

    // Get Response
    const messages = await openai.beta.threads.messages.list(threadId);
    // Get the most recent message from assistant
    const lastMsg = messages.data.find(m => m.role === 'assistant' && m.run_id === run.id); // Validating run_id is good practice

    if (lastMsg && lastMsg.content[0].type === 'text') {
        return lastMsg.content[0].text.value;
    }
    return "Error: No response text.";
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, threadId, answer, assistantId: clientAsstId } = body;

        // 1. Setup / Get Assistant ID
        if (action === 'init') {
            const asstId = await getOrCreateAssistant();
            return NextResponse.json({ assistantId: asstId });
        }

        // 2. Start Quiz (Create Thread + First Question)
        if (action === 'start') {
            if (!clientAsstId) return NextResponse.json({ error: "Missing assistantId (call init first)" }, { status: 400 });

            const thread = await openai.beta.threads.create();

            // Run Questioner
            const question = await runWithInstructions(thread.id, clientAsstId, PROMPT_QUESTIONER);

            return NextResponse.json({ threadId: thread.id, message: question });
        }

        // 3. Process Answer & Get Feedback (Parser) -> Then Get Next Question
        if (action === 'answer') {
            if (!threadId || !clientAsstId) return NextResponse.json({ error: "Missing threadId or assistantId" }, { status: 400 });

            // Add User Answer
            await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: answer || "(No answer provided)"
            });

            // Run Parser
            const feedback = await runWithInstructions(threadId, clientAsstId, PROMPT_PARSER);

            // Run Questioner (Immediate follow-up)
            // Note: We might want these separate to let frontend control pacing, but "Loop" implies continuous.
            // Let's return both or let frontend call again?
            // Returning both is faster for UX (less latency if we do it here).
            // Sending feedback + new question together?
            // Or separate messages.

            // Let's just return feedback first, and let user click "Next"? 
            // User asked for "Loop". 
            // Best approach: Return feedback, then frontend automatically requests next question?
            // OR: We generate next question now and return `{ feedback, nextQuestion }`.

            const nextQuestion = await runWithInstructions(threadId, clientAsstId, PROMPT_QUESTIONER);

            return NextResponse.json({ feedback, nextQuestion });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("Assistant Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
