// Description:
//   Generates help commands for Hubot.
//
// Commands:
//   `hubot MYcommand` - test.
//
// URLS:
//   /hubot/help
//
// Configuration:
//   HUBOT_HELP_REPLY_IN_PRIVATE - if set to any value, all `hubot help` replies are sent in private
//   HUBOT_HELP_DISABLE_HTTP - if set, no web entry point will be declared
//   HUBOT_HELP_HIDDEN_COMMANDS - comma-separated list of commands that will not be displayed in help
//
// Notes:
//   These commands are grabbed from comment blocks at the top of each file.


module.exports = function (robot) {
    var CronJob = require('cron').CronJob;


    robot.respond(/yo/i, function (res) {

        var channelMembers = (robot.adapter.client.rtm.dataStore.getChannelByName('general')).members

        channelMembers.forEach(function (id) {
            var user = robot.brain.userForId(id)

            if (!user[robot.adapterName].is_bot && !user[robot.adapterName].is_app_user) {
                console.log(user.name)
            }
        });
    })
};