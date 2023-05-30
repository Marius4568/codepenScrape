const express = require('express');
const app = express();
const scrapeCodePenExec = require('./scrapeCodePenExec.js');

app.get('/scrape', async (req, res) => {
    const data = await scrapeCodePenExec('marius4568');
    res.json(data);
});

const listener = app.listen(process.env.PORT, () => {
    console.log('App is listening on port ' + listener.address().port);
});