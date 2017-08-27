'use strict'

var slackmsg = require("./slackMsgs.js");
var request = require('request-promise');
var Trello = require('node-trello');
var cache = require('./cache.js').getCache()
var c = require('./config.json')
var mongoskin = require('mongoskin');

// config
var TRELLO_API = 'https://api.trello.com/1'
var trello_headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}
// auth
var mongodb_uri = process.env.MONGODB_URI
var hubot_host_url = process.env.HUBOT_HOST_URL;
var trelloKey = process.env.HUBOT_TRELLO_KEY;
var secret = process.env.HUBOT_TRELLO_OAUTH;
var token = process.env.HUBOT_TRELLO_TOKEN;
// TODO : login based on user
var trelloAuth = new Trello(trelloKey, token);

// convert node-trello callbacks to promises
const Promise = require("bluebird");
var trello = Promise.promisifyAll(trelloAuth);

module.exports = function (robot) {


    /*************************************************************************/
    /*                             Listeners                                 */
    /*************************************************************************/


    robot.respond(/trello (all |unread |read |)notifications/i, function (res) {
        var read_filter = res.match[1].trim()
        if (!read_filter) {
            read_filter = 'unread'
        }
        var query = { read_filter: read_filter }
        getNotifications(res.message.user.id, query)
    })


    robot.respond(/trello mentions/i, function (res) {
        var query = { filter: 'mentionedOnCard' }
        getNotifications(res.message.user.id, query)
    })

    // TODO add the since query
    robot.respond(/trello sum-?up( all| unread| read|)/i, function (res) {
        var read_filter = res.match[1].trim()
        if (!read_filter) {
            read_filter = 'unread'
        }
        var query = { read_filter: read_filter }
        getNotificationsSumUp(res.message.user.id, query)
    })

    robot.on('trelloSumUp', function (userid, query, saveLastNotif) {
        getNotificationsSumUp(userid, query, saveLastNotif)
    })

    robot.respond(/enable trello webhooks for channel (.*) for the board (.*)/i, function (res) {
        var callback_url = `${hubot_host_url}/hubot/trello-webhooks`
        var userid
        var boardName = res.match[2].trim()
        var channel = res.match[1].trim()
        // TODO: could check the existance of that channel

        getBoardID(res.message.user.id, boardName)
            .then(id => {
                console.log(id)
                enableTrelloWebhooks(userid, modelId)
                // enable webhooks here
            })
            .catch(error => {
                console.log(error)
            })
    })

    robot.on('postTrelloAction', function (token, actionId, room) {
        console.log(token)
        console.log(actionId)
        console.log(room)
        getTrelloAction(token, actionId, room)
    })

    /*************************************************************************/
    /*                             API Functions                             */
    /*************************************************************************/

    function getTrelloAction(token, actionId, room) {

        var qs = { entities: true }

        var options = {
            url: `${TRELLO_API}/actions/${actionId}?token=${token}&key=${trelloKey}`,
            method: 'GET',
            qs: qs,
            headers: trello_headers,
            json: true
        }

        request(options)
            .then(action => {



                //PROBLEM here
                displayNotifications(room, action)




            })
            .catch(error => {
                //TODO
            })


    }

    function enableTrelloWebhooks(userid, modelId) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var qs = {}

        var options = {
            url: `${TRELLO_API}/members/me/notifications?${credentials}`,
            method: 'GET',
            qs: qs,
            headers: trello_headers,
            json: true
        }

        request(options)
            .then()
    }

    function getNotifications(userid, query) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var qs = Object.assign(
            { entities: true },
            query
        )
        var options = {
            url: `${TRELLO_API}/members/me/notifications?${credentials}`,
            method: 'GET',
            qs: qs,
            headers: trello_headers,
            json: true
        }

        request(options)
            .then(notifications => {
                if (!notifications.length) {
                    robot.messageRoom(userid, 'Nothing found!')
                } else {
                    displayNotifications(userid, notifications)
                }
            })
            .catch(error => {
                //TODO handle error codes: i.e. 404 not found -> dont post
                errorHandler(userid, error)
                console.log(error)
            })
    }

    function getNotificationsSumUp(userid, query, saveLastNotificationID = 1) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var options = {
            url: `${TRELLO_API}/members/me/notifications?${credentials}`,
            method: 'GET',
            qs: query,
            headers: trello_headers,
            json: true
        }

        request(options)
            .then(notifications => {
                if (!notifications.length) {
                    robot.messageRoom(userid, 'Nothing found!')
                } else {
                    displaySumUp(userid, notifications)

                    if (saveLastNotificationID) {
                        //TODO save last notification id
                        var lastNotificationID = notifications[0].id

                        cache.set(userid, { trello_last_notification: lastNotificationID })

                        var db = mongoskin.MongoClient.connect(mongodb_uri);
                        db.bind('users').findAndModifyAsync(
                            { _id: userid },
                            [["_id", 1]],
                            { $set: { trello_last_notification: lastNotificationID } },
                            { upsert: true })
                            .catch(err => {
                                robot.logger.error(err)
                                if (c.errorsChannel) {
                                    robot.messageRoom(c.errorsChannel, c.errorMessage
                                        + `Script: ${path.basename(__filename)}`)
                                }
                            })
                    }
                }
            })
            .catch(error => {
                //TODO handle error codes: i.e. 404 not found -> dont post
                errorHandler(userid, error)
                console.log(error)
            })
    }

    function displaySumUp(userid, notifications) {
        var typesCnt = {}
        var i, j
        for (i = 0; i < notifications.length; i++) {
            var notifType = notifications[i].type
            if (!typesCnt[notifType]) {
                typesCnt[notifType] = 1
            } else {
                typesCnt[notifType] += 1
            }
        }
        console.log(typesCnt)

        var msg = {
            text: 'Here is your Trello Notifications Sum-Up:',
            attachments: []
        }
        var types = Object.keys(typesCnt)
        var s, have, were
        for (j = 0; j < types.length; j++) {
            var attachment = slackmsg.attachment()
            if (typesCnt[types[j]] > 1) {
                s = 's'
                have = 'have'
                were = 'were'
            } else {
                have = 'has'
                were = 'was'
                s = ''
            }
            switch (types[j]) {
                case 'addAdminToBoard':
                    break
                case 'addAdminToOrganization':
                    attachment.text = `You've been made ${bold('admin')} in ${typesCnt[types[j]]} ${bold('organization')}${s}`
                    msg.attachments.push(attachment)
                    break
                case 'addAttachmentToCard':
                    attachment.color = 'good'
                    attachment.text = `${typesCnt[types[j]]} ${bold('attachement' + s)} ${have} been added to your subscribed card${s} `
                    msg.attachments.push(attachment)
                    break
                case 'addedMemberToCard':
                    msg.attachments.push({ text: `${types[j]} ${typesCnt[types[j]]}` })
                    break
                case 'addedToBoard':
                    attachment.color = 'danger'
                    attachment.text = `You've been ${bold('added')} to ${typesCnt[types[j]]} ${bold('board' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'addedToCard':
                    attachment.color = 'danger'
                    attachment.text = `You've been ${bold('added')} to ${typesCnt[types[j]]} ${bold('card' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'addedToOrganization':
                    attachment.color = 'good'
                    attachment.text = `You've been ${bold('added')} to ${typesCnt[types[j]]} ${bold('board' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'cardDueSoon':
                    attachment.color = 'danger'
                    attachment.text = `The ${bold('due date')} of ${typesCnt[types[j]]} card${s} has ${bold('passed')}`
                    msg.attachments.push(attachment)
                    break
                case 'changeCard':
                    attachment.color = 'warning'
                    attachment.text = `There ${were} ${typesCnt[types[j]]} ${bold('change' + s)} to subscribed ${bold('card' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'closeBoard':
                    attachment.text = `${typesCnt[types[j]]} ${bold('board' + s)} ${have} been ${bold('closed')}`
                    msg.attachments.push(attachment)
                    break
                case 'commentCard':
                    attachment.color = 'warning'

                    attachment.text = `There ${were} ${typesCnt[types[j]]} ${bold('comment' + s)} to your subscribed ${bold('card' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'createdCard':
                    // attachment.text = `${types[j]} ${typesCnt[types[j]]}`
                    // msg.attachments.push(attachment)
                    break
                case 'invitedToBoard':
                    attachment.text = `You've been ${bold('invited')} to ${typesCnt[types[j]]}${bold('board' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'invitedToOrganization':
                    attachment.text = `You've been ${bold('invited')} to ${typesCnt[types[j]]} ${bold('organization' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'makeAdminOfBoard':
                    attachment.text = `You've been made ${bold('admin')} in ${typesCnt[types[j]]} ${bold('board' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'makeAdminOfOrganization':
                    attachment.text = `You've been made ${bold('admin')} in ${typesCnt[types[j]]} ${bold('organization' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'mentionedOnCard':
                    attachment.color = 'warning'
                    attachment.text = `You've been ${bold('mentioned')} on ${typesCnt[types[j]]} ${bold('card' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'removedFromBoard':
                    attachment.color = 'danger'
                    attachment.text = `You've been ${bold('removed')} from ${typesCnt[types[j]]} ${bold('board' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'removedFromCard':
                    attachment.color = 'danger'

                    attachment.text = `You've been ${bold('removed')} from ${typesCnt[types[j]]} ${bold('card' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'removedFromOrganization':
                    attachment.color = 'danger'
                    attachment.text = `You've been ${bold('removed')} from ${typesCnt[types[j]]} ${bold('organization' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'removedMemberFromCard':
                    attachment.color = 'warning'
                    attachment.text = `There ${were} ${typesCnt[types[j]]} member ${bold('deletion' + s)} from ${bold('card' + s)}`
                    msg.attachments.push(attachment)
                    break
                case 'declinedInvitationToBoard':
                case 'declinedInvitationToOrganization':
                case 'unconfirmedInvitedToBoard':
                case 'unconfirmedInvitedToOrganization':
                case 'memberJoinedTrello':
                    break
                case 'updateCheckItemStateOnCard':
                    attachment.text = `${types[j]} ${typesCnt[types[j]]}`
                    msg.attachments.push(attachment)
                    break
            }
        }
        robot.messageRoom(userid, msg)
    }

    function displayNotifications(userid, notifications) {
        var msg = { attachments: [] }
        var i, j

        for (i = 0; i < notifications.length; i++) {
            console.log(i + 1, notifications[i].type)
            var entities = notifications[i].entities
            var pretext = ''
            var text = ''
            for (j = 0; j < entities.length; j++) {
                var entity = entities[j]
                switch (entity.type) {
                    case 'text':
                        pretext += entity.text + ' '
                        break
                    case 'member':
                        pretext += `<https://trello.com/${entity.username}|${entity.text}> (${entity.username})` + ' '
                        break
                    case 'card':
                        pretext += `<https://trello.com/c/${entity.shortLink}|${entity.text}>` + ' '
                        break
                    case 'board':
                        pretext += `<https://trello.com/b/${entity.shortLink}|${entity.text}>` + ' '
                        break
                    case 'comment':
                        text = entity.text
                        break
                    case 'relDate':
                        pretext += entity.current + ' '
                        break
                    case 'attachmentPreview':
                        // TODO: should i add it or not? 
                        break
                    default:
                        // TODO
                        break
                }
            }

            msg.attachments.push({ pretext: i + 1 + '. ' + pretext, text: text })
        }
        robot.messageRoom(userid, msg)
    }

    function getBoardID(userid, boardName) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var query = { fields: 'id,name' }

        var options = {
            url: `${TRELLO_API}/members/me/boards?${credentials}`,
            method: 'GET',
            qs: query,
            headers: trello_headers,
            json: true
        }
        return new Promise(function (resolve, reject) {
            request(options)
                .then(boards => {
                    for (var i = 0; i < boards.length; i++) {
                        if (boards[i].name == boardName) {
                            resolve(boards[i].id)
                        } else if (boards.length == i + 1) {
                            reject(404)
                        }
                    }
                })
                .catch(error => {
                    reject(error)
                })
        })
    }

    /*************************************************************************/
    /*                          helpful functions                            */
    /*************************************************************************/


    function getCredentials(userid) {

        try {
            var token = cache.get(userid).trello_token
            var username = cache.get(userid).trello_username

            if (!token || !username) { // catch the case where username or token are null/undefined
                throw error
            }
        } catch (error) {
            robot.emit('trelloOAuthLogin', userid)
            return false
        }
        return `token=${token}&key=${trelloKey}`

    }


    // TODO change the messages
    function errorHandler(userid, error) {
        if (error.statusCode == 401) {
            robot.messageRoom(userid, c.jenkins.badCredentialsMsg)
        } else if (error.statusCode == 404) {
            robot.messageRoom(userid, c.jenkins.jobNotFoundMsg)
        } else {
            robot.messageRoom(userid, c.errorMessage + 'Status Code: ' + error.statusCode)
            robot.logger.error(error)
        }
    }

    function bold(text) {
        if (robot.adapterName == 'slack') {
            return `*${text}*`
        }
        // Add any other adapters here  
        else {
            return text
        }
    }

    /*******************************************************************/
    /*          Slack Buttons Implementation - TEMPLATE                */
    /*               (not in use - for future use)                     */
    /*******************************************************************/

    function sendMessageToSlackResponseURL(responseURL, JSONmessage) {
        var postOptions = {
            uri: responseURL,
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            json: JSONmessage
        };
        request(postOptions, (error, response, body) => {
            if (error) {
                // handle errors as you see fit
            };
        })
    }

    // trello board
    robot.hear(/trello board/i, function (res_r) {
        // TODO: fetch the board id from other source (env, redis or mongodb)
        let boardId = 'BE7seI7e';
        let args = { fields: "name,url,prefs" };

        trello.get("/1/board/" + boardId, args, function (err, data) {
            if (err) {
                res_r.send(err);
                robot.logger.error(err);
                return 0;
            }
            // else !err
            let msg = slackmsg.buttons();
            msg.attachments[0].title = `<${data.url}|${data.name}>`;
            msg.attachments[0].title_url = 'www.google.com'
            msg.attachments[0].author_name = 'Board'
            msg.attachments[0].callback_id = `trello_board`;
            msg.attachments[0].color = `${data.prefs.backgroundColor}`;

            // attach the board lists to buttons
            let joinBtn = { "name": "join", "text": "Join", "type": "button", "value": "join" };
            let subBtn = { "name": "sub", "text": "Subscribe", "type": "button", "value": "sub" };
            let starBtn = { "name": "star", "text": "Star", "type": "button", "value": "star" };
            let listsBtn = { "name": "lists", "text": "Lists", "type": "button", "value": "lists" };
            let doneBtn = { "name": "done", "text": "Done", "type": "button", "value": "done", "style": "danger" };
            msg.attachments[0].actions.push(joinBtn);
            msg.attachments[0].actions.push(subBtn);
            msg.attachments[0].actions.push(starBtn);
            msg.attachments[0].actions.push(listsBtn);
            msg.attachments[0].actions.push(doneBtn);

            res_r.send(msg);
        })
    })

    var slackCB = 'slack:msg_action:';

    // responding to 'trello_board' interactive message
    robot.on(slackCB + 'trello_board', function (data, res) {
        robot.logger.info(`robot.on: ${slackCB}trello_board`);
        let btnId = data.actions[0].value;
        let btnName = data.actions[0].name;
        let response_url = data.response_url;
        let msg;

        switch (btnId) {
            case 'join':
                break;
            case 'sub':
                break;
            case 'star':
                break;
            case 'lists':
                res.status(200).end(); // best practice to respond with 200 status           
                // get board info to fetch lists
                let boardId = 'BE7seI7e';
                let args = { lists: "all" };
                trello.get("1/board/" + boardId, args, function (err, data) {
                    if (err) {
                        res.send(err);
                        robot.logger.error(err);
                        return;
                    }
                    // else if (!err)
                    // create buttons msg
                    let msg = slackmsg.buttons();
                    msg.text = `*${data.name}* board`;

                    msg.attachments[0].text = `Available lists`;
                    msg.attachments[0].callback_id = `trello_list`;
                    let listsNum = Object.keys(data.lists).length;
                    for (var i = 0; i < listsNum; i++) {
                        // TODO change value to some id or something similar
                        let name = data.lists[i].name;
                        let id = data.lists[i].id;
                        let list = { "name": name, "text": name, "type": "button", "value": id };
                        msg.attachments[0].actions.push(list);
                    }
                    sendMessageToSlackResponseURL(response_url, msg);
                })
                break;
            case 'done':
                //res.status(200).end() // best practice to respond with 200 status
                msg = slackmsg.plainText();
                res.send(msg);
                //sendMessageToSlackResponseURL(response_url, msg);
                // res.send(msg);
                break;
            default:
                //Statements executed when none of the values match the value of the expression
                break;
        }
    })

    // responding to 'trello_list' interactive message
    robot.on(slackCB + 'trello_list', function (data_board, res) {
        let response_url = data_board.response_url;

        res.status(200).end() // best practice to respond with 200 status
        robot.logger.info(`robot.on: ${slackCB}trello_list`);
        let listId = data_board.actions[0].value;
        let listName = data_board.actions[0].name;

        // call function to fetch list - provide list id
        let args = { cards: "all" };
        trello.get("/1/lists/" + listId, args, function (err, data) {
            if (err) {
                robot.logger.error(err);
                res.send(`Error: ${err}`)
                return 0;
            }
            // else !err
            // create buttons msg
            let msg = slackmsg.buttons();
            msg.text = `*${listName}* list`;
            msg.attachments[0].text = `Available Cards`;
            msg.attachments[0].callback_id = `trello_list`;

            let cardsNum = Object.keys(data.cards).length;
            robot.logger.info(`total cards: ${cardsNum}`);
            for (var i = 0; i < cardsNum; i++) {
                let card = data.cards[i].name;
                let cardId = data.cards[i].id;
                let item = { "name": card, "text": card, "type": "button", "value": cardId };
                msg.attachments[0].actions.push(item);
            }

            // respond with information for that list
            sendMessageToSlackResponseURL(response_url, msg);
        })
    })

}


            // switch (notification.type) {
            //     case 'addAdminToBoard':
            //     case 'addAdminToOrganization':
            //     case 'addedAttachmentToCard':
            //     case 'addedMemberToCard':
            //     case 'addedToBoard':
            //     case 'addedToCard':
            //     case 'addedToOrganization':
            //     case 'cardDueSoon':
            //     case 'changeCard':
            //     case 'closeBoard':
            //     case 'commentCard':
            //     case 'createdCard':
            //     case 'declinedInvitationToBoard':
            //     case 'declinedInvitationToOrganization':
            //     case 'invitedToBoard':
            //     case 'invitedToOrganization':
            //     case 'makeAdminOfBoard':
            //     case 'makeAdminOfOrganization':
            //     case 'memberJoinedTrello':
            //     case 'mentionedOnCard':
            //     case 'removedFromBoard':
            //     case 'removedFromCard':
            //     case 'removedFromOrganization':
            //     case 'removedMemberFromCard':
            //     case 'unconfirmedInvitedToBoard':
            //     case 'unconfirmedInvitedToOrganization':
            //     case 'updateCheckItemStateOnCard':
            // }