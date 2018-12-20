const fs = require('fs');
const gulp = require('gulp');
const { src, dest, watch, symlink, task, series, lastRun, parallel } = require('gulp');
const rimraf = require('rimraf');// 只是删除文件以及文件夹 我们没必要去用一个 gulp 插件，直接用原生的 node 模块
const plugins = require('gulp-load-plugins')(); // 自动加载 gulp 插件
const pngquant = require('imagemin-pngquant'); // 使用 pngquant 深度压缩 png 图片的 imagemin 插件
const browserSync = require('browser-sync'); // 本地开发 浏览器实时刷新
const proxy = require('http-proxy-middleware'); // 本地开发 代理
const minimist = require('minimist'); // 命令行参数解析工具

// 解析命令行中的参数
const knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'production' }
};
const options = minimist(process.argv.slice(2), knownOptions);
console.log(options, 'options');

// 创建环境变量
// fs.open(__dirname + '/src/js/env.js', 'w', function (err, fd) {
//   const buf = `window.PROJECT_NODE_ENV = '${options.env}';`;
//   // TODO: 下面这个方法有兼容问题？
//   fs.write(fd, buf, 0, buf.length, function (err, written, buffer) {});
// });

// 定义路径对象
const srcRoot = 'src/'; // 源目录文件夹
const distRoot = 'build/'; // 输出目录文件夹
const paths = {
  src: {
    less: srcRoot + 'less/',
    js: srcRoot + 'js/',
    img: srcRoot + 'img/',
    lib: srcRoot + 'lib/',
    page: srcRoot + 'views/',
  },
  dest: {
    css: distRoot + 'dist/css/',
    js: distRoot + 'dist/js/',
    img: distRoot + 'dist/img/',
    lib: distRoot + 'dist/lib/',
    html: distRoot + 'pages/',
  }
};

/**
 * 删除打包目录
 */
task('clean', (cb) => {
  rimraf('build', cb);
});

/**
 * 处理图片
 */
task('img', () => {
  const imgSuffix = '**/*.+(jpeg|jpg|png|svg|gif|ico)';
  return src([paths.src.img + imgSuffix, paths.src.page + imgSuffix])
  .pipe(plugins.rename(function (path) {
    path.dirname = path.dirname.split('/')[0]; // 将 views/xxx/img/ 下的图片 提到外面一层 放到 images/xx/ 下。去掉了 img 文件夹
  }))
  .pipe(plugins.if(options.env === 'production', plugins.imagemin({
    optimizationLevel: 5, // 取值范围：0-7（优化等级）
    progressive: true, // 无损压缩jpg图片
    verbose: false, // 输出压缩结果
    use: [pngquant()] // 使用 pngquant 深度压缩 png 图片的 imagemin 插件
  })))
  .pipe(dest(paths.dest.img))
});

/**
 * 处理 css
 * 这里将 less 文件分开写，是有原因的 这样打包出来的文件夹会少一层
 */
task('css', () => {
  return src([paths.src.less + '**/*.less', paths.src.page + '**/*.less'], { sourcemaps: true })
    .pipe(plugins.less())
    .pipe(plugins.autoprefixer({
      browsers: ['last 2 versions'],
      cascade: true,
      remove: true
    }))
    .pipe(plugins.if(options.env === 'production', plugins.cleanCss({
      compatibility: 'ie8',
    })))
    .pipe(plugins.rename({
      suffix: '.min'
    }))
    .pipe(dest(paths.dest.css,  { sourcemaps: '.' }));
});

/**
 * 处理 js
 */
task('js', () => {
  return src([paths.src.js + '**/*.js', paths.src.page + '**/*.js'], { sourcemaps: true })
  .pipe(plugins.babel())
  .pipe(plugins.if(options.env === 'production', plugins.uglify()))
  .pipe(plugins.rename({
    suffix: '.min'
  }))
  .pipe(dest(paths.dest.js,  { sourcemaps: '.' }));
});

/**
 * 处理 html
 */
task('html', function() {
  return src(paths.src.page + '**/*.html')
  .pipe(plugins.cheerio(function ($, file, done) {
    // $('body').prepend('<script src="../../dist/js/env.js"></script>');
    $('body').prepend(`<script>window.PROJECT_NODE_ENV = '${options.env}';</script>`);
    done();
  }))
  .pipe(plugins.htmlmin({
    removeComments: true,               // 清除HTML注释
    collapseWhitespace: true,           // 压缩空格
    collapseBooleanAttributes: true,    // 省略布尔属性的值 <input checked="true"/> => <input checked>
    removeEmptyAttributes: true,        // 删除所有空格作属性值 <input id=""> => <input>
    removeScriptTypeAttributes: true,   // 删除<script>的type="text/javascript"
    removeStyleLinkTypeAttributes: true,// 删除<style>和<link>的type="text/css"
    minifyJS: true,                     // 压缩页面JS
    minifyCSS: true                     // 压缩页面CSS
  }))
  .pipe(dest(paths.dest.html));
});

/**
 * 拷贝第三方库
 */
task('lib', () => {
  return src(paths.src.lib + '**/*.*')
    .pipe(dest(paths.dest.lib));
});

/**
 * 监听任务
 */
task('watcher', () => {
  const imgSuffix = '**/*.+(jpeg|jpg|png|svg|gif|ico)';
  watch([paths.src.less + '**/*.less', paths.src.page + '**/*.less'], series('css'));
  watch([paths.src.js + '**/*.js', paths.src.page + '**/*.js'], series('js'));
  watch([paths.src.img + imgSuffix, paths.src.page + imgSuffix], series('img'));
  watch(paths.src.lib + '**/*.*', series('lib'));
  watch(paths.src.page + '**/*.html', series('html'));
});

/**
 * 本地开发代理
 */
const getProxyTable = () =>  {
  return [
    proxy('/api', {
      target: 'https://stageloanh5-test.vbillbank.com/api/', // test
      // target: 'https://stageloanh5.vbillbank.com/api/', // 生产
      // target: 'http://172.18.30.19:8080/', // 锦舟本地
      changeOrigin: true,
      pathRewrite: {
        '^/api/': ''
      }
    }),
    proxy('/wxapi', {
      target: 'https://api.weixin.qq.com/cgi-bin/',
      changeOrigin: true,
      pathRewrite: {
        '^/wxapi/': ''
      }
    }),
    proxy('/wxapp', {
      target: 'https://api.weixin.qq.com/wxa/',
      changeOrigin: true,
      pathRewrite: {
        '^/wxapp/': ''
      }
    }),
  ]
};

/**
 * 创建本地服务器
 */
task('server', () => {
  browserSync.init({
    server: {
      baseDir: "./build/",
      middleware: getProxyTable(),
    },
    files: ['src/'],
    browser: "google chrome",
    notify: true,
    port: 4000
  });
});

exports.default = series('clean', 'img', parallel('css', 'js', 'lib', 'html'), parallel('watcher', 'server'));
exports.build = series('clean', 'img', 'css', 'js', 'lib', 'html');