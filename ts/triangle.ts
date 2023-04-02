
import jpeg from "npm:jpeg-js";
import triangulate from "npm:delaunay-triangulate";
import { DPI, Svg } from "./Svg.ts";
import { Vector } from "./Vector.ts";
import { Rect } from "./Rect.ts";
import { Line } from "./Line.ts";

async function main() {
    const pageSize = new Vector(8.5*DPI, 11*DPI);
    const page = new Rect(Vector.ZERO, pageSize);
    const margin = 1*DPI;
    const drawArea = page.insetBy(margin);

    const jpegData = await Deno.readFile("input.jpg");
    const image = jpeg.decode(jpegData, {
        formatAsRGBA: false,
        useTArray: true,
    });

    // Center image in draw area.
    let scale: number;
    let offset: Vector;
    if (image.width/image.height < drawArea.size.x/drawArea.size.y) {
        // Image is narrower (taller) than draw area.
        scale = drawArea.size.y/image.height;
        offset = new Vector(drawArea.p.x + (drawArea.size.x - image.width*scale)/2, drawArea.p.y);
    } else {
        // Image is wider than draw area.
        scale = drawArea.size.x/image.width;
        offset = new Vector(drawArea.p.x, drawArea.p.y + (drawArea.size.y - image.height*scale)/2);
    }

    // Convert image to grayscale (0 to 1).
    let minGray = 1;
    let maxGray = 0;
    let rgbIndex = 0;
    let grayIndex = 0;
    const grayImage = new Float32Array(image.width*image.height);
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const r = image.data[rgbIndex++];
            const g = image.data[rgbIndex++];
            const b = image.data[rgbIndex++];
            const gray = (r*0.30 + g*.59 + b*.11)/255;
            minGray = Math.min(minGray, gray);
            maxGray = Math.max(maxGray, gray);
            grayImage[grayIndex++] = gray;
        }
    }
    console.log("minGray:", minGray, "maxGray:", maxGray);

    const points: Vector[] = [];
    grayIndex = 0;
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            // Rescale 0 to 1.
            let gray = (grayImage[grayIndex++] - minGray) / (maxGray - minGray);

            gray = (gray - 0.5)*1.5 + 0.6;

            let makePoint = false;
            if (gray >= 1) {
                makePoint = Math.random()*100 < 1;            
            } else {
                if (Math.random() < 0.9 && Math.random() > Math.pow(gray, 1)) {
                    makePoint = true;
                }
            }
            if (makePoint) {
                points.push(new Vector(x + Math.random(), y + Math.random()).times(scale).plus(offset));
            }
        }
    }

    console.log("Number of points:", points.length);
    const triangles = triangulate(points.map(p => [p.x, p.y]));
    console.log("Number of triangles:", triangles.length);

    // Generate lines, removing duplicates. Key is "A,B" where A or B is the point index and A < B.
    const lineMap = new Map<string,Line>();
    for (const t of triangles) {
        for (let i = 0; i < t.length; i++) {
            const j = (i + 1) % t.length;
            const t1 = t[i];
            const t2 = t[j];
            const p1 = points[t1];
            const p2 = points[t2];
            const key = t1 < t2 ? `${t1},${t2}` : `${t2},${t1}`;
            lineMap.set(key, new Line(p1, p2));
        }
    }
    console.log("Number of lines:", lineMap.size);

    const svg = new Svg(pageSize);
    // svg.drawRect(Vector.ZERO, pageSize);
    // svg.drawRect(drawArea.p, drawArea.p.plus(drawArea.size));
    for (const line of lineMap.values()) {
        svg.drawLine(line.p1, line.p2);
    }
    await svg.save("out.svg");
}

await main();


