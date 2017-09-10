// var cache = require('./cache.js').getCache()

module.exports = function (robot) {

    robot.hear(/room/, res => {
        console.log(robot.brain.userForId(res.message.user.id))
        var room = res.message.room
        console.log(robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(room).name)

    })

    robot.catchAll(function (res) {
        console.log('catchAll')
        // var regexp = new RegExp("^(?:" + robot.alias + "|" + robot.name + ") (.*)", "i") 
        var regex = new RegExp(robot.name + " (.*)", "i")
        if (res.message.text.match(regex)) { // captures only direct messages and not messages in channels 
            var msg = res.message.text.match(regex)[1]
            console.log(msg)
        }
    })
};