<script>
    // This component shows a sample health card with the new format for testing and demonstration
    export let showSample = true;

    const sampleAdvice = `
TOP TIP: Stay hydrated and take frequent breaks in higher temperatures.

WEATHER BRIEF: Mendez is slightly cooler and more humid than Dasmariñas. Be prepared for a potential temperature drop.

HEALTH REMINDERS:
1. Drink plenty of water throughout your journey.
2. Wear light-colored, loose-fitting clothing to stay cool.
3. Apply sunscreen with a high SPF, especially if you'll be outdoors.
4. Bring insect repellent, especially if you plan on hiking.

WATCH FOR:
• Signs of heat exhaustion (dizziness, headache, nausea).
• Any unusual insect bites or stings.

QUICK TIPS:
• Pack a reusable water bottle.
• Use a hat and sunglasses for sun protection.

_Remember to consult a healthcare professional for personalized medical advice._
`;

    function formatAdviceText(text) {
        if (!text) return '';
        
        // Initial cleaning - normalize line endings and ensure proper breaks
        // Fix common issues with joined bullet points and numbered lists
        text = text
            // Ensure line breaks before section headings
            .replace(/([^\n])(WEATHER BRIEF|HEALTH REMINDERS|WATCH FOR|QUICK TIPS)/g, '$1\n\n$2')
            // Fix numbered list items that appear on the same line
            .replace(/(\d+\.?\)?\s+[^.\n]+\.)(\s*)(\d+\.?\)?\s+)/g, '$1\n$3')
            // Fix bullet points that appear on the same line
            .replace(/([.!?])(\s*)(•|\*|\-)\s+/g, '$1\n$3 ');
        
        // Split the text into sections
        const sections = {
            topTip: '',
            weatherBrief: '',
            healthReminders: [],
            watchFor: [],
            quickTips: [],
            disclaimer: ''
        };
        
        // Extract the top tip
        const topTipMatch = text.match(/TOP TIP:?\s*(.*?)(?:\n|$)/i);
        if (topTipMatch && topTipMatch[1]) sections.topTip = topTipMatch[1].trim();
        
        // Extract the weather brief section
        const weatherBriefMatch = text.match(/WEATHER BRIEF:?\s*([\s\S]*?)(?:\n\n|\n(?=[A-Z][A-Z])|\n?HEALTH REMINDERS)/i);
        if (weatherBriefMatch && weatherBriefMatch[1]) sections.weatherBrief = weatherBriefMatch[1].trim();
        
        // Extract health reminders with improved regex
        const healthRemindersSection = text.match(/HEALTH REMINDERS:?\s*([\s\S]*?)(?:\n\n|\n?WATCH FOR)/i);
        if (healthRemindersSection && healthRemindersSection[1]) {
            // Find all numbered points using regex
            const numberedItems = healthRemindersSection[1].match(/\n?\s*\d+\.?\)?\s+(.*?)(?=\n\s*\d+\.?\)?\s+|\n\n|\n?WATCH FOR|$)/gis);
            if (numberedItems) {
                // Process each match to extract just the content
                sections.healthReminders = numberedItems.map(item => {
                    const content = item.replace(/\n?\s*\d+\.?\)?\s+/, '').trim();
                    return content;
                }).filter(item => item.length > 0);
            }
        }
        
        // Extract Watch For items with improved regex
        const watchForSection = text.match(/WATCH FOR:?\s*([\s\S]*?)(?:\n\n|\n?QUICK TIPS|$)/i);
        if (watchForSection && watchForSection[1]) {
            // Split by bullet points, accounting for possible formatting issues
            const bulletItems = watchForSection[1].split(/\n\s*[•\-\*]\s+/).slice(1);
            if (bulletItems.length > 0) {
                // Clean each bullet point
                sections.watchFor = bulletItems.map(item => 
                    item.trim().replace(/\n([^•\-\*])/g, ' $1') // Join lines that aren't new bullets
                ).filter(item => item.length > 0);
            } else {
                // Fallback - try to extract content some other way
                const content = watchForSection[1].trim().replace(/^[•\-\*]\s+/gm, '');
                if (content) {
                    sections.watchFor = [content]; 
                }
            }
        }
        
        // Extract Quick Tips items with improved regex
        const quickTipsSection = text.match(/QUICK TIPS:?\s*([\s\S]*?)(?:\n\n|_|$)/i);
        if (quickTipsSection && quickTipsSection[1]) {
            // Split by bullet points, accounting for possible formatting issues
            const bulletItems = quickTipsSection[1].split(/\n\s*[•\-\*]\s+/).slice(1);
            if (bulletItems.length > 0) {
                // Clean each bullet point
                sections.quickTips = bulletItems.map(item => 
                    item.trim().replace(/\n([^•\-\*])/g, ' $1') // Join lines that aren't new bullets
                ).filter(item => item.length > 0);
            } else {
                // Fallback - try to extract content some other way
                const content = quickTipsSection[1].trim().replace(/^[•\-\*]\s+/gm, '');
                if (content) {
                    sections.quickTips = [content];
                }
            }
        }
        
        // Extract disclaimer - usually the last paragraph
        const disclaimerMatch = text.match(/(?:_|remember)(.*?)\.?$/is);
        if (disclaimerMatch && disclaimerMatch[1]) {
            sections.disclaimer = disclaimerMatch[1].trim();
        }

        // Now build the HTML with the structured sections
        let formattedHtml = '';
        
        // Top Tip 
        if (sections.topTip) {
            formattedHtml += `<div class="top-tip"><span class="tip-label">TOP TIP</span> ${sections.topTip}</div>`;
        }
        
        // Weather Brief
        if (sections.weatherBrief) {
            formattedHtml += `<div class="weather-brief"><h3>Weather</h3><p>${sections.weatherBrief}</p></div>`;
        }
        
        // Health Reminders
        if (sections.healthReminders.length > 0) {
            formattedHtml += `<div class="health-reminders"><h3>Health Reminders</h3><ol>`;
            sections.healthReminders.forEach(point => {
                if (point) formattedHtml += `<li>${point}</li>`;
            });
            formattedHtml += `</ol></div>`;
        }
        
        // Watch For
        if (sections.watchFor.length > 0) {
            formattedHtml += `<div class="watch-for"><h3>Watch For</h3><ul class="warning-list">`;
            sections.watchFor.forEach(point => {
                if (point) formattedHtml += `<li>${point}</li>`;
            });
            formattedHtml += `</ul></div>`;
        }
        
        // Quick Tips
        if (sections.quickTips.length > 0) {
            formattedHtml += `<div class="quick-tips"><h3>Quick Tips</h3><ul class="tips-list">`;
            sections.quickTips.forEach(point => {
                if (point) formattedHtml += `<li>${point}</li>`;
            });
            formattedHtml += `</ul></div>`;
        }
        
        return formattedHtml;
    }
</script>

{#if showSample}
<div class="sample-card-container">
    <div class="health-advice-card">
        <div class="card-header">
            <h3>Travel Health Tips</h3>
            <div class="route">
                <span class="city origin">Manila</span>
                <span class="arrow">→</span>
                <span class="city destination">Tagaytay</span>
            </div>
        </div>
        
        <div class="card-body">
            <div class="advice-content">
                {@html formatAdviceText(sampleAdvice)}
            </div>
        </div>
        
        <div class="card-footer">
            <div class="disclaimer">
                Always consult a healthcare professional for personalized medical advice.
            </div>
            <div class="update-time">
                Updated: {new Date().toLocaleString()}
            </div>
        </div>
    </div>
    
    <div class="sample-notice">
        <p>This is a sample card showing the new health advice format.</p>
        <button on:click={() => showSample = false}>Hide Sample</button>
    </div>
</div>
{/if}

<style>
    .sample-card-container {
        margin: 1.5rem 0;
        position: relative;
    }
    
    .health-advice-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        overflow: hidden;
        margin: 0 auto;
        width: 100%;
    }
    
    .card-header {
        background: #4285f4;
        color: white;
        padding: 1rem;
        border-radius: 8px 8px 0 0;
    }
    
    .card-header h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.4rem;
    }
    
    .route {
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
        font-size: 1.1rem;
    }
    
    .city {
        font-weight: 600;
    }
    
    .origin {
        color: #e8f0fe;
    }
    
    .destination {
        color: #e8f0fe;
    }
    
    .arrow {
        margin: 0 0.5rem;
        font-size: 1.2rem;
    }
    
    .card-body {
        padding: 1rem;
    }
    
    .advice-content {
        color: #333;
        line-height: 1.5;
    }
    
    .top-tip {
        background-color: #e3f2fd;
        padding: 0.8rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 1.1rem;
        font-weight: 500;
        color: #1565c0;
    }
    
    .tip-label {
        background: #1565c0;
        color: white;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        margin-right: 0.5rem;
        font-size: 0.8rem;
        font-weight: bold;
    }
    
    .advice-content h3 {
        color: #333;
        font-size: 1rem;
        margin: 1rem 0 0.5rem 0;
        border-bottom: 1px solid #eee;
        padding-bottom: 0.3rem;
    }
    
    .weather-brief {
        margin-bottom: 1rem;
    }
    
    .weather-brief p {
        margin: 0.5rem 0;
    }
    
    .health-reminders ol {
        padding-left: 1.5rem;
        margin: 0.5rem 0;
    }
    
    .health-reminders li {
        margin-bottom: 0.5rem;
    }
    
    .warning-list, .tips-list {
        list-style-type: none;
        padding-left: 0;
        margin: 0.5rem 0;
    }
    
    .warning-list li {
        position: relative;
        padding-left: 1.5rem;
        margin-bottom: 0.5rem;
    }
    
    .warning-list li:before {
        content: "⚠️";
        position: absolute;
        left: 0;
        top: 0;
        font-size: 0.9rem;
    }
    
    .tips-list li {
        position: relative;
        padding-left: 1.5rem;
        margin-bottom: 0.5rem;
    }
    
    .tips-list li:before {
        content: "✓";
        position: absolute;
        left: 0.2rem;
        top: -1px;
        font-weight: bold;
        color: #4caf50;
    }
    
    .card-footer {
        background: #f8f9fa;
        padding: 0.75rem 1rem;
        border-top: 1px solid #eee;
        font-size: 0.8rem;
        color: #666;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    .disclaimer {
        font-style: italic;
        flex: 1;
    }
    
    .update-time {
        color: #888;
        font-size: 0.75rem;
    }
    
    .sample-notice {
        margin-top: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background-color: #fffde7;
        border-radius: 4px;
        font-size: 0.9rem;
    }
    
    .sample-notice button {
        background: transparent;
        border: 1px solid #ccc;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .sample-notice button:hover {
        background-color: #f5f5f5;
    }
</style>
