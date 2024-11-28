const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 1337;

// Path to the JSON file
const dataPath = path.join(__dirname, 'data', '2024-Leagues-Points.json');

// Function to read and parse the JSON data
const readAndParseData = () => {
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    const jsonData = JSON.parse(data);
    jsonData.sort((a, b) => b.score - a.score);
    return jsonData.slice(0, 25);
  } catch (error) {
    console.error('Error reading or parsing JSON file:', error);
    return [];
  }
};

// Define the GET route
app.get('/2024-Leagues-Points.json', (req, res) => {
  const top25 = readAndParseData();
  res.json(top25);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
