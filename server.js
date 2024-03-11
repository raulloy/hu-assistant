import express from 'express';
import config from './config.js';
import OpenAI from 'openai';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = config.PORT;
const OPENAI_API_KEY = config.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

app.get('/start', async (req, res) => {
  try {
    console.log('Starting a new conversation...');
    const thread = await openai.beta.threads.create();
    console.log(`New thread created with ID: ${thread.id}`);
    res.send({ thread_id: thread.id });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).send('Error starting a new conversation');
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { thread_id: threadId, message: userInput = '' } = req.body;
    if (!threadId) {
      console.log('Error: Missing thread_id');
      return res.status(400).json({ error: 'Missing thread_id' });
    }
    console.log(`Received message: ${userInput} for thread ID: ${threadId}`);

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userInput,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: config.ASSISTANT_ID,
    });

    console.log(`Run started with ID: ${run.id}`);
    res.json({ run_id: run.id });
  } catch (error) {
    console.error(`Error in /chat endpoint: ${error.message}`);
    res.status(500).send('Error processing chat request');
  }
});

app.post('/check', async (req, res) => {
  try {
    const { thread_id: threadId, run_id: runId } = req.body;
    if (!threadId || !runId) {
      console.log('Error: Missing thread_id or run_id');
      return res.status(400).json({ error: 'Missing thread_id or run_id' });
    }

    let endTime = Date.now() + 9000; // 9 seconds from now
    let runStatus;

    do {
      runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
      if (Date.now() > endTime) {
        console.log('Run timed out');
        return res.json({ response: 'timeout' });
      }

      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(threadId);
        const messageContent = messages.data[0].content[0].text;
        console.log('Run completed, returning response');
        return res.json({ response: messageContent, status: 'completed' });
      }

      if (runStatus.status === 'requires_action') {
        // Process required actions here, similar to the Python code
      }
    } while (runStatus.status !== 'completed');
  } catch (error) {
    console.error(`Error in /check endpoint: ${error.message}`);
    res.status(500).send('Error checking run status');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
