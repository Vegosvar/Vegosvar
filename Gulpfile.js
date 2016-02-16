var gulp = require('gulp')
var plugins = require('gulp-load-plugins')()
var del = require('del')
var run_sequence = require('run-sequence')
var util = require('util')
var path = require('path')
var mainBowerFiles = require('main-bower-files')
var bower = require('gulp-bower')
var config = require('./src/config/config')

process.env.NODE_ENV = config.environment

// TODO svg2png, favicons, etc. Look at Köttet!
// TODO Unit tests!

var postcss_url = require('postcss-url')({
  url: function (url, decl, from, dirname, to, options, result) {
    if (url.slice(0, 1) === '/') {
      return url
    }

    return '../images/' + url 
  }
})

var sequence_error = function (callback, error) {
  if (error) {
    plugins.util.log(plugins.util.colors.red('There was an error running the sequence!'))
    process.exit(1)
  }

  callback()
}

var paths = {
  js: [
    'src/app/src/**/*.js'
  ],

  less: [
    'src/app/src/less/**/*.less'
  ],

  images: [
    'src/app/src/images/**/*',
  ]
}

gulp.task('pre-build', function (callback) {
 return run_sequence('clean', function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('bower-install', function (callback) {
  return bower({
    verbosity: 1
  })
})

gulp.task('bower-dependencies', function (callback) {
  var bowerConfig = {
    "overrides": {
      "datatables": {
        "main": [
          "media/js/jquery.dataTables.min.js",
          "media/js/dataTables.bootstrap.min.js",
          "media/css/dataTables.bootstrap.min.css",
          "media/css/jquery.dataTables.min.css"
        ]
      },
      "datatables-plugins": {
        "main": [
          "features/conditionalPaging/dataTables.conditionalPaging.js"
        ]
      },
      "dropzone": {
        "main": [
          "dist/min/dropzone.min.js",
          "dist/min/dropzone.min.css"
        ]
      },
      "fastclick": {
        "main": "lib/fastclick.js",
      },
      "markerclustererplus": {
        "main": "dist/markerclusterer.min.js"
      },
      "highcharts": {
        "main": [
          "highcharts.js",
          "highcharts-more.js"
        ]
      },
      "bootstrap-multiselect": {
        "main": [
          "dist/css/bootstrap-multiselect.css",
          "dist/js/bootstrap-multiselect.js",
          "dist/js/bootstrap-multiselect-collapsible-groups.js"
        ],
        "dependencies": null
      },
      "wysihtml": {
        "main": [
          "parser_rules/advanced_and_extended.js",
          "dist/wysihtml.min.js",
          "dist/wysihtml-toolbar.min.js"
        ]
      }
    }
  }

  bowerConfig.filter = function(path) {
    var srcDir = 'bower_components/'
    var dirTmp = path.substr(path.indexOf(srcDir) + srcDir.length)
    var dirName = dirTmp.substr(0, dirTmp.indexOf('/'))

    var fileType = path.substr(path.lastIndexOf('.') + 1)
    var destDir = fileType + '/' + dirName

    gulp.src(path).pipe(gulp.dest('src/public/assets/' + destDir))
  }

  mainBowerFiles(bowerConfig, callback)
})

gulp.task('build', function (callback) {
  return run_sequence(Object.keys(paths), function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('clean', function (callback) {
  del(['src/public'], callback)
})

var watch

gulp.task('js', function () {
  return gulp.src(paths.js)
        .pipe(!watch ? plugins.util.noop() : plugins.plumber(function (error) {
          plugins.util.log(plugins.util.colors.red('Error (' + error.plugin + '): ' + error.message))

          this.emit('end')
        }))
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(watch ? plugins.util.noop() : plugins.jshint.reporter('fail'))
        .pipe(plugins.jscs())
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('app.js'))
        .pipe(plugins.uglify())
        .pipe(plugins.sourcemaps.write('maps'))
        .pipe(gulp.dest('src/public/assets/js'))
})

gulp.task('less', function () {
  return gulp.src(paths.less)
        .pipe(!watch ? plugins.util.noop() : plugins.plumber(function (error) {
          plugins.util.log(plugins.util.colors.red('Error (' + error.plugin + '): ' + error.message))

          this.emit('end')
        }))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.less())
        .pipe(plugins.autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(plugins.postcss([
          postcss_url
        ]))
        .pipe(plugins.concat('style.css'))
        .pipe(plugins.minifyCss())
        .pipe(plugins.sourcemaps.write('maps'))
        .pipe(gulp.dest('src/public/assets/css'))
})
  
gulp.task('images', function () {
  return gulp.src(paths.images)
        .pipe(gulp.dest('src/public/assets/images'))
})

gulp.task('watch', function () {
  for (var task in paths) {
    gulp.watch(paths[task], [task])
  }
})

gulp.task('serve', function () {
    process.env.port = (process.env.NODE_ENV === 'production') ? false : (process.env.NODE_ENV === 'beta') ? 35729 : 12345
    var server = plugins.liveServer('server.js', undefined, process.env.port)
    server.start()

    if( ! ('headless' in config) ) {
      setTimeout(function () {
        require('open')('http://local.vegosvar.se:8080')
      }, 1000)
    }

    gulp.watch(['src/app/views/**/*.ejs', 'src/app/views/**/*.html', 'src/public/**/*'], function () {
      server.notify.apply(server, arguments)
    })

    gulp.watch(['*.js','src/app/routes/**/*.js', 'src/app/lib/**/*.js'], function () {
      server.start()
    })
})

gulp.task('default', function (callback) {
  watch = true
  return run_sequence('pre-build', 'build', 'bower-install', 'bower-dependencies', ['watch', 'serve'], function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('prod', function (callback) {
  return run_sequence('pre-build', 'build', 'bower-install', 'bower-dependencies', function (error) {
    sequence_error(callback, error)
  })
})
