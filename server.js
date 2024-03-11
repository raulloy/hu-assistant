import express from 'express';
import config from './config.js';
import OpenAI from 'openai';
import cors from 'cors';
import { createHubSpotContact } from './functions.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = config.PORT;

const OPENAI_API_KEY = config.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

app.get('/api/start', async (req, res) => {
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
    const data = req.body;
    const threadId = data.thread_id;
    const userInput = data.message || '';

    if (!threadId) {
      console.log('Error: Missing thread_id');
      return res.status(400).json({ error: 'Missing thread_id' });
    }

    console.log(`Received message: ${userInput} for thread ID: ${threadId}`);

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: userInput,
    });

    // Run the Assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: config.ASSISTANT_ID,
    });

    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      if (runStatus.status === 'requires_action') {
        const args = JSON.parse(
          runStatus.required_action.submit_tool_outputs.tool_calls[0].function
            .arguments
        );
        const toolCallId =
          runStatus.required_action.submit_tool_outputs.tool_calls[0].id;
        const output = await createHubSpotContact(
          args.firstname,
          args.lastname,
          args.phone,
          args.email
        );

        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: [
            {
              tool_call_id: toolCallId,
              output: JSON.stringify(output),
            },
          ],
        });

        // console.log(
        //   runStatus.required_action.submit_tool_outputs.tool_calls[0].id
        // );
        // console.log(
        //   runStatus.required_action.submit_tool_outputs.tool_calls[0].function.arguments
        // );
      }
    } while (runStatus.status !== 'completed');

    const messages = await openai.beta.threads.messages.list(threadId);
    const response = messages.data[0].content[0].text.value;

    console.log(`Assistant response: ${response}`);
    res.json({ response: response });
  } catch (error) {
    console.error(`Error in /chat endpoint: ${error.message}`);
    res.status(500).send('Error processing chat request');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
