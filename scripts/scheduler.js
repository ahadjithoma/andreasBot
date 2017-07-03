var key = process.env.HUBOT_TRELLO_KEY;
var Promise = require('bluebird');
var Trello = require('node-trello');
var message = require('./slackMsgs.js');

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

    trelloNotifications(); //for debugging
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
            let type, creator;
            switch (notif[j].type) {
                case 'commentCard':
                case 'changeCard':
                case 'addAdminToBoard':
                case 'addAdminToOrganization':
                case 'addedAttachmentToCard':
                case 'addedMemberToCard':
                case 'addedToBoard':
                case 'addedToCard':
                case 'addedToOrganization':
                case 'cardDueSoon':
                case 'changeCard':
                case 'closeBoard':
                case 'commentCard':
                case 'createdCard':
                case 'declinedInvitationToBoard':
                case 'declinedInvitationToOrganization':
                case 'invitedToBoard':
                case 'invitedToOrganization':
                case 'makeAdminOfBoard':
                case 'makeAdminOfOrganization':
                case 'memberJoinedTrello':
                case 'mentionedOnCard':
                case 'removedFromBoard':
                case 'removedFromCard':
                case 'removedFromOrganization':
                case 'removedMemberFromCard':
                case 'unconfirmedInvitedToBoard':
                case 'unconfirmedInvitedToOrganization':
                case 'updateCheckItemStateOnCard':
                    type = notif[j].type.split(/(?=[A-Z])/).join(" ").toLowerCase(); // split capitals, join and convert to lowercase 
                    creator = notif[j].memberCreator.username;
                    break;
                default:
                    type = notif[j].type.split(/(?=[A-Z])/).join(" ").toLowerCase(); // split capitals, join and convert to lowercase 
                    creator = notif[j].memberCreator.username;
                    break;
            }


            attachment.pretext = `${type} by ${creator}`;

            msg.attachments.push(attachment);
        }
        return msg;
    }
}