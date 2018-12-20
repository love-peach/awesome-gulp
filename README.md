# awesome-gulp

这是一个使用gulp 4.0 来构建前端工作流的静态网站项目，目的是搭建一个综合，高效，简洁的 gulp 模板项目。

## TODO

- [x] less/scss 转 css
- [x] es6 转 es5
- [x] 压缩 css js 图片
- [x] 构建区分 开发 和 生产
- [x] 页面逻辑区分 开发 和 生产
- [x] 代理接口
- [ ] 添加版本号
- [ ] 替换地址

## 工作流

目前，实现的工作流如下，

- 删除开发目录
- 处理图片
- 处理 css
- 处理 js
- 处理第三方库
- 处理 html
- 启动监听
- 启动本地服务

下面讲一下工作流中的每一步都干了啥。

**首先**，假设我们有如下的路径对象。

```js
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
```

**然后**，再假设我们偶如下方式获取环境变量

```js
const knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'production' }
};
const options = minimist(process.argv.slice(2), knownOptions);
```

**最后**，你有这样的启动方式

```json
{
  "scripts": {
    "start": "cross-env NODE_ENV=development gulp",
    "build": "cross-env NODE_ENV=production gulp build"
  }
}
```

### 删除开发目录 clean

为了保证每次打包，都是最新的文件，一般在执行打包操作时，都需要先清理下目标文件夹。

由于删除文件和文件内容并没有太大关系，所以，我们没必要去用一个 gulp 插件，直接引用一个 node 模块。

```sh
npm install rimraf --save
```

```js
task('clean', (cb) => {
  rimraf('build', cb);
});
```

### 处理图片 img

期望 将如下项目结构中的图片，

```sh
src
├── img/
│   ├── icon/
│   │   ├── icon1.png
│   │   └── icon2.png
│   ├── bg/
│   │   ├── bg1.png
│   │   └── bg2.png
│   ├── logo.png
│   └── favicon.ico
└── views/
    └── about/
        └── img/
            ├── some1.png
            └── some2.png
```

打包成下面这种结构：

```sh
dist
└── img/
    ├── icon/
    │   ├── icon1.png
    │   └── icon2.png
    ├── bg/
    │   ├── bg1.png
    │   └── bg2.png
    ├── about/
    │   ├── some2.png
    │   └── some2.png
    ├── logo.png
    └── favicon.ico
```

中间会根据环境来判断要不要压缩图片

```js
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
```

### 处理样式 css

样式处理的过程属于基本过程吧，没做其他额外的处理，就是 less 预编译，为 css3 属性添加前缀，根据环境压缩 css;

```js
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
```

### 处理样式 js

用了 es6 后，就再也回不去了，所以，这里增加了将 es6 转为 es5 的过程。

```js
task('js', () => {
  return src([paths.src.js + '**/*.js', paths.src.page + '**/*.js'], { sourcemaps: true })
  .pipe(plugins.babel())
  .pipe(plugins.if(options.env === 'production', plugins.uglify()))
  .pipe(plugins.rename({
    suffix: '.min'
  }))
  .pipe(dest(paths.dest.js,  { sourcemaps: '.' }));
});
```

### 处理页面 html

编写页面逻辑的时候，有时候，需要区分开发 和 线上，因此需要一个变量来区分。这里 通过 `gulp-cheerio` 插件 往页面 `body` 中 插入一段脚本 `<script>window.PROJECT_NODE_ENV = '${options.env}';</script>`

然后对 html 进行了压缩。

```js
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
```

### 处理第三方库 lib

纯拷贝

```js
task('lib', () => {
  return src(paths.src.lib + '**/*.*')
    .pipe(dest(paths.dest.lib));
});
```

### 监听任务 watcher

```js
task('watcher', () => {
  const imgSuffix = '**/*.+(jpeg|jpg|png|svg|gif|ico)';
  watch([paths.src.less + '**/*.less', paths.src.page + '**/*.less'], series('css'));
  watch([paths.src.js + '**/*.js', paths.src.page + '**/*.js'], series('js'));
  watch([paths.src.img + imgSuffix, paths.src.page + imgSuffix], series('img'));
  watch(paths.src.lib + '**/*.*', series('lib'));
  watch(paths.src.page + '**/*.html', series('html'));
});
```

### 创建本地服务器 server

```js
task('server', () => {
  browserSync.init({
    server: {
      baseDir: "./build/",
      middleware: getProxyTable(), // 创建本地接口代理
    },
    files: ['src/'],
    browser: "google chrome",
    notify: true,
    port: 4000
  });
});
```

### 创建本地接口代理 server

```js
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
```

## 用到的插件

### 全局

- gulp
- gulp-load-plugins
- gulp-if
- gulp-rename
- cross-env
- rimraf

### css

- gulp-less
- gulp-clean-css
- gulp-autoprefixer

### js

- gulp-babel
- @babel/core
- @babel/preset-env
- gulp-uglify

### img

- gulp-imagemin
- imagemin-pngquant

### html

- gulp-cheerio
- gulp-htmlmin

### 服务

- browser-sync
- http-proxy-middleware

## 与3.0不同之处

自带 sourcemaps，无需通过 `gulp-sourcemaps` 插件生成。

自带编译报错不退出 gulp 任务，之前需要借用 `gulp-plumber` 插件，防止报错，直接退出watch

自带增量编译？ 仅仅传递更改过的文件，之前需要通过 `gulp-changed` 来实现这一目的

## 备注

### js babel

> gulp-babel@8.0.0 requires a peer of @babel/core@^7.0.0 but none is installed. You must install peer dependencies yourself

1、除了安装 `gulp-babel` 插件外，还需要安装 `@babel/core`、`@babel/preset-env` 这两个插件

```sh
npm install @babel/core @babel/preset-env --save-dev
```

2、需要新建 `.babelrc` 文件，内容：

```json
{
  "presets": ["@babel/preset-env"]
}
```