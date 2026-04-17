import OpenAI from 'openai';

const NVIDIA_API_KEY = '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';

const openai = new OpenAI({
  apiKey: NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function main() {
  console.log('Testing NVIDIA API with STREAMING...');

  try {
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen3-coder-480b-a35b-instruct",
      messages: [{"role":"user","content":"Say 'hello world' in exactly 3 words"}],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 50,
      stream: true
    });

    console.log('\nStreaming response:');
    for await (const chunk of completion) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
    console.log('\n\nStream complete!');
  } catch (error) {
    console.error('\nError:', error?.message || error);

    if (error?.status === 403) {
      console.error('\n403 Forbidden - API key may be invalid or expired');
    } else if (error?.status === 401) {
      console.error('\n401 Unauthorized - Authentication failed');
    } else if (error?.status === 404) {
      console.error('\n404 Not Found - The endpoint may be incorrect');
    }

    if (error?.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();