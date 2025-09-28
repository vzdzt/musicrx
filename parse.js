import fs from 'fs';

const content = fs.readFileSync('news_segments.txt', 'utf8');

const lines = content.split('\n').map(l => l.trim()).filter(l => l);

const segments = [];

let current = [];

for (const line of lines) {
    if (line.match(/^\w+ \d+$/)) {
        if (current.length > 0) {
            segments.push(current);
            current = [];
        }
    }
    current.push(line);
}

if (current.length > 0) segments.push(current);

const newsItems = [];

for (const segment of segments) {
    if (segment.length < 2) continue;
    const date = segment[0];
    const title = segment[1];
    let description = '';
    let image = '';
    if (segment.length > 2) {
        const last = segment[segment.length - 1];
        if (last.includes('.')) {
            image = last;
            description = segment.slice(2, -1).join(' ');
        } else {
            description = segment.slice(2).join(' ');
        }
    }
    newsItems.push({ date, title, description, image });
}

// Sort by date descending
newsItems.sort((a, b) => new Date(b.date + ' 2025') - new Date(a.date + ' 2025'));

// Generate HTML
let html = '';
for (const item of newsItems) {
    const isVideo = item.image && item.image.endsWith('.mov');
    const mediaTag = isVideo ?
        `<video width="100%" controls>
                            <source src="${item.image}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>` :
        item.image ? `<img src="${item.image}" alt="${item.title}">` : '';

    // Capitalize date
    const capDate = item.date.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    html += `
                <!-- ${capDate} -->
                <div class="news-item">
                    <div class="news-title-card">
                        <h2 class="card-title-container">${item.title}</h2>
                    </div>
                    <div class="news-content-card">
                        <p class="date">${capDate}</p>
                        ${mediaTag}
                        <p>${item.description}</p>
                    </div>
                </div>
`;
}

fs.writeFileSync('new_news.html', html);
