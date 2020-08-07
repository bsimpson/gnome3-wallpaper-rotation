'use strict';

const { spawnSync } = require( 'child_process' );
const fs = require('fs');
const { URL } = require('url');
const https = require('https');
const wallpaper = require('wallpaper');

// Feel free to change these configuration options
const SUBREDDIT_URL = 'https://www.reddit.com/r/WidescreenWallpaper.json';
const DOWNLOAD_PATH = `/home/${process.env.USER}/Pictures/Wallpapers`;
const CONFIG_FILE = `${DOWNLOAD_PATH}/entries.txt`;

(function() {
  const args = process.argv.slice(2);
  switch(args[0]) {
    case '--prev':
      setToPrevious(args[1]);
      break;
    case '--help':
      showHelp();
      break;
    default:
      setNewImage();
  }
}());

function showHelp() {
  console.log(`
    NAME
      Gnome3 wallpaper changer

    SYNOPSIS
      node /path/to/index.js [OPTION]

    DESCRIPTION
      Sets the wallpaper to the top image on r/WidescreenWallpaper
    
      --prev [STEP]
        Set the wallpaper back to the previous and skip current
      
      --help 
        Show this help
  `);
}

function setToPrevious(step = 1) {
  getPreviousEntry(parseInt(step))
    .then(setWallpaper)
    .catch(console.error);
}

function setNewImage() {
  getImageList()
  .then(saveImage)
  .then(createEntry)
  .then(setWallpaper)
  .catch(console.error);
}


function getImageList() {
  console.log('Starting background changer');

  return new Promise((resolve, reject) => {
    https.get(SUBREDDIT_URL, (res) => {
      let str = '';
  
      res.on('data', chunk => str += chunk);
      res.on('end', () => {
        console.log('Got list of images');
        str = JSON.parse(str);
        resolve(
          str.data.children.map((child) => {
            return child.data.url;
          }).find(url => {
            return url.match(/(jpe?g|png)$/)
          })
        );
      });
    });
  })
}

function saveImage(imageUrl) {
  console.log(`Got top image URL ${imageUrl}`);
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      const filename = imageUrl.split('/').slice(-1)[0];
      const wallpaperPath = `${DOWNLOAD_PATH}/${filename}`;
      const fileStream = fs.createWriteStream(wallpaperPath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(resolve(wallpaperPath));
      });
    });
  });
}

function setWallpaper(pathToWallpaper) {
  return new Promise((resolve, reject) => {
    console.log(`Setting image ${pathToWallpaper}`);
    if (process.platform === 'linux') {
      spawnSync( 'gsettings', [ 'set', 'org.gnome.desktop.background', 'picture-uri', `file:///${wallpaperPath}` ] );
    } else {
      wallpaper.set(wallpaperPath);
    }
    resolve(pathToWallpaper);
  });
}

function createEntry(entry) {
  return new Promise((resolve, reject) => {
    fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
      data = data || '';

      const dataArray = data.split('\n').filter(entry => entry); // strip trailing newline
      const lastEntry = dataArray.pop(); // last entry
      
      if (lastEntry !== entry) {
        fs.appendFile(CONFIG_FILE, `${entry}\n`, function (err) {
          if (err) reject(err);
          resolve(entry);
        });
      } else {
        reject('Image is a repeat');
      }
    });
  })
}

function getPreviousEntry(step) {
  return new Promise((resolve, reject) => {
    fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
      if (err) reject(err);
  
      const dataArray = data.split('\n').filter(entry => entry); // strip trailing newline
      resolve(dataArray[dataArray.length - (step + 1)]);
    });
  });
}
