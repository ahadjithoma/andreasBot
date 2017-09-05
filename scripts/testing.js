var cache = require('./cache.js').getCache()

module.exports = function (robot) {

    robot.respond(/aaa/, res => {
        robot.emit('resetCacheForWebhooks')
    })
};