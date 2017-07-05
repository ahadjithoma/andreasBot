module.exports = function (robot) {

    robot.router.head('/hubot/trello-webhooks', function (req, res) {
        robot.logger.info(`trello-webhook HEAD. Status Code: ${res.statusCode}`);
        res.send(200);
    });

    robot.router.post('/hubot/trello-webhooks', function (req, res) {
        let headers = JSON.stringify(req.headers);
        robot.logger.info(`trello-webhook POST. Status Code: ${res.statusCode}\nHeaders: ${headers}`);
        // robot.emit("trello-webhook-event", req, res);
        res.send(200);

        var room = "random";
        let payload = req.body;
        let type = payload.action.type;
        robot.logger.info(payload); // payload sample here: https://github.com/andreash92/trello-webhooks
        switch (type) {
            case 'addAttachmentToCard':
            case 'addChecklistToCard':
            case 'addLabelToCard':
            case 'addMemberToBoard':
            case 'addMemberToCard':
            case 'commentCard':
            case 'convertToCardFromCheckItem':
            case 'copyCard':
            case 'createCard':
            case 'createLabel':
            case 'createCheckItem':
            case 'createLabel':
            case 'createList':
            case 'deleteAttachmentFromCard':
            case 'deleteCard':
            case 'deleteCheckItem':
            case 'deleteComment':
            case 'deleteLabel':
            case 'emailCard':
            case 'moveCardFromBoard':
            case 'moveCardToBoard':
            case 'moveListFromBoard':
            case 'moveListToBoard':
            case 'removeChecklistFromCard':
            case 'removeLabelFromCard':
            case 'removeMemberFromBoard':
            case 'removeMemberFromCard':
            case 'updateBoard':
            case 'updateCard':
            case 'updateCheckItem':
            case 'updateCheckItemStateOnCard':
            case 'updateChecklist':
            case 'updateComment':
            case 'updateLabel':
            case 'updateList':
            case 'voteOnCard':
                robot.messageRoom(room, type.split(/(?=[A-Z])/).join(" ").toLowerCase());
                break;
            default:
                robot.messageRoom(room, 'webhook not found: ' + type.split(/(?=[A-Z])/));
                break;
        }
        robot.messageRoom('random', type);


    });
}
