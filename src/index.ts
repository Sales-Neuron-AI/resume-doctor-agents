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
// --- ADDING NEW CAPABILITIES FOR PROFILE MANAGEMENT ---

// CAPABILITY 2: Store a new file in the workspace
agent.addCapability({
  name: 'storeFile',
  description: 'Stores a file in the OpenServ workspace. Use this to save CVs, LinkedIn data, etc.',
  schema: z.object({
    path: z.string().describe('The full path and filename. e.g., "master_cv.pdf" or "user_data/linkedin.json"'),
    fileContent: z.string().describe('The text content of the file to be saved.')
  }),
  async run({ args, action }) {
    // This uses the built-in SDK power to upload files
    try {
      if (!action || !('workspace' in action)) {
        throw new Error('Action context is missing or invalid.');
      }
      
      await agent.uploadFile({
        workspaceId: action.workspace.id,
        path: args.path,
        file: Buffer.from(args.fileContent, 'utf-8') // Convert text to a file buffer
      });
      
      console.log(`File successfully stored at: ${args.path}`);
      return `File stored successfully at ${args.path}.`;
      
    } catch (error) {
      console.error('File storage Error:', error);
      return 'Error storing file.';
    }
  }
});

// CAPABILITY 3: Get a file's content from the workspace
agent.addCapability({
  name: 'getFile',
  description: 'Retrieves the text content of a specific file from the OpenServ workspace.',
  schema: z.object({
    path: z.string().describe('The exact path of the file to retrieve. e.g., "master_cv.pdf"')
  }),
  async run({ args, action }) {
    try {
      if (!action || !('workspace' in action)) {
        throw new Error('Action context is missing or invalid.');
      }

      // Use the built-in SDK to get all files
      const files = await agent.getFiles({ workspaceId: action.workspace.id });
      
      // Find the specific file
      const foundFile = files.find(file => file.path === args.path);
      
      if (!foundFile) {
        throw new Error(`File not found at path: ${args.path}`);
      }

      // We need to fetch the file's content
      // This is a bit of a workaround: we fetch the URL
      const response = await fetch(foundFile.fullUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file content from ${foundFile.fullUrl}`);
      }
      const textContent = await response.text();
      
      console.log(`File successfully retrieved: ${args.path}`);
      return textContent;

    } catch (error) {
      console.error('File retrieval Error:', error);
      return `Error retrieving file: ${error.message}`;
    }
  }
});
// 3. Start the Server
agent.start();

// FIX 4: Removed the console.log for the private 'agent.port'
