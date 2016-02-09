/** index.js
* @file: /routes/index.js
* @description: Main file for loading express routes
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

module.exports = function (app, resources) {
  //Auth routes
  require('./auth')(app)

  //Ajax routes
  require('./ajax/unauthenticated')(app, resources)
  require('./ajax/authenticated')(app, resources)
  require('./ajax/privileged')(app, resources)

  //Page routes
  require('./pages/unauthenticated')(app, resources)
  require('./pages/authenticated')(app, resources)
  require('./pages/privileged')(app, resources)

  //Post routes
  require('./post')(app, resources)

  //Error (404/500) routes
  require('./error')(app, resources)
}