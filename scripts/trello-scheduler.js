var CronJob = require('cron').CronJob;
var mongoskin = require('mongoskin')
var Promise = require('bluebird')
var cache = require('./cache.js').getCache()
var async = require('async')
var c = require('./config.json')
// config
var mongodb_uri = process.env.MONGODB_URI

module.exports = (robot) => {

    async.series([
        function (done) {
            initDefaultSumUp()
            done()
        },
        function (done) {
            getTrelloSumUpData()
        }
    ])

    function initDefaultSumUp() {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('trelloSumUps').insertAsync(c.defaultTrelloSumUp)
            .then(data => {
            })
            .catch(error => {
                if (error.code != 11000) {
                    robot.logger.error(error)
                    if (c.errorsChannel) {
                        robot.messageRoom(c.errorsChannel, c.errorMessage + `Script: ${path.basename(__filename)}`)
                    }
                }
            })
    }

    function getTrelloSumUpData() {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('trelloSumUps').findOneAsync()
            .then(dbData => {
                createCronJob(dbData)
            })
            .catch(dbError => {
                robot.logger.error(error)
                if (c.errorsChannel) {
                    robot.messageRoom(c.errorsChannel, c.errorMessage + `Script: ${path.basename(__filename)}`)

                }
            })
    }

    function createCronJob(sumup) {
        var time = sumup.time.split(':')
        var days = sumup.days

        var job = new CronJob(`${time[2]} ${time[1]} ${time[0]} * * ${days}`,
            function () {
                trelloSumUpScheduler()
            },
            function () { return null; }, /* This function is executed when the job stops */
            true, /* Start the job right now */
            'Europe/Athens' /* Time zone of this job. */
        )
    }

    function trelloSumUpScheduler() {
        var userIDs = cache.get('userIDs')
        Promise.each(userIDs, function (userid) {
            var query
            var lastNotificationID = cache.get(userid, 'trello_last_notification')
            if (!lastNotificationID) {
                query = { read_filer: 'unread' }
            } else {
                query = { since: lastNotificationID }
            }
            robot.emit('trelloSumUp', userid, query, true)
        })
    }
}
/**********************************************************/
// OLD STUFF - TO BE DELETED
// left for some possible useful code snippets

// var key = process.env.HUBOT_TRELLO_KEY;
// var Promise = require('bluebird');
// var Trello = require('node-trello');
// var message = require('./slackMsgs.js');
// var c = require('./colors.js');

// module.exports = function (robot) {
//     var db = require('./mlab-login.js').db();
//     var encryption = require('./encryption.js');
//     var CronJob = require('cron').CronJob;
//     var job = new CronJob('00 05 20 * * *',
//         function () {
//             robot.logger.info('cron job running on trello-notifications.js');
//             trelloNotifications();
//         },
//         function () { }, /* This function is executed when the job stops */
//         true, /* Start the job right now */
//         'Europe/Athens' /* Time zone of this job. */
//     );

//     // check if trello notifications feature is enabled
//     // db.bind('settings');
//     // db.settings.find().toArrayAsync().then(dbData => {
//     //     if (dbData.trelloNotifications) {
//     //         job.start();
//     //     } else {
//     //         // job.stop();
//     //     }
//     // }).catch(dbError => {
//     //     robot.logger.info(dbError)
//     // });

//     // trelloNotifications(); //for debugging -> MUST DELETE THIS AT THE END OF DEVELOPMENT
//     function trelloNotifications() {
//         db.bind('trelloTokens');
//         db.trelloTokens.find().toArrayAsync().then(dbData => {
//             var usersNum = dbData.length;
//             for (let i = 0; i < usersNum; i++) { // i: the number of authorized trello users
//                 var encryptedToken = dbData[i].token;
//                 encryption.decrypt(encryptedToken).then(token => {
//                     var trello = Promise.promisifyAll(new Trello(key, token));
//                     var args = { read_filter: 'unread' }; // get only the unread notifications

//                     trello.getAsync('/1/member/me/notifications', args).then(notif => {
//                         if (notif.length > 0) {
//                             let msg = getMsg(notif);
//                             let userId = dbData[i].id;      // get user's id (on chat platform)
//                             robot.messageRoom(userId, msg); // send message to that user
//                         }
//                     }).catch(trError => {
//                         robot.messageRoom('general', 'trError on scheduler.js. Please check server log');
//                         robot.logger.error(trError);
//                     })
//                 })
//             }
//         }).catch(dbError => {
//             robot.messageRoom('general', 'dbError on scheduler.js. Please check server log');
//             robot.logger.error(dbError)
//         })
//     }

//     function getMsg(notif) {
//         var msg = { attachments: [] };
//         var notifNum = notif.length;

//         for (let j = 0; j < notifNum; j++) { // j: the number of notifications per user
//             let attachment = message.attachment();
//             let type, creator, text, pretext, cardUrl, cardName, listName, color;
//             if (notif[j].memberCreator)
//                 creator = notif[j].memberCreator.username;
//             cardUrl = `https://trello.com/c/${notif[j].data.card.shortLink}`;
//             cardName = notif[j].data.card.name;

//             switch (notif[j].type) {
//                 // case 'addAdminToBoard':
//                 // case 'addAdminToOrganization':
//                 // case 'addedAttachmentToCard':
//                 // case 'addedMemberToCard':
//                 // case 'addedToBoard':
//                 // case 'addedToCard':
//                 // case 'addedToOrganization':
//                 //     break;
//                 case 'cardDueSoon':
//                 case 'changeCard':
//                     // listName = (notif[j].data.listBefore || notif[j].data.list)['name'];
//                     // type = notif[j].type.split(/(?=[A-Z])/).join(" ").toLowerCase(); // split capitals, join and convert to lowercase 
//                     // creator = notif[j].memberCreator.username;
//                     // pretext = `Card <${cardUrl}|${cardName}> on list _${listName}_ updated by ${creator}`;
//                     // color = c.getColor('cyan');
//                     // if (notif[j].data.card.due != null) {
//                     //     let fullDate = getDate(notif[j].data.card.due);
//                     //     text = `*Due Date:* ${fullDate}`;
//                     // } else if (notif[j].data.listBefore) {
//                     //     text = `*Moved* to list: ${notif[j].data.listAfter.name}`;
//                     // }
//                     break;
//                 case 'closeBoard':
//                     break;
//                 case 'commentCard':
//                     pretext = `New comment on card <${cardUrl}|${cardName}> by ${creator}`
//                     text = notif[j].data.text
//                     break;
//                 // case 'createdCard':
//                 // case 'declinedInvitationToBoard':
//                 // case 'declinedInvitationToOrganization':
//                 // case 'invitedToBoard':
//                 // case 'invitedToOrganization':
//                 // case 'makeAdminOfBoard':
//                 // case 'makeAdminOfOrganization':
//                 // case 'memberJoinedTrello':
//                 // case 'mentionedOnCard':
//                 // case 'removedFromBoard':
//                 // case 'removedFromCard':
//                 // case 'removedFromOrganization':
//                 // case 'removedMemberFromCard':
//                 // case 'unconfirmedInvitedToBoard':
//                 // case 'unconfirmedInvitedToOrganization':
//                 // case 'updateCheckItemStateOnCard':
//                 // break;

//                 default:
//                     type = notif[j].type.split(/(?=[A-Z])/).join(" ").toLowerCase(); // split capitals, join and convert to lowercase 
//                     text = 'default';
//                     pretext = `${type} by ${creator}`;
//                     color = c.getColor('cyan');

//                     break;
//             }
//             attachment.text = text;
//             attachment.pretext = pretext;
//             attachment.color = color;
//             msg.attachments.push(attachment);
//         }
//         return msg;
//     }


//     function getDate(timestamp) {
//         var d = new Date(timestamp);
//         var options = {
//             year: "numeric", month: "long",
//             day: "numeric", hour: "2-digit", minute: "2-digit"
//         };
//         var str = d.toLocaleString("en-uk", options).split(',') // MMMM DD, YYYY, HH:MM PP 
//         var date = str[0];
//         var year = str[1];
//         var time = str[2];
//         var day = d.getDate()

//         // don't display year if due date year matches the current year
//         if (parseInt(year) === (new Date()).getFullYear()) {
//             year = '';
//         } else {
//             year = ',' + year;
//         }

//         var suffix = "th";
//         if (day % 10 == 1 && day != 11) {
//             suffix = 'st'
//         } else if (day % 10 == 2 && day != 12) {
//             suffix = 'nd'
//         } else if (day % 10 == 3 && day != 13) {
//             suffix = 'rd'
//         }
//         else {
//             suffix = 'th'
//         }

//         return (date + suffix + year + ' at' + time);
//     }
// }