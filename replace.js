import fs from 'fs';

const news = fs.readFileSync('public/news.html', 'utf8');

const newItems = fs.readFileSync('new_news.html', 'utf8');

const start = '<div class="grid">';

const end = '</div>';

const divs = [];

let pos = 0;

while ((pos = news.indexOf(end, pos)) !== -1) {

    divs.push(pos);

    pos += end.length;

}

const gridEnd = divs[divs.length - 2]; // second last </div> is grid's

const gridStart = news.indexOf(start);

const before = news.substring(0, gridStart + start.length);

const after = news.substring(gridEnd);

const newNews = before + '\n' + newItems + '\n' + after;

fs.writeFileSync('public/news.html', newNews);
