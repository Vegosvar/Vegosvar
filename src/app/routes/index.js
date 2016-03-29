/** index.js
* @file: /src/app/routes/index.js
* @description: Main file for loading express routes
* @parameters: Object(app), Object(resources)
* @returns: Express routes
*/

module.exports = function (app, resources) {
  //Setup routes required before everything else
  require('./setup')(app, resources)

  //Auth routes
  require('./auth')(app)

  //Ajax routes
  require('./ajax/privileged')(app, resources)
  require('./ajax/authenticated')(app, resources)
  require('./ajax/unauthenticated')(app, resources)

  //Post routes
  require('./post')(app, resources)

  //Page routes
  require('./pages/privileged')(app, resources)
  require('./pages/authenticated')(app, resources)
  require('./pages/unauthenticated')(app, resources)

  //Error (404/500) routes
  require('./error')(app, resources)
}