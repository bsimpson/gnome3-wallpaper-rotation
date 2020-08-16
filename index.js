'use strict';

const { spawnSync } = require( 'child_process' );
const fs = require('fs');
const { URL } = require('url');
const https = require('https');

// Feel free to change these configuration options
const SUBREDDIT_URL = 'https://www.reddit.com/r/WidescreenWallpaper.json';
const DOWNLOAD_PATH = `/home/${process.env.USER}/Pictures/Wallpapers`;

console.log('Starting background changer');

getImageList()
.then(saveImage)
.then(setWallpaper)
.catch(console.error);


function getImageList() {
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

function setWallpaper(pathTowallpaper) {
  return new Promise((resolve, reject) => {
    console.log(`Setting image ${pathTowallpaper}`);
    spawnSync( 'gsettings', [ 'set', 'org.gnome.desktop.background', 'picture-uri', `file:///${pathTowallpaper}` ] );
    resolve();
  });
}