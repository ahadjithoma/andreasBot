var cache = require('./cache.js').getCache()

module.exports = function (robot) {

    robot.hear(/test/, res => {
        //  console.log(robot.adapter.client.web.channels.history(res.message.room))
        // console.log(robot.brain.userForId(res.message.user.id))
        // var room = res.message.room
        // console.log(robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(room).name)

    })
    
    // ((.|\s)+)
    // robot.respond(/((.*\s*)+)/i, res =>{
    //     console.log(res.match)
    //     res.reply(res.match[1])
    // })

};