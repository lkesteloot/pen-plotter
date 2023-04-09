
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

/**
 * Relax (spread apart) a list of points using Lloyd's Algorithm.
 * 
 * https://en.wikipedia.org/wiki/Lloyd%27s_algorithm
 */
function relaxPoints(points: Vector[], drawArea: Rect, iterations: number): Vector[] {
    for (let iteration = 0; iteration < iterations; iteration++) {
        const delaunay = Delaunay.from(points.map(p => p.toArray()));
        const newPoints: Vector[] = [];

        const voronoi = delaunay.voronoi(drawArea.asArray());
        for (const cellPolygon of voronoi.cellPolygons()) {
            const polygon = Polygon.fromClosedPoints(cellPolygon.map(Vector.fromArray));
            newPoints.push(polygon.getCentroid());
        }

        points = newPoints;
    }

    return points;
}

async function main() {
    const pageSize = new Vector(8.5*DPI, 11*DPI).swap();
    const page = new Rect(Vector.ZERO, pageSize);
    const margin = 1*DPI;
    const drawArea = page.insetBy(margin);

    const svg = new Svg(pageSize);
    // svg.drawRect(Vector.ZERO, pageSize);
    // svg.drawRect(drawArea.p, drawArea.p.plus(drawArea.size));

    if (true) {
        const jpegData = await Deno.readFile("bean.jpg");
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

        let points: Vector[] = [];
        grayIndex = 0;
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                // Rescale 0 to 1.
                let gray = (grayImage[grayIndex++] - minGray) / (maxGray - minGray);

                // gray = (gray - 0.5)*1.5 + 0.6;
                gray += 0.35; // bean

                gray = Math.min(Math.max(gray, 0), 1);
                gray = Math.pow(gray, 2)*3 - Math.pow(gray, 3)*2;
                gray = Math.pow(gray, 2)*3 - Math.pow(gray, 3)*2;

                let makePoint = false;
                if (gray >= 1) {
                    makePoint = Math.random()*100 < 1; 
                } else {
                    if (Math.random() < 1 && Math.random() > Math.pow(gray, 1)) {
                        makePoint = true;
                    }
                }
                if (makePoint) {
                    points.push(new Vector(x + Math.random(), y + Math.random()).times(scale).plus(offset));
                }
            }
        }

        points = relaxPoints(points, drawArea, 3);

        console.log("Number of points:", points.length);
        const delaunay = Delaunay.from(points.map(p => p.toArray()));
        const triangles = delaunay.triangles;
        console.log("Number of triangles:", triangles.length / 3);

        const trianglesPath = delaunay.render();
        svg.drawPath(trianglesPath);

        for (const point of points) {
            // svg.drawCircle(point, 1);
        }
    }

    await svg.save("out.svg");
}

await main();


