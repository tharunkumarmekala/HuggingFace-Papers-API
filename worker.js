export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "trending";
    
    const today = new Date();
    let hfUrl;

    // Set the Hugging Face URL based on the requested type
    switch (type) {
      case "daily":
        const dailyDate = today.toISOString().split("T")[0];
        hfUrl = `https://huggingface.co/papers/date/${dailyDate}`;
        break;
      case "weekly":
        const weekNumber = getWeekNumber(today);
        hfUrl = `https://huggingface.co/papers/week/${today.getFullYear()}-W${weekNumber}`;
        break;
      case "monthly":
        const month = String(today.getMonth() + 1).padStart(2, "0");
        hfUrl = `https://huggingface.co/papers/month/${today.getFullYear()}-${month}`;
        break;
      case "trending":
      default:
        hfUrl = "https://huggingface.co/papers/trending";
    }

    try {
      // Step 1: Fetch main page
      const res = await fetch(hfUrl);
      const html = await res.text();
      
      // Step 2: Extract paper list (titles + individual URLs)
      const paperList = extractPaperList(html);
      
      // Step 3: Fetch each paper's details page
      const papers = await Promise.all(
        paperList.map(paper => fetchPaperDetails(paper))
      );

      return new Response(JSON.stringify(papers, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Failed to fetch papers" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

// Helper: ISO week number
function getWeekNumber(date) {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
}

// Step 1: Extract paper list from main page
function extractPaperList(html) {
  // Match ANY paper container across all page types
  const paperRegex = /<article[^>]*>[\s\S]*?<\/article>|<div[^>]*class="[^"]*flex[^"]*flex-col[^"]*"[^>]*>[\s\S]*?(?:<div[^>]*class="[^"]*flex[^"]*sm:flex-row[^"]*"[^>]*>[\s\S]*?<\/div>){1,2}/gs;
  const paperMatches = [...html.matchAll(paperRegex)];
  
  const papers = [];
  
  for (const match of paperMatches.slice(0, 10)) {
    const block = match[0];
    
    // Extract title and relative URL
    const titleMatch = block.match(/<a[^>]*href="(\/papers\/[^"]*)"[^>]*>([^<]+)<\/a>/);
    if (!titleMatch) continue;
    
    papers.push({
      title: titleMatch[2].trim(),
      paperUrl: `https://huggingface.co${titleMatch[1]}`
    });
  }
  
  return papers;
}

// Step 2: Fetch individual paper page and extract details
async function fetchPaperDetails(paper) {
  try {
    const res = await fetch(paper.paperUrl);
    const html = await res.text();
    
    // ✅ PRIORITY 1: AI-Generated Summary (blue box)
    let description = "No description available";
    
    const aiSummaryMatch = html.match(/<div[^>]*class="[^"]*bg-blue-500[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    
    if (aiSummaryMatch && aiSummaryMatch[1].trim()) {
      description = aiSummaryMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim();
    } else {
      // ✅ PRIORITY 2: Actual Paper Abstract (fallback)
      const abstractMatch = html.match(/<h2[^>]*class="[^"]*font-semibold[^"]*"[^>]*>Abstract<\/h2>\s*<div[^>]*class="[^"]*flex flex-col[^"]*"[^>]*>\s*<p[^>]*class="[^"]*text-gray-600[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      
      if (abstractMatch && abstractMatch[1].trim()) {
        description = abstractMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim();
      } else {
        // ✅ PRIORITY 3: Meta description (last resort)
        const metaDescMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
        if (metaDescMatch && metaDescMatch[1].trim()) {
          description = metaDescMatch[1].trim();
        }
      }
    }
    
    // Extract ALL links and filter for GitHub/arXiv
    const allLinks = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
    
    const githubUrl = allLinks.find(link => 
      link.includes('github.com') && !link.includes('huggingface.co')
    ) || "Not available";
    
    const arxivUrl = allLinks.find(link => link.includes('arxiv.org')) || "Not available";
    
    return {
      title: paper.title,
      description,
      githubUrl,
      arxivUrl,
      paperUrl: paper.paperUrl
    };
  } catch (error) {
    // Return basic info if fetch fails
    return {
      title: paper.title,
      description: "Failed to fetch details",
      githubUrl: "Not available",
      arxivUrl: "Not available",
      paperUrl: paper.paperUrl
    };
  }
}
