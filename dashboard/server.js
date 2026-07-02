const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve the dashboard files (index.html, styles.css, app.js)
app.use(express.static(path.join(__dirname)));

// Serve the parent directory so that files like master_database.json are accessible
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`Tata Motors Dashboard is running on http://localhost:${PORT}`);
});
