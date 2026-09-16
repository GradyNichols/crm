// The one place the model is named.
//
// Three endpoints call Anthropic, and a swap that lands in two of them leaves
// the app running two models with different tokenizers and different max_tokens
// needs — a bug that only shows up as an occasional truncated response weeks
// later. One constant makes a half-swap impossible.
//
// Claude 4.7 and later use a newer tokenizer that produces roughly 30% more
// tokens for the same text. That's why the `max_tokens` ceilings below the call
// sites carry headroom rather than being tuned tight: the same prompt and the
// same answer cost more tokens on Sonnet 5 than they did on Sonnet 4.6, even
// though the price per token is lower.
export const MODEL = "claude-sonnet-5";
