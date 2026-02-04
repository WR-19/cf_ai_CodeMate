import { DurableObject } from 'cloudflare:workers';

export interface Env {
  CODEMATE: DurableObjectNamespace;
  AI: any;
}

export class CodeMate extends DurableObject {
  env: Env;
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/chat' && request.method === 'POST') {
      return this.handleChat(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleChat(request: Request) {
    const { message, userId } = await request.json() as {
      message: string;
      userId: string;
    };

    try {
      // Call Llama 3.3 LLM
      const response = await this.env.AI.run(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        {
          messages: [
            {
              role: 'system',
              content: `You are CodeMate, a helpful bot that explains coding concepts using simple analogies.
              
Keep explanations SHORT (2-3 sentences). Use everyday analogies. Always include a code example. Be friendly!`,
            },
            {
              role: 'user',
              content: message,
            },
          ],
        }
      );

      const botResponse = response.response;

      // Save to memory
      await this.state.storage?.put(
        `msg:${userId}:${Date.now()}`,
        JSON.stringify({
          user: message,
          bot: botResponse,
          time: new Date().toISOString(),
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          response: botResponse,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}