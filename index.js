if (process.env.NODE_ENV !== 'development') {
  process.env.NODE_ENV = 'production'
}

var passport = require('passport')
var facebook_strategy = require('passport-facebook').Strategy

var express = require('express')
var session = require('express-session')
var session_store = require('connect-mongo')(session)
var cookie_parser = require('cookie-parser')
var body_parser = require('body-parser')
var consolidate = require('consolidate')
var getSlug = require('speakingurl')
var busboy = require('connect-busboy')
var fs = require('fs')
var md5 = require('md5')

var util = require('util')

var config = require('./config')
var image_processer = require('./imageProcesser.js')

var urlencodedParser = body_parser.urlencoded({ extended: false })
var striptags = require('striptags')
var ObjectID = require('mongodb').ObjectID
var db = require('./db')
db.connect()


// TODO Move this out using cluster to a separate file, add more files for routes etc!
// TODO Index auth.facebook etc
// TODO set callback URLs etc in Facebook dev console
// TODO Set enableProof: true
// TODO Set fallback photo to actual link
// TODO Reauthenticate etc?
passport.use(new facebook_strategy({
    clientID: config.facebook.app_id,
    clientSecret: config.facebook.app_secret,
    callbackURL: config.facebook.callback,
    profileFields: ['id', 'name', 'displayName', 'picture.type(large)']
  },

  function (access_token, refresh_token, profile, done) {
    var dbinstance = db.instance()
    var usersdb = dbinstance.collection('users')
    usersdb.findAndModify({
      auth: {
        facebook: profile.id
      }
    },
    [
      ['_id','asc'] // sort order
    ],
    {
      $setOnInsert: {
        auth: {
          facebook: profile.id
        },

        name: {
          display_name: profile.displayName,
          first: profile.name.givenName
        },

        info: {
          website: null,
          description: null,
        },

        photo: profile.photos ? profile.photos[0].value : '/unknown_user.png'
      }
    }, {
      new: true,
      upsert: true
    }, function (error, result) {
      done(error, {
        id: result.value._id,
        display_name: result.value.name.display_name,
        photo: result.value.photo
      })
    })
  }
))

var app = express()

// TODO Replace this with streaming json parser
app.engine('html', consolidate.ejs)
app.set('view engine', 'html')
app.set('views', __dirname + '/views')
app.use(body_parser.json())
app.use(busboy())

app.use(cookie_parser())
// TODO re-use db connection
// TODO resave/saveUnitialized
// TODO heighten cookie max time?
// TODO set secure: true later when redirecting for https etc!
// TODO use redis store?
app.use(session({
  secret: config.session_secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: new session_store({
    url: config.database.host + config.database.name
  }),
  cookie: {
    maxAge: 60*60*1000,
    secure: false
  }
}))

app.use(passport.initialize())
app.use(passport.session())

if (process.env.NODE_ENV === 'development') {
  app.use(express.static(__dirname + '/public'))
  app.use('/includes', express.static(__dirname + '/includes'))
  app.use('/uploads', express.static(__dirname + '/uploads'))
}

passport.serializeUser(function (user, done) {
  //console.log(user)
  done(null, user.id)
})

// TODO error handling etc
passport.deserializeUser(function (id, done) {
  var dbinstance = db.instance()
  var usersdb = dbinstance.collection('users')

  usersdb.find({_id: new ObjectID(id)}, ['_id', 'name', 'photo', 'info']).toArray(function (error, result) {
    done(error, result[0])
  })
})

// TODO dynamically generate routes?

// TODO cache views etc, NODE_ENV === production?

// TODO make one default template instead of the same includes in every?
app.get('/', function (req, res) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')
  var likesdb = dbinstance.collection('likes')

  var pages = {}
  var options = {
    limit: 8,
    sort: [ ['rating.likes', 'desc'] ]
  }
  pagesdb.find({}, options).toArray(function(err, doc) {
    res.render('index', { user: req.user, pages: doc, startpage: false, searchString: req.query.s, striptags: striptags })
  })
})

app.get('/handle', function (req, res) {
  var dbinstance = db.instance()
  var images = dbinstance.collection('pages')

  images.find({}).toArray(function(err, doc) {
    res.json(doc)
  })
})

app.get('/handle/votes', function (req, res) {
  var images = db.get('votes')
  images.find({ }, function(err, doc) {
    res.json(doc)
  })
})

app.post('/handle/post', urlencodedParser, function(req, res) {
  res.send('Done')
})

app.get('/logga-in', function (req, res) {
  // TODO make this a middleware or something
  if (req.isAuthenticated()) {
    // TODO get latest page we were on or something instead
    return res.redirect('/')
  }

  res.render('login', { })
})

app.get('/om', function(req, res) {
  res.render('about', { user: req.user })
})

app.get('/licens', function(req, res) {
  res.render('license', { user: req.user })
})

app.get('/riktlinjer', function (req, res) {
  res.render('guidelines', { user: req.user, hidelink: true })
})

app.get('/villkor', function (req, res) {
  res.render('terms-of-use', { user: req.user, hidelink: true })
})

app.get('/vanliga-fragor', function (req, res) {
  res.render('faq', { user: req.user })
})

app.get('/press', function (req, res) {
  res.render('press', { user: req.user })
})

app.get('/recensera', function (req, res) {
  res.render('vote-login', { user: req.user })
})

app.get('/gilla', function (req, res) {
  res.render('like-login', { user: req.user })
})

app.get('/rapportera', function (req, res) {
  res.render('report', { user: req.user })
})


app.get('/auth/facebook', passport.authenticate('facebook'), function(req, res) {})

// TODO manually handle failure?
// TODO redirect to /konto?
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), function (req, res) {
  res.redirect(req.session.returnTo || '/');
})

app.get('/logga-ut', function (req, res) {
  req.logout()
  res.redirect('/')
})

app.get('/ajax/search', function (req, res) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')

  var query = {
      $text: {
        $search: req.query.s
      }
  }

  var options = {
      "score": {
          $meta: "textScore",
      }
  }

  pagesdb.find(query, options).sort({
    "score": {
        $meta: "textScore"
    }
  }).toArray(function (err, doc) {
    for (var i = 0; i < doc.length; i++) {
      doc[i].post.content = striptags(doc[i].post.content, ['br','p','a','span','i','b'])
    }

    res.json(doc)
  })
})

app.get('/ajax/imageInfo', function (req, res) {
  if(req.query.id != undefined) {
    var dbinstance = db.instance()
    var imagesdb = dbinstance.collection('images')
    imagesdb.find({ _id : new ObjectID(req.query.id) }).toArray(function (err, doc) {
      res.json(doc)
    })
  }
})

app.get('/ajax/addVote', function (req, res) {
  if(req.query.id != undefined && req.query.content != undefined) {
    req.session.returnTo = req._parsedOriginalUrl.path
    if (req.isAuthenticated()) {
      var database = db.instance()
      var votesdb = database.collection('votes')
      votesdb.count({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function(err, count) {
        if(count < 1) {
          var data = {
            content: req.query.content,
            post: { id: new ObjectID(req.query.id) },
            user: { id: req.user._id }
          }

          db.votes.aggregate([
            { $match: { post : { id: 'req.post.id'} } },
            {
              $group: {
                _id: "$post.id",
                average: { $avg: "$content" }
              }
            }
          ])

          votesdb.insert(data, function (err) {
            if(err) throw err
          })

          pagesdb.update({ "_id": new ObjectID(req.query.id) }, {$inc: { "rating.votes": 1, }}, function (err) {
            if(err) throw err
          })

          res.send('0')
        } else {
          res.send('3') // Vote already found!
        }
      })
    } else {
      res.send('1') // Not logged in
    }
  } else {
    res.send('2') // All required variables not found in url
  }
})

app.get('/ajax/like', function (req, res) {
  if(req.query.id != undefined) {
    req.session.returnTo = req._parsedOriginalUrl.path
    if (req.isAuthenticated()) {
      var database = db.instance()
      var likesdb = database.collection('likes')
      likesdb.count({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function (err, count) {
        if(count > 0) { // Already liked, remove it
          likesdb.remove({ "post.id": new ObjectID(req.query.id), "user.id": req.user._id }, function (err) {
            if (err) throw err
          })

          var pagesdb = database.collection('pages')
          pagesdb.update({ "_id": new ObjectID(req.query.id) }, {$inc: { "rating.likes": -1, }}, function (err) {
            if(err) throw err
          })

          likesdb.count({ "post.id": new ObjectID(req.query.id) }, function (err, sum) {
            if (err) throw err
            var response = { 'action':0, 'new_value':sum }
            res.send(response)
          })
        } else { // First time pressing, add it
          var data = {
            post: { id: new ObjectID(req.query.id) },
            user: { id: req.user._id }
          }

          likesdb.insert(data, function (err) {
            if (err) throw err
          })

          var pagesdb = database.collection('pages')
          pagesdb.update({ "_id": new ObjectID(req.query.id) }, {$inc: { "rating.likes": 1, }}, function (err) {
            if (err) throw err
          })

          likesdb.count({ "post.id": new ObjectID(req.query.id) }, function (err, sum) {
            if (err) throw err
            var response = { 'action':1, 'new_value':sum }
            res.send(response)
          })
        }
      })
    } else {
      res.redirect('/login/like')
    }
  } else {
    res.send('2') // All variables isnt set
  }
})

app.get('/:url', function (req, res, next) {
  var url = req.params.url
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')
  var usersdb = dbinstance.collection('users')
  var likesdb = dbinstance.collection('likes')

  pagesdb.count({ url: url }, function (err, count) {
    if(count > 0) {
      pagesdb.find({ url : url }).toArray(function (err, result) {
        usersdb.find({ _id : result[0].user_info.id }).toArray(function(err, user_info) {
          if (req.isAuthenticated ()) {
            likesdb.count({ "post.id": new ObjectID(result[0]._id), "user.id": req.user._id }, function (err, is_liked) {
              if(typeof(user_info[0]) == 'undefined') {
                result[0].user_info.hidden = true
                user_info[0] = { id: '', photo: ''}
              }
                res.render('page', { user: req.user, post: result[0], user_info: user_info[0], userLikes: is_liked })
            })
          } else {
            if(typeof(user_info[0]) == 'undefined') {
              result[0].user_info.hidden = true
              user_info[0] = { id: '', photo: ''}
            }
              res.render('page', { user: req.user, post: result[0], user_info: user_info[0], userLikes: 0 })
          }
        })
      })
    } else {
      return next()
    }
  })
})

app.use(function ensure_authenticated (req, res, next) {
  req.session.returnTo = req._parsedOriginalUrl.path
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/logga-in')
})

app.get('/konto', function (req, res) {
  res.render('konto', { user: req.user })
})

app.get('/installningar', function (req, res) {
  res.render('settings', { user: req.user, loadEditorResources: true })
})

app.post('/installningar/submit', urlencodedParser, function (req, res) {
  var id = req.user._id
  var display_name = req.body.displayName
  var website = req.body.website
  var description = req.body.description

  var dbinstance = db.instance()
  var usersdb = dbinstance.collection('users')

  usersdb.update(
    { _id : id },
    { $set:
      { "name.display_name": display_name,
       "info.website":website,
       "info.description":description }
    }
  )
  res.send('1')
})

app.get('/mina-sidor', function (req, res) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')

  var userid = new ObjectID(req.user._id)

  pagesdb.find( { "user_info.id": userid }).toArray(function(err, doc) {
    console.log(doc)
    res.render('pages', { user: req.user, pages:doc })
  })
})

app.get('/ny', function (req, res) {
  res.render('new', { user: req.user })
})

app.get('/ny/publicerad', function (req, res) {
  if(typeof req.query.newpost === 'undefined') {
    res.render('post/published', { user: req.user, type: "product", hideredirect:true })
  } else {
    res.render('post/published', { user: req.user, type: "product", post_url: req.query.newpost })
  }
})

app.get('/ny/:type', function (req, res) {
  res.render('post/'+req.params.type, { user: req.user, type: req.params.type, loadEditorResources: true, loadDropzoneResources: true })
})

app.get('/redigera/:url', function (req, res, next) {
  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')

  pagesdb.find({url:req.params.url}).toArray(function(err, doc) {
    if(doc !== null && doc.length > 0) {
      var post = doc[0]
      var type = parseInt(post.type)
      var page = null
        switch(type) {
          case 1:
            page = 'fakta'
            break
          case 2:
            page = 'recept'
            break
          case 3:
            page = 'restaurang'
            break
          case 4:
            page = 'produkt'
            break
          case 5:
            page = 'butik'
            break
          default:
            return next()
        }

      if(page !== null) {
        res.render('post/' + page, { user: req.user, post: post, loadEditorResources: true, loadDropzoneResources: true })
      }
    } else {
      next()
    }
  })
})

app.post('/submit', urlencodedParser, function (req, res) {
  // Controller for handling page inputs.
  // ## TODO ######################################################
  // # Add error handling, check and sanitize inputs              #
  // # Add support for multiple sources, ingredients, steps et.c. #
  // ##############################################################

  var id = req.body.id
  var type = req.body.type
  var hidden = (req.body.hidden) ? true : false;
  var niceurl = getSlug(req.body.title, {
    // URL Settings
    separator: '-',
    maintainCase: false,
    symbols: false
  })

  var dbinstance = db.instance()
  var pagesdb = dbinstance.collection('pages')

  if(type == 1) { // Fakta
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        type: req.body.type,
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        cover: {
          id: req.body.cover_image_id,
          filename: req.body.cover_image_filename
        }
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else if(type == 2) { // Recept
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        food_type: req.body.food_type,
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        cover: {
          id: req.body.cover_image_id,
          filename: req.body.cover_image_filename
        }
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else if(type == 3) { // Restaurang
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        city: req.body.city,
        street: req.body.street,
        phone: req.body.phone,
        website: req.body.website,
        email: req.body.email,
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        veg_offer: req.body.veg_offer,
        food: req.body.food,
        openhours: {
          monday: req.body.monday,
          tuesday: req.body.tuesday,
          wednesday: req.body.wednesday,
          thursday: req.body.thursday,
          friday: req.body.friday,
          saturday: req.body.saturday,
          sunday: req.body.sunday
        },
        cover: {
          id: req.body.cover_image_id,
          filename: req.body.cover_image_filename
        },
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else if(type == 4) { // Produkt
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        veg_type: req.body.veg_type,
        product_type: req.body.product_type,
        manufacturer: req.body.manufacturer,
        manufacturer_website: req.body.manufacturer_website,
        cover: {
          id: req.body.cover_image_id,
          filename: req.body.cover_image_filename
        }
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else if(type == 5) { // Butik
    var data = {
      title: req.body.title,
      url: niceurl,
      type: type,
      post: {
        content: req.body.content,
        sources: {
            name: typeof(req.body.source_name) === 'string' ? [req.body.source_name] : req.body.source_name,
            url: typeof(req.body.source_url) === 'string' ? [req.body.source_url] : req.body.source_url,
        },
        license: req.body.license,
        license_cc_version: req.body.license_cc_version,
        license_holder: req.body.license_holder,
        license_holder_website: req.body.license_holder_website,
        city: req.body.city,
        street: req.body.street,
        website: req.body.website,
        openhours: {
          monday: req.body.monday,
          tuesday: req.body.tuesday,
          wednesday: req.body.wednesday,
          thursday: req.body.thursday,
          friday: req.body.friday,
          saturday: req.body.saturday,
          sunday: req.body.sunday
        },
        cover: {
          id: req.body.cover_image_id,
          filename: req.body.cover_image_filename
        }
      },
      user_info: {
        id: req.user._id,
        hidden: hidden
      }
    }
  } else {
    res.redirect('/ny')
  }

  if(id) {
    id = new ObjectID(id) //If editing the post, the id will be provided as a string and we need to convert it to an objectid
  }
  pagesdb.count({ _id : id }, function(err, count) {
    if(err) throw err
    if(count > 0) {
      //Update
      pagesdb.update({_id:id}, data, function(err, result) {
        res.redirect('/ny/publicerad/?newpost='+niceurl)
      })
    } else {
      //Insert
      pagesdb.insert(data, function(err, doc) {
        if(err) throw err
        res.redirect('/ny/publicerad/?newpost='+niceurl)
      })
    }
  })
})

app.post('/submit/file', function(req, res) {
  var fstream
    req.pipe(req.busboy)
    req.busboy.on('file', function (fieldname, file, filename) {
        var dbinstance = db.instance()
        var imagesdb = dbinstance.collection('images')
        imagesdb.count({ }, function (err, num_rows) {
          random = Math.floor((Math.random() * 99999999) + 10000000);
          uHash = md5(num_rows + 1 + random)
          randomsubstring = Math.floor((Math.random() * 20) + 10)
          uFilename = uHash.substring(0, randomsubstring)
          imagesdb.insert({ id:num_rows + 1, filename: uFilename, active: false, deleted: false, "user_info":{ id: req.user._id } }, function(err, doc) {
            if(err) throw err
            fstream = fs.createWriteStream(__dirname + '/uploads/' + uFilename + '_original.jpg')
            file.pipe(fstream)
            fstream.on('finish', function() {
              var resize = image_processer.resize(uFilename, 1200, 630)
              if(resize == true) {
                fstream.on('close', function () {
                  res.send(doc.ops[0]._id)
                })
              }
            })
          })
        })
    })
})

app.use(function (req, res) {
  res.render('404', { user: req.user })
  return
})

// TODO 'uncaughtException' as well? See what happens if DB goes down etc
app.use(function error_handler (error, req, res, next) {
  // TODO better error page
  console.error(error.stack)
  res.status(500)
  res.send('<h1>Något blev fel</h1><p>Servern fick slut på havremjölk.</p>')
})

app.listen(process.env.PORT || config.port, config.address)
