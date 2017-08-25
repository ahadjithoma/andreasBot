'use strict'

var slackmsg = require("./slackMsgs.js");
var request = require('request-promise');
var Trello = require('node-trello');
var cache = require('./cache.js').getCache()
var c = require('./config.json')

// config
var TRELLO_API = 'https://api.trello.com/1'
var trello_headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}
// auth
var trelloKey = process.env.HUBOT_TRELLO_KEY;
var secret = process.env.HUBOT_TRELLO_OAUTH;
var token = process.env.HUBOT_TRELLO_TOKEN;
// TODO : login based on user
var trelloAuth = new Trello(trelloKey, token);

// convert node-trello callbacks to promises
const Promise = require("bluebird");
var trello = Promise.promisifyAll(trelloAuth);

module.exports = function (robot) {

    robot.respond(/trello (all |unread |read |)notifications/i, function (res) {
        var read_filter = res.match[1].trim()
        var query = `read_filter=${read_filter}`
        if (!read_filter) {
            query = null
        }
        getNotifications(res.message.user.id, query)
    })


    // σηοθλ
    robot.hear(/trello hooks/, function (res) {
        let boardId = 'BE7seI7e';
        let cb_url = 'https://andreasbot.herokuapp.com/hubot/trello-webhooks';
        let args = { description: "my test webhook", callbackURL: cb_url, idModel: '59245663c76f54b975558854' };

        trello.postAsync('/1/webhooks', args).then(function (data) {
            res.send(data)
        }).catch(function (err) {
            res.send(err.Error);
        })
    })

    robot.hear(/delete trello webhook (.*)/, function (res_r) {
        res_r.match[1];
        // TODO0

    })

    robot.on('trello-webhook-event', function (data, res) {

        var room = "random";
        let payload = data.body;
        let type = payload.action.type;
        robot.logger.info(type);
        switch (type) {

            case 'updateList':
                robot.messageRoom(room, `updateList`);
                break;
            case 'voteOnCard':
                break;
            default:
                robot.messageRoom(room, type.split(/(?=[A-Z])/).join(" ").toLowerCase());
                break;
        }
    })


    function getNotifications(userid, query) {
        var credentials = getCredentials(userid)
        if (!credentials) { return 0 }

        var qs = { entities: true }

        var options = {
            url: `${TRELLO_API}/members/me/notifications?${credentials}&${null}`,
            method: 'GET',
            qs: qs,
            headers: trello_headers,
            json: true
        }

        request(options)
            .then(notifications => {
                displayNotifications(notifications)
                // TODO : to be deleted ▼↡
                console.log((notifications))
            })
            .catch(error => {
                //TODO handle error codes: i.e. 404 not found -> dont post
                errorHandler(userid, error)
                console.log(error)
            })
    }

    function displayNotifications(allNotifications) {

        var msg = { attachments: [] }
        var i = 0
        Promise.each(allNotifications, function (notif) {
            i++
            console.log(i)
            var text = ''
            Promise.each(notif.entities, function (ent) {
                if (ent.text) {
                    if (ent.current) {
                        text = text + ent.current + ' '
                    } else {
                        text = text + ent.text + ' '
                    }
                }
            }).then(() => { console.log(text) })
            // var attachment = slackmsg.attachment()
            // switch (notif.type) {
            //     case 'addAdminToBoard':
            //     case 'addAdminToOrganization':
            //         break
            //     case 'addedAttachmentToCard':
            //     var memberCreator = notif.memberCreator.fullName

            //         attachment.pretext = `${memberCreator} attached ${'f'}`
            //         break
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
        }).done(() => {
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
