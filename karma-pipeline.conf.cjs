module.exports = function (config) {
    config.set({
      frameworks: ['jasmine', '@angular-devkit/build-angular'],
      plugins: [
        require('karma-jasmine'),
        require('karma-chrome-launcher'),
        require('karma-jasmine-html-reporter'),
        require('karma-coverage'),
        require('karma-junit-reporter'), // JUnitレポーターを追加
        require('@angular-devkit/build-angular/plugins/karma')
      ],
      client: {
        jasmine: {
          // 設定オプション
        },
        clearContext: false
      },
      reporters: ['progress', 'junit'], // JUnitレポーターを追加
      junitReporter: {
        outputDir: 'test-results', // テスト結果を出力するディレクトリ
        outputFile: 'unit-test-results.xml', // 出力するXMLファイル名
        useBrowserName: false // ブラウザ名を含めない
      },
      port: 9876,
      colors: true,
      logLevel: config.LOG_INFO,
      autoWatch: false,
      browsers: ['ChromeHeadless'],
      singleRun: true,
      restartOnFileChange: true
    });
  };
  