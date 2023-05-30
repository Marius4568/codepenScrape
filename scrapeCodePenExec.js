require('dotenv').config();

const Redis = require('ioredis');
const sendGrid = require('@sendgrid/mail');

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Extract data from the current page
const extractDataFromPage = async (page) => {
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

// Main scraping function
const scrapeCodePen = async (url) => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(2 * 60 * 1000);
    await page.goto(url, { waitUntil: 'networkidle0' });

    let data = await extractDataFromPage(page);

    while (true) {
        const nextButton = await page.$('button[data-direction="next"]');

        if (nextButton) {
            await Promise.all([
                page.click('button[data-direction="next"]'),
                delay(2000),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
            console.log('Clicked on next button');
            const nextPageData = await extractDataFromPage(page);
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

const scrapeCodePenExec = async (codepenProfile) => {
    try {
        const url = `https://codepen.io/${codepenProfile}/pens/public`;
        const data = await scrapeCodePen(url);
        const timeScraped = new Date();
        
        // Connect to your Redis server
        const redis = new Redis({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT
        });

        // Get the previous total views from Redis
        const previousTotalViews = await redis.get('totalViews');
        const previousViews = previousTotalViews ? Number(previousTotalViews) : 0;

        if (data.totalViews > previousViews) {
            // Send notification
            sendGrid.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
                to: process.env.YOUR_EMAIL,
                from: process.env.YOUR_EMAIL,
                subject: 'You have more views!',
                text: `You have ${data.totalViews - previousViews} new views.`,
            };
            await sendGrid.send(msg);
        }
        
        // Update the total views in Redis
        await redis.set('totalViews', data.totalViews);

        console.log('Data:', data);
        console.log('Scrape Date:', timeScraped.toLocaleString());
    } catch (error) {
        console.error('Error:', error);
    }
};

scrapeCodePenExec('marius4568');