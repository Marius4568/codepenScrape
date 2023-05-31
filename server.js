import express from 'express';
import { executeCodePenScraping } from './scraping.js';
const app = express();

app.get('/scrape', async (req, res) => {
    const data = await executeCodePenScraping(process.env.CODEPEN_PROFILE);
    res.json(data);
});

const listener = app.listen(process.env.PORT, () => {
    console.log('App is listening on port ' + listener.address().port);
});