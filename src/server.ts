import express from 'express';
import { executeCodePenScraping } from './scraper/controller';
const app = express();

app.get('/scrape/:profile?', async (req, res) => { // Optional profile parameter
    try {
        const profile = req.params.profile || process.env.CODEPEN_PROFILE || 'undefined';
        const data = await executeCodePenScraping(profile, false, false);
        res.status(200).json(data);
    } catch (error) {
        console.error('Error in /scrape route:', error);
        res.status(500).json({ message: 'Server error occurred' });
    }
});

app.listen(process.env.PORT, () => console.log(`Server is running on port ${process.env.PORT}`));