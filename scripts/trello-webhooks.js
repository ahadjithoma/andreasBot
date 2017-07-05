module.exports = function (robot) {

    robot.router.head('/hubot/trello-webhooks', function (req, res) {
        robot.logger.info(`trello-webhook HEAD. Status Code: ${res.statusCode}`);
        res.send(200);
    });

    robot.router.post('/hubot/trello-webhooks', function (req, res) {
        let headers = JSON.stringify(req.headers);  
        robot.logger.info(`trello-webhook POST. Status Code: ${res.statusCode}\nHeaders: ${headers}`);
        robot.emit("trello-webhook-event", req, res);
        res.send(200);

        var room = "random";
        let payload = req.body;
        let type = payload.action.type;
        // switch (type)
        robot.messageRoom('random', type);

/*addAdminToBoard
addAdminToOrganization
addedAttachmentToCard
addedMemberToCard
addedToBoard
addedToCard
addedToOrganization
cardDueSoon
changeCard
closeBoard
commentCard
createdCard
declinedInvitationToBoard
declinedInvitationToOrganization
invitedToBoard
invitedToOrganization
makeAdminOfBoard
makeAdminOfOrganization
memberJoinedTrello
mentionedOnCard
removedFromBoard
removedFromCard
removedFromOrganization
removedMemberFromCard
unconfirmedInvitedToBoard
unconfirmedInvitedToOrganization
updateCheckItemStateOnCard*/
    });
}
