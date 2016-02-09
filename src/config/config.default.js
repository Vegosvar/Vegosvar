// TODO Just add fallbacks to config.js
var path = require('path')

module.exports = {
  port: 8080,
  address: '127.0.0.1',

  session_secret: 'asdf',

  database: {
    host: 'mongodb://127.0.0.1/', // MongoDB host
    name: 'vegosvar', // MongoDB database name
  },

  facebook: {
    app_id: '',
    app_secret: '',
    callback: 'http://local.vegosvar.se:8080/auth/facebook/callback'
  },

  root: path.join(__dirname, '..'),
}