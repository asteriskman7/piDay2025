'use strict';

/*
  more explicit info on how this calculation of pi works here: https://jsfiddle.net/asteriskman/z3y52691/23/
*/


class App {
  constructor() {
    console.log('init');

    this.storageKey = 'piDay2025';
    this.disableSaves = false;

    this.diceSides = 6;
    this.diceCount = 20;
    this.minVal = this.diceCount;
    this.maxVal = this.diceSides * this.diceCount;
    this.expectedMean = (this.minVal + this.maxVal) / 2;

    this.loadFromStorage();

    document.getElementById('bstart').onclick = () => this.startStream();
    document.getElementById('bcapture').onclick = () => this.captureImage();
    document.getElementById('bprocess').onclick = () => this.processImage();

    this.dx0 = 0;
    this.dy0 = 0;
    this.dx1 = 0;
    this.dy1 = 0;
    document.getElementById('brll').onmousedown = () => this.dx0 = -1;
    document.getElementById('brlr').onmousedown = () => this.dx0 = 1;
    document.getElementById('brrl').onmousedown = () => this.dx1 = -1;
    document.getElementById('brrr').onmousedown = () => this.dx1 = 1;
    document.getElementById('brtu').onmousedown = () => this.dy0 = -1;
    document.getElementById('brtd').onmousedown = () => this.dy0 = 1;
    document.getElementById('brbu').onmousedown = () => this.dy1 = -1;
    document.getElementById('brbd').onmousedown = () => this.dy1 = 1;

    document.getElementById('brll').onmouseup = () => this.dx0 = 0;
    document.getElementById('brlr').onmouseup = () => this.dx0 = 0;
    document.getElementById('brrl').onmouseup = () => this.dx1 = 0;
    document.getElementById('brrr').onmouseup = () => this.dx1 = 0;
    document.getElementById('brtu').onmouseup = () => this.dy0 = 0;
    document.getElementById('brtd').onmouseup = () => this.dy0 = 0;
    document.getElementById('brbu').onmouseup = () => this.dy1 = 0;
    document.getElementById('brbd').onmouseup = () => this.dy1 = 0;

    document.getElementById('brll').ontouchstart = () => this.dx0 = -1;
    document.getElementById('brlr').ontouchstart = () => this.dx0 = 1;
    document.getElementById('brrl').ontouchstart = () => this.dx1 = -1;
    document.getElementById('brrr').ontouchstart = () => this.dx1 = 1;
    document.getElementById('brtu').ontouchstart = () => this.dy0 = -1;
    document.getElementById('brtd').ontouchstart = () => this.dy0 = 1;
    document.getElementById('brbu').ontouchstart = () => this.dy1 = -1;
    document.getElementById('brbd').ontouchstart = () => this.dy1 = 1;

    document.getElementById('brll').ontouchend = () => this.dx0 = 0;
    document.getElementById('brlr').ontouchend = () => this.dx0 = 0;
    document.getElementById('brrl').ontouchend = () => this.dx1 = 0;
    document.getElementById('brrr').ontouchend = () => this.dx1 = 0;
    document.getElementById('brtu').ontouchend = () => this.dy0 = 0;
    document.getElementById('brtd').ontouchend = () => this.dy0 = 0;
    document.getElementById('brbu').ontouchend = () => this.dy1 = 0;
    document.getElementById('brbd').ontouchend = () => this.dy1 = 0;

    document.getElementById('ithresh').onchange = () => this.changeThresh();
    document.getElementById('ithresh').value = this.state.thresh;

    document.getElementById('btogLog').onclick = () => this.toggleLog();

    document.getElementById('ePipMin').value = this.state.pipMin;
    document.getElementById('ePipMax').value = this.state.pipMax;
    document.getElementById('ePipBias').value = this.state.pipBias;
    document.getElementById('ePipMin').onchange = () => this.changePipThresh();
    document.getElementById('ePipMax').onchange = () => this.changePipThresh();
    document.getElementById('ePipBias').onchange = () => this.changePipThresh();
    document.getElementById('bgomode').onclick = () => this.startGoMode();
    document.getElementById('breset').onclick = () => this.reset();
    document.getElementById('cmain').onclick = (evt) => this.doGo(evt);

    document.getElementById('bexport').onclick = () => this.export();

    setInterval( () => this.tick(), 1000/ 30);

    this.video = document.getElementById('vmain');
    this.canvas = document.getElementById('cmain');
    this.ctx = this.canvas.getContext('2d');
    this.plog = document.getElementById('plog');
    this.clickState = -1;

    this.mobile = navigator.userAgentData.mobile;

    this.cgraph = document.getElementById('cgraph');
    this.ctxgraph = this.cgraph.getContext('2d');
    this.goMode = false;

  }

  loadFromStorage() {
    this.state = {
      region: {x0: 0, y0: 0, x1: 200, y1: 200},
      thresh: 128,
      pipMin: 6,
      pipMax: 20,
      pipBias: 0,
      totalRolls: 0,
      totalTotal: 0,
      rollingDiff2Sum: 0,
      buckets: (new Array(this.maxVal + 1)).fill(0),
      maxTotal: 0,
      maxIndex: 0,
      measuredMean: 0,
      stdDev: 0,
      pdensity: 0,
      piEst: 0
    }
    const str = localStorage.getItem(this.storageKey);

    if (str !== null) {
      this.state = {...this.state, ...JSON.parse(str)};
    }
  }

  saveToStorage() {
    if (!this.disableSaves) {
      const str = JSON.stringify(this.state);
      localStorage.setItem(this.storageKey, str);
    }
  }

  reset() {
    this.disableSaves = true;
    localStorage.removeItem(this.storageKey);
    window.location.reload();
  }

  export() {
    document.getElementById('dexport').innerText = JSON.stringify(this.state);
  }

  log(s) {
    this.plog.innerText += `${s}\n`;
  }

  async startStream() {
    let constraint;
    if (this.mobile) {
      constraint = { video: { facingMode: 'environment', width: {ideal: 1920} } };
    } else {
      constraint = { video: { facingMode: 'environment', width: {ideal: 640} } };
    }
    this.stream = await navigator.mediaDevices.getUserMedia(constraint);
    this.video.srcObject = this.stream;
    this.video.play();
    this.video.style.width = '100px';

  }

  async captureImage() {
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.ctx.drawImage(this.video, 0, 0);
  }

  processImage() {
    this.ctx.save();
    const image = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const imageData = image.data;
    const minCount = this.state.pipMin;
    const maxCount = this.state.pipMax;

    //threshold
    const step = 1;
    for (let x = this.state.region.x0; x < this.state.region.x1; x += step) {
      for (let y = this.state.region.y0; y < this.state.region.y1; y += step) {
        const ibase = (x + y * this.canvas.width) * 4;
        const r = imageData[ibase + 0];
        const g = imageData[ibase + 1];
        const b = imageData[ibase + 2];

        const total = r + g + b;

        const thresh = this.state.thresh * 3;

        let newr;
        let newg;
        let newb;

        if (total < thresh) {
          newr = 0;
          newg = 0;
          newb = 0;
        } else {
          newr = 255;
          newg = 255;
          newb = 255;
        }

        imageData[ibase + 0] = newr;
        imageData[ibase + 1] = newg;
        imageData[ibase + 2] = newb;
      }
    }

    //process
    let pipCount = this.state.pipBias;
    //process region
    //when you hit white, start looking for black
    //flood fill on black
    //if it is too large or small, ignore it
    //else, add it to pip count
    for (let x = this.state.region.x0; x < this.state.region.x1; x += step) {
      for (let y = this.state.region.y0; y < this.state.region.y1; y += step) {
        const ibase = (x + y * this.canvas.width) * 4;
        const thresh = imageData[ibase + 0];

        if (thresh === 0) {
          const alreadyProcessed = imageData[ibase + 1];
          if (alreadyProcessed === 0) {
            const count = this.floodFill(x, y, imageData);

            if (count > minCount && count < maxCount) {
              pipCount++;
            }
          }
        }
      }
    }

    pipCount = Math.max(this.minVal, Math.min(this.maxVal, pipCount));

    this.log(`pips: ${pipCount}`);

    this.ctx.fillStyle = '#808080';
    if (this.mobile) {
      this.ctx.font = '100px Monospace';
    } else {
      this.ctx.font = '30px Monospace';
    }

    if (this.goMode) {
      //this.ctx.translate(-this.state.region.x0, -this.state.region.y0);
      this.ctx.putImageData(image, -this.state.region.x0, -this.state.region.y0, 
        this.state.region.x0, this.state.region.y0, 
        this.state.region.x1 - this.state.region.x0,
        this.state.region.y1 - this.state.region.y0);
      this.ctx.fillText(pipCount, 30, (this.state.region.y1 - this.state.region.y0) - 30);
    } else {
      this.ctx.putImageData(image, 0, 0);
      this.ctx.fillText(pipCount, this.state.region.x0 + 30, this.state.region.y1 - 30);
    }

    this.ctx.restore();
     
    this.updatePi(pipCount);
  }

  floodFill(x, y, imageData) {
    let count = 0;

    const edges = [[x, y]];
    imageData[(x + y * this.canvas.width) * 4 + 1] = 1;

    while (edges.length > 0) {
      const [spotx, spoty] = edges.pop();
      count++;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) { continue; }
          const testx = spotx + dx;
          const testy = spoty + dy;
          const testIndex = (testx + testy * this.canvas.width) * 4;
          if (imageData[testIndex] === 0) {
            if (imageData[testIndex + 1] === 0) {
              edges.push([testx, testy]);
              imageData[testIndex + 1] = 1;
            }
          }
        }
      }
    }
    return count;
  }

  canvasClick(evt) {
  }

  tick() {
    const region = this.state.region;
    region.x0 += this.dx0;
    region.y0 += this.dy0;
    region.x1 += this.dx1;
    region.y1 += this.dy1;
    this.ctx.strokeStyle = 'green';
    this.ctx.strokeRect(region.x0, region.y0, region.x1 - region.x0, region.y1 - region.y0);
    this.saveToStorage();
  }

  changeThresh() {
    this.state.thresh = document.getElementById('ithresh').value;
  }
  
  updatePi(total) {
    this.state.totalRolls++;
    this.state.totalTotal += total;

    this.state.rollingDiff2Sum += Math.pow(total - this.expectedMean, 2);

    this.state.buckets[total]++;
    if (this.state.buckets[total] > this.state.maxTotal) {
      this.state.maxTotal = this.state.buckets[total];
      this.state.maxIndex = total;
    }

    this.state.measuredMean = this.state.totalTotal / this.state.totalRolls;
    this.state.stdDev = Math.sqrt(this.state.rollingDiff2Sum / (this.state.totalRolls - 1));
    this.state.pdensity = this.state.buckets[this.state.maxIndex] / this.state.totalRolls;
    this.state.piEst = Math.pow(this.state.pdensity * this.state.stdDev, -2) / 2;

    const ctx = this.ctxgraph;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.cgraph.width, this.cgraph.height);
    const bucketCount = this.maxVal - this.minVal + 1;
    ctx.beginPath();
    const xScale = this.cgraph.width / bucketCount;
    const yMargin = 2;
    const yScale = (this.cgraph.height - 2 * yMargin) / this.state.maxTotal;
    ctx.moveTo(0, this.cgraph.height - yMargin);
    for (let i = this.minVal; i <= this.maxVal; i++) {
      const x1 = (i - this.minVal) * xScale;
      const x2 = x1 + xScale;
      const y = (this.cgraph.height - yMargin) - this.state.buckets[i] * yScale;
      ctx.lineTo(x1, y);
      ctx.lineTo(x2, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'black';
    ctx.fillText(`stddev: ${this.state.stdDev}`, 10, 30);
    ctx.fillText(`max idx: ${this.state.maxIndex}`, 10, 50);
    ctx.fillText(`meas mean: ${this.state.measuredMean}`, 10, 70);
    ctx.fillText(`pdensity: ${this.state.pdensity}`, 10, 90);
    ctx.fillText(`pi est: ${this.state.piEst}`, 10, 110);
    
    ctx.fillText(`roll cnt: ${this.state.totalRolls}`, 10, 130);
  }

  toggleLog() {
    const e = document.getElementById('plog');
    if (e.style.display === 'none') {
      e.style.display = 'block';
    } else {
      e.style.display = 'none';
    }
  }

  changePipThresh() {
    this.state.pipMin = parseInt(document.getElementById('ePipMin').value);
    this.state.pipMax = parseInt(document.getElementById('ePipMax').value);
    this.state.pipBias = parseInt(document.getElementById('ePipBias').value);
  }

  startGoMode() {
    document.getElementById('dsetup').style.display = 'none'; 
    this.goMode = true;
  }

  doGo(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    if (this.goMode) {
      this.captureImage();
      this.processImage();
    } else {
      const w = this.state.region.x1 - this.state.region.x0;
      const h = this.state.region.y1 - this.state.region.y0;
      this.state.region.x0 = Math.floor(x - w / 2);  
      this.state.region.y0 = Math.floor(y - h / 2);
      this.state.region.x1 = this.state.region.x0 + w;
      this.state.region.y1 = this.state.region.y0 + h;
    }
  }

}

const app = new App();
