#!/bin/bash

# Read the news_segments.txt and generate HTML for news items in reverse order

# The file has segments separated by blank lines
# Each segment: date\n\n title\n\n description\n\n image\n\n\n

# But some descriptions have multiple lines, images may be missing.

# To parse, use awk or something.

# Assume each segment starts with date (lowercase month), then title, then description, then image.

# But it's inconsistent.

# Perhaps split by double newlines.

# Use awk to group.

# Let's use a python script instead, since bash is hard for this.

# But since I have node, perhaps use node.

# But to keep simple, let's try bash.

# Read the file, split by empty lines.

# But it's hard.

# Since the date is the first line of each segment, and then title, description, image.

# But description can have newlines.

# Perhaps assume the image is the last line before blank.

# This is tricky.

# Perhaps manually generate, but since I'm AI, I can list them.

# To save time, I'll generate the HTML for the segments in reverse order.

# Let's start from the end.

# The last segment is july 22

# Tyler, The Creator’s 'DON’T TAP THE GLASS' Earned 41M First-Day Streams on Spotify

# glass6.jpeg

# So HTML as above.

# Then the previous, July 21, there are several for July 21.

# The list has:

# july 21

# Tyler, The Creator released ‘Flower Boy’ 8 years ago today & ‘DON’T TAP THE GLASS’ Today

# flowerboys.jpeg

# Then july 21

# Che's 'closed captions' dropped two years ago today

# closed.png

# Then july 21

# OsamaSon's debut commercial project 'Osama Season' dropped 2 years ago today

# osama.jpeg

# Then july 21

# TYLER, THE CREATOR - DON'T TAP THE GLASS (ALBUM) OUT NOW

# glass4.jpeg

# Then july 21

# "THIS ALBUM WAS NOT MADE FOR SITTING STILL. DANCING, DRIVING, RUNNING — ANY TYPE OF MOVEMENT IS RECOMMENDED TO MAYBE UNDERSTAND THE SPIRIT OF IT." — Tyler, The Creator on 'DON'T TAP THE GLASS'

# glass5.jpeg

# Then july 21

# JID - GOD DOES LIKE UGLY (ALBUM) AUGUST 8TH

# jid.jpeg

# Then july 21

# QUADECA - VANISHER, HORIZON SCRAPER (ALBUM + MOVIE) JULY 25TH

# quadeca.jpeg

# Then july 21

# Travis Scott & Jackboys for The Source (2025)

# source.jpeg

# Then july 21

# Travis Scott & Jackboys for Mass Appeal (2025)

# mass.jpeg

# Then july 21

# Ken Carson says Opium will have no new members going forward

# opium.mov

# Then july 21

# Drake reacts to "F*CK KENDRICK" chants in Birmingham

# fuckken.mov

# Then july 21

# Anthony Fantano rates Che’s 'REST IN BASS' a "light 7"

# fantano7.jpeg

# So for July 21, there are 11 segments.

# Then July 20, several.

# This is a lot.

# To do it, perhaps I can use a tool to generate the HTML.

# Perhaps the user expects me to add them, so I'll pick a few and add.

# But to complete, perhaps I can replace the grid with the new content.

# But since it's long, perhaps the task is to add the new news, and the most recent is now the latest in the list.

# The latest in the list is July 22, but current time is Sept 28, so July 22 is past.

# But the user said "place most recent at the top", so the list is not in order, but to sort by date descending.

# The list is in ascending order, so reverse it.

# To implement, perhaps I can use sed or awk to parse.

# Let's try to write a bash script.

# Assume each segment is separated by blank lines, and the first line is date, then title, then description, then image.

# But description can have multiple lines.

# Perhaps use csplit or something.

# Perhaps use python.

# Since I have node, let's use node to parse.

# Write a js script.

# Use write_to_file for parse.js

# Then run node parse.js

# Yes.

# The script can read the file, split by \n\n, then for each block, split by \n, first is date, then title, then description lines, last is image.

# Then generate HTML.

# For video, if image ends with .mov, use video tag.

# Yes.

# Let's do that.<write_to_file>
<path>parse.js</path>
<content>const fs = require('fs');

const content = fs.readFileSync('news_segments.txt', 'utf8');

const segments = content.split(/\n\s*\n/).filter(s => s.trim());

const newsItems = [];

for (const segment of segments) {
    const lines = segment.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) continue;
    const date = lines[0];
    const title = lines[1];
    let description = '';
    let image = '';
    if (lines.length > 2) {
        if (lines[lines.length - 1].includes('.')) {
            image = lines[lines.length - 1];
            description = lines.slice(2, -1).join(' ');
        } else {
            description = lines.slice(2).join(' ');
        }
    }
    newsItems.push({ date, title, description, image });
}

// Reverse the order
newsItems.reverse();

// Generate HTML
let html = '';
for (const item of newsItems) {
    const isVideo = item.image.endsWith('.mov');
    const mediaTag = isVideo ?
        `<video width="100%" controls>
                            <source src="${item.image}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>` :
        `<img src="${item.image}" alt="${item.title}">`;

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

console.log(html);
