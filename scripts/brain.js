var mongoskin = require('mongoskin')
var Promise = require('bluebird')
var encryption = require('./encryption.js')
var c = require('./config.json')
var path = require('path')
var cache = require('./cache.js').getCache()
Promise.promisifyAll(mongoskin)

// config
var mongodb_uri = process.env.MONGODB_URI


module.exports = (robot) => {
    refreshBrain()

    robot.on('refreshBrain', function () {
        refreshBrain()
    })

    function refreshBrain() {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.collection('users').find().toArrayAsync()
            .then(data => {
                data.forEach(function (document) {
                    Promise.all([
                        encryption.decrypt(document.github_token),
                        encryption.decrypt(document.trello_token),
                        encryption.decrypt(document.jenkins_token)
                    ]).then(t => {
                        var values
                        return values = {
                            github_username: document.github_username,
                            jenkins_username: document.jenkins_username,
                            trello_username: document.trello_username,
                            github_token: t[0],
                            jenkins_token: t[1],
                            trello_token: t[2]
                        }
                    }).then(values => {
                        var id = document._id
                        cache.set(id, values)
                        // robot.brain.set(id, values) // (key, value)
                    }).then(() => {
                        // robot.emit('generateJWToken')
                    }).catch(err => {
                        robot.logger.error(err)
                        if (c.errorsChannel)
                            robot.messageRoom(c.errorsChannel, c.errorMessage
                                + `Script: ${path.basename(__filename)}`)
                    })
                })
            }).catch(dbError => {
                robot.logger.error(err)
                if (c.errorsChannel)
                    robot.messageRoom(c.errorsChannel, c.errorMessage
                        + `Script: ${path.basename(__filename)}`)
            }).done(() => {
                db.close()
            })
    }

    robot.respond(/show brain u/, function (res) {
        console.log('\nusers: ', robot.brain.data.users)
    })

    robot.respond(/show brain p/, function (res) {
        console.log('\n_private', robot.brain.data._private)
    })

    robot.respond(/clear brain/, function (res) {
        robot.brain.constructor(robot)
    })

    robot.respond(/refresh brain/, function (res) {
        refreshBrain()
    })

    robot.respond(/write brain/, function (res) {
        var id = res.message.user.id
        robot.brain.set('KEYYY', 'something')
    })

    robot.respond(/delete users/, function (res) {
        delete robot.brain.data.users
    })

    robot.respond(/delete private/, function (res) {
        robot.brain.remove[!'GithubApp']
    })





    var cb = require('./cache.js').getCache()

    robot.respond(/cache set/, function (res) {
        var id = res.message.user.id
        cb.set(`${id}`, {a: 'mytrellotoken'})
        console.log('SETTED: ', cb.data)
    })


    robot.respond(/cache set a/, function (res) {
        var id = res.message.user.id

        cb.set(`${id}.github`, 'mygithubstuff')
        console.log('SETTED: ', cb.data)
    })

    robot.respond(/show cache/, function(res){
        console.log( cb.data)
    })












}



