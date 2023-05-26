import { Circle } from "./Circle.ts";
import { Line } from "./Line.ts";
import { Vector } from "./Vector.ts";

const CURVE_TIGHTNESS = 0; // 0 = Catmull-Rom splines, 1 = straight lines
export const DPI = 96;

/**
 * A class to generate SVG files. All coordinates are in points.
 */
export class Svg {
    private readonly size: Vector;
    private readonly parts: string[] = [];
    private inverted = false;

    /**
     * Construct an SVG page with the given size.
     */
    constructor(size: Vector) {
        this.size = size;

        this.parts.push(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>`);
        this.parts.push(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`);
        this.parts.push(`<svg width="${this.size.x}" height="${this.size.y}" viewBox="0 0 ${this.size.x} ${this.size.y}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
    }

    public invert() {
        this.parts.push(`<rect x="0" y="0" width="${this.size.x}" height="${this.size.y}" fill="black"/>`);
        this.inverted = true;
    }

    /**
     * Draw a line.
     */
    public drawLine(line: Line, color?: string) {
        if (color === undefined) {
            color = this.inverted ? "white" : "black";
        }
        this.parts.push(`<line x1="${line.p1.x}" y1="${line.p1.y}" x2="${line.p2.x}" y2="${line.p2.y}" stroke="${color}" stroke-width="1"/>`);
    }

    /**
     * Draw a rectangle outline from p1 to p2.
     */
    public drawRect(p1: Vector, p2: Vector) {
        const size = p2.minus(p1);
        this.parts.push(`<rect x="${p1.x}" y="${p1.y}" width="${size.x}" height="${size.y}" stroke="blue" stroke-width="1" fill="none"/>`);
    }

    /**
     * Draw a circle outline centered at "c" with radius "r".
     */
    public drawCircle(c: Vector | Circle, r?: number) {
        if (c instanceof Circle) {
            if (r !== undefined) {
                throw new Error("when circle, can't specify radius");
            }
            r = c.r;
            c = c.c;
        }
        this.parts.push(`<circle cx="${c.x}" cy="${c.y}" r="${r}" stroke="black" stroke-width="1" fill="none"/>`);
    }

    /**
     * Draw an outlined hollow SVG path.
     */
    public drawPath(path: string) {
        const color = this.inverted ? "white" : "black";
        this.parts.push(`<path d="${path}" stroke="${color}" stroke-width="1" fill="none"/>`);
    }

    /**
     * Draw a Catmull-Rom spline. Does not draw the first and last point, so if you want those, duplicate
     * them.
     */
    public drawSpline(v: Vector[]) {
        const s = 1 - CURVE_TIGHTNESS;

        for (let i = 1; i < v.length - 2; i++) {
            const b0 = v[i];
            const b1 = v[i].plus(v[i + 1].minus(v[i - 1]).times(s/6));
            const b2 = v[i + 1].plus(v[i].minus(v[i + 2]).times(s/6));
            const b3 = v[i + 1];
            this.parts.push(`<path d="M ${b0.x} ${b0.y} C ${b1.x} ${b1.y}, ${b2.x} ${b2.y}, ${b3.x} ${b3.y}" stroke="black" stroke-width="1" fill="none"/>`);
        }
    }

    /**
     * Make a single string of the entire SVG file.
     */
    private makeSvgString(): string {
        return this.parts.join("\n") + "\n";
    }

    /**
     * Closes the SVG file and writes it to the given pathname. Do not call multiple times or
     * the file will be closed too many times.
     */
    public async save(pathname: string) {
        this.parts.push(`</svg>`);
        await Deno.writeTextFile(pathname, this.makeSvgString());
    }
}