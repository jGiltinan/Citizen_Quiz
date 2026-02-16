import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID!;

if (!VECTOR_STORE_ID) {
    throw new Error("Missing OPENAI_VECTOR_STORE_ID in environment variables");
}

// Prompts
const PREVENT_REPETITION = true;

const BASE_PROMPT = `You are a practice questioner for the US naturalization test. Return one question based on the document in plain English. You may alter the wording slightly as a questioner would do on the test. You are to return a question and just the question.`;

const PROMPT_QUESTIONER = PREVENT_REPETITION
    ? `${BASE_PROMPT}\n\nReview the conversation history. Do not ask questions that have already been asked. Select a new question from the document.`
    : BASE_PROMPT;

const PROMPT_PARSER = `Instructions
You are a practice examiner for the US naturalization test.

You just asked the user a question and the test taker responded. Tell the test taker if it is incorrect or not, and if they are incorrect, explain why the answer is incorrect.`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, previousResponseId, answer } = body;

        // 1. Start Quiz (Create First Response)
        if (action === 'start') {
            const response = await openai.responses.create({
                model: "gpt-4o",
                tools: [{
                    type: "file_search",
                    vector_store_ids: [VECTOR_STORE_ID]
                }],
                input: [
                    { role: "user", content: "Please ask me the first question." }
                ],
                instructions: PROMPT_QUESTIONER,
            });

            return NextResponse.json({
                responseId: response.id,
                message: response.output_text
            });
        }

        // 2. Process Answer & Get Feedback (Parser) -> Then Get Next Question
        if (action === 'answer') {
            if (!previousResponseId) return NextResponse.json({ error: "Missing previousResponseId" }, { status: 400 });

            // Step A: Submit User Answer and Get Feedback
            const feedbackResponse = await openai.responses.create({
                model: "gpt-4o",
                previous_response_id: previousResponseId,
                input: [
                    { role: "user", content: answer || "(No answer provided)" }
                ],
                instructions: PROMPT_PARSER,
                tools: [{
                    type: "file_search",
                    vector_store_ids: [VECTOR_STORE_ID]
                }],
            });

            const feedback = feedbackResponse.output_text;

            // Step B: Get Next Question (Chain from Feedback)
            const nextQuestionResponse = await openai.responses.create({
                model: "gpt-4o",
                previous_response_id: feedbackResponse.id,
                instructions: PROMPT_QUESTIONER,
                input: [
                    { role: "user", content: "Please ask the next question." }
                ],
                tools: [{
                    type: "file_search",
                    vector_store_ids: [VECTOR_STORE_ID]
                }],
            });

            const nextQuestion = nextQuestionResponse.output_text;

            return NextResponse.json({
                feedback,
                nextQuestion,
                responseId: nextQuestionResponse.id
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("Assistant/Response Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
