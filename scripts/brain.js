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
                    var github_token = document.github_token
                    var jenkins_token = document.jenkins_token
                    var trello_token = document.trello_token
                    var id = document._id

                    if (github_token) {
                        var values = {
                            github_username: document.github_username,
                            github_token: encryption.decryptSync(github_token)
                        }
                        cache.set(id, values)
                    }
                    if (jenkins_token) {
                        var values = {
                            jenkins_username: document.jenkins_username,
                            jenkins_token: encryption.decryptSync(jenkins_token)
                        }
                    }
                    if (trello_token) {
                        var values = {
                            trello_username: document.trello_username,
                            trello_token: encryption.decryptSync(trello_token)
                        }
                        cache.set(id, values)
                    }

                    // Promise.all([
                    //     encryption.decrypt(document.github_token),
                    //     encryption.decrypt(document.trello_token),
                    //     encryption.decrypt(document.jenkins_token)
                    // ]).then(t => {
                    //     var values
                    //     return values = {
                    //         github_username: document.github_username,
                    //         jenkins_username: document.jenkins_username,
                    //         trello_username: document.trello_username,
                    //         github_token: t[0],
                    //         jenkins_token: t[1],
                    //         trello_token: t[2]
                    //     }
                    // }).then(values => {
                    //     var id = document._id
                    //     cache.set(id, values)
                    //     // robot.brain.set(id, values) // (key, value)
                    // }).catch(err => {
                    //     robot.logger.error(err)
                    //     if (c.errorsChannel)
                    //         robot.messageRoom(c.errorsChannel, c.errorMessage
                    //             + `Script: ${path.basename(__filename)}`)
                    // })
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

    /*************************************************************/
    // TO BE DELETED 


    var cb = require('./cache.js').getCache()

    robot.respond(/cache set/, function (res) {
        var id = res.message.user.id
        cb.set(`${id}`, { a: 'mytrellotoken' })
        console.log('SETTED: ', cb.data)
    })


    robot.respond(/cache set a/, function (res) {
        var id = res.message.user.id

        cb.set(`${id}.github`, 'mygithubstuff')
        console.log('SETTED: ', cb.data)
    })

    robot.respond(/show cache/, function (res) {
        console.log(cb.data)


        console.log((cb.data))
    })

    robot.respond(/do cache/, function (res) {
        var id1 = 1234
        var id2 = 5678
        // cb.union('githubApp', { id: id1, token:'id1token' })
        // cb.union('githubApp', { id: id2, token:'id2token' })
        // cb.set('githubApp', { id: id2, token:'newtoken' })

        cb.set(`GHAPP.${id1}`, { token: 'fardsgfv', name: 'org' })
        cb.set(`GHAPP.${id2}`, { token: 'fardsgfv', name: "andreas" })
        cb.set(`GHAPP.${id2}`, { token: 'fardsgfv', name: "neeew" })

        // cb.set(`GHAPP`, [{ token: 'fardsgfv', name: 'org' }])
        console.log((cb.data.GHAPP['1234']))

    })
    /*************************************************************/











}



