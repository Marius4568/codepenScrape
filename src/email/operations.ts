import sendGrid from '@sendgrid/mail';

export interface penData { 
    title: string,
    views: number,
    likes: number,
    comments: number
}

export const sendGridNotification = async (totalViews: number, previousViews: number, pensData: Array<penData>, previousPensData: Array<penData>) => {

    if (!process.env.SENDGRID_API_KEY || !process.env.RECEIVER_EMAIL || !process.env.SENDER_EMAIL) {
    throw new Error("SENDGRID_API_KEY, RECEIVER_EMAIL and SENDER_EMAIL must be defined in environment variables");
}
    sendGrid.setApiKey(process.env.SENDGRID_API_KEY);

    let penViewsText = "";

    pensData.forEach(pen => {
        const previousPenData = previousPensData.find(prevPen => prevPen.title === pen.title);
    const previousPenViews = previousPenData ? previousPenData.views : 0;
    if(pen.views > previousPenViews) {
        penViewsText += `<li>Pen ${pen.title} has <strong>${pen.views - previousPenViews}</strong> new views and now has total <strong>${pen.views}</strong> views.</li>`;
    }
});

    if (penViewsText.length > 0) { // If any pen has new views
        const emailMessage = {
            to: process.env.RECEIVER_EMAIL,
            from: process.env.SENDER_EMAIL,
            subject: 'You have more views!',
            text: `You have ${totalViews - previousViews} new views.\n\nYour pens views:\n${penViewsText}\nYour total views are now: ${totalViews}`,
            html: `<p>You have <strong>${totalViews - previousViews}</strong> new views.</p>
                   <ul>${penViewsText}</ul>
                   <p>Your total views are now: <strong>${totalViews}</strong></p>`,
        };
        try {
            await sendGrid.send(emailMessage);
            console.log('Sent email!')
        }
        catch (err) { 
            console.log(`Couldn't send the email encountered error: ${err}`)
        }
       
    }
};