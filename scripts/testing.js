var cache = require('./cache.js').getCache()

module.exports = function (robot) {

    robot.hear(/room/, res => {

        var room = res.message.room

        console.log( robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(room).name)

    })
};