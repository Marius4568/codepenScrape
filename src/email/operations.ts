import sendGrid from '@sendgrid/mail';
import Logger from '../logger';
import { PenData } from '../types';

export const sendNewCodePenChangedDataNotification = async (totalViews: number, previousTotalViews: number, totalLikes: number, previousLikes: number, totalComments: number, previousTotalComments: number, pensData: PenData[], previousPensData: PenData[]) => {
    if (!process.env.SENDGRID_API_KEY || !process.env.RECEIVER_EMAIL || !process.env.SENDER_EMAIL) {
        throw new Error("SENDGRID_API_KEY, RECEIVER_EMAIL and SENDER_EMAIL must be defined in environment variables");
    }
    sendGrid.setApiKey(process.env.SENDGRID_API_KEY);

    Logger.info('Starting notification process');
    Logger.info(`Total Views: ${totalViews}, Previous Total Views: ${previousTotalViews}`);
    Logger.info(`Total Likes: ${totalLikes}, Previous Total Likes: ${previousLikes}`);
    Logger.info(`Total Comments: ${totalComments}, Previous Total Comments: ${previousTotalComments}`);

    let penUpdatesText = "";

    pensData.forEach(pen => {
        Logger.info(`Processing pen: ${pen.title}`);
        const previousPenData = previousPensData.find(prevPen => prevPen.codepen_id === pen.codepen_id);
        Logger.info(`Previous pen data: ${JSON.stringify(previousPenData)}`);

        const previousPenViews = previousPenData ? previousPenData.views : 0;
        const previousPenLikes = previousPenData ? previousPenData.likes : 0;
        const previousPenComments = previousPenData ? previousPenData.comments_count : 0;

        if (pen.views > previousPenViews) {
            penUpdatesText += `<li>Pen ${pen.title} has <strong>${pen.views - previousPenViews}</strong> new views and now has total <strong>${pen.views}</strong> views.</li>`;
            Logger.info(`Pen ${pen.title} has ${pen.views - previousPenViews} new views.`);
        }
        if (pen.likes > previousPenLikes) {
            penUpdatesText += `<li>Pen ${pen.title} has <strong>${pen.likes - previousPenLikes}</strong> new likes and now has total <strong>${pen.likes}</strong> likes.</li>`;
            Logger.info(`Pen ${pen.title} has ${pen.likes - previousPenLikes} new likes.`);
        }
        if (pen.comments_count > previousPenComments) {
            penUpdatesText += `<li>Pen ${pen.title} has <strong>${pen.comments_count - previousPenComments}</strong> new comments and now has total <strong>${pen.comments_count}</strong> comments.</li>`;
            Logger.info(`Pen ${pen.title} has ${pen.comments_count - previousPenComments} new comments.`);
        }
    });

    if (penUpdatesText.length > 0) { // If any pen has new views, likes, or comments
        const emailMessage = {
            to: process.env.RECEIVER_EMAIL,
            from: process.env.SENDER_EMAIL,
            subject: 'You have new interactions on your CodePens!',
            text: `You have ${totalViews - previousTotalViews} new views, ${totalLikes - previousLikes} new likes, and ${totalComments - previousTotalComments} new comments.\n\nYour pens interactions:\n${penUpdatesText}\nYour total views are now: ${totalViews}, total likes: ${totalLikes}, total comments: ${totalComments}`,
            html: `<p>You have <strong>${totalViews - previousTotalViews}</strong> new views, <strong>${totalLikes - previousLikes}</strong> new likes, and <strong>${totalComments - previousTotalComments}</strong> new comments.</p>
                   <ul>${penUpdatesText}</ul>
                   <p>Your total views are now: <strong>${totalViews}</strong>, total likes: <strong>${totalLikes}</strong>, total comments: <strong>${totalComments}</strong></p>`,
        };
        try {
            Logger.info('Sending email notification...');
            await sendGrid.send(emailMessage);
            Logger.info(`Sent email to ${process.env.RECEIVER_EMAIL}!`);
        } catch (err) {
            Logger.error(`Couldn't send the email encountered error: ${err}`);
        }
    } else {
        Logger.info('No new views, likes, or comments to report.');
    }
};