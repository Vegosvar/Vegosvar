var gulp = require('gulp')
var plugins = require('gulp-load-plugins')()
var del = require('del')
var run_sequence = require('run-sequence')
var util = require('util')
var path = require('path')
var config = require('./src/config/config')

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
    'src/js/**/*.js'
  ],

  less: [
    'src/less/**/*.less'
  ],

  images: [
    'src/images/**/*',
  ],
}

gulp.task('pre-build', function (callback) {
  return run_sequence('clean', function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('build', function (callback) {
  return run_sequence(Object.keys(paths), function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('clean', function (callback) {
  del(['public'], callback)
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
        .pipe(gulp.dest('public/assets/js'))
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
        .pipe(gulp.dest('public/assets/css'))
})
  
gulp.task('images', function () {
  return gulp.src(paths.images)
        .pipe(gulp.dest('public/assets/images'))
})

gulp.task('watch', function () {
  for (var task in paths) {
    gulp.watch(paths[task], [task])
  }
})

gulp.task('serve', function () {
    var server = plugins.liveServer('server.js')
    server.start()

    if( ! ('headless' in config) ) {
      setTimeout(function () {
        require('open')('http://local.vegosvar.se:8080')
      }, 1000)
    }

    gulp.watch(['views/**/*.ejs', 'views/**/*.html', 'public/**/*'], function () {
      server.notify.apply(server, arguments)
    })

    gulp.watch('*.js', function () {
      server.start()
    })
})

gulp.task('default', function (callback) {
  watch = true
  return run_sequence('pre-build', 'build', ['watch', 'serve'], function (error) {
    sequence_error(callback, error)
  })
})

gulp.task('prod', function (callback) {
  return run_sequence('pre-build', 'build', function (error) {
    sequence_error(callback, error)
  })
})