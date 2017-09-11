var cache = require('./cache.js').getCache()

module.exports = function (robot) {

    robot.hear(/room/, res => {
        console.log(robot.brain.userForId(res.message.user.id))
        var room = res.message.room
        console.log(robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(room).name)

    })


};