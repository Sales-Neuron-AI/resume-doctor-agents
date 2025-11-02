import { Agent } from '@openserv-labs/sdk';
import { z } from 'zod';
// FIX 1: Import default (no curly braces)
import FirecrawlApp from '@mendable/firecrawl-js';
import 'dotenv/config';

// 1. Initialize the Agent
const agent = new Agent({
  systemPrompt: 'You are a Research Agent. Your job is to use your tools to crawl websites and scrape data.',
  apiKey: process.env.OPENSERV_API_KEY,
  port: Number(process.env.PORT) || 7378
});

// 2. Add the Firecrawl "Capability" (Tool)
agent.addCapability({
  name: 'crawlWebsite',
  description: 'Crawls a company website and returns its text content using Firecrawl API.',
  schema: z.object({
    url: z.string().url().describe('The URL of the company website to crawl.')
  }),
  async run({ args, action }) {
    try {
      console.log(`Starting crawl for: ${args.url}`);
      
      const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      
      const crawlResult = await firecrawl.crawlUrl(args.url);

      if (crawlResult && crawlResult.data && crawlResult.data.content) {
        console.log('Crawl successful!');
        return crawlResult.data.content;
      } else {
        throw new Error('No content found in Firecrawl result.');
      }

    } catch (error) {
      console.error('Firecrawl Error:', error);

      // FIX 2 & 3: Safely check if action.task exists before reporting an error
      if (action && 'task' in action && action.task && 'workspace' in action) {
        await agent.markTaskAsErrored({
          workspaceId: action.workspace.id,
          taskId: action.task.id,
          error: error instanceof Error ? error.message : 'Failed to crawl website.'
        });
      }
      return 'Error during crawl.';
    }
  }
});

// 3. Start the Server
agent.start();

// FIX 4: Removed the console.log for the private 'agent.port'
