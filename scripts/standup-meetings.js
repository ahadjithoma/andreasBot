const Conversation = require('hubot-conversation');

module.exports = function (robot) {
    var type = 'user' //Type parameter can take one of two values: user (default) or room 
    var switchBoard = new Conversation(robot, type);

    robot.respond(/setup standup/, function (res) {
        var timeout = 1000 * 60; //60 seconds timeout. Default = 30 sec
        var dialog = switchBoard.startDialog(res, timeout);
        res.reply('Sure, please give me the *name* of your new standup');

        dialog.addChoice(/(.*)/i, function (res) {
            var name = res.match[1];
            res.reply('name = ' + name);
        });
    });
}