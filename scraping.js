import { config } from 'dotenv';
config();

import db from './db.js';
import sendGrid from '@sendgrid/mail';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const delayTime = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendGridNotification = async (totalViews, previousViews) => {
    sendGrid.setApiKey(process.env.SENDGRID_API_KEY);
    const emailMessage = {
        to: process.env.YOUR_EMAIL,
        from: process.env.YOUR_EMAIL,
        subject: 'You have more views!',
        text: `You have ${totalViews - previousViews} new views.`,
    };
    await sendGrid.send(emailMessage);
};

const fetchPreviousTotalViews = async (codepenProfile) => {
    const [rows] = await db.execute('SELECT totalViews FROM views WHERE codepenProfile = ? ORDER BY scrapeDate DESC LIMIT 1', [codepenProfile]);
    return rows.length > 0 ? rows[0].totalViews : 0;
};

const updateTotalViewsInDB = async (codepenProfile, totalViews) => {
    await db.execute('INSERT INTO views (codepenProfile, totalViews) VALUES (?, ?)', [codepenProfile, totalViews]);
};

const extractPageData = async (page) => {
    return await page.evaluate(() => {
        // Query all required elements
        const viewsElements = document.querySelectorAll('a[data-stat="views"]');
        const likeElements = document.querySelectorAll('button[data-stat="loves"]');
        const commentElements = document.querySelectorAll('a[data-stat="comments"]');
        const titleElements = document.querySelectorAll('h2[title] a');

        // Extract data from elements
        const titles = Array.from(titleElements).map(el => el.textContent || 'N/A');
        const views = Array.from(viewsElements).map(el => parseInt(el.textContent.replace(/[\, \.]/g, '')) || 0);
        const likes = Array.from(likeElements).map(el => parseInt(el.textContent.replace(/[\, \. love]/gi, '')) || 0);
        const comments = Array.from(commentElements).map(el => parseInt(el.textContent.replace(/[\, \.]/g, '')) || 0);

        // Build pensData array
        const pensData = Array.from(titleElements, (el, index) => {
            return {
                title: titles[index] || 'N/A',
                views: views[index] || 0,
                likes: likes[index] || 0,
                comments: comments[index] || 0,
            };
        });

        // Calculate total views, likes, and comments
        const totalViews = views.reduce((acc, curr) => acc + curr, 0);
        const totalLikes = likes.reduce((acc, curr) => acc + curr, 0);
        const totalComments = comments.reduce((acc, curr) => acc + curr, 0);

        return {
            pens: pensData,
            totalViews,
            totalLikes,
            totalComments,
        };
    });
};

const scrapeCodePenPage = async (url) => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(2 * 60 * 1000);
    await page.goto(url, { waitUntil: 'networkidle0' });

    let data = await extractPageData(page);

    while (true) {
        const nextButton = await page.$('button[data-direction="next"]');

        if (nextButton) {
            await Promise.all([
                page.click('button[data-direction="next"]'),
                delayTime(2000),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
            console.log('Clicked on next button');
            const nextPageData = await extractPageData(page);
            data.pens = [...data.pens, ...nextPageData.pens];
            data.totalViews = data.totalViews += nextPageData.totalViews;
            data.totalLikes = data.totalLikes += nextPageData.totalLikes;
            data.totalComments = data.totalComments += nextPageData.totalComments;
        } else {
            break;
        }
    }

    await browser.close();
    return data;
};

export const executeCodePenScraping = async (codepenProfile) => {
    try {
        const url = `https://codepen.io/${codepenProfile}/pens/public`;
        const data = await scrapeCodePenPage(url);
        const timeScraped = new Date();

        const previousViews = await fetchPreviousTotalViews(codepenProfile);
        await updateTotalViewsInDB(codepenProfile, data.totalViews);

        if (data.totalViews > previousViews) {
            await sendGridNotification(data.totalViews, previousViews);
        }

        console.log('Data:', data);
        console.log('Scrape Date:', timeScraped.toLocaleString());
    } catch (error) {
        console.error('Error:', error);
    }
};
