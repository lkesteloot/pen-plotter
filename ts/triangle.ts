
import jpeg from "npm:jpeg-js";
// @deno-types="npm:@types/d3-delaunay"
import {Delaunay} from "npm:d3-delaunay";
import Color from "npm:color";
import { DPI, Svg } from "./Svg.ts";
import { Vector } from "./Vector.ts";
import { Rect } from "./Rect.ts";
import { Line } from "./Line.ts";
import { Circle } from "./Circle.ts";
import { Polygon } from "./Polygon.ts";

async function main() {
    const pathname = "bean.jpg";
    const jpegData = await Deno.readFile(pathname);
    const image = jpeg.decode(jpegData, {
        formatAsRGBA: false,
        useTArray: true,
    });

    let pageSize = new Vector(8.5*DPI, 11*DPI);
    if (image.width > image.height) {
        // Match orientation of image.
        pageSize = pageSize.swap();
    }
    const page = new Rect(Vector.ZERO, pageSize);
    const margin = 1*DPI;
    const drawArea = page.insetBy(margin);

    const svg = new Svg(pageSize);
    // svg.drawRect(Vector.ZERO, pageSize);
    // svg.drawRect(drawArea.p, drawArea.p.plus(drawArea.size));

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

    // Rescale.
    grayIndex = 0;
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            // Rescale 0 to 1.
            let gray = (grayImage[grayIndex] - minGray) / (maxGray - minGray);

            gray += 0.35;

            gray = Math.min(Math.max(gray, 0), 1);
            gray = Math.pow(gray, 2)*3 - Math.pow(gray, 3)*2;
            gray = Math.pow(gray, 2)*3 - Math.pow(gray, 3)*2;

            grayImage[grayIndex] = Math.min(gray, 0.99);
            grayIndex += 1;
        }
    }

    if (true) {
        // Write modified JPEG back out.
        const buffer8 = new Uint8Array(grayImage.length*4);
        for (let i = 0; i < grayImage.length; i++) {
            const value = Math.floor(Math.min(Math.max(grayImage[i]*255.99, 0), 255));
            buffer8[i*4 + 0] = value;
            buffer8[i*4 + 1] = value;
            buffer8[i*4 + 2] = value;
            buffer8[i*4 + 3] = 255;
        }
        const buffer = jpeg.encode({
            width: image.width,
            height: image.height,
            data: buffer8,
        })
        await Deno.writeFile("gray-" + pathname, buffer.data);
    }

    let points: Vector[] = [];
    // Rejection sampling.
    while (points.length < 60000) {
        const x = Math.random()*image.width;
        const y = Math.random()*image.height;
        const gray = grayImage[Math.floor(y)*image.width + Math.floor(x)];
        const weight = 1 - gray;

        if (Math.random() < weight) {
            points.push(new Vector(x, y).times(scale).plus(offset));
        }
    }

    // Relax the points.
    const iterations = 40;
    for (let iteration = 0; iteration < iterations; iteration++) {
        const delaunay = Delaunay.from(points.map(p => p.toArray()));
        const newPoints: Vector[] = [];

        // const voronoi = delaunay.voronoi(drawArea.asArray());

        let i = 0;
        grayIndex = 0;
        const pointCount = points.length;
        const closest = new Float64Array(pointCount * 2);
        const weights = new Float64Array(pointCount);
        for (let y = 0; y < image.height; y++) {
            const py = y*scale + offset.y;
            for (let x = 0; x < image.width; x++) {
                const px = x*scale + offset.x;

                const gray = grayImage[grayIndex++];
                const weight = 1 - gray;
                i = delaunay.find(px, py, i);
                weights[i] += weight;
                closest[i*2 + 0] += px*weight;
                closest[i*2 + 1] += py*weight;
            }
        }
        for (let i = 0; i < pointCount; i++) {
            const w = weights[i];
            const x = closest[i*2 + 0];
            const y = closest[i*2 + 1];
            if (w > 0) {
                newPoints.push(new Vector(x/w, y/w));
            }
        }

        points = newPoints;
    }

    console.log("Number of points:", points.length);
    const delaunay = Delaunay.from(points.map(p => p.toArray()));
    const triangles = delaunay.triangles;
    console.log("Number of triangles:", triangles.length / 3);

    const trianglesPath = delaunay.render();
    // svg.drawPath(trianglesPath);

    for (const point of points) {
        svg.drawCircle(point, 1);
    }

    await svg.save("out.svg");
}

await main();


