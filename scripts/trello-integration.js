// Description:
//   Trello API Integration
//
// Commands:
//   `trello (all|unread|read) notifications`
//	 `trello mentions`
//	 `trello my sumup (all|unread|read|since)`
// 	 `trello link <board|card url> to <channel>`
//	 `trello disable|deactivate webhook <webhook-ID>`
//	 `trello enable|activate webhook <webhook-ID>`
//   `trello update webhooks callback url`
//	 `trello update|change webhook <webhook-ID> channel to <channel>`
//	 `trello delete webhook <webhook-ID>`
//	 `trello show webhooks`
//   `trello reply <comment_text>`
// Configuration
//
// Author
//   andreash92

'use strict'

var slackmsg = require("./slackMsgs.js");
var request = require('request-promise');
var Trello = require('node-trello');
var cache = require('./cache.js').getCache()
var c = require('./config.json')
var mongoskin = require('mongoskin');
var dateFormat = require('dateformat')
var Conversation = require('hubot-conversation');
var path = require('path')

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
    var switchBoard = new Conversation(robot);

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
    robot.respond(/trello my sum-?ups?( all| unread| read| since|)/i, function (res) {
        var userid = res.message.user.id
        var read_filter = res.match[1].trim()
        if (!read_filter) {
            read_filter = 'unread'
        }
        else if (read_filter == 'since') {
            var lastTrelloNotificationID = cache.get(userid, 'trello_last_notification')
            if (!lastTrelloNotificationID) {
                query = { read_filer: 'unread' }
            } else {
                query = { since: lastTrelloNotificationID }
            }
        }
        else {
            var query = { read_filter: read_filter }
        }
        getNotificationsSumUp(userid, query)
    })

    robot.on('trelloSumUp', function (userid, query, saveLastNotif) {
        getNotificationsSumUp(userid, query, saveLastNotif)
    })

    robot.hear(/trello link (.*)trello.com\/(.*)/i, function (res) {
        var room = slackmsg.getChannelName(robot, res)
        var userid = res.message.user.id
        var modelUrl = res.match[2].trim()
        if (room == 'DM') { // DM = Direct Message
            room = '@' + res.message.user.name
        }
        getModelInfo(userid, modelUrl)
            .then(model => {
                createWebhook(userid, model, room)
            })
            .catch(error => {
                robot.logger.error(error)
                robot.messageRoom(c.errorsChannel, c.errorMessage
                    + `Script: ${path.basename(__filename)}`)
            })
    })

    // DEPRECATED
    // use: trello link (.*)

    // // TODO: regexp may not needed. insted use \/ for slash 
    // robot.respond(new RegExp("trello link (.*)trello.com/(.*) to (.*)", "i"), function (res) {
    //     var userid = res.message.user.id
    //     var modelUrl = res.match[2].trim()
    //     var room = res.match[3].trim()

    //     getModelInfo(userid, modelUrl)
    //         .then(model => {
    //             createWebhook(userid, model, room)
    //         })
    //         .catch(error => {
    //             robot.logger.error(error)
    //             robot.messageRoom(c.errorsChannel, c.errorMessage
    //                 + `Script: ${path.basename(__filename)}`)
    //         })
    // })

    robot.hear(/trello unlink (.*)trello.com\/(.*)/i, function (res) {
        var room = slackmsg.getChannelName(robot, res)
        var userid = res.message.user.id
        var modelShortLink = res.match[2].trim().split('/')[1]
        if (room == 'DM') {
            room = '@' + res.message.user.name
        }
        var queryObj = {
            userid: userid,
            modelShortLink: modelShortLink,
            room: room
        }
        getWebhookId(queryObj)
            .then(webhooksIds => {
                Promise.each(webhooksIds, function (webhookId) {
                    deleteWebhook(res.message.user.id, webhookId)
                })
            })
            .catch(error => {
                robot.logger.error(error)
                robot.messageRoom(c.errorsChannel, c.errorMessage
                    + `Script: ${path.basename(__filename)}`)
            })
    })

    robot.respond(/trello (disable|pause|stop|deactivate) webhook (.*)/i, function (res) {
        var webhookId = res.match[2].trim()
        updateWebhook(res.message.user.id, webhookId, { active: false })
    })

    robot.respond(/trello (enable|resume|start|activate) webhook (.*)/i, function (res) {
        var webhookId = res.match[2].trim()
        updateWebhook(res.message.user.id, webhookId, { active: true })
    })

    // The follow command is useful when changing hubot host (i.e. when testing with ngrok).
    // Due to that, it's not uvailable through api.ai NLU/P 
    robot.respond(/trello update webhooks callback url/i, function (res) {
        // var webhookId = res.match[1].trim()
        var userid = res.message.user.id
        robot.messageRoom(userid, 'Note that webhooks not created by you can\'t be updated.')
        updateWebhooksCallbackURL(userid)

    })

    robot.respond(/trello (change|edit|replace|update) webhook (.*) channel to (.*)/i, function (res) {
        var webhookId = res.match[2].trim()
        var channel = res.match[3].trim()
        updateWebhook(res.message.user.id, webhookId, { callbackURL: `${hubot_host_url}/hubot/trello-webhooks?room=${channel}` })
    })

    robot.respond(/trello delete webhook (.*)/i, function (res) {
        var webhookId = res.match[1].trim()
        deleteWebhook(res.message.user.id, webhookId)
    })

    // get the existing trello webhooks and display them
    robot.respond(/trello show webhooks/i, function (res) {
        var userid = res.message.user.id
        getWebhooks(res.message.user.id)
    })
    robot.on('showTrelloWebhooks', function (response, res) {
        var userid = res.message.user.id
        getWebhooks(res.message.user.id)
    })


    robot.on('postTrelloAction', function (modelid, room, actionId) {
        // first i need to get the token of the user who created that webhook.
        Promise.each(cache.get('trelloWebhooks'), function (webhook) {
            if (webhook.room == room && webhook.model_id == modelid) {
                var userid = webhook.userid // this is the id of the user who created the webhook    
                var token = cache.get(userid).trello_token

                getTrelloAction(token, actionId, room)
            }
        }).catch(error => {
            //TODO
        })
    })

    robot.on('trelloBoardRename', function (modelId, modelName) {
        var db = mongoskin.MongoClient.connect(mongodb_uri);
        db.bind('trelloWebhooks').updateAsync(
            { idModel: modelId },
            {
                $set: { modelName: modelName }
            },
            { multi: true },
            { upsert: true })
            .catch(error => {
                robot.logger.error(error)
                if (c.errorsChannel) {
                    robot.messageRoom(c.errorsChannel, c.errorMessage
                        + `Script: ${path.basename(__filename)}`)
                }
            })

    })

    // reply instantly to the last trello card comment mention
    robot.respond(/trello reply (.*)/i, function (res) {
        var userid = res.message.user.id
        var commentText = res.match[1]
        try {
            var cardId = cache.get(userid).trello_last_mentioned_card_id
            if (cardId) {
                addCardComment(userid, cardId, commentText)
            } else {
                throw null
            }
        } catch (error) {
            robot.messageRoom(userid, 'Sorry but no card found.')
        }
    })

    /*************************************************************************/
    /*                             API Calls                                 */
    /*************************************************************************/


    function addCardComment(userid, cardId, commentText) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var query = { text: commentText }

        var options = {
            url: `${TRELLO_API}/cards/${cardId}/actions/comments?${credentials}`,
            method: 'POST',
            qs: query,
            headers: trello_headers,
            json: true
        }

        request(options)
            .then(res => {
                var cardName = res.data.card.name
                var cardUrl = `https://trello.com/c/${res.data.card.shortLink}`
                robot.messageRoom(userid, `Comment on card <${cardUrl}|${cardName}> added.`)
            })
            .catch(error => {
                robot.logger.error(error)
                robot.messageRoom(userid, error.message)
            })
    }

    function updateWebhook(userid, webhookId, query) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var options = {
            url: `${TRELLO_API}/webhooks/${webhookId}?${credentials}`,
            method: 'PUT',
            qs: query,
            headers: trello_headers,
            json: true
        }

        if (query.callbackURL) {
            var room = query.callbackURL.split('room=')[1]
            var dbSet = { room: room }
        } else {
            var dbSet = query
        }

        request(options)
            .then(webhook => {
                //save to db and cache 
                var db = mongoskin.MongoClient.connect(mongodb_uri);
                db.bind('trelloWebhooks').findAndModifyAsync(
                    { _id: webhook.id },
                    [["_id", 1]],
                    {
                        $set: dbSet
                    },
                    { upsert: false })
                    .catch(err => {
                        robot.logger.error(err)
                        if (c.errorsChannel) {
                            robot.messageRoom(c.errorsChannel, c.errorMessage
                                + `Script: ${path.basename(__filename)}`)
                        }
                    })
            })
            .then(() => {
                var handled = robot.emit('resetCacheForTrelloWebhooks')
                if (!handled) {
                    robot.logger.warning('No script handled the resetCacheForTrelloWebhooks event.')
                }
                if (query.active) {
                    robot.messageRoom(userid, 'Webhook activated. You can deactivate it again: `deactivate trello webhook <Webhook ID>`')
                } else if (query.active == false) {
                    robot.messageRoom(userid, 'Webhook deactivated. You can activate it again: `activate trello webhook <Webhook ID>`')
                } else if (query.callbackURL) {
                    robot.messageRoom(userid, 'Webhook ' + webhookId + ' successfully updated')
                }
            })
            .catch(error => {
                // TODO 
                // would be better to prin the error.message or error.error
                if (error.statusCode == 400) {
                    robot.logger.info(error)
                    robot.messageRoom(userid, error.message)
                    robot.messageRoom(userid, 'You provided a wrong webhook ID. Say `show trello webhooks` to see webhooks details.')
                }
                else if (error.statusCode == 401) {
                    robot.logger.error(error.message)
                    robot.messageRoom(userid, error.message)
                    robot.messageRoom(userid, 'Only the user who created the webhook is eligible to make any changes. Say `show trello webhooks` to see webhooks details.')
                } else {
                    robot.messageRoom(userid, error.message)
                }
            })
    }

    function getWebhookId(queryObj) {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        return new Promise(function (resolve, reject) {
            db.bind('trelloWebhooks').find(queryObj).toArrayAsync()
                .then(webhooks => {
                    var idsArray = []
                    Promise.each(webhooks, function (webhook) {
                        idsArray.push(webhook._id)
                    }).then(() => {
                        resolve(idsArray)
                    })
                })
                .catch(error => {
                    reject(error)
                })
        })
    }

    function deleteWebhook(userid, webhookId) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var options = {
            url: `${TRELLO_API}/webhooks/${webhookId}?${credentials}`,
            method: 'DELETE',
            headers: trello_headers,
            json: true
        }

        var db = mongoskin.MongoClient.connect(mongodb_uri);
        request(options)
            .then(webhook => {
                // update db 
                db.bind('trelloWebhooks').removeAsync({ _id: webhookId })
            })
            .then(() => {
                // then update cache (cache 'looks' at db so update it later than db)
                var handled = robot.emit('resetCacheForTrelloWebhooks')
                if (!handled) {
                    robot.logger.warning('No script handled the resetCacheForTrelloWebhooks event.')
                }
                robot.messageRoom(userid, 'Webhook deleted permanently.')
            })
            .catch(error => {
                if (error.statusCode == 400) {
                    robot.messageRoom(userid, 'You provided a wrong webhook ID. Say `show trello webhooks` to see webhooks details.')
                }
                else if (error.statusCode == 401) {
                    robot.messageRoom(userid, 'Only the user who created the webhook is eligible to disable it. Say `show trello webhooks` to see webhooks details.')
                }
                else {
                    robot.messageRoom(userid, error.error)
                }
            })
            .done(() => {
                db.close()
            })

    }

    function updateWebhooksCallbackURL(userid) {
        var db = mongoskin.MongoClient.connect(mongodb_uri);
        db.bind('trelloWebhooks').find().toArrayAsync()
            .then(webhooks => {
                Promise.each(webhooks, function (webhook) {
                    var callbackURL = `${hubot_host_url}/hubot/trello-webhooks?room=${webhook.room}`
                    updateWebhook(webhook.userid, webhook._id, { callbackURL: callbackURL })
                })
            })
            .catch(error => {
                robot.logger.error(error)
                robot.messageRoom(res.message.user.id, c.errorMessage)
            })
            .done(() => {
                db.close()
            })
    }

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
                displayNotifications(room, [action])

                // Add here any logic fot user mentions.
                /* Problem is that:
                 * action.type == 'mentionedOnCard' does not exist. nor webhook.type
                 * but only notification.type
                 * 
                 * Possible walkthrough 1: 
                 *   each time action.type == 'commentCard'
                 *   request from every user the notifications 
                 *   and check for mentionOnCard notification. 
                 *
                 * Possible walkthrough 2: 
                 * (currently working with this one - seems more logic)
                 *   each time action.type == 'commentCard'
                 *   check for any regex word match that starts with '@'
                 *   check if the user exists and get the slack user id.
                 *   After that, inform the user for its mention on card.
                 */

                if (action.type == 'commentCard') {
                    var commentText = action.data.text
                    var cardId = action.data.card.id
                    var regex = /(?:^|\W)@(\w+)(?!\w)/g, match, matches = [];
                    while (match = regex.exec(commentText)) {
                        var user = getSlackUser(match[1])
                        if (user) {
                            cache.set(user.id, { trello_last_mentioned_card_id: cardId })
                            robot.messageRoom(user.id, 'You are mentioned on trello.')
                            displayNotifications(user.id, [action])
                            robot.messageRoom(user.id, '`trello reply <text>` to reply to your last card mentioned')
                        }
                    }
                }
            })
            .catch(error => {
                //TODO
            })
    }

    function userMentionedOnCard(userid) {
        console.log(userid)
        robot.messageRoom(userid, 'Reply back?')
    }

    function getWebhooks(userid) {
        var db = mongoskin.MongoClient.connect(mongodb_uri);
        db.bind('trelloWebhooks').find().toArrayAsync()
            .then(webhooks => {
                var msg = { attachments: [] }
                Promise.each(webhooks, function (webhook) {
                    var attachment = slackmsg.attachment()
                    if (webhook.active) {
                        var active = 'Yes'
                        attachment.color = 'good'
                    }
                    else {
                        var active = 'No'
                        attachment.color = 'danger'
                    }

                    attachment.pretext = webhook.description
                    attachment.fields.push({
                        title: "Channel",
                        value: webhook.room,
                        short: true
                    })
                    attachment.fields.push({
                        title: "Active",
                        value: active,
                        short: true
                    })
                    attachment.fields.push({
                        title: "ID",
                        value: webhook._id,
                        short: true
                    })

                    msg.attachments.push(attachment)
                    return msg
                }).then(() => {
                    if (webhooks.length) {
                        robot.messageRoom(userid, msg)
                    } else {
                        robot.messageRoom(userid, 'There aren`t any webhooks. Say `help trello webhooks` to see the available commands for creating a webhook.')
                    }
                })

            })
            .catch(err => {
                robot.logger.error(err)
                if (c.errorsChannel) {
                    robot.messageRoom(c.errorsChannel, c.errorMessage
                        + `Script: ${path.basename(__filename)}`)
                }
            })

    }

    function createWebhook(userid, model, room) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var username = robot.brain.userForId(userid).name

        var qs = {
            description: `Created by ${username} for the ${model.type} "${model.name}"`,
            callbackURL: `${hubot_host_url}/hubot/trello-webhooks?room=${room}`,
            idModel: model.id
        }

        var options = {
            url: `${TRELLO_API}/webhooks?${credentials}`,
            method: 'POST',
            qs: qs,
            headers: trello_headers,
            json: true
        }

        request(options)
            .then(webhook => {
                //save to db and cache
                var webhookObj = {
                    userid: userid,
                    username: username,
                    idModel: webhook.idModel,
                    modelName: model.name,
                    modelType: model.type,
                    modelShortUrl: model.shortUrl,
                    modelShortLink: model.shortLink,
                    room: room,
                    active: webhook.active,
                    description: webhook.description
                }

                var db = mongoskin.MongoClient.connect(mongodb_uri);
                db.bind('trelloWebhooks').findAndModifyAsync(
                    { _id: webhook.id },
                    [["_id", 1]],
                    {
                        $set: webhookObj
                    },
                    { upsert: true })
                    .catch(error => {
                        robot.logger.error(error)
                        if (c.errorsChannel) {
                            robot.messageRoom(c.errorsChannel, c.errorMessage
                                + `Script: ${path.basename(__filename)}`)
                        }
                    })
            })
            .then(() => {
                // then update cache (cache 'looks' at db so update it later than db)
                var handled = robot.emit('resetCacheForTrelloWebhooks')
                if (!handled) {
                    robot.logger.warning('No script handled the resetCacheForTrelloWebhooks event.')
                }
                robot.messageRoom(room, ' To check your team`s webhooks: `show trello webhooks`')
                robot.messageRoom(userid, 'Webbhook created! To check your team`s webhooks: `show trello webhooks`')
            })
            .catch(error => {
                robot.messageRoom(userid, error.error)
            })

    }


    function getModelInfo(userid, modelUrl) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var typeLetter = modelUrl.split('/')[0]
        var id = modelUrl.split('/')[1]
        var modelType
        if (typeLetter == 'b') {
            modelType = 'boards'
        }
        else if (typeLetter == 'c') {
            modelType = 'cards'
        }

        var query = { fields: 'id,name,shortLink,shortUrl' }
        var options = {
            url: `${TRELLO_API}/${modelType}/${id}?${credentials}`,
            method: 'GET',
            qs: query,
            headers: trello_headers,
            json: true
        }
        return new Promise(function (resolve, reject) {
            request(options)
                .then(model => {
                    resolve({
                        id: model.id,
                        name: model.name,
                        shortLink: model.shortLink,
                        shortUrl: model.shortUrl,
                        type: modelType.slice(0, -1)
                    })
                })
                .catch(error => {
                    reject(error)
                })
        })
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
                robot.logger.error(error)
            })
    }

    function getNotificationsSumUp(userid, query, saveLastNotificationID = false) {
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
                        var lastTrelloNotificationID = notifications[0].id

                        cache.set(userid, { trello_last_notification: lastTrelloNotificationID })

                        var db = mongoskin.MongoClient.connect(mongodb_uri);
                        db.bind('users').findAndModifyAsync(
                            { _id: userid },
                            [["_id", 1]],
                            { $set: { trello_last_notification: lastTrelloNotificationID } },
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

        for (var i = 0; i < notifications.length; i++) {
            var entities = notifications[i].entities
            var pretext = ''
            var text = ''
            for (var j = 0; j < entities.length; j++) {
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
                        if (entity.desc) {
                            text = entity.text
                        }
                        break
                    case 'list':
                        pretext += `"${entity.text}"` + ' '
                        break
                    case 'board':
                        pretext += `<https://trello.com/b/${entity.shortLink}|${entity.text}>` + ' '
                        break
                    case 'comment':
                        text = entity.text
                        break
                    case 'checkItem':
                        pretext += entity.text + ' '
                        break
                    case 'date':
                        pretext += dateFormat(new Date(entity.date), 'mmm dS yyyy, HH:MM TT ')
                        break
                    case 'label':
                        if (entity.text) {
                            pretext += entity.text + ' '
                        } else {
                            pretext += entity.color + ' '
                        }
                        break
                    case 'relDate':
                        pretext += entity.current + ' '
                        break
                    case 'attachment':
                        // if link==true
                        pretext += `<${entity.url}|${entity.text}>` + ' '
                        break
                    case 'attachmentPreview':
                        // pretext += `<${entity.url}|${entity.text}>` + ' '
                        break
                    default:
                        // TODO
                        break
                }
            }
            msg.attachments.push({
                fallback: pretext,
                pretext: pretext,
                text: text
            })
        }
        if (entities.length != 1) {         // This is because of a trello bug (?) 
            robot.messageRoom(userid, msg)  // when notification.type = 'deleteComment' the json includes just one member entity only
        }
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
        else if (robot.adapterName == 'mattermost') {
            return `**${text}**`
        }
        // Add any other adapters here  
        else {
            return text
        }
    }

    function getSlackUser(trelloUsername) {

        var userids = cache.get('userIDs')

        for (var i = 0; i < userids.length; i++) {
            var id = userids[i]

            var user = cache.get(id)
            var cachedTrelloUsername
            try {
                var cachedTrelloUsername = user.trello_username
                if (cachedTrelloUsername == trelloUsername) {
                    return robot.brain.userForId(id)
                }
            } catch (e) {

            }
            return false
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