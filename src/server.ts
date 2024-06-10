import express from 'express';
import Logger from './logger';
import { scrapeUsersCodepensData } from './scraper/operations';
const app = express();

app.get('/scrape/:profile?', async (req, res) => {
    try {
        const profile = req.params.profile || null;
        if (profile) {
            const data = await scrapeUsersCodepensData(`https://codepen.io/${profile}/pens/public`);
            return res.status(200).json(data);
        }
        else { 
            return res.status(400).json({ message: 'No profile provided' });
        }
    } catch (error) {
        Logger.error('Error in /scrape route:', error);
       return res.status(500).json({ message: 'Server error occurred' });
    }
});

app.listen(process.env.PORT || 3000, () => Logger.info(`Server is running on port ${process.env.PORT || 3000}`));