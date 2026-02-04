import { CodeMate, Env } from './agent';

export { CodeMate };
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // API endpoint
    if (path === '/api/chat') {
      const { message, userId } = await request.json() as {
        message: string;
        userId: string;
      };

      const id = env.CODEMATE.idFromName(userId);
      const agent = env.CODEMATE.get(id);

      return agent.fetch(
        new Request('http://internal/chat', {
          method: 'POST',
          body: JSON.stringify({ message, userId }),
        })
      );
    }

    // Health check
    if (path === '/health') {
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;