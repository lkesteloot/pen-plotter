
import jpeg from "npm:jpeg-js";
import triangulate from "npm:delaunay-triangulate";
// @deno-types="npm:@types/d3-delaunay"
import {Delaunay} from "npm:d3-delaunay";
import { DPI, Svg } from "./Svg.ts";
import { Vector } from "./Vector.ts";
import { Rect } from "./Rect.ts";
import { Line } from "./Line.ts";
import { Circle } from "./Circle.ts";
import { Polygon } from "./Polygon.ts";

function relaxPoints(points: Vector[], drawArea: Rect, max: number): Vector[] {
    for (let qq = 0; qq < max; qq++) {
        const delaunay = Delaunay.from(points.map(p => p.toArray()));
        const newPoints: Vector[] = [];

        const voronoi = delaunay.voronoi(drawArea.asArray());
        for (const cellPolygon of voronoi.cellPolygons()) {
            const polygon = Polygon.fromClosedPoints(cellPolygon.map(Vector.fromArray));
            const circle = polygon.largestInscribedCircle();
            if (circle !== undefined) {
                newPoints.push(circle.c);
            }
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

        // svg.drawRect(Vector.ZERO, pageSize);
        // svg.drawRect(drawArea.p, drawArea.p.plus(drawArea.size));
        for (const line of lineMap.values()) {
            svg.drawLine(line.p1, line.p2);
        }
        for (const point of points) {
            // svg.drawCircle(point, 1);
        }
    }

    if (false) {
        const p1 = new Vector(1*DPI, 1*DPI);
        const p2 = new Vector(1*DPI, 3*DPI);
        const p3 = new Vector(3*DPI, 3*DPI);
        const p4 = new Vector(3.5*DPI, 1.5*DPI);

        const polygon = Polygon.fromPoints([p1, p2, p3, p4]);
        for (const line of polygon.lines) {
            svg.drawLine(line);
        }

        for (let i = 0; i < polygon.lines.length; i++) {
            for (let j = i + 1; j < polygon.lines.length; j++) {
                for (let k = j + 1; k < polygon.lines.length; k++) {
                    const circle = Circle.circleTangentWith(
                        polygon.lines[i],
                        polygon.lines[j],
                        polygon.lines[k]);
                    if (circle !== undefined) {
                        // svg.drawCircle(circle);
                    }
                }
            }
        }

        const circle = polygon.largestInscribedCircle();
        if (circle !== undefined) {
            svg.drawCircle(circle);
        }
    }

    if (false) {
        let points: Vector[] = [];
        for (let i = 0; i < 100; i++) {
            const p = drawArea.randomPoint();
            points.push(p);
            // svg.drawCircle(p, 1);
        }

        const MAX = 5;
        for (let qq = 0; qq < MAX; qq++) {
            // const triangles = triangulate(points.map(p => p.toArray()));
            const delaunay = Delaunay.from(points.map(p => p.toArray()));
            const newPoints: Vector[] = [];
            /*
            const triangles = delaunay.triangles;
            for (let i = 0; i < triangles.length; i += 3) {
                const tp = [
                    points[triangles[i]],
                    points[triangles[i + 1]],
                    points[triangles[i + 2]],
                ];
                const polygon = Polygon.fromPoints(tp);
                for (const line of polygon.lines) {
                    // svg.drawLine(line);
                }
                const circle = polygon.largestInscribedCircle();
                if (circle !== undefined) {
                    if (qq === MAX - 1) {
                        svg.drawCircle(circle);
                    }
                    newPoints.push(circle.c);
                }
            }*/

            const hull = delaunay.hull;
            for (let i = 0; i < hull.length; i++) {
                const p1 = points[hull[i]];
                const p2 = points[hull[(i + 1) % hull.length]];
                // svg.drawLine(p1, p2);
            }

            const voronoi = delaunay.voronoi(drawArea.asArray());
            for (const cellPolygon of voronoi.cellPolygons()) {
                const polygon = Polygon.fromClosedPoints(cellPolygon.map(Vector.fromArray));
                for (const line of polygon.lines) {
                    // svg.drawLine(line);
                }
                const circle = polygon.largestInscribedCircle();
                if (circle !== undefined) {
                    if (qq === MAX - 1) {
                        svg.drawCircle(circle.c, 1);
                    }
                    newPoints.push(circle.c);
                }
            }

            points = newPoints;
        }
    }
    
    await svg.save("out.svg");
}

await main();


