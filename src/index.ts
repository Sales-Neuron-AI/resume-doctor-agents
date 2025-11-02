import { Agent } in '@openserv-labs/sdk';
import { z } from 'zod';
import { FirecrawlApp } from '@mendable/firecrawl-js';
import 'dotenv/config';

// 1. Initialize the Agent
// We use the SDK, which handles all the server logic for us.
const agent = new Agent({
  systemPrompt: 'You are a Research Agent. Your job is to use your tools to crawl websites and scrape data.',
  apiKey: process.env.OPENSERV_API_KEY, // This is a "nickname" for your secret key
  port: Number(process.env.PORT) || 7378
});

// 2. Add the Firecrawl "Capability" (Tool)
// This is the custom code we discussed.
agent.addCapability({
  name: 'crawlWebsite',
  description: 'Crawls a company website and returns its text content using Firecrawl API.',
  schema: z.object({
    url: z.string().url().describe('The URL of the company website to crawl.')
  }),
  async run({ args, action }) {
    // This 'try...catch' block is for error handling
    try {
      console.log(`Starting crawl for: ${args.url}`);

      // Use the Firecrawl API key from our "nickname"
      const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

      const crawlResult = await firecrawl.crawlUrl(args.url);

      if (crawlResult && crawlResult.data && crawlResult.data.content) {
        console.log('Crawl successful!');
        // Return the raw text content to the OpenServ Project Manager
        return crawlResult.data.content;
      } else {
        throw new Error('No content found in Firecrawl result.');
      }

    } catch (error) {
      console.error('Firecrawl Error:', error);
      // If it fails, report the error back to OpenServ
      await action.task.reportError({
        error: error instanceof Error ? error.message : 'Failed to crawl website.'
      });
      return 'Error during crawl.';
    }
  }
});

// 3. Start the Server
// This one line of code starts the entire web server.
agent.start();

console.log(`Agent server started on port ${agent.port}`);
