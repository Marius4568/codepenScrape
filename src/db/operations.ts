import db from './db';

import { RowDataPacket } from 'mysql2';
import {penData} from '../email/operations'

export const fetchPreviousPenViews = async (codepenProfile: string) => {
    try {
        const [rows] = await db.execute(`
            SELECT v.penTitle, v.views
            FROM penViews v
            INNER JOIN (
                SELECT penTitle, MAX(scrapeDate) as latestScrapeDate
                FROM penViews
                WHERE codepenProfile = ?
                GROUP BY penTitle
            ) as subQuery
            ON v.penTitle = subQuery.penTitle AND v.scrapeDate = subQuery.latestScrapeDate
            ORDER BY latestScrapeDate DESC`, [codepenProfile]);
        let previousViewsObj: Record<string, number> = {};
        (rows as RowDataPacket[]).forEach(row => previousViewsObj[row.penTitle] = row.views);
        return previousViewsObj;
    } catch (error) {
        console.error('Error in fetchPreviousPenViews:', error);
        return {}; // return an empty object in case of an error
    }
};

export const fetchPreviousTotalViews = async (codepenProfile: string) => {
    try {
        const [rows] = await db.execute('SELECT totalViews FROM views WHERE codepenProfile = ? ORDER BY scrapeDate DESC LIMIT 1', [codepenProfile]);
        return (rows as RowDataPacket[]).length > 0 ? (rows as RowDataPacket[])[0].totalViews : 0;
    } catch (error) {
        console.error('Error in fetchPreviousTotalViews:', error);
    }
};

export const updateTotalViewsInDB = async (codepenProfile: string, totalViews: number) => {
    try {
        // Fetch existing data from database for the particular profile
        const [rows] = await db.execute('SELECT totalViews FROM views WHERE codepenProfile = ? ORDER BY scrapeDate DESC LIMIT 1', [codepenProfile]);

        // If existing data is not present or if it is different from the new data
        if ((rows as RowDataPacket[]).length === 0 || (rows as RowDataPacket[])[0].totalViews !== totalViews) {
            // Insert new data into database
            await db.execute('INSERT INTO views (codepenProfile, totalViews) VALUES (?, ?)', [codepenProfile, totalViews]);
        }
    } catch (error) {
        console.error('Error in updateTotalViewsInDB:', error);
    }
};

export const updatePenViewsInDB = async (codepenProfile: string, pensData: Array<penData>) => {
    try {
        for (let pen of pensData) {
            // Fetch existing data from database for the particular penTitle
            const [rows] = await db.execute(`
                SELECT views
                FROM penViews
                WHERE codepenProfile = ? AND penTitle = ?
                ORDER BY scrapeDate DESC
                LIMIT 1`, [codepenProfile, pen.title]);

            // If existing data is not present or if it is different from the new data
            if ((rows as RowDataPacket[]).length === 0 || (rows as RowDataPacket[])[0].views !== pen.views) {
                // Insert new data into database
                await db.execute('INSERT INTO penViews (codepenProfile, penTitle, views) VALUES (?, ?, ?)', [codepenProfile, pen.title, pen.views]);
            }
        }
    } catch (error) {
        console.error('Error in updatePenViewsInDB:', error);
    }
};