
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
import { Lines } from "./Lines.ts";

// The Gelly Roll metallic set.
// Colors eyeballed using https://htmlcolorcodes.com/color-picker/
const PEN_COLOR = [
    "#F4C858", // Gold #XPGB-M551
    "#D7D7D7", // Silver #XPGB-M553
    "#DDA62A", // Copper #XPGB-M554
    "#F4977B", // Metallic Red #XPGB-M559
    "#E7A7BF", // Metallic Pink #XPGB-M520
    "#CBA5B5", // Metallic Burgundy #XPGB-M522
    "#EFC2DE", // Metallic Purple #XPGB-M524
    "#9CA560", // Metallic Emerald #XPGB-M526
    "#A1B68D", // Metallic Green #XPGB-M529
    "#6A9794", // Metallic Blue #XPGB-M536
    "#4B5B60", // Metallic Blue Black #XPGB-M543
    "#707070", // Metallic Black #XPGB-M549
];

function clamp(x: number, low: number, high: number): number {
    return Math.min(Math.max(x, low), high);
}

function sCurve(x: number): number {
    return Math.pow(x, 2)*3 - Math.pow(x, 3)*2;
}

async function main() {
    const inverted = true;
    const pathname = inverted ? "bean_over_black.jpg" : "bean.jpg";
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
            let gray = (r*0.30 + g*.59 + b*.11)/255;
            if (inverted) {
                gray = 1 - gray;
            }
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

            // gray += 0.35;
            gray -= 0.03;

            gray = Math.min(Math.max(gray, 0), 1);
            // gray = sCurve(gray);
            gray = sCurve(gray);

            grayImage[grayIndex] = Math.min(gray, 0.99);
            grayIndex += 1;
        }
    }

    if (true) {
        // Write modified JPEG back out.
        const buffer8 = new Uint8Array(grayImage.length*4);
        for (let i = 0; i < grayImage.length; i++) {
            const value = Math.floor(clamp(grayImage[i]*255.99, 0, 255));
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
    while (points.length < 20_000 /* && points.length < 1000 */) {
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

    // One color.
    if (false) {
        const svg = new Svg(pageSize, inverted);
        // svg.drawRect(Vector.ZERO, pageSize);
        // svg.drawRect(drawArea.p, drawArea.p.plus(drawArea.size));

        // Lines.
        if (true) {
            const trianglesPath = delaunay.render();
            svg.drawPath(trianglesPath);
        }

        // Dots.
        if (false) {
            const minRadius = 1;
            const maxRadius = 6;
            for (const point of points) {
                const imagePoint = point.minus(offset).dividedBy(scale);
                const ix = clamp(Math.floor(imagePoint.x), 0, image.width - 1);
                const iy = clamp(Math.floor(imagePoint.y), 0, image.height - 1);
                const gray = grayImage[iy*image.width + ix];
                const weight = (1 - gray);
                const radius = minRadius + (maxRadius - minRadius)*weight;

                svg.drawCircle(point, radius);
            }
        }

        await svg.save("out.svg");
    } else {
        // Multi-color.

        const lines = new Lines();
        delaunay.render(lines.getContext());
        const linesPasses = lines.colorize(PEN_COLOR.length);
        const svgAll = new Svg(pageSize, inverted);
        for (let i = 0; i < linesPasses.length; i++) {
            const linesPass = linesPasses[i];
            const svg = new Svg(pageSize, inverted);
            svg.drawPath(linesPass.toSvgPath());
            svgAll.drawPath(linesPass.toSvgPath(), PEN_COLOR[i]);
            await svg.save("out" + i + ".svg");
        }
        await svgAll.save("out.svg");
    }
}

await main();


