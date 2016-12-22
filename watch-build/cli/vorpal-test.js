const vorpal = require('vorpal')();
// var cmd = require('node-cmd');

var exec = require('child_process').exec;
// var spawn = require('child_process').spawn;


var cmd = function(command, callback){
  exec(command).stdout.on('data', callback);
  // spawn(command, {shell: true, stdio: 'inherit'});
  // callback();
};

const webPackDone = 'webpack: bundle is now VALID.';

vorpal
  .command('dev', 'Runs "npm run dev", waits for build finish and then kills it.')
  .action(function(args, cb) {
    this.log('running npm run dev');
    cmd('npm run dev', function(data) {
      process.stdout.write(data);
      if(data.indexOf(webPackDone) !== -1) {
        console.log('build finished, killing it in 1.5 sec!');
        setTimeout(function(){
          vorpal.exec('kill');
          cb();
        }, 1500)
      }
    });
  });

// vorpal
//   .command('devmon', 'Runs "npm run dev", waits for build finish and then kills it.')
//   .action(function(args, cb) {
//     this.log('running npm run dev');
//     cmd('npm run dev', function(data) {
//       process.stdout.write(data);
//       if(data.indexOf(webPackDone) !== -1) {
//         console.log('build finished, killing it in 1.5 sec!');
//         setTimeout(function(){
//           vorpal.exec('kill');
//           cb();
//         }, 1500)
//       }
//     });
//   });

vorpal
  .command('kill', 'Kills web pack dev server.')
  .action(function(args, cb) {
    this.log('killing webpack dev server!');
    cmd('pkill -f webpack-dev-server', function(data) {
      console.log(data);
    });
    cb();
  });

vorpal
  .delimiter('uber-dev$')
  .show();
