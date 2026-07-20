# Voice transcription function

This function powers the high-accuracy Voice button in the Food Log.

It requires a logged-in Supabase user and keeps the OpenAI API key server-side.

## Deploy

```bash
supabase secrets set OPENAI_API_KEY="your_openai_api_key"
supabase functions deploy voice-transcribe
```

The frontend falls back to browser dictation when this function is not configured.
