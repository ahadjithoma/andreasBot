var key = process.env.HUBOT_TRELLO_KEY;
var Promise = require('bluebird');
var Trello = require('node-trello');
var message = require('./slackMsgs.js');
var c = require('./colors.js');

module.exports = function (robot) {
    var db = require('./mlab-login.js').db();
    var encryption = require('./encryption.js');
    var CronJob = require('cron').CronJob;
    var job = new CronJob('00 24 19 * * *', // note that heroku free plan is not running 24/7
        function () { trelloNotifications(); },
        function () { }, /* This function is executed when the job stops */
        false, /* Start the job right now */
        'Europe/Athens' /* Time zone of this job. */
    );

    // check if trello notifications feature is enabled
    db.bind('settings');
    db.settings.find().toArrayAsync().then(dbData => {
        if (dbData.trelloNotifications) {
            job.start();
        } else {
            job.stop();
        }
    }).catch(dbError => {
        robot.logger.info(dbError)
    });

    trelloNotifications(); //for debugging -> MUST DELETE THIS AT THE END OF DEVELOPMENT
    function trelloNotifications() {
        robot.logger.info('started')
        db.bind('trelloTokens');
        db.trelloTokens.find().toArrayAsync().then(dbData => {
            var usersNum = dbData.length;
            for (let i = 0; i < usersNum; i++) { // i: the number of authorized trello users
                var encryptedToken = dbData[i].token;
                var token = encryption.decrypt(encryptedToken);
                var trello = Promise.promisifyAll(new Trello(key, token));
                var args = { read_filter: 'unread' }; // get only the unread notifications

                trello.getAsync('/1/member/me/notifications', args).then(notif => {

                    if (notif.length > 0) {
                        let msg = getMsg(notif);
                        let userId = dbData[i].id;      // get user's id (on chat platform)
                        robot.messageRoom(userId, msg); // send massage to that user
                    }
                }).catch(trError => {
                    robot.messageRoom('general', 'trError on scheduler.js. Please check server log');
                    robot.logger.error(trError);
                })
            }
        }).catch(dbError => {
            robot.messageRoom('general', 'dbError on scheduler.js. Please check server log');
            robot.logger.error(dbError)
        })
    }

    function getMsg(notif) {
        var msg = { attachments: [] };
        var notifNum = notif.length;

        for (let j = 0; j < notifNum; j++) { // j: the number of notifications per user
            let attachment = message.attachment();
            let type, creator, text, pretext, cardUrl, cardName, listName, color;
            if (notif[j].memberCreator)
                creator = notif[j].memberCreator.username;
            cardUrl = `https://trello.com/c/${notif[j].data.card.shortLink}`;
            cardName = notif[j].data.card.name;

            switch (notif[j].type) {
                // case 'addAdminToBoard':
                // case 'addAdminToOrganization':
                // case 'addedAttachmentToCard':
                // case 'addedMemberToCard':
                // case 'addedToBoard':
                // case 'addedToCard':
                // case 'addedToOrganization':
                //     break;
                case 'cardDueSoon':
                case 'changeCard':
                    listName = (notif[j].data.listBefore || notif[j].data.list)['name'];
                    // type = notif[j].type.split(/(?=[A-Z])/).join(" ").toLowerCase(); // split capitals, join and convert to lowercase 
                    creator = notif[j].memberCreator.username;
                    pretext = `Card <${cardUrl}|${cardName}> on list _${listName}_ updated by ${creator}`;
                    color = c.getColor('cyan');
                    if (notif[j].data.card.due != null) {
                        let fullDate = getDate(notif[j].data.card.due);
                        text = `*Due Date:* ${fullDate}`;
                    } else if (notif[j].data.listBefore) {
                        text = `*Moved* to list: ${notif[j].data.listAfter.name}`;
                    }
                    break;
                case 'closeBoard':
                    break;
                case 'commentCard':
                    pretext = `New comment on card <${cardUrl}|${cardName}> by ${creator}`
                    text = notif[j].data.text
                    break;
                // case 'createdCard':
                // case 'declinedInvitationToBoard':
                // case 'declinedInvitationToOrganization':
                // case 'invitedToBoard':
                // case 'invitedToOrganization':
                // case 'makeAdminOfBoard':
                // case 'makeAdminOfOrganization':
                // case 'memberJoinedTrello':
                // case 'mentionedOnCard':
                // case 'removedFromBoard':
                // case 'removedFromCard':
                // case 'removedFromOrganization':
                // case 'removedMemberFromCard':
                // case 'unconfirmedInvitedToBoard':
                // case 'unconfirmedInvitedToOrganization':
                // case 'updateCheckItemStateOnCard':
                // break;

                default:
                    type = notif[j].type.split(/(?=[A-Z])/).join(" ").toLowerCase(); // split capitals, join and convert to lowercase 
                    text = 'default';
                    pretext = `${type} by ${creator}`;
                    color = c.getColor('cyan');

                    break;
            }
            attachment.text = text;
            attachment.pretext = pretext;
            attachment.color = color;
            msg.attachments.push(attachment);
        }
        return msg;
    }


    function getDate(timestamp) {
        var d = new Date(timestamp);
        var options = {
            year: "numeric", month: "long",
            day: "numeric", hour: "2-digit", minute: "2-digit"
        };
        var str = d.toLocaleString("en-uk", options).split(',') // MMMM DD, YYYY, HH:MM PP 
        var date = str[0];
        var year = str[1];
        var time = str[2];
        var day = d.getDate()

        // don't display year if due date year matches the current year
        if (parseInt(year) === (new Date()).getFullYear()) {
            year = '';
        } else {
            year = ',' + year;
        }

        var suffix = "th";
        if (day % 10 == 1 && day != 11) {
            suffix = 'st'
        } else if (day % 10 == 2 && day != 12) {
            suffix = 'nd'
        } else if (day % 10 == 3 && day != 13) {
            suffix = 'rd'
        }
        else {
            suffix = 'th'
        }

        return (date + suffix + year + ' at' + time);
    }
}