# HuggingFace Papers API

A high-performance Cloudflare Worker that scrapes trending AI research papers from Hugging Face Papers, extracting AI-generated summaries, abstracts, GitHub repositories, and arXiv links.

## Features

- **Multiple Time Ranges**: Fetch trending, daily, weekly, or monthly papers
- **AI-Generated Summaries**: Prioritizes Hugging Face's AI summaries (blue box)
- **Fallback Extraction**: Automatically falls back to paper abstracts and meta descriptions
- **Parallel Processing**: Fetches 10 papers concurrently for maximum speed
- **CORS Ready**: Built-in `Access-Control-Allow-Origin` headers for web integration
- **Error Resilient**: Graceful degradation if individual paper pages fail

## Quick Start

### Deploy to Cloudflare Workers

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Create Worker Project**:
   ```bash
   wrangler init hf-papers-api
   cd hf-papers-api
   ```

3. **Replace `src/index.js`** with the code from this repository

4. **Deploy**:
   ```bash
   wrangler deploy
   ```

### Local Development

```bash
# Run locally at http://localhost:8787
wrangler dev

# Test the API
curl "http://localhost:8787?type=trending"
```

## API Usage

### Endpoint
```
GET https://your-worker.your-subdomain.workers.dev
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `trending` | Paper list type: `trending`, `daily`, `weekly`, `monthly` |

### Example Requests

```bash
# Get trending papers
curl "https://your-worker.workers.dev"

# Get today's papers
curl "https://your-worker.workers.dev?type=daily"

# Get this week's papers
curl "https://your-worker.workers.dev?type=weekly"

# Get this month's papers
curl "https://your-worker.workers.dev?type=monthly"
```

## Response Format

```json
[
  {
    "title": "Depth Anything 3: Recovering the Visual Space from Any Views",
    "description": "Depth Anything 3 (DA3) uses a plain transformer for geometry prediction from visual inputs, achieving state-of-the-art results in camera pose estimation, any-view geometry, visual rendering, and monocular depth estimation.",
    "githubUrl": "https://github.com/ByteDance-Seed/depth-anything-3",
    "arxivUrl": "https://arxiv.org/abs/2511.10647",
    "paperUrl": "https://huggingface.co/papers/2511.10647"
  }
]
```

### Field Descriptions

- `title`: Paper title
- `description`: AI-generated summary (priority) → Paper abstract → Meta description
- `githubUrl`: GitHub repository link (if available)
- `arxivUrl`: arXiv paper link
- `paperUrl`: Hugging Face paper page URL

## Architecture

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ Parse 'type' Parameter   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Fetch Main Papers Page   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Extract 10 Paper URLs    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Parallel Fetch Details   │ ← Promise.all()
│  (10 concurrent requests)│
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Parse Individual Pages:  │
│ 1. AI Summary (blue box) │
│ 2. Abstract (fallback)   │
│ 3. GitHub/arXiv links    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Return JSON Response     │
└──────────────────────────┘
```

## Extraction Strategy

The scraper uses a **3-tier fallback system** for robustness:

1. **AI Summary** (highest quality)
   - CSS: `bg-blue-500/6` (blue highlighted box)
   - Hugging Face's own summary of the paper

2. **Paper Abstract** (original content)
   - CSS: `text-gray-600` inside Abstract section
   - Directly from the paper's PDF

3. **Meta Description** (last resort)
   - HTML: `<meta name="description">`
   - Generic placeholder text

## Performance

- **Cold start**: ~2-3 seconds (fetching 11 pages total)
- **Warm start**: <500ms (Cloudflare caching)
- **Concurrent requests**: 10 paper pages fetched in parallel
- **Rate limits**: Respects Hugging Face's robots.txt

## Troubleshooting

### Getting "Failed to fetch details" for all papers
- Check Cloudflare Worker's outbound HTTP permissions
- Verify Hugging Face hasn't changed their HTML structure

### Missing GitHub URLs
- Some papers don't have public repositories
- Check `githubUrl` field shows "Not available"

### CORS Issues
- Already configured with `Access-Control-Allow-Origin: *`
- For production, replace `*` with your specific domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test changes with `wrangler dev`
4. Submit a pull request

## License

MIT License - feel free to use in your projects!

## Related Projects

- [arXiv API](https://arxiv.org/help/api) - Official arXiv API
- [Papers with Code](https://paperswithcode.com/) - Alternative paper aggregation site
- [HF Datasets](https://huggingface.co/datasets) - Hugging Face datasets library

---

**Disclaimer**: This is an unofficial API. Please respect Hugging Face's terms of service and rate limits.
