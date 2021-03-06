'use strict'

const fs = require('fs')
const cp = require('child_process')
const defaultsdeep = require('lodash.defaultsdeep')
const gulp = require('gulp')
const $ = require('gulp-load-plugins')()
const del = require('del')
const browserSync = require('browser-sync')
const watchify = require('watchify')
const browserify = require('browserify')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const log = require('fancy-log')
const YAML = require('yamljs')
const SassString = require('node-sass').types.String
const notifier = require('node-notifier')
const historyApiFallback = require('connect-history-api-fallback')
const runSequence = require('run-sequence')
const through2 = require('through2')
const autoprefixer = require('autoprefixer')

// /////////////////////////////////////////////////////////////////////////////
// --------------------------- Variables -------------------------------------//
// ---------------------------------------------------------------------------//

const bs = browserSync.create()

// The package.json
var pkg

// Environment
// Set the correct environment, which controls what happens in config.js
if (!process.env.DS_ENV) {
  if (!process.env.CIRCLE_BRANCH || process.env.CIRCLE_BRANCH !== process.env.PRODUCTION_BRANCH) {
    process.env.DS_ENV = 'staging'
  } else {
    process.env.DS_ENV = 'production'
  }
}

var prodBuild = false

// /////////////////////////////////////////////////////////////////////////////
// ------------------------- Helper functions --------------------------------//
// ---------------------------------------------------------------------------//

function readPackage () {
  pkg = JSON.parse(fs.readFileSync('package.json'))
}
readPackage()

// /////////////////////////////////////////////////////////////////////////////
// ------------------------- Callable tasks ----------------------------------//
// ---------------------------------------------------------------------------//

gulp.task('default', ['clean'], function () {
  prodBuild = true
  gulp.start('build')
})

gulp.task('serve', ['vendorScripts', 'javascript', 'styles', 'jekyll'], function () {
  bs.init({
    port: 3000,
    server: {
      baseDir: ['.tmp', '_site'],
      routes: {
        '/node_modules': './node_modules'
      },
      ghostMode: false,
      middleware: [
        historyApiFallback()
      ]
    }
  })
  // watch for changes
  gulp.watch([
    'app/**/*.html',
    'app/**/*.md',
    'app/api/**/*',
    'app/assets/graphics/**/*',
    '!app/assets/icons/collecticons/**/*'
  ], ['jekyll', bs.reload])

  gulp.watch('app/assets/styles/**/*.scss', ['styles'])
  // If templates change trigger the js task that will render the templates.
  gulp.watch('app/assets/templates/*.ejs', ['javascript'])
  gulp.watch('package.json', ['vendorScripts'])
  gulp.watch('app/assets/icons/collecticons/**', ['collecticons'])
})

gulp.task('clean', function () {
  return del(['.tmp', '_site'])
})

// /////////////////////////////////////////////////////////////////////////////
// ------------------------- Browserify tasks --------------------------------//
// ------------------- (Not to be called directly) ---------------------------//
// ---------------------------------------------------------------------------//

// Compiles the user's script files to bundle.js.
// When including the file in the index.html we need to refer to bundle.js not
// main.js
gulp.task('javascript', function () {
  var watcher = watchify(browserify({
    entries: ['./app/assets/scripts/main.js'],
    debug: true,
    cache: {},
    packageCache: {},
    fullPaths: true
  }), { poll: true })

  function bundler () {
    if (pkg.dependencies) {
      watcher.external(Object.keys(pkg.dependencies))
    }
    return watcher.bundle()
      .on('error', function (e) {
        notifier.notify({
          title: 'Oops! Browserify errored:',
          message: e.message
        })
        console.log('Javascript error:', e)
        if (prodBuild) {
          process.exit(1)
        }
        // Allows the watch to continue.
        this.emit('end')
      })
      .pipe(source('bundle.js'))
      .pipe(buffer())
      // Source maps.
      .pipe($.sourcemaps.init({ loadMaps: true }))
      .pipe($.sourcemaps.write('./'))
      .pipe(gulp.dest('.tmp/assets/scripts'))
      .pipe(bs.stream())
  }

  watcher
    .on('log', log)
    .on('update', bundler)

  return bundler()
})

// Vendor scripts. Basically all the dependencies in the package.js.
// Therefore be careful and keep the dependencies clean.
gulp.task('vendorScripts', function () {
  // Ensure package is updated.
  readPackage()
  var vb = browserify({
    debug: true,
    require: pkg.dependencies ? Object.keys(pkg.dependencies) : []
  })
  return vb.bundle()
    .on('error', log.bind(log, 'Browserify Error'))
    .pipe(source('vendor.js'))
    .pipe(buffer())
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest('.tmp/assets/scripts/'))
    .pipe(bs.stream())
})

// /////////////////////////////////////////////////////////////////////////////
// -------------------------- Jekyll tasks -----------------------------------//
// ---------------------------------------------------------------------------//
gulp.task('jekyll', function (done) {
  var args = ['exec', 'jekyll', 'build']

  switch (process.env.DS_ENV) {
    case 'development':
      args.push('--config=_config.yml,_config-dev.yml')
      break
    case 'staging':
      args.push('--config=_config.yml,_config-stage.yml')
      break
    case 'production':
      args.push('--config=_config.yml')
      break
  }

  return cp.spawn('bundle', args, { stdio: 'inherit' })
    .on('close', done)
})

// /////////////////////////////////////////////////////////////////////////////
// ------------------------- Collecticon tasks -------------------------------//
// --------------------- (Font generation related) ---------------------------//
// ---------------------------------------------------------------------------//
gulp.task('collecticons', function (done) {
  var args = [
    'node_modules/collecticons-processor/bin/collecticons.js',
    'compile',
    'app/assets/icons/collecticons/',
    '--font-embed',
    '--font-dest', 'app/assets/fonts',
    '--font-name', 'Collecticons',
    '--font-types', 'woff',
    '--style-format', 'sass',
    '--style-dest', 'app/assets/styles/core/',
    '--style-name', 'collecticons',
    '--class-name', 'collecticon',
    '--author-name', 'Development Seed',
    '--author-url', 'https://developmentseed.org/',
    '--no-preview'
  ]

  return cp.spawn('node', args, { stdio: 'inherit' })
    .on('close', done)
})

// //////////////////////////////////////////////////////////////////////////////
// --------------------------- Helper tasks -----------------------------------//
// ----------------------------------------------------------------------------//
gulp.task('build', function () {
  runSequence(['vendorScripts', 'javascript', 'collecticons'], ['styles', 'jekyll'], ['html', 'images:imagemin'], function () {
    return gulp.src('_site/**/*')
      .pipe($.size({ title: 'build', gzip: true }))
      .pipe($.exit())
  })
})

gulp.task('styles', function () {
  return gulp.src('app/assets/styles/main.scss')
    .pipe($.plumber(function (e) {
      notifier.notify({
        title: 'Oops! Sass errored:',
        message: e.message
      })
      console.log('Sass error:', e.toString())
      if (prodBuild) {
        process.exit(1)
      }
      // Allows the watch to continue.
      this.emit('end')
    }))
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: 'expanded',
      precision: 10,
      functions: {
        'urlencode($url)': function (url) {
          var v = new SassString()
          v.setValue(encodeURIComponent(url.getValue()))
          return v
        }
      },
      includePaths: require('bourbon').includePaths.concat('node_modules/jeet')
    }))
    .pipe($.postcss([ autoprefixer({ grid: true }) ]))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp/assets/styles'))
    // https://browsersync.io/docs/gulp#gulp-sass-maps
    .pipe(bs.stream({ match: '**/*.css' }))
})

// After being rendered by jekyll process the html files. (merge css files, etc)
gulp.task('html', function () {
  let jkConf = YAML.load('_config.yml')
  if (process.env.DS_ENV === 'staging') {
    const stageConf = YAML.load('_config-stage.yml')
    jkConf = defaultsdeep({}, stageConf, jkConf)
  }

  return gulp.src('_site/**/*.html')
    .pipe($.useref({ searchPath: ['.tmp', 'app', '.'] }))
    .pipe(cacheUseref())
    // Do not compress comparisons, to avoid MapboxGLJS minification issue
    // https://github.com/mapbox/mapbox-gl-js/issues/4359#issuecomment-286277540
    // https://github.com/mishoo/UglifyJS2/issues/1609 -> Just until gulp-uglify updates
    .pipe($.if('*.js', $.uglify({ compress: { comparisons: false, collapse_vars: false } })))
    .pipe($.if('*.css', $.csso()))
    .pipe($.if(/\.(css|js)$/, $.rev()))
    .pipe($.revRewrite({ prefix: jkConf.baseurl }))
    .pipe(gulp.dest('_site'))
})

gulp.task('images:imagemin', function () {
  return gulp.src([
    '_site/assets/graphics/content/**/*'
  ])
    .pipe($.imagemin([
      $.imagemin.gifsicle({ interlaced: true }),
      $.imagemin.jpegtran({ progressive: true }),
      $.imagemin.optipng({ optimizationLevel: 5 }),
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling.
      $.imagemin.svgo({ plugins: [{ cleanupIDs: false }] })
    ]))
    .pipe(gulp.dest('_site/assets/graphics'))
})

/**
 * Caches the useref files.
 * Avoid sending repeated js and css files through the minification pipeline.
 * This happens when there are multiple html pages to process.
 */
function cacheUseref () {
  let files = {
    // path: content
  }
  return through2.obj(function (file, enc, cb) {
    const path = file.relative
    if (files[path]) {
      // There's a file in cache. Check if it's the same.
      const prev = files[path]
      if (Buffer.compare(file.contents, prev) !== 0) {
        this.push(file)
      }
    } else {
      files[path] = file.contents
      this.push(file)
    }
    cb()
  })
}
