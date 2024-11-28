const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// List of websites to ping
const websites = [
  {
    id: '2024-Leagues-Points',
    url: 'https://secure.runescape.com/m=hiscore_oldschool_seasonal/a=13/overall?category_type=1&table=0#headerHiscores',
  },
  // Add more websites as needed
];

// Function to fetch and parse the data for a given website
async function fetchAndStoreHiscores(website) {
  try {
    const response = await axios.get(website.url, {
      responseType: 'arraybuffer',
    });

    let encoding =
      response.headers['content-type'].split('charset=')[1] || 'utf-8';
    encoding = encoding.toLowerCase().replace(/"/g, '');

    // Decode initially to find meta charset
    const initialHtml = iconv.decode(response.data, encoding);
    const metaCharsetMatch = initialHtml.match(
      /<meta.*?charset=["']?(.*?)[ "'><]/i
    );
    if (metaCharsetMatch && metaCharsetMatch[1]) {
      encoding = metaCharsetMatch[1].toLowerCase();
    }

    // Decode with the determined encoding
    const html = iconv.decode(response.data, encoding);
    const $ = cheerio.load(html);

    const rows = $('tr.personal-hiscores__row');
    const hiscores = [];

    // Determine the data file path
    const dataFilePath = path.join(DATA_DIR, `${website.id}.json`);

    // Load existing data
    let existingData = [];
    if (fs.existsSync(dataFilePath)) {
      existingData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    }

    // Create a mapping of username to existing entries for quick lookup
    const usernameMapping = {};
    existingData.forEach((entry) => {
      usernameMapping[entry.username] = entry;
    });

    rows.each((index, element) => {
      const usernameElement = $(element).find('td.left a');
      const username = usernameElement.text().trim();
      const scoreElement = $(element).find('td.right').eq(1);
      const scoreText = scoreElement.text().trim().replace(/,/g, '');
      const score = parseInt(scoreText, 10);

      if (usernameMapping.hasOwnProperty(username)) {
        const previousEntry = usernameMapping[username];
        if (score > previousEntry.score) {
          const gain = score - previousEntry.score;
          const timestamp = new Date().toISOString();
          hiscores.push({ username, score, gain, timestamp });
        } else {
          // Retain previous gain and timestamp
          hiscores.push(previousEntry);
        }
      } else {
        // New user
        const gain = 0;
        const timestamp = new Date().toISOString();
        hiscores.push({ username, score, gain, timestamp });
      }
    });

    // Overwrite the data file with the updated hiscores
    fs.writeFileSync(dataFilePath, JSON.stringify(hiscores, null, 2), 'utf-8');
    console.log(`Stored data for ${website.id} in ${dataFilePath}`);
  } catch (error) {
    console.error(`Error fetching hiscores for ${website.id}:`, error);
  }
}

// Fetch and store data for all websites
async function updateAllData() {
  for (const website of websites) {
    await fetchAndStoreHiscores(website);
  }
}

// Run the update once
updateAllData();
