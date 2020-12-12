// SPDX-License-Identifier: GPL-2.0+
var elCanvasDiv = document.getElementById("canvas-div");
var elCfg = document.getElementById("cfg");
var elDebug = document.getElementById("debug");
var elLog = document.getElementById("log");
var elc = document.getElementById("canvas-extra");
var ctx = elc.getContext("2d");
let defLineWidth = 1.0;
var w = window,
    d = document,
    e = d.documentElement;

function font_size(size) {
    eltax.style.fontSize = size + "pt";
}

function toggleTa() {
    if (eltax.style.display === "none") {
        eltax.style.display = "block";
        eldebug.style.display = "none";
    } else {
        eltax.style.display = "none";
        eldebug.style.display = "block";
    }
}

function toggleCfg() {
    if (elMenu.style.display === "none") {
        elMenu.style.display = "block";
        elCfg.style.display = "none";
    } else {
        elMenu.style.display = "none";
        elCfg.style.display = "block";
    }
}

var log = console.log;
//var log = function() {};

// log("version:28");

let NORDIC_UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
let NORDIC_UART_CHRC_TX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
let NORDIC_UART_CHRC_RX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
let WACOM_LIVE_SERVICE_UUID = "00001523-1212-efde-1523-785feabcd123";
let WACOM_CHRC_LIVE_PEN_DATA_UUID = "00001524-1212-efde-1523-785feabcd123";
let WACOM_OFFLINE_SERVICE_UUID = "ffee0001-bbaa-9988-7766-554433221100";
let WACOM_OFFLINE_CHRC_PEN_DATA_UUID = "ffee0003-bbaa-9988-7766-554433221100";
let SYSEVENT_NOTIFICATION_SERVICE_UUID = "3a340720-c572-11e5-86c5-0002a5d5c51b";
let SYSEVENT_NOTIFICATION_CHRC_UUID = "3a340721-c572-11e5-86c5-0002a5d5c51b";

const WacomResps = {
    PressureAndButtons: 0x10,
    EnterProximity: 0xa2,
    Data: 0xa1,
    UnknownB3: 0xb3, // might be a ping
    UpdateF1: 0xf1,
    BatteryState: 0xba,
    GetFirmware: 0xb8,
    GetName: 0xbc,
    GetWidthHeight: 0xeb,
    RegConfirmedE4: 0xe4,
    RegStartedEF: 0xef
};

const WacomCmds = {
    Connect: 0xe6,
    GetSetName: 0xbb,
    GetSetTime: 0xb6,
    GetFirmware: 0xb7,
    GetBattery: 0xb9,
    GetWidthHeight: 0xea,
    SetMode: 0xb1,
    GetStrokes: 0xcc,
    AvailableFilesCount: 0xc1,
    DownloadOldestFile: 0xc3,
    DeleteOldestFiles: 0xca,
    RegisterPressButton: 0xe7,
    SetFileTransferReportingType: 0xec,
    UnknownE3: 0xe3
};

function short2long(scha) {
    return '0000' + scha + '-0000-1000-8000-00805f9b34fb';
}

function concatTypedArrays(a, b) { // a, b TypedArray of same type
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}

// Must be 6-bytes
window.bleIdent = "BamBOO";

function onGetChar(charHandle) {
    let theChar0 = charHandle[0];
    theChar0.addEventListener('characteristicvaluechanged',
        handleNotifications);
    // log(theChar0);
    return theChar0.startNotifications().then(_ => {
        log('> Notifications started');
    })
}

function subToChar(subChar, svc, queueChars) {
    // log("Subscribe to " + subChar);
    queueChars = queueChars.then(_ => svc.getCharacteristics(subChar).then(
        charHandle => onGetChar(charHandle))
    );
}

function onChars(characteristics, oneSvc, svc, queueChars) {
    characteristics.forEach(oneChar => {
        window.ble.svc2chars[oneSvc][oneChar.uuid] = oneChar;
        window.ble.chars[oneChar.uuid] = oneChar;
    });
    if (typeof (char2svcSub[svc.uuid]) !== "undefined") {
        // log("this service (" + oneSvc + ") has char to sub: " + char2svcSub[oneSvc]);
        char2svcSub[oneSvc].forEach(subChar => subToChar(subChar, svc, queueChars))
    } else {
        queueChars = queueChars.then(_ => { log("nothing to subscribe to") });
    }
    return queueChars;
}

function onSvc(svc, oneSvc) {
    // log("have handle to svc:" + oneSvc);
    window.ble.svcs[oneSvc] = svc;
    window.ble.svc2chars[oneSvc] = {};
    // log("run - getCharacteristics() in " + oneSvc);
    let queueChars = Promise.resolve();
    let pGetCharsPerScv = svc.getCharacteristics().then(
        characteristics => onChars(characteristics, oneSvc, svc, queueChars))
    return pGetCharsPerScv;
};

function prepBle() {
    let filters = [];
    var options = {};
    var allBle = true;
    window.ble = { svcs: {}, svc2chars: {}, chars: {} };
    svcs = [NORDIC_UART_SERVICE_UUID, SYSEVENT_NOTIFICATION_SERVICE_UUID, WACOM_LIVE_SERVICE_UUID, WACOM_OFFLINE_SERVICE_UUID];
    char2svcSub = {};
    char2svcSub[NORDIC_UART_SERVICE_UUID] = [NORDIC_UART_CHRC_RX_UUID];
    char2svcSub[SYSEVENT_NOTIFICATION_SERVICE_UUID] = [SYSEVENT_NOTIFICATION_CHRC_UUID];
    char2svcSub[WACOM_LIVE_SERVICE_UUID] = [WACOM_CHRC_LIVE_PEN_DATA_UUID];
    char2svcSub[WACOM_OFFLINE_SERVICE_UUID] = [WACOM_OFFLINE_CHRC_PEN_DATA_UUID];
    options.optionalServices = svcs;
    var elNamePfx = document.getElementById('bleNamePfx');
    if (elNamePfx) {
        let filterName = elNamePfx.value;
        if (filterName && filterName != "") {
            filters.push({ namePrefix: filterName });
            allBle = false;
            setCookie("blePfx", filterName)
        } else {
            eraseCookie("blePfx")
        }
    }
    if (allBle) {
        options.acceptAllDevices = true;
    } else {
        options.filters = filters;
    }
    // console.log(options);
    return options;
}

function findBle(e) {
    let encoder = new TextEncoder('utf-8');
    let options = prepBle();
    log('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice(options)
        .then(device => {
            log('Connecting to GATT Server...');
            window.ble.device = device;
            device.addEventListener('gattserverdisconnected', onDisconnected);
            return device.gatt.connect();
        })
        .then(server => {
            log('Getting Device Service...');
            window.ble.server = server;
            let queueSvc = Promise.resolve();
            svcs.forEach(oneSvc => {
                // log("get service: " + oneSvc);
                queueSvc = queueSvc.then(_ => {
                    // log("run - getPrimaryService(" + oneSvc + ")");
                    var getPriSvc = server.getPrimaryService(oneSvc).then(
                        svc => onSvc(svc, oneSvc))
                    return getPriSvc;
                })
                return queueSvc;
            });
            queueSvc = queueSvc.then(_ => {
                // log(window.ble);
                // log(window.ble.chars[NORDIC_UART_CHRC_TX_UUID]);
                let ident = window.bleIdent;
                // log(ident);
                let identBytes = encoder.encode(ident);
                // log(identBytes);
                // Do this on normal connect
                let cmdPfx = Uint8Array.of(WacomCmds.Connect, identBytes.length);
                let cmd0 = concatTypedArrays(cmdPfx, identBytes);
                log(toHexString(cmd0));
                return window.ble.chars[NORDIC_UART_CHRC_TX_UUID].writeValue(cmd0);
            });
            queueSvc = queueSvc.then(_ => {
                // height
                let cmd1 = Uint8Array.of(WacomCmds.GetWidthHeight, 2, 3, 0);
                log(toHexString(cmd1));
                return window.ble.chars[NORDIC_UART_CHRC_TX_UUID].writeValue(cmd1);
            });
            queueSvc = queueSvc.then(_ => {
                // width
                let cmd1 = Uint8Array.of(WacomCmds.GetWidthHeight, 2, 4, 0);
                log(toHexString(cmd1));
                return window.ble.chars[NORDIC_UART_CHRC_TX_UUID].writeValue(cmd1);
            });
            queueSvc = queueSvc.then(_ => {
                let cmd1 = Uint8Array.of(WacomCmds.GetBattery, 1, 0);
                log(toHexString(cmd1));
                return window.ble.chars[NORDIC_UART_CHRC_TX_UUID].writeValue(cmd1);
            });
            queueSvc = queueSvc.then(_ => {
                let cmd2 = Uint8Array.of(WacomCmds.SetMode, 1, 0);
                log(toHexString(cmd2));
                return window.ble.chars[NORDIC_UART_CHRC_TX_UUID].writeValue(cmd2);
            });
            return queueSvc;
        }).then(_ => {
            if (elDebug) {
                elDebug.innerHTML = "Connected";
            };
            topright();
            addLog("Connected");
        })
        .catch(error => {
            log('Argh! ' + error);
        });
}

function regBle(e) {
    let encoder = new TextEncoder('utf-8');
    let options = prepBle();
    log('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice(options)
        .then(device => {
            log('Connecting to GATT Server...');
            addLog("Connecting to GATT Server");
            window.ble.device = device;
            device.addEventListener('gattserverdisconnected', onDisconnected);
            return device.gatt.connect();
        })
        .then(server => {
            log('Getting Device Service...');
            addLog("Get Device");
            window.ble.server = server;
            let queueSvc = Promise.resolve();
            svcs.forEach(oneSvc => {
                // log("get service: " + oneSvc);
                queueSvc = queueSvc.then(_ => {
                    // log("run - getPrimaryService(" + oneSvc + ")");
                    var getPriSvc = server.getPrimaryService(oneSvc).then(
                        svc => onSvc(svc, oneSvc))
                    return getPriSvc;
                })
                return queueSvc;
            });
            queueSvc = queueSvc.then(_ => {
                log(window.ble);
                log(window.ble.chars[NORDIC_UART_CHRC_TX_UUID]);
                let ident = window.bleIdent;
                log(ident);
                let identBytes = encoder.encode(ident);
                log(identBytes);
                // Do this on initial register
                addLog("Sending register command");
                let cmdPfx = Uint8Array.of(WacomCmds.RegisterPressButton, identBytes.length);
                let cmd0 = concatTypedArrays(cmdPfx, identBytes);
                log(cmd0);
                return window.ble.chars[NORDIC_UART_CHRC_TX_UUID].writeValue(cmd0);
            });
            return queueSvc;
        }).then(_ => {
            log("finished");
            if (elDebug) {
                elDebug.innerHTML = "Connected";
            }
            addLog("Connected");
        })
        .catch(error => {
            log('Argh! ' + error);
        });
}

function onDisconnectButtonClick() {
    if (!window.ble.device) {
        return;
    }
    log('Disconnecting from Bluetooth Device...');
    if (window.ble.device.gatt.connected) {
        window.ble.device.gatt.disconnect();
        addLog("Disconnecting");
    } else {
        log('> Bluetooth Device is already disconnected');
    }
}

var logArr = [];
function addLog(val) {
    // console.log("addLog:" + val);
    logArr.push(val);
    if (elLog) {
        elLog.innerHTML = logArr.join("<br />\n");
    }
}

function onDisconnected(event) {
    // Object event.target is Bluetooth Device getting disconnected.
    log('> Bluetooth Device disconnected', event);
    addLog("Disconnected");
}

// button at the bottom
var cdDefOriHoriz = {
    "flip_axes": false,
    "h": { "min": 0, "max": 21600, "rev": false },
    "v": { "min": 0, "max": 14800, "rev": true }
};
// button on the left
var cdDefOriVert = {
    "flip_axes": true,
    "h": { "min": 0, "max": 14800, "rev": true },
    "v": { "min": 0, "max": 21600, "rev": true }
};
var calibrationDone = true;
var cd = cdDefOriHoriz; //copy:JSON.parse(JSON.stringify(cdDefOriVert));

var canvas = elc;

var ignorePressure = true;

function pointIteration(segCallBack) {
    for (segId = 0; segId < points.length; segId++) {
        var cvtLine = [];
        for (pntId = 0; pntId < points[segId].length; pntId++) {
            json = points[segId][pntId];
            var c = { x: 0, y: 0 };
            var inp = { x: json.x, y: json.y };
            if (cd.flip_axes) {
                inp.x = json.y;
                inp.y = json.x;
            }
            c.x = (inp.x - cd.h.min) * canvas.width / (cd.h.max - cd.h.min);
            if (cd.h.rev) {
                c.x = canvas.width - c.x;
            }
            c.y = (inp.y - cd.v.min) * canvas.height / (cd.v.max - cd.v.min);
            // note reverse y in canvas (top-down)
            if (!cd.v.rev) {
                c.y = canvas.height - c.y;
            }
            cvtLine.push({ x: c.x, y: c.y });
        }
        segCallBack(cvtLine)
    }
}

function segDraw(cvtLine) {
    if (cvtLine.length > 0) {
        ctx.strokeStyle = "red";
        ctx.beginPath();
        if (cvtLine.length > 1) {
            ctx.lineWidth = defLineWidth;
            ctx.moveTo(cvtLine[0].x, cvtLine[0].y);
            for (var ii = 1; ii < cvtLine.length; ii++) {
                ctx.lineTo(cvtLine[ii].x, cvtLine[ii].y);
            }
        } else {
            ctx.arc(cvtLine[0].x, cvtLine[0].y, defLineWidth, 0, 2 * Math.PI);
        }
        ctx.stroke();
    };
}

function redraw() {
    pointIteration(segDraw);
}

function segCollect(cvtLine) {
    //window.collectSegs.push(JSON.parse(JSON.stringify(cvtLine)));
    if (cvtLine.length > 1) {
        var line = '<path d="';
        line += "M" + cvtLine[0].x + " " + cvtLine[0].y;
        for (var ii = 1; ii < cvtLine.length; ii++) {
            line += "L" + cvtLine[ii].x + " " + cvtLine[ii].y;
        }
        line += '"/>';
        window.collectSegs.push(line);
    };
}

function share(e) {
    window.collectSegs = [];
    pointIteration(segCollect);
    console.log(window.collectSegs);
    var as_text = `<?xml version="1.0" standalone="no"?>
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN"
     "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
    <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
     width="994.000000pt" height="1280.000000pt" viewBox="0 0 994.000000 1280.000000"
     preserveAspectRatio="xMidYMid meet">
    <metadata>
    Created by potrace 1.15, written by Peter Selinger 2001-2017
    </metadata>
    <g transform="translate(0.000000,1280.000000) scale(0.100000,-0.100000)"
    fill="#000000" stroke="none">
    <path d="M7270 12793 c-960 -35 -1582 -162 -1935 -394 -345 -228 -584 -593
    -695 -1064 -51 -216 -54 -249 -47 -614 7 -398 25 -581 57 -581 31 0 83 278
    139 750 55 460 293 917 597 1145 255 192 602 282 1304 337 105 8 464 12 1115
    13 528 1 1178 5 1444 9 l483 9 -15 -24 c-34 -55 -400 -754 -515 -984 -217
    -435 -377 -701 -562 -936 -115 -145 -326 -352 -430 -421 -259 -172 -770 -375
    -1238 -492 -328 -83 -556 -109 -897 -104 -161 2 -252 -1 -254 -7 -7 -16 94
    -72 178 -99 314 -103 764 -98 1292 14 446 94 909 268 1160 436 365 245 708
    670 1033 1281 l95 178 105 375 c177 629 255 914 253 916 -3 4 -902 131 -1433
    204 l-442 60 -358 -2 c-198 -1 -393 -3 -434 -5z"/>
    <path d="M8592 11829 c-766 -68 -1769 -568 -2782 -1388 -473 -382 -984 -866
    -1374 -1301 -76 -85 -146 -163 -155 -173 -16 -17 -22 -15 -122 32 -575 270
    -1200 298 -1765 80 -278 -107 -672 -344 -976 -587 -162 -129 -483 -447 -602
    -597 -700 -880 -957 -1985 -740 -3170 79 -430 219 -842 434 -1280 207 -423
    417 -745 733 -1125 155 -186 540 -571 727 -726 660 -548 1360 -930 2200 -1202
    102 -33 248 -84 325 -115 828 -326 1595 -363 2282 -110 736 270 1351 871 1789
    1745 259 516 451 1126 553 1758 68 416 86 652 86 1130 0 423 -10 571 -56 895
    -109 767 -354 1409 -710 1856 -72 90 -271 289 -290 289 -13 0 -14 2 87 -121
    270 -328 472 -729 609 -1209 349 -1231 241 -2809 -279 -4080 -270 -658 -644
    -1199 -1091 -1577 -358 -303 -799 -501 -1275 -575 -115 -18 -564 -17 -690 0
    -303 43 -608 125 -905 244 -82 33 -235 88 -340 123 -688 228 -1297 544 -1848
    958 -716 538 -1291 1230 -1663 2002 -220 458 -355 903 -425 1406 -26 192 -37
    618 -20 817 91 1087 630 2000 1546 2621 321 217 595 355 836 421 410 111 859
    77 1272 -97 59 -25 107 -47 107 -49 0 -2 -56 -74 -126 -159 -518 -644 -904
    -1285 -1068 -1775 -174 -522 -97 -889 216 -1038 242 -116 571 -104 1043 38
    782 236 1241 660 1331 1231 20 125 14 362 -11 479 -105 482 -452 966 -922
    1287 l-82 56 28 36 c181 228 815 882 1121 1157 895 805 1752 1357 2503 1613
    181 62 381 112 552 140 72 12 146 24 165 28 l35 6 -40 8 c-48 9 -100 9 -223
    -2z m-4234 -3268 c360 -242 632 -568 767 -921 57 -146 78 -265 78 -430 0 -159
    -11 -223 -63 -358 -67 -173 -236 -377 -425 -511 -239 -168 -696 -341 -1049
    -396 -153 -24 -348 -17 -430 15 -67 26 -139 86 -166 140 -47 92 -51 280 -10
    450 123 510 503 1182 1097 1938 57 72 106 132 109 132 3 0 44 -26 92 -59z"/>
    </g>
    </svg>
    `;
    var as_text = `<?xml version="1.0" standalone="no"?>
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20010904//EN"
     "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
    <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
     width="994.000000pt" height="1280.000000pt" viewBox="0 0 994.000000 1280.000000"
     preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="navy">`;
    as_text += window.collectSegs.join("\n") + "\n";
    as_text += "</g></svg>";
    const blob = new Blob([as_text], { type: "image/svg+xml" });
    // create an URI pointing to that blob
    const url = URL.createObjectURL(blob);

    var a = document.getElementById("dwna");
    // a.setAttribute("class", "svg-crowbar");
    var ts = moment().format('YYYYMMDD_HHms');
    a.setAttribute("download", "wacom" + ts + ".svg");
    a.setAttribute("href", url);
    // a.style["display"] = "none";
    a.click();

    // const win = open(url);
    // so the Garbage Collector can collect the blob
    win.onload = (evt) => URL.revokeObjectURL(url);

    return false;
}

function drawPoint(json) {
    // console.log(canvas.width+"x"+canvas.height);
    if (calibrationDone) {
        var c = { x: 0, y: 0 };
        var inp = { x: json.x, y: json.y };
        if (cd.flip_axes) {
            inp.x = json.y;
            inp.y = json.x;
        }
        c.x = (inp.x - cd.h.min) * canvas.width / (cd.h.max - cd.h.min);
        if (cd.h.rev) {
            c.x = canvas.width - c.x;
        }
        c.y = (inp.y - cd.v.min) * canvas.height / (cd.v.max - cd.v.min);
        // note reverse y in canvas (top-down)
        if (!cd.v.rev) {
            c.y = canvas.height - c.y;
        }
        cursor = [c.x, c.y];
        if (json.p > 0) {
            var radius = 0.0005 * json.p;
            if (ignorePressure)
                radius = defLineWidth / 2;
            ctx.strokeStyle = "blue";
            ctx.beginPath();
            ctx.arc(c.x, c.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        };
    } else {
        msgT2T("Please calibrate", 10);
    }
}

function dumpHex(value) {
    var a = [];
    for (let i = 0; i < value.byteLength; i++) {
        a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
    }
    log('> ' + a.join(' '));
    addLog("Recv: " + a.join(':'));
}

var wh = { w: 0, h: 0 }
var curSeg = 0;
var points = [[]]; // empty array
function addPoint(json) {
    // x,y,p
    if (json.p === 0) {
        nextSegment();
    } else {
        points[curSeg].push({ x: json.x, y: json.y });// ignore pressure , p: json.p });
    }
}

function nextSegment() {
    var preCnt = points[curSeg].length;
    if (preCnt > 0) {
        var preSeg = curSeg;
        curSeg++;
        points[curSeg] = [];
        var res = simplify(points[preSeg], 1.0);
        points[preSeg] = res;
        console.log(preCnt + " -> " + res.length);
        // console.log(points);
    }
}

var elBat = document.getElementById("bat");
function handleNotifications(event) {
    let value = event.target.value;
    let a = [];
    // Convert raw data bytes to hex values just for the sake of showing something.
    // In the "real" world, you'd use data.getUint8, data.getUint16 or even
    // TextDecoder to process raw data bytes.
    if (value.getUint8(0) == WacomResps.BatteryState || value.getUint8(0) == WacomResps.UpdateF1) {
        log("BatteryInfo: level = " + value.getUint8(2) + "% and charging " + (value.getUint8(3) > 0));
        if (elBat) {
            var txt = "<i class='fa fa-battery-half' aria-hidden='true'></i>" +
                value.getUint8(2) +
                "&nbsp;% ";
            if (value.getUint8(3) > 0) {
                txt += "<i class='fa fa-bolt' style='color:#00CC33' aria-hidden='true'></i><span style='color:#00CC33'>&nbsp;charging</span>";
            } else {
                txt += "<i class='fa fa-bolt' style='color:#D3D3D3' aria-hidden='true'></i><span style='color:#D3D3D3'>&nbsp;not-charging</span>";
            };
            elBat.innerHTML = txt;
        };
    } else if (value.getUint8(0) == WacomResps.RegStartedEF) {
        addLog("Registration started");
        addLog("Please press button on tablet");
    } else if (value.getUint8(0) == WacomResps.RegConfirmedE4) {
        addLog("Registration confirmed");
        addLog("Disconnect and Press Conn on screen");
    } else if (value.getUint8(0) == WacomResps.GetWidthHeight) {
        addLog("Width Height");
        dumpHex(value);
        let worh = value.getUint8(2);
        let size = value.getUint8(4) + value.getUint8(5) * 256 + value.getUint8(6) * 256 * 256 + value.getUint8(7) * 256 * 256 * 256;
        // width or height in normal orientation, button is on the left
        console.log(cdDefOriHoriz.h.max, cdDefOriHoriz.v.max, cdDefOriVert.h.max, cdDefOriVert.v.max, size)
        if (worh === 4) {
            // width
            window.wh.w = size;
            cdDefOriHoriz.v.max = size;
            cdDefOriVert.h.max = size;
        } else {
            // worh === 3
            // height
            window.wh.h = size;
            cdDefOriHoriz.h.max = size;
            cdDefOriVert.v.max = size;
        }
        console.log(cdDefOriHoriz.h.max, cdDefOriHoriz.v.max, cdDefOriVert.h.max, cdDefOriVert.v.max, size)
        console.log(window.wh)
    } else if (value.getUint8(0) == WacomResps.Data) {
        let bufLen = (value.byteLength - 2) / 2;
        var uints = new Uint16Array(bufLen);
        //log("bufLen="+bufLen);
        for (var ii = 0; ii < bufLen; ii++) {
            uints[ii] = value.getUint8(ii * 2 + 2) + 256 * value.getUint8(ii * 2 + 3);
        }
        //log("Data",bufLen, value, value.buffer,uints);
        var seq = uints;//.slice(1);
        //log("--");
        var msgs = [];
        while (seq.length > 0) {
            //log(seq);
            if (seq[0] == 0xffff && seq[1] == 0xffff && seq[2] == 0xffff) {
                //log("Left proximity");
                msgs.push({ op: "leftProx" });
                nextSegment();
            } else {
                let x = seq[0];
                let y = seq[1];
                let p = seq[2];
                //log("x:" + x + ",y:" + y + ",p:" + p);
                var json = { x: x, y: y, p: p };
                msgs.push({ op: "data", data: json });
                drawPoint(json);
                addPoint(json);
            }
            seq = seq.slice(3);
        }
        //log(msgs);
    } else {
        dumpHex(value)
    }
}
/* Utils */

function toHexString(value) {
    var a = [];
    for (let ii = 0; ii < value.byteLength; ii++) {
        a.push(('00' + value[ii].toString(16)).slice(-2));
    }
    return a.join(":");
}

function padHex(value) {
    return ('00' + value.toString(16).toUpperCase()).slice(-2);
}

function getUsbVendorName(value) {
    // Check out page source to see what valueToUsbVendorName object is.
    return value +
        (value in valueToUsbVendorName ? ' (' + valueToUsbVendorName[value] + ')' : '');
}

function fixImg(sw, sh, iw, ih, fill, fit) {
    //var sw=$(window).width();
    // var sh=$(window).height();
    //if (theImage) {
    //var iw = theImage.naturalWidth;
    //var ih = theImage.naturalHeight;
    var dw = sw - iw;
    var dh = sh - ih;
    var xw = sw / iw;
    var xh = sh / ih;
    var niw, nih;
    if ((fill || fit) && xw < 1.0 && xh < 1.0) {
        var useHeight = xw < xh;
        if (fit) {
            useHeight = xw > xh;
        }
        if (useHeight) {
            niw = Math.floor(iw * xh);
            nih = sh;
        } else {
            niw = sw;
            nih = Math.floor(ih * xw);
        };
    } else {
        niw = iw;
        nih = ih;
    }
    dw = sw - niw;
    dh = sh - nih;
    var x = dw / 2;
    var y = dh / 2;
    return { w: niw, h: nih, l: x, t: y };
    /*
    theImage.style.width = niw + "px";
    theImage.style.height = nih + "px";
    theImage.style.left = x + 'px';
    theImage.style.top = y + 'px';
    */
    //};
}

{
    var el = document.getElementById("bleNamePfx")
    if (el) {
        cookieBlePfx = getCookie("blePfx")
        if (cookieBlePfx) {
            el.value = cookieBlePfx;
        }
    }
}

var oriVert = true;
function rotate(e) {
    oriVert = !oriVert;
    if (oriVert) {
        cd = cdDefOriVert;
    } else {
        cd = cdDefOriHoriz;
    };
    fitCanvas();
    return false;
}

function fitCanvas() {
    var w = window,
        d = document,
        e = d.documentElement,
        g = d.body.clientWidth;

    sw = w.innerWidth || e.clientWidth || g.clientWidth;
    sh = w.innerHeight || e.clientHeight || g.clientHeight;

    window.idSize = fixImg(sw, sh, cd.h.max, cd.v.max, true, true);
    //console.log(idSize);

    //console.log(JSON.stringify(idSize));
    elc.style.width = (idSize.w) + "px";
    elc.style.height = (idSize.h) + "px";
    elc.width = (idSize.w);
    elc.height = (idSize.h);
    elc.style.top = 0;
    elc.style.left = 0;
    //var bt = 0.5;
    elCanvasDiv.style.width = (idSize.w) + "px";
    elCanvasDiv.style.height = (idSize.h) + "px";
    elCanvasDiv.style.left = idSize.l;
    elCanvasDiv.style.top = idSize.t;
}

function topright() {
    if (elCfg.style.display === "none") {
        elCfg.style.display = "block";
        elCanvasDiv.style.display = "none";
    } else {
        elCfg.style.display = "none";
        elCanvasDiv.style.display = "block";
        fitCanvas();
        redraw();
    }
}

function setCookie(name, value, days = 100) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

/*
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
  .then(function(registration) {
    console.log('Registration successful, scope is:', registration.scope);
  })
  .catch(function(error) {
    console.log('Service worker registration failed, error:', error);
  });
}
*/
