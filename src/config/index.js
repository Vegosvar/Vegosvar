/** index.js
* @file: /config/index.js
* @description: Configures modules
* @parameters: Object(app), Object(resources)
* @exports: Configuration
*/

module.exports = function (app, resources) {
    require('./express')(app, resources)
    require('./passport')(app, resources)
    require('./routes')(app, resources)
}