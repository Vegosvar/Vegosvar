// TODO Just add fallbacks to config.js
var path = require('path')

module.exports = {
  hostname: 'local.vegosvar.se',
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

  instagram: {
    client_id: '',
    client_secret: '',
    callback: 'http://local.vegosvar.se/admin/auth/instagram/callback',
    scope: ['public_content']
  },

  google: {
    client_id: '',
    client_secret: '',
    callback: 'http://local.vegosvar.se/admin/auth/google/callback',
    scope: ['https://www.googleapis.com/auth/analytics.readonly']
  },

  root: path.join(__dirname, '..'),
  uploads: path.join(__dirname, '../uploads'),
  environment: 'development'
}
