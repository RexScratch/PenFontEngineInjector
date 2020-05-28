var font = {};
var fileName = "project.sb3";
var fontSize = 100;

function formatNum(n) {
    const PRECISION = 12;

    n = +n;
    if (Number.isNaN(n)) {
        return 'NaN';
    }

    if (n === Infinity) {
        return 'Infinity';
    }

    if (n === -Infinity) {
        return '-Infinity';
    }

    if (n === 0) {
        return '0';
    }

    const original = n;
    if (n < 0) {
        n *= -1;
    }

    var exponent = Math.floor(Math.log10(n));
    if (n >= (+('1e' + (exponent + 1)))) { // Remove effects of floating-point error
        exponent += 1;
    } else if (n < (+'1e' + exponent)) {
        exponent -= 1;
    }

    var mantissa = n / (+('1e' + exponent)); // 10 ** exponent may introduce error, so this is used instead (base 10 with floats is weird anyway)
    mantissa = +mantissa.toFixed(PRECISION - 1);

    var casted = ''+(+(''+(+mantissa.toFixed(PRECISION - 1)) + 'e' + ('' + exponent)));
    if (casted.length > 1 && casted.charAt(0) === '0') {
        casted = casted.slice(1);
    }

    const scientific = ''+mantissa + 'e' + ('' + exponent);

    if (scientific.length < casted.length) {
        if (original < 0) {
            return '-' + scientific;
        }
        return scientific;
    }

    if (original < 0) {
        return '-' + casted;
    }
    return casted;

}

function round(n) {
    return +((+n).toFixed(6));
}

function lerp(value0, value1, t) {
    return (1 - t) * value0 + t * value1;
}

class Line {

    constructor(x0, y0, x1, y1) {

        x0 = round(x0);
        y0 = round(y0);
        x1 = round(x1);
        y1 = round(y1);

        if (x1 < x0) {
            [x0, x1] = [x1, x0];
            [y0, y1] = [y1, y0];
        }

        this.x0 = x0;
        this.x1 = x1;
        this.xmin = x0;
        this.xmax = x1;
        this.y0 = y0;
        this.y1 = y1;
        this.ymin = Math.min(y0, y1);
        this.ymax = Math.max(y0, y1);
        this.slope = (y1 - y0) / (x1 - x0);
    }

    static createLines(x0, y0, x1, y1) {

        // Creates an array of lines
        // This is used instead of a constructor because vertical lines should be ignored

        var x0 = round(x0);
        var y0 = round(y0);
        var x1 = round(x1);
        var y1 = round(y1);

        if (x0 === x1) {
            return [];
        }

        if (x1 < x0) {
            [x0, x1] = [x1, x0];
            [y0, y1] = [y1, y0];
        }

        return [new Line(x0, y0, x1, y1)];
        
    }

    yOfX(x) {
        if (x < this.xmin || x > this.xmax) {
            return NaN;
        }

        if (x === this.x0) {
            return this.y0;
        }

        if (x === this.x1) {
            return this.y1;
        }

        return this.slope * (x - this.x0) + this.y0;
        
    }

}

class Curve {

    // Represents a quadratic Bézier curve

    constructor(x0, y0, x1, y1, x2, y2) {

        x0 = round(x0);
        y0 = round(y0);
        x1 = round(x1);
        y1 = round(y1);
        x2 = round(x2);
        y2 = round(y2);

        if (x2 < x0) {
            [x0, x2] = [x2, x0];
            [y0, y2] = [y2, y0];
        }

        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x2;
        this.y1 = y2;

        this.controlX = x1;
        this.controlY = x2;

        this.ax = x2 - 2 * x1 + x0;
        this.bx = 2 * (x1 - x0);
        this.cx = x0;

        this.ay = y2 - 2 * y1 + y0;
        this.by = 2 * (y1 - y0);
        this.cy = y0;

        this.xmin = x0;
        this.xmax = x1;

        // Solve for t when dy/dt = 0  
        const extremeT = (-1 * this.by) / (2 * this.ay);
        const extremeY = this.yOfT(extremeT);

        this.ymin = Math.min(y0, y2, extremeY);
        this.ymax = Math.max(y0, y2, extremeY);
        
    }

    static createCurves(x0, y0, x1, y1, x2, y2, x3, y3) {

        // Creates an array of curves
        // This is used instead of a constructor because cubic curves need to be split
        // Quadratic curves may also be split if they cannot be expressed as a function of x

        x0 = round(x0);
        y0 = round(y0);
        x1 = round(x1);
        y1 = round(y1);
        x2 = round(x2);
        y2 = round(y2);

        if (x3 == null && y3 == null) {

            // The curve is quadratic

            if (x0 === x1 && x1 === 2) {
                return [];
            }

            if (x2 < x0) {
                [x0, x2] = [x2, x0];
                [y0, y2] = [y2, y0];
            }

            if (x0 <= x1 && x1 <= x2) {
                return [new Curve(x0, y0, x1, y2, x2, y2)];
            }

            // The curve cannot be expressed as a function of x

            const ax = x2 - 2 * x1 + x0;
            const bx = 2 * (x1 - x0);
            const cx = x0;

            const ay = y2 - 2 * y1 + y0;
            const by = 2 * (y1 - y0);
            const cy = y0;

            // Solve for t when dx/dt = 0
            const extremeT = (-1 * bx) / (2 * ax);
            
            const controlX0 = lerp(x0, x1, extremeT);
            const controlY0 = lerp(y0, y1, extremeT);
            const controlX1 = lerp(x1, x2, extremeT);
            const controlY1 = lerp(y1, y2, extremeT);
            const midX = lerp(controlX0, controlX1, extremeT);
            const midY = lerp(controlY0, controlY1, extremeT);

            return [new Curve(x0, y0, controlX0, controlY0, midX, midY), new Curve(midX, midY, controlX1, controlY1, x2, y2)];

        }

        // The curve is cubic

        x3 = round(x3);
        y3 = round(y3);

        if (x0 === x1 && x1 === x2 & x2 === x3) {
            return [];
        }

        return Curve.splitCubic(x0, y0, x1, y1, x2, y2, x3, y3, 4);

    }

    static splitCubic(x0, y0, x1, y1, x2, y2, x3, y3, parts) {

        if (parts < 2) {
            return [Curve.approxCubic(x0, y0, x1, y1, x2, y2, x3, y3)];
        }

        const t = 1 / parts;

        var midX = lerp(x1, x2, t);
        var midY = lerp(y1, y2, t);

        const controlX0 = lerp(x0, x1, t);
        const controlX1 = lerp(controlX0, midX, t);
        const controlX3 = lerp(x2, x3, t);
        const controlX2 = lerp(midX, controlX3, t);

        const controlY0 = lerp(y0, y1, t);
        const controlY1 = lerp(controlY0, midY, t);
        const controlY3 = lerp(y2, y3, t);
        const controlY2 = lerp(midY, controlY3, t);

        midX = lerp(controlX1, controlX2, t);
        midY = lerp(controlY1, controlY2, t);

        var curves = [Curve.approxCubic(x0, y0, controlX0, controlY0, controlX1, controlY1, midX, midY)];
        curves = curves.concat(Curve.splitCubic(midX, midY, controlX2, controlY2, controlX3, controlY3, x3, y3, parts - 1));

        return curves;
    }

    static approxCubic(x0, y0, x1, y1, x2, y2, x3, y3) {

        const controlX = (0.75 * x1 - 0.25 * x0) + (0.75 * x3 - 0.25 * x2);
        const controlY = (0.75 * y1 - 0.25 * y0) + (0.75 * y3 - 0.25 * y2);

        return new Curve(x0, y0, controlX, controlY, x3, y3);

    }

    xOfT(t) {
        return this.ax * (t ** 2) + this.bx * t + this.cx;
    }

    yOfT(t) {
        return this.ay * (t ** 2) + this.by * t + this.cy;
    }

    yOfX(x) {

        if (x < this.xmin || x > this.xmax) {
            return NaN;
        }

        if (x === this.x0) {
            return this.y0;
        }

        if (x === this.x1) {
            return this.y1;
        }

        var t = NaN;

        if (this.ax === 0) {
            t = (x - this.cx) / this.bx;
        } else {
            t = (-1 * this.bx + Math.sqrt(this.bx ** 2 - 4 * this.ax * (this.cx - x))) / (2 * this.ax);
        }

        return this.yOfT(t);

    }

}

function openFont(event) {
    var reader = new FileReader();
    reader.onload = function() {
        font = opentype.parse(reader.result);
        const bounds = font.getPath('H', 0, 0, 1).getBoundingBox();
        fontSize = 100 / (bounds.y2 - bounds.y1);

        var name = font.names.fullName.en;
        if (name !== void 0) {
            name = name.replace(" Regular", "").replace(" Normal", "").replace(" Book", "");
            name = name.replace(" regular", "").replace(" normal", "").replace(" book", "");
            document.getElementById("fontName").value = name;
        }
    }

    reader.readAsArrayBuffer(event.target.files[0]);
}

function openSb3() {
    var reader = new FileReader();
    reader.onload = function() {
        JSZip.loadAsync(reader.result).then(inject);
    }

    const target = document.getElementById("sb3File");
    fileName = target.files[0].name;
    reader.readAsArrayBuffer(target.files[0]);
}

function inject(sb3) {
    spriteName = document.getElementById("spriteName").value;
    sb3.file("project.json").async("string").then(injectData);

    function injectData(project) {
        project = JSON.parse(project);
        sprite = getSprite(project, spriteName);
        if (sprite === "Error") {
            alert("Error: Sprite does not exist");
            return;
        }
        const fontNames = getList(sprite, "_fontNames");
        if (fontNames === "Error") {
            alert("Error: Sprite does not have \"_fontNames\" list");
            return;
        }
        const charWidths = getList(sprite, "_charWidths");
        if (charWidths === "Error") {
            alert("Error: Sprite does not have \"_charWidths\" list");
            return;
        }
        charWidths[0] = 0;
        charWidths[1] = 0;
        
        fontName = document.getElementById("fontName").value;
        var index = fontNames.map((value) => value.toLowerCase()).indexOf(fontName.toLowerCase());
        var costumeIndex;
        var fontId;
        if (index === -1) {
            index = fontNames.length;
            fontNames.push(fontName.toLowerCase());
            costumeIndex = -1;
            fontId = (index + 1) + ":";
        } else {

            const costumes = {};
            for (let i = 0; i < project.targets.length; i++) {
                if (project.targets[i].name !== spriteName) {
                    for (let j = 0; j < project.targets[i].costumes.length; j++) {
                        costumes[project.targets[i].costumes[j].md5ext] = true;
                    }
                }
            }

            fontId = (index + 1) + ":";
            costumeIndex = 0;
            while (sprite.costumes[costumeIndex].name.slice(0,2) !== fontId) {
                costumeIndex++;
            }

            var assetFile;
            while ((sprite.costumes.length > costumeIndex) && (sprite.costumes[costumeIndex].name.slice(0,2) === fontId)) {
                assetFile = sprite.costumes[costumeIndex].md5ext;
                if (costumes[assetFile] === void 0) sb3.remove(assetFile);
                sprite.costumes.splice(costumeIndex, 1);
                charWidths.splice(costumeIndex, 1);
            }

            if (index === fontNames.length - 1) costumeIndex = -1;

        }

        var charset = document.getElementById("charset").value;
        if (charset.indexOf(" ") === -1) {
            charset = " " + charset;
        }

        var path;
        var svg;
        var md5Value;
        if (costumeIndex === -1) {
            for (let i = 0; i < charset.length; i++) {
                path = font.getPath(charset.charAt(i), 240, 180, fontSize).toPathData(3);
                svg = `<svg width="480px" height="360px" xmlns="http://www.w3.org/2000/svg"><path fill="#F00" d="${path}"/></svg>`
                md5Value = md5(svg);

                sprite.costumes.push({
                    assetId: md5Value,
                    name: fontId + charset.charAt(i),
                    md5ext: md5Value + ".svg",
                    dataFormat: "svg",
                    bitmapResolution: 1,
                    rotationCenterX: 240,
                    rotationCenterY: 180
                });
                charWidths.push(Math.round(1000 * font.getAdvanceWidth(charset.charAt(i), fontSize))/16000);

                sb3.file(md5Value + ".svg", svg);
            }
        } else {
            for (let i = 0; i < charset.length; i++) {
                path = font.getPath(charset.charAt(i), 240, 180, fontSize).toPathData(3);
                svg = `<svg width="480px" height="360px" xmlns="http://www.w3.org/2000/svg"><path fill="#F00" d="${path}"/></svg>`
                md5Value = md5(svg);

                sprite.costumes.splice(costumeIndex, 0, {
                    assetId: md5Value,
                    name: fontId + charset.charAt(i),
                    md5ext: md5Value + ".svg",
                    dataFormat: "svg",
                    bitmapResolution: 1,
                    rotationCenterX: 240,
                    rotationCenterY: 180
                });
                charWidths.splice(costumeIndex, 0, Math.round(1000 * font.getAdvanceWidth(charset.charAt(i), fontSize))/16000);

                sb3.file(md5Value + ".svg", svg);
                
                costumeIndex++;
            }
        }

        sb3.file("project.json", JSON.stringify(project));
        sb3.generateAsync({type:"base64"}).then(download);

    }

    function getSprite(data, spriteName) {
        data = data.targets;
        for (let i = 0; i < data.length; i++) {
            if (data[i].name === spriteName) return data[i];
        }
        return "Error";
    }

    function getList(sprite, listName) {
        const lists = Object.values(sprite.lists);
        for (let i = 0; i < lists.length; i++) {
            if (lists[i][0] === listName) return lists[i][1];
        }
        return "Error";
    }

}

function download(data) {
    var link = document.createElement("a");
    link.style.display = "none";
    link.download = fileName;
    link.href = "data:application/zip;base64," + data;
    document.body.appendChild(link);
    link.click();
    alert("The project has been downloaded");
}